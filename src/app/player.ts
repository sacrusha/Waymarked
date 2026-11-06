// Listening to a station (docs/design/trail-content.md, Audio): the shell's
// audio (docs/design/layers.md).
//
// The card is re-rendered at every selection, so the player cannot live in
// it: one audio element belongs to the page. The shell hands it the item's
// track as data (`show`), which the peek's Listen plays; the body's views of
// it (`.player[data-audio]`, content/player-view.ts) are bound after each
// render, whichever track they name. Audio belongs to the card in view:
// selecting another card stops it. While it plays, the lock screen and
// headphones get the Media Session controls, so the phone can stay in the
// pocket.

import type { Audio, Item, Trail } from "./trail-types.ts";
import type { Strings } from "./strings.ts";
import { attr } from "./html.ts";
import type { Track } from "./content/context.ts";
import { pauseIcon, playIcon } from "./content/player-view.ts";

/**
 * The audio to offer for an item in a language: that language's file; or,
 * where the item has no text in that language and the card falls back to the
 * source language's text, the source language's file. Never speech that does
 * not match the text on the screen.
 */
export function pickAudio(trail: Trail, item: Item, lang: string): Audio | undefined {
  return item.audio[lang] ?? (item.body[lang] ? undefined : item.audio[trail.languages[0]]);
}

/** The item's track's play button for the peek row, beside the title (card.ts). */
export function peekPlay(s: Strings): string {
  return `<button type="button" class="peek-play" data-state="idle" aria-label="${attr(s.listen)}" title="${attr(s.listen)}">${playIcon}${pauseIcon}</button>`;
}

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** A view's track: what its data attributes name, the item's own label and artwork where they name none. */
function viewTrack(p: HTMLElement, item?: Track): Track {
  const url = p.dataset.audio!;
  const own = item?.url === url ? item : undefined;
  return { url, label: p.dataset.label ?? own?.label ?? "", art: p.dataset.art ?? own?.art };
}

export class Player {
  private el = new window.Audio();
  /** The track playing or paused. */
  private active?: Track;
  /** The item's track, the one the peek plays. */
  private track?: Track;
  private probe?: HTMLAudioElement;
  private failed = false;
  private card: HTMLElement;
  private trailTitle: string;
  private s: Strings;

  constructor(card: HTMLElement, trailTitle: string, s: Strings) {
    this.card = card;
    this.trailTitle = trailTitle;
    this.s = s;
    this.el.preload = "none";
    for (const ev of ["play", "pause", "ended", "timeupdate", "durationchange", "waiting", "playing"])
      this.el.addEventListener(ev, () => this.sync());
    this.el.addEventListener("error", () => {
      if (!this.active) return; // stop() clearing the source also raises it
      this.failed = true;
      this.sync();
    });

    card.addEventListener("click", (e) => {
      const t = e.target as Element;
      const view = t.closest(".player-toggle")?.closest<HTMLElement>(".player[data-audio]");
      if (view) void this.toggle(viewTrack(view, this.track));
      else if (t.closest(".peek-play") && this.track) void this.toggle(this.track);
    });
    card.addEventListener("input", (e) => {
      const seek = e.target as HTMLInputElement;
      if (!seek.matches?.(".player-seek") || !this.isActive(seek.closest<HTMLElement>(".player[data-audio]"))) return;
      this.el.currentTime = Number(seek.value);
      this.sync();
    });

    const ms = "mediaSession" in navigator ? navigator.mediaSession : undefined;
    const handle = (action: MediaSessionAction, fn: MediaSessionActionHandler) => {
      try {
        ms?.setActionHandler(action, fn);
      } catch {
        /* action not supported by this browser */
      }
    };
    handle("play", () => void this.el.play());
    handle("pause", () => this.el.pause());
    handle("stop", () => this.stop());
    handle("seekbackward", (d) => this.seekBy(-(d.seekOffset ?? 10)));
    handle("seekforward", (d) => this.seekBy(d.seekOffset ?? 10));
    handle("seekto", (d) => {
      if (d.seekTime != null) this.el.currentTime = d.seekTime;
    });
  }

