#!/usr/bin/env python3
"""Speech files for a trail's texts (docs/design/trail-content.md, Audio).

For every text.<lang>.md in the trail folder (the trail's own and each
station's) this writes audio.<lang>.mp3 beside it, spoken by a Microsoft
neural voice through edge-tts (unofficial endpoint, no key; fine for a demo).

    pip install edge-tts
    python src/build/make-audio.py [trail folder] [--lang de] [--force] [--dry-run]

Without a folder it uses WAYMARKED_TRAIL, as the build does, or the only one
under trails/. It is incremental: audio.json in the trail folder records, for
each file this script wrote, a hash of what was spoken from and the file's
size, and a file whose source is unchanged is left alone. A file that
audio.json does not list, or of another size than the one listed (a real
recording put in the same slot), is never overwritten, even with --force
unless --overwrite-recordings is also given.

Settings come from an optional "audio" object in trail.json, read by this
script only (the site ignores it):

    "audio": {
      "voices": { "de": "de-CH-LeniNeural" },   // per language; defaults below
      "rate": "-5%",                            // speaking speed, edge-tts syntax,
                                                // or { "de": "+8%" } per language
      "say": { "WWF": "W W F" }                 // pronunciation: written -> spoken
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
DEFAULT_RATE = "-5%"
BOM = "\ufeff"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def find_trail(arg: str | None) -> Path:
    """The folder: the argument (a name under trails/, or a path from here), else WAYMARKED_TRAIL (a name, or a path from the repository, as the build reads it), else the only trail."""
    repo = Path(__file__).resolve().parents[2]
    env = os.environ.get("WAYMARKED_TRAIL")
    name, base = (arg, Path.cwd()) if arg else (env, repo)
    if name:
        by_name = repo / "trails" / name
        d = by_name if by_name.exists() else (base / name).resolve()
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
    text = md.replace("\r\n", "\n").replace(BOM, "")
    return hashlib.sha256(f"{title}\n{text}".encode("utf-8")).hexdigest()


def plain(md: str) -> str:
    """The text as it is said: Markdown reduced to sentences."""
    t = md.replace(BOM, "")
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


GERMAN_ONES = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf",
               "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"]
GERMAN_TENS = ["", "", "zwanzig", "dreissig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"]


def german_number(n: int) -> str:
    """1..999 as German words (Swiss spelling: dreissig, no ß)."""
    if n < 20:
        return GERMAN_ONES[n]
    if n < 100:
        tens, ones = divmod(n, 10)
        return GERMAN_TENS[tens] if not ones else ("ein" if ones == 1 else GERMAN_ONES[ones]) + "und" + GERMAN_TENS[tens]
    hundreds, rest = divmod(n, 100)
    return ("ein" if hundreds == 1 else GERMAN_ONES[hundreds]) + "hundert" + (german_number(rest) if rest else "")


def run_on_short_openers(text: str) -> str:
    """Join a paragraph's very short first sentence to the next with a comma.

    The multilingual German voice decides its language sentence by sentence;
    a sentence of four words or fewer ("Gänsesäger brüten in Höhlen.") that
    stands first in a paragraph can come out English. Followed by a comma it
    is heard together with the sentence after it.
    """
    def join(par: str) -> str:
        m = re.match(r"([^.!?]+)\.(\s+\S)", par)
        return f"{m.group(1)},{par[m.end(1) + 1:]}" if m and len(m.group(1).split()) <= 4 else par

    return "\n\n".join(join(par) for par in text.split("\n\n"))


def spoken(n: int, title: str, md: str, lang: str, say: dict[str, str]) -> str:
    """The intro (for a station: its number and title; item 0: its title) and the text.

    German: "Hier ist Station zwei: Title." The number is a word because German
    reads "2." as an ordinal ("zweiter"). The title stays in the one sentence
    with German words before it, because the multilingual German voice decides
    its language sentence by sentence and a short title of its own ("Schräge
    Baumgiganten.") can come out English.
    """
    if not n:
        head = f"{title}."
    elif lang == "de":
        head = f"Hier ist {STATION_WORD['de']} {german_number(n)}: {title}."
    else:
        head = f"{STATION_WORD.get(lang, 'Station')} {n}. {title}."
    body = plain(md)
    t = f"{head}\n\n{run_on_short_openers(body) if lang == 'de' else body}"
    for written, said in say.items():
        t = t.replace(written, said)
    return t


def declare_voice_locale() -> None:
    """Make edge-tts declare a multilingual voice's own locale in the request.

    edge-tts writes xml:lang='en-US' on every request. A multilingual voice
    (de-DE-SeraphinaMultilingualNeural) chooses its language from the text and
    that declaration, so a short German sentence made of a word English shares
    ("Station") could be read in English. Voices that are not multilingual
    are left as they were.
    """
    from edge_tts import communicate

    if getattr(communicate.mkssml, "declares_locale", False):
        return
    original = communicate.mkssml

    def mkssml(tc, escaped_text):
        ssml = original(tc, escaped_text)
        # tc.voice is edge-tts's long form: "Microsoft Server Speech Text to Speech Voice (de-DE, SeraphinaMultilingualNeural)"
        found = re.search(r"\(([a-z]{2,3}-[A-Za-z0-9]+), \w*Multilingual\w*\)", tc.voice)
        if found:
            ssml = ssml.replace("xml:lang='en-US'", f"xml:lang='{found.group(1)}'", 1)
        return ssml

    mkssml.declares_locale = True
    communicate.mkssml = mkssml


async def synth(text: str, voice: str, rate: str, out: Path) -> None:
    import edge_tts  # imported late so --dry-run works without it

    declare_voice_locale()

    # The part file is written outside the trail folder: a dev server watching
    # the folder re-reads its audio on every change, and on Windows a file it
    # is reading can't be replaced. Same drive, so the final move is atomic.
    tmp = part_dir(out) / (out.name + ".part")
    sweep_old(tmp.parent)
    last: Exception | None = None
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(tmp))
            if tmp.stat().st_size < 1000:
                raise RuntimeError("empty audio")
            await replace_when_free(tmp, out)
            return
        except Exception as e:  # network, endpoint hiccup: retry
            last = e
            await asyncio.sleep(2 * (attempt + 1))
    tmp.unlink(missing_ok=True)
    raise RuntimeError(f"{out}: {last}")


def part_dir(out: Path) -> Path:
    """A scratch folder on the same drive as `out`, outside any watched tree."""
    for parent in out.resolve().parents:
        if (parent / "trails").is_dir() and (parent / "src").is_dir():
            d = parent / ".cache" / "audio"
            break
    else:
        d = out.parent
    d.mkdir(parents=True, exist_ok=True)
    return d


async def replace_when_free(tmp: Path, out: Path) -> None:
    """Put the new file in place even while something streams the old one.

    A dev server serving the old file to a browser that has paused the
    download keeps it open for as long as the page lives; Windows then
    refuses to replace it, but allows renaming it (Node opens files with
    share-delete). So the old file is moved aside into the part folder and
    deleted there, now or on a later run.
    """
    try:
        tmp.replace(out)
        return
    except PermissionError:
        pass
    aside = part_dir(out) / f"{out.parent.name}-{out.name}.{os.getpid()}.old"
    out.replace(aside)
    tmp.replace(out)
    try:
        aside.unlink()
    except PermissionError:
        pass


def sweep_old(out_dir: Path) -> None:
    """Delete files moved aside by earlier runs whose readers have gone."""
    for f in out_dir.glob("*.old"):
        try:
            f.unlink()
        except PermissionError:
            pass


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
    rate = audio.get("rate", DEFAULT_RATE)
    rate_for = lambda lang: rate.get(lang, DEFAULT_RATE) if isinstance(rate, dict) else rate
    say = audio.get("say", {})
    langs = cfg.get("languages", [])
    manifest_path = trail / MANIFEST
    manifest = read_json(manifest_path) if manifest_path.exists() else {"files": {}}
    files: dict = manifest.setdefault("files", {})
    changed = False  # audio.json needs saving without new speech: sizes recorded, recordings unlisted

    def save() -> None:
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                                 encoding="utf-8", newline="\n")

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
            rate_l = rate_for(lang)
            entry = files.get(key)
            size = out.stat().st_size if out.exists() else None
            # Ours if listed at the size it was made (entries from before sizes were recorded: listed is enough).
            made = entry is not None and entry.get("bytes") in (None, size)
            if out.exists() and not made and not args.overwrite_recordings:
                print(f"  keep   {key} (a recording, not made by this script)")
                if entry is not None:
                    del files[key]
                    changed = True
                continue
            if out.exists() and made and entry.get("source") == digest and entry.get("voice") == voice \
                    and entry.get("rate") == rate_l and entry.get("say") == say_l and not args.force:
                print(f"  fresh  {key}")
                if "bytes" not in entry:
                    entry["bytes"] = size
                    changed = True
                continue
            jobs.append((key, out, spoken(n, title, md, lang, say_l), voice, digest, say_l, rate_l))

    for key, out, text, voice, digest, say_l, rate_l in jobs:
        if args.dry_run:
            print(f"--- {key} ({voice}, {rate_l})\n{text}\n")
            continue
        print(f"  speak  {key} ({voice}) ...", end=" ", flush=True)
        await synth(text, voice, rate_l, out)
        files[key] = {"source": digest, "voice": voice, "rate": rate_l, "say": say_l, "bytes": out.stat().st_size}
        print(f"{out.stat().st_size // 1024} KB")
        # Saved after each file, so an interrupted run keeps what it made.
        save()
    if changed and not args.dry_run:
        save()

    print(f"{len(jobs)} file(s) {'to make' if args.dry_run else 'made'}.")


if __name__ == "__main__":
    asyncio.run(main())
