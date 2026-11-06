#!/usr/bin/env python3
"""Speech files for a trail's texts (docs/design/trail-content.md, Audio).

For every text.<lang>.md in the trail folder (the trail's own and each
station's) this writes audio.<lang>.mp3 beside it, spoken by a Microsoft
neural voice through edge-tts (unofficial endpoint, no key; fine for a demo).

    pip install edge-tts
    python src/build/make-audio.py [trail folder] [--lang de] [--force] [--dry-run]

Without a folder it uses the only one under trails/ (or WAYMARKED_TRAIL, as
the build does). It is incremental: audio.json in the trail folder records,
for each file this script wrote, a hash of what was spoken from, and a file
whose source is unchanged is left alone. A file that audio.json does not list
(a real recording put in the same slot) is never overwritten, even with --force
unless --overwrite-recordings is also given.

Settings come from an optional "audio" object in trail.json, read by this
script only (the site ignores it):

    "audio": {
      "voices": { "de": "de-CH-LeniNeural" },   // per language; defaults below
      "rate": "-5%",                            // speaking speed, edge-tts syntax
      "say": { "NAVO": "Navo" }                 // pronunciation: written -> spoken
                                                // a value may be { "de": "…", "en": "…" } to say it per language
    }
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import sys
from pathlib import Path

DEFAULT_VOICES = {
    "de": "de-CH-LeniNeural",  # Swiss Standard German
    "en": "en-GB-SoniaNeural",
    "fr": "fr-CH-ArianeNeural",
    "it": "it-IT-ElsaNeural",
}
# Said before a station's title, so the listener can match it to the sign.
STATION_WORD = {"de": "Station", "en": "Station", "fr": "Station", "it": "Stazione"}
MANIFEST = "audio.json"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def find_trail(arg: str | None) -> Path:
    repo = Path(__file__).resolve().parents[2]
    arg = arg or os.environ.get("WAYMARKED_TRAIL")
    if arg:
        by_name = repo / "trails" / arg
        d = by_name if by_name.exists() else Path(arg).resolve()
    else:
        found = [p for p in (repo / "trails").glob("*") if (p / "trail.json").exists()]
        if len(found) != 1:
            sys.exit(f"Expected one trail under trails/, found {len(found)}: name it.")
        d = found[0]
    if not (d / "trail.json").exists():
        sys.exit(f"No trail.json in {d}")
    return d


def source_hash(title: str, md: str) -> str:
    """What the site's check recomputes (build/trail.ts): title, newline, text with LF line ends."""
    text = md.replace("\r\n", "\n").replace("﻿", "")
    return hashlib.sha256(f"{title}\n{text}".encode("utf-8")).hexdigest()


def plain(md: str) -> str:
    """The text as it is said: Markdown reduced to sentences."""
    t = md.replace("﻿", "")
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)  # links: their text
    t = re.sub(r"(\*\*|__)(.+?)\1", r"\2", t)  # bold
    t = re.sub(r"(\*|_)(.+?)\1", r"\2", t)  # emphasis
    t = re.sub(r"^#+\s*", "", t, flags=re.M)
    t = re.sub(r"[ \t]+", " ", t)
    return re.sub(r"\n{2,}", "\n\n", t).strip()


def say_for(say: dict, lang: str) -> dict[str, str]:
    """The pronunciation map for one language: a string value applies to every language, an object per language."""
    out = {}
    for written, said in say.items():
        said = said.get(lang) if isinstance(said, dict) else said
        if said:
            out[written] = said
    return out


def spoken(n: int, title: str, md: str, lang: str, say: dict[str, str]) -> str:
    head = f"{STATION_WORD.get(lang, 'Station')} {n}. {title}." if n else f"{title}."
    t = f"{head}\n\n{plain(md)}"
    for written, said in say.items():
        t = t.replace(written, said)
    return t


async def synth(text: str, voice: str, rate: str, out: Path) -> None:
    import edge_tts  # imported late so --dry-run works without it

    tmp = out.with_suffix(".part")
    last: Exception | None = None
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(tmp))
            if tmp.stat().st_size < 1000:
                raise RuntimeError("empty audio")
            tmp.replace(out)
            return
        except Exception as e:  # network, endpoint hiccup: retry
            last = e
            await asyncio.sleep(2 * (attempt + 1))
    tmp.unlink(missing_ok=True)
    raise RuntimeError(f"{out}: {last}")


async def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to a legacy code page
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("trail", nargs="?", help="trail folder (name under trails/ or path)")
    ap.add_argument("--lang", action="append", help="only this language (repeatable)")
    ap.add_argument("--force", action="store_true", help="regenerate files whose source is unchanged")
    ap.add_argument("--overwrite-recordings", action="store_true", help="also replace files not made by this script")
    ap.add_argument("--dry-run", action="store_true", help="print what would be spoken, write nothing")
    args = ap.parse_args()

    trail = find_trail(args.trail)
    cfg = read_json(trail / "trail.json")
    audio = cfg.get("audio", {})
    voices = {**DEFAULT_VOICES, **audio.get("voices", {})}
    rate = audio.get("rate", "-5%")
    say = audio.get("say", {})
    langs = cfg.get("languages", [])
    manifest_path = trail / MANIFEST
    manifest = read_json(manifest_path) if manifest_path.exists() else {"files": {}}
    files: dict = manifest.setdefault("files", {})

    items: list[tuple[int, Path, str]] = []  # (n, folder, title key source)
    items.append((0, trail, "trail.json"))
    stations = trail / "stations"
    for i, d in enumerate(sorted(p for p in stations.iterdir() if p.is_dir()), start=1):
        items.append((i, d, "station.json"))

    jobs = []
    for n, folder, meta in items:
        titles = read_json(folder / meta).get("title", {}) if n else cfg.get("title", {})
        for lang in langs:
            if args.lang and lang not in args.lang:
                continue
            md_file = folder / f"text.{lang}.md"
            if not md_file.exists():
                continue
            title = titles.get(lang) or titles.get(langs[0], "")
            md = md_file.read_text(encoding="utf-8")
            out = folder / f"audio.{lang}.mp3"
            key = out.relative_to(trail).as_posix()
            voice = voices.get(lang)
            if not voice:
                sys.exit(f"No voice for language '{lang}': set audio.voices.{lang} in trail.json")
            digest = source_hash(title, md)
            say_l = say_for(say, lang)
            entry = files.get(key)
            if out.exists() and not entry and not args.overwrite_recordings:
                print(f"  keep   {key} (not made by this script)")
                continue
            if out.exists() and entry and entry.get("source") == digest and entry.get("voice") == voice \
                    and entry.get("rate") == rate and entry.get("say") == say_l and not args.force:
                print(f"  fresh  {key}")
                continue
            jobs.append((key, out, spoken(n, title, md, lang, say_l), voice, digest, say_l))

    for key, out, text, voice, digest, say_l in jobs:
        if args.dry_run:
            print(f"--- {key} ({voice}, {rate})\n{text}\n")
            continue
        print(f"  speak  {key} ({voice}) ...", end=" ", flush=True)
        await synth(text, voice, rate, out)
        files[key] = {"source": digest, "voice": voice, "rate": rate, "say": say_l}
        print(f"{out.stat().st_size // 1024} KB")
        # Saved after each file, so an interrupted run keeps what it made.
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(f"{len(jobs)} file(s) {'to make' if args.dry_run else 'made'}.")


if __name__ == "__main__":
    asyncio.run(main())