  /** After a card was rendered, with its item's track: audio no view in it names stops; the views show their state. */
  show(track: Track | undefined) {
    this.track = track;
    if (this.active && !this.views().some((v) => v.dataset.audio === this.active!.url) && this.active.url !== track?.url) this.stop();
    this.sync();
    if (track && this.active?.url !== track.url) this.loadDuration(track.url);
  }

  stop() {
    this.active = undefined;
    this.failed = false;
    this.el.pause();
    this.el.removeAttribute("src");
    this.el.load();
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    }
    this.sync();
  }

  private views(): HTMLElement[] {
    return [...this.card.querySelectorAll<HTMLElement>(".player[data-audio]")];
  }
  private isActive(p: HTMLElement | null): boolean {
    return !!p && !!this.active && p.dataset.audio === this.active.url;
  }
  private seekBy(d: number) {
    this.el.currentTime = Math.max(0, Math.min(this.el.duration || Infinity, this.el.currentTime + d));
  }

  private async toggle(t: Track) {
    if (this.active?.url !== t.url) {
      this.stop();
      this.active = t;
      this.el.src = t.url;
      this.setSession(t);
    }
    if (this.el.paused) {
      this.failed = false;
      try {
        await this.el.play();
      } catch (e) {
        // A pause or a new source interrupting play() is not a failure.
        if ((e as DOMException).name !== "AbortError") this.failed = true;
      }
    } else this.el.pause();
    this.sync();
  }

  private setSession(t: Track) {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const art = t.art ? [{ src: new URL(t.art, location.href).href }] : [];
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.label, artist: this.trailTitle, album: this.trailTitle, artwork: art });
  }

  /** The duration of a track not yet started, so its views say how long it is. */
  private loadDuration(url: string) {
    this.probe?.removeAttribute("src");
    const probe = (this.probe = new window.Audio());
    probe.preload = "metadata";
    probe.addEventListener("loadedmetadata", () => {
      if (this.probe !== probe || !isFinite(probe.duration)) return;
      for (const v of this.views()) {
        const time = v.querySelector<HTMLElement>(".player-time");
        if (v.dataset.audio === url && time && !time.textContent) time.textContent = clock(probe.duration);
      }
    });
    probe.src = url;
  }

  /** Brings the card's controls in line with the audio element. */
  private sync() {
    const playing = !!this.active && !this.el.paused && !this.el.ended;
    const stateOf = (url?: string) =>
      !url || this.active?.url !== url ? "idle" : this.failed ? "error" : playing ? "playing" : "idle";

    const peek = this.card.querySelector<HTMLElement>(".peek-play");
    if (peek) {
      const st = stateOf(this.track?.url);
      peek.dataset.state = st;
      peek.setAttribute("aria-label", st === "playing" ? this.s.pause : this.s.listen);
      peek.title = st === "playing" ? this.s.pause : this.s.listen;
    }

    const dur = this.el.duration;
    for (const p of this.views()) {
      const state = stateOf(p.dataset.audio);
      p.dataset.state = state;
      const label = p.querySelector<HTMLElement>(".player-toggle-label");
      if (label) label.textContent = state === "playing" ? this.s.pause : this.s.listen;
      const error = p.querySelector<HTMLElement>(".player-error");
      if (error) error.hidden = state !== "error";
      if (!this.isActive(p) || !isFinite(dur) || dur <= 0) continue;
      const now = this.el.ended ? 0 : this.el.currentTime;
      const seek = p.querySelector<HTMLInputElement>(".player-seek");
      if (seek) {
        seek.disabled = false;
        seek.max = String(Math.floor(dur));
        seek.value = String(Math.floor(now));
        seek.setAttribute("aria-valuetext", `${clock(now)} ${this.s.of} ${clock(dur)}`);
      }
      const time = p.querySelector<HTMLElement>(".player-time");
      if (time) time.textContent = `${clock(now)} / ${clock(dur)}`;
    }

    if (this.active && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
      if (isFinite(dur) && dur > 0 && navigator.mediaSession.setPositionState) {
        try {
          navigator.mediaSession.setPositionState({ duration: dur, position: Math.min(this.el.ended ? 0 : this.el.currentTime, dur), playbackRate: this.el.playbackRate });
        } catch {
          /* position outside the duration while seeking */
        }
      }
    }
  }
}
