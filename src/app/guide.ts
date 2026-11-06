// The peek row's walking help (docs/design/surface.md, Walking help): which
// way and how far, from where the visitor is, to the station they walk to.
//
// The station walked to is the selected one until the visitor is at it; then
// the next. So after "Next: 8" at the end of card 7, card 8 shows the way to
// 8 beside its title; standing at 8, its "Next 9" button shows the way on.
// Standing at another station, the row offers that station's card, never
// switching to it by itself: the visitor may be reading.
//
// Direction: along the leg into the target where the visitor is on it (a
// point a little ahead on the route, so the arrow follows bends and stairs),
// else straight. The arrow points the way in the world when the phone knows
// which way it faces (compass, or the course while walking), else as on the
// map. Distance: what is left of the leg, else the straight line.

import type { Here } from "./here.ts";
import type { TrailMap } from "./map.ts";
import type { LngLat, Localized, Trail } from "./trail-types.ts";
import { formatLive, type Strings } from "./strings.ts";
import { textFor } from "./language.ts";
import { bearing, distance, onLine } from "./geo.ts";

/** Within this many metres of a station the visitor is at it ... */
const ARRIVE = 25;
/** ... until they are this far from it again. */
const LEAVE = 40;
/** A fix vaguer than this says nothing about being at a station. */
const VAGUE = 50;
/** On a leg: within this many metres of it. */
const ON_LEG = 40;
/** The arrow aims this far ahead along the leg. */
const AHEAD = 30;

interface Way {
  /** Degrees clockwise from north, from the visitor. */
  deg: number;
  metres: number;
  /** The leg the way follows (its first station), where the visitor is on it. */
  leg?: number;
}

export class Guide {
  private trail: Trail;
  private here: Here;
  private tm: TrailMap;
  private head: HTMLElement;
  private s: Strings;
  private lang: string;
  private tx: (l?: Localized) => string;
  private n = 0;
  /** The station the visitor is at, with hysteresis. */
  private at?: number;
  private ways: { el: HTMLElement; way: Way }[] = [];
  private frame = 0;

  constructor(trail: Trail, here: Here, tm: TrailMap, head: HTMLElement, s: Strings, lang: string) {
    this.trail = trail;
    this.here = here;
    this.tm = tm;
    this.head = head;
    this.s = s;
    this.lang = lang;
    this.tx = textFor(trail, lang);
    here.onChange((what) => (what === "heading" ? this.turnArrows() : this.update()));
    tm.map.on("rotate", () => this.turnArrows());
  }

  /** The card head was rendered for item n. */
  show(n: number) {
    this.n = n;
    this.update();
  }

  private update() {
    const fix = this.here.fix;
    this.at = fix ? this.arrival(fix.at, fix.accuracy) : undefined;
    const head = this.head;
    const slot = head.querySelector<HTMLElement>(".guide");
    const chip = head.querySelector<HTMLButtonElement>(".here-chip");
    const next = head.querySelector<HTMLElement>(".go-next[data-live]");
    const n = this.n;
    this.ways = [];
    let state = "";
    let walked: number | undefined;
    if (fix) {
      if (this.at !== undefined && this.at !== n) {
        state = "elsewhere";
        if (chip) {
          chip.dataset.go = String(this.at);
          chip.querySelector(".here-chip-n")!.textContent = String(this.at);
          chip.setAttribute("aria-label", `${this.s.hereAt} ${this.s.station} ${this.at}: ${this.tx(this.trail.items[this.at].title)}`);
        }
      } else if (n > 0 && this.at !== n) {
        state = "approach";
        const way = this.way(fix.at, n);
        walked = way?.leg;
        if (slot) this.fill(slot, way, `${this.s.station} ${n}`);
      } else {
        state = n > 0 ? "here" : "";
      }
      // The way on: from the station the visitor is at (or to the first, from the overview).
      if (next && (state === "here" || n === 0)) {
        const to = Number(next.dataset.go);
        if (to >= 1) this.fill(next, this.way(fix.at, to), `${this.s.station} ${to}`);
      }
    }
    head.dataset.guide = state;
    this.tm.emphasiseLeg(walked);
    head.querySelectorAll<HTMLElement>(".go-next[data-live]").forEach((el) => (el.dataset.live = state === "here" || (fix && n === 0) ? "on" : ""));
    if (slot) slot.hidden = state !== "approach";
    if (chip) chip.hidden = state !== "elsewhere";
    this.turnArrows();
  }

  /** Writes a way's distance into el's .way-dist and remembers its arrow to turn. */
  private fill(el: HTMLElement, way: Way | undefined, to: string) {
    if (!way) return;
    const d = formatLive(way.metres, this.lang);
    const dist = el.querySelector(".way-dist");
    if (dist) dist.textContent = d;
    if (el.classList.contains("guide")) el.setAttribute("aria-label", `${d} ${this.s.wayTo} ${to}`);
    this.ways.push({ el, way });
  }

  private turnArrows() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const ref = this.here.heading?.deg ?? this.tm.map.getBearing();
      for (const { el, way } of this.ways) {
        const a = el.querySelector<SVGElement>(".way-arrow");
        if (a) a.style.transform = `rotate(${way.deg - ref}deg)`;
      }
    });
  }

  /** The way to station `to`, along the leg into it where the visitor is on it. */
  private way(p: LngLat, to: number): Way | undefined {
    const target = this.trail.items[to]?.position;
    if (!target) return undefined;
    const leg = this.trail.legs.find((l) => l.to === to);
    if (leg && !leg.straight) {
      const o = onLine(p, leg.coordinates, AHEAD);
      if (o && o.off <= ON_LEG) {
        const left = o.length - o.along;
        const aim = left < AHEAD ? target : o.ahead;
        return { deg: bearing(p, aim), metres: left + o.off, leg: leg.from };
      }
    }
    return { deg: bearing(p, target), metres: distance(p, target) };
  }

  /** The station the visitor is at: the nearest within reach, the one already arrived at kept until left. */
  private arrival(p: LngLat, accuracy: number): number | undefined {
    if (accuracy > VAGUE) return undefined;
    const d = (i: number) => distance(p, this.trail.items[i].position!);
    // Stations can stand closer together than the arrival radius:
    // the selected one wins among those in reach, so standing at it never suggests its neighbour.
    if (this.n > 0 && d(this.n) <= ARRIVE) return this.n;
    if (this.at !== undefined && d(this.at) <= LEAVE) return this.at;
    let best: number | undefined, bestD = ARRIVE;
    for (let i = 1; i < this.trail.items.length; i++) {
      const di = d(i);
      if (di <= bestD) (best = i), (bestD = di);
    }
    return best;
  }
}
