// Listening to a station (docs/design/trail-content.md, Audio).
//
// The card is re-rendered at every selection, so the player cannot live in
// it: one audio element belongs to the page, and the card carries only the
// controls (`renderPlayer`), which `Player.show` binds after each render.
// Audio belongs to the card in view: selecting another card stops it. While
// it plays, the lock screen and headphones get the Media Session controls,
// so the phone can stay in the pocket.

import "./player.css";
import type { Audio, Item, Trail } from "./trail-types.ts";
import type { Strings } from "./strings.ts";
import { attr } from "./html.ts";

/**
 * The audio to offer for an item in a language: that language's file; or,
 * where the item has no text in that language and the card falls back to the
 * source language's text, the source language's file. Never speech that does
 * not match the text on the screen.
 */
export function pickAudio(trail: Trail, item: Item, lang: string): Audio | undefined {
  return item.audio[lang] ?? (item.body[lang] ? undefined : item.audio[trail.languages[0]]);
}

const playIcon = `<svg class="player-icon player-icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>`;
const pauseIcon = `<svg class="player-icon player-icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor"/></svg>`;

/** The controls for one item's audio; `label` is what the lock screen shows, `art` an image URL. */
export function renderPlayer(audio: Audio, label: string, art: string | undefined, s: Strings): string {
  return `<div class="player" data-state="idle" data-audio="${attr(audio.url)}" data-label="${attr(label)}"${art ? ` data-art="${attr(art)}"` : ""}>
    <button type="button" class="player-toggle">${playIcon}${pauseIcon}<span class="player-toggle-label">${s.listen}</span></button>
    <span class="player-time" aria-hidden="true"></span>
    <input class="player-seek" type="range" min="0" max="0" step="1" value="0" disabled aria-label="${attr(s.position)}" />
    ${audio.synthetic ? `<p class="player-note">${s.syntheticVoice}</p>` : ""}
    <p class="player-error" role="alert" hidden>${s.audioError}</p>
  </div>`;
}

/** The same audio's play button for the peek row, beside the title (card.ts); it drives the card's player. */
export function peekPlay(s: Strings): string {
  return `<button type="button" class="peek-play" data-state="idle" aria-label="${attr(s.listen)}" title="${attr(s.listen)}">${playIcon}${pauseIcon}</button>`;
}

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export class Player {
  private el = new window.Audio();
  private active?: { url: string };
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
      const p = t.closest(".player-toggle")?.closest<HTMLElement>(".player") ?? (t.closest(".peek-play") ? this.player() : null);
      if (p) void this.toggle(p);
    });
    card.addEventListener("input", (e) => {
      const seek = e.target as HTMLInputElement;
      if (!seek.matches?.(".player-seek") || !this.isActive(seek.closest(".player"))) return;
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

  /** After a card was rendered: audio of another card stops; this card's player shows its state. */
  show() {
    const p = this.player();
    if (this.active && !this.isActive(p)) this.stop();
    this.sync();
    if (p && !this.isActive(p)) this.loadDuration(p);
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

  private player(): HTMLElement | null {
    return this.card.querySelector<HTMLElement>(".player");
  }
  private isActive(p: Element | null): boolean {
    return !!p && !!this.active && (p as HTMLElement).dataset.audio === this.active.url;
  }
  private seekBy(d: number) {
    this.el.currentTime = Math.max(0, Math.min(this.el.duration || Infinity, this.el.currentTime + d));
  }

  private async toggle(p: HTMLElement) {
    if (!this.isActive(p)) {
      this.stop();
      this.active = { url: p.dataset.audio! };
      this.el.src = p.dataset.audio!;
      this.setSession(p);
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

  private setSession(p: HTMLElement) {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const art = p.dataset.art ? [{ src: new URL(p.dataset.art, location.href).href }] : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: p.dataset.label ?? "",
      artist: this.trailTitle,
      album: this.trailTitle,
      artwork: art,
    });
  }

  /** The duration of a track not yet started, so the card says how long it is. */
  private loadDuration(p: HTMLElement) {
    this.probe?.removeAttribute("src");
    const probe = (this.probe = new window.Audio());
    probe.preload = "metadata";
    probe.addEventListener("loadedmetadata", () => {
      if (this.probe !== probe || !p.isConnected || !isFinite(probe.duration)) return;
      const time = p.querySelector<HTMLElement>(".player-time")!;
      if (!time.textContent) time.textContent = clock(probe.duration);
    });
    probe.src = p.dataset.audio!;
  }

  /** Brings the card's controls in line with the audio element. */
  private sync() {
    const p = this.player();
    if (!p) return;
    const mine = this.isActive(p);
    const playing = mine && !this.el.paused && !this.el.ended;
    const state = this.failed && mine ? "error" : playing ? "playing" : "idle";
    p.dataset.state = state;
    p.querySelector<HTMLElement>(".player-toggle-label")!.textContent = playing ? this.s.pause : this.s.listen;
    const peek = this.card.querySelector<HTMLElement>(".peek-play");
    if (peek) {
      peek.dataset.state = state;
      peek.setAttribute("aria-label", playing ? this.s.pause : this.s.listen);
      peek.title = playing ? this.s.pause : this.s.listen;
    }
    p.querySelector<HTMLElement>(".player-error")!.hidden = state !== "error";
    const seek = p.querySelector<HTMLInputElement>(".player-seek")!;
    const time = p.querySelector<HTMLElement>(".player-time")!;
    const dur = this.el.duration;
    if (mine && isFinite(dur) && dur > 0) {
      const now = this.el.ended ? 0 : this.el.currentTime;
      seek.disabled = false;
      seek.max = String(Math.floor(dur));
      seek.value = String(Math.floor(now));
      seek.setAttribute("aria-valuetext", `${clock(now)} ${this.s.of} ${clock(dur)}`);
      time.textContent = `${clock(now)} / ${clock(dur)}`;
      if ("mediaSession" in navigator && navigator.mediaSession.setPositionState) {
        try {
          navigator.mediaSession.setPositionState({ duration: dur, position: Math.min(now, dur), playbackRate: this.el.playbackRate });
        } catch {
          /* position outside the duration while seeking */
        }
      }
    }
    if (mine && "mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }
}
