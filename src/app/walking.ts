// Walking help on the map (docs/design/surface.md, Walking help): the
// visitor's position with its accuracy and heading cone, follow mode,
// heading-up rotation, the locate and north buttons, and the visitor at the
// map's edge when they are out of view.
//
// Modes: "free" leaves the camera to the visitor; "follow" keeps them in the
// middle of the map that the sheet leaves visible, north up; "heading" does
// the same a little lower, with the map turned so that what is ahead of them
// is up. Panning the map returns to free; pinching keeps the mode.

import { Marker, type GeoJSONSource } from "maplibre-gl";
import "./walking.css";
import type { Padding, TrailMap } from "./map.ts";
import type { Here } from "./here.ts";
import type { LngLat } from "./trail-types.ts";
import { formatLive, type Strings } from "./strings.ts";
import { distance, inBox, toLocal, turn } from "./geo.ts";

export type Mode = "free" | "follow" | "heading";

export interface WalkingOptions {
  /** Where the buttons go (main.ts places it above the sheet). */
  tools: HTMLElement;
  /** The part of the map the sheet leaves visible, as padding. */
  visible: () => Padding;
  s: Strings;
  lang: string;
  /** The mode changed (to save it with where the visitor was). */
  onMode: (m: Mode) => void;
}

/** Zoom that entering follow mode brings a zoomed-out map to: a few streets around the visitor. */
const FOLLOW_ZOOM = 17;
/** The visitor's place in the visible map, as a share of its height from the top: heading-up shows more ahead. */
const ANCHOR = { follow: 0.5, heading: 0.64 };
/** Heading-up turns the map this share of the way to the heading per frame: steady, not nervous. */
const TURN_EASE = 0.18;

export class Walking {
  mode: Mode = "free";
  private tm: TrailMap;
  private here: Here;
  private o: WalkingOptions;
  private you: Marker;
  private youEl: HTMLElement;
  private locate: HTMLButtonElement;
  private north: HTMLButtonElement;
  private edge: HTMLButtonElement;
  private toastEl: HTMLElement;
  private toastTimer = 0;
  /** Phones turn the map with the visitor on the first tap; a desktop has no compass to turn it by. */
  private firstMode: Mode = matchMedia("(pointer: coarse)").matches ? "heading" : "follow";
  private reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // The camera in follow modes: where it shows the visitor, eased between fixes.
  private shown?: { at: LngLat; from: LngLat; t0: number };
  private frame = 0;
  private holdUntil = 0;
  private touching = false;
  /** The mode was asked for before the first fix: enter it when the fix comes. */
  private pending = false;

  constructor(tm: TrailMap, here: Here, o: WalkingOptions) {
    this.tm = tm;
    this.here = here;
    this.o = o;
    const { s } = o;
    const map = tm.map;

    this.youEl = document.createElement("div");
    this.youEl.className = "you";
    this.youEl.innerHTML = `<div class="you-cone"></div><div class="you-dot"></div>`;
    this.you = new Marker({ element: this.youEl, rotationAlignment: "map", pitchAlignment: "map" });

    this.toastEl = document.createElement("div");
    this.toastEl.className = "map-toast";
    this.toastEl.setAttribute("role", "status");
    this.toastEl.hidden = true;
    map.getContainer().append(this.toastEl);

    this.edge = document.createElement("button");
    this.edge.type = "button";
    this.edge.className = "you-edge";
    this.edge.hidden = true;
    this.edge.innerHTML = `<svg class="you-edge-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 16-7-4-7 4z" fill="currentColor"/></svg><span class="you-edge-dist"></span>`;
    this.edge.addEventListener("click", () => this.toVisitor());
    map.getContainer().append(this.edge);

    this.north = document.createElement("button");
    this.north.type = "button";
    this.north.className = "tool north";
    this.north.hidden = true;
    this.north.setAttribute("aria-label", s.northUp);
    this.north.title = s.northUp;
    this.north.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="north-n" d="M12 2.5l4 9.5h-8z"/><path class="north-s" d="M12 21.5l-4-9.5h8z"/></svg>`;
    this.north.addEventListener("click", () => this.northUp());

    this.locate = document.createElement("button");
    this.locate.type = "button";
    this.locate.className = "tool locate";
    this.locate.innerHTML =
      `<svg class="locate-free" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` +
      `<svg class="locate-heading" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7.5 18-7.5-4.2-7.5 4.2z" fill="currentColor"/></svg>`;
    this.locate.addEventListener("click", () => this.onLocate());
    o.tools.append(this.north, this.locate);

    map.on("style.load", () => this.addLayers());
    if (map.isStyleLoaded()) this.addLayers();

    // A pan by the visitor ends following; a pinch (two fingers) only zooms around it.
    map.on("dragstart", (e) => {
      const t = (e.originalEvent as TouchEvent | undefined)?.touches;
      if (e.originalEvent && !(t && t.length > 1)) this.setMode("free");
    });
    const c = map.getCanvasContainer();
    c.addEventListener("touchstart", () => (this.touching = true), { passive: true });
    const untouch = () => {
      this.touching = false;
      this.kick();
    };
    c.addEventListener("touchend", untouch, { passive: true });
    c.addEventListener("touchcancel", untouch, { passive: true });
    c.addEventListener("wheel", () => (this.holdUntil = performance.now() + 350), { passive: true });

    map.on("move", () => this.drawEdge());
    map.on("rotate", () => this.drawNorth());
    here.onChange((what) => this.onHere(what));
    this.drawButtons();
  }

  /** Whether follow mode handled a selection change; otherwise the map reveals it as usual. */
  reveal(target: LngLat, padding: Padding): boolean {
    if (this.mode === "free" || !this.here.fix) return false;
    // Keep the visitor where they are on screen; zoom out only as far as it takes for the target to show too.
    const map = this.tm.map;
    const r = rect(map.getContainer(), padding);
    const a = this.anchor(r);
    const p = map.project(target), q = map.project(this.shown?.at ?? this.here.fix.at);
    const vx = p.x - q.x, vy = p.y - q.y;
    // Over a raised sheet the view is a strip: the margin shrinks with it, or nothing would fit.
    const EDGE = Math.min(40, (r.b - r.t) / 4, (r.r - r.l) / 4);
    let k = 1;
    if (vx > 0) k = Math.min(k, (r.r - EDGE - a.x) / vx);
    if (vx < 0) k = Math.min(k, (r.l + EDGE - a.x) / vx);
    if (vy > 0) k = Math.min(k, (r.b - EDGE - a.y) / vy);
    if (vy < 0) k = Math.min(k, (r.t + EDGE - a.y) / vy);
    if (k >= 1 || k <= 0) return true;
    const zoom = Math.max(map.getMinZoom(), map.getZoom() + Math.log2(k));
    this.camera({ zoom, duration: this.reduceMotion.matches ? 0 : 450 });
    return true;
  }

  /** The sheet moved or the window changed: keep the visitor in the part of the map that shows. */
  nudge() {
    if (this.mode !== "free") this.kick();
    this.drawEdge();
  }

  setMode(m: Mode, opts: { quiet?: boolean } = {}) {
    if (m !== "free" && this.here.fix && !inBox(this.here.fix.at, this.tm.limits.bounds)) {
      // Far from the trail: the map can't go there; the edge shows where and how far.
      this.toast(this.o.s.farAway.replace("{d}", formatLive(this.tm.distanceToTrail(this.here.fix.at), this.o.lang)));
      m = "free";
    }
    const was = this.mode;
    this.mode = m;
    this.pending = m !== "free" && !this.here.fix;
    if (m !== "free" && this.here.fix && (was === "free" || m === "heading")) {
      // Entering: one smooth move to the visitor, closer if the map is far out.
      const zoom = Math.max(this.tm.map.getZoom(), FOLLOW_ZOOM);
      this.shown = { at: this.here.fix.at, from: this.here.fix.at, t0: 0 };
      this.camera({ zoom, duration: this.reduceMotion.matches ? 0 : 700 });
    }
    if (m === "follow" && was === "heading") this.camera({ bearing: 0, duration: this.reduceMotion.matches ? 0 : 400 });
    this.drawButtons();
    if (!opts.quiet && m !== was) this.o.onMode(m);
    this.kick();
  }

  private onLocate() {
    const h = this.here;
    if (!h.active || h.compassNeedsGesture) h.start(true);
    if (h.state === "insecure") return this.toast(this.o.s.locationInsecure);
    if (h.state === "denied") return this.toast(this.o.s.locationDenied);
    const next: Mode =
      this.mode === "free" ? this.firstMode : this.mode === "heading" ? "follow" : this.firstMode === "heading" ? "heading" : "free";
    this.setMode(next);
  }

  /** The edge arrow, tapped: to the visitor, if the map can go there. */
  private toVisitor() {
    this.setMode(this.mode === "free" ? this.firstMode : this.mode);
  }

  private northUp() {
    if (this.mode === "heading") this.setMode("follow");
    else this.tm.map.easeTo({ bearing: 0, duration: this.reduceMotion.matches ? 0 : 400 });
  }

  private onHere(what: "fix" | "heading" | "state") {
    const h = this.here;
    if (what === "state") {
      if (h.state === "denied") this.toast(this.o.s.locationDenied);
      if (h.state === "insecure") this.toast(this.o.s.locationInsecure);
      if (h.state === "unavailable") this.toast(this.o.s.locationUnavailable, "unavailable");
      if (h.state === "denied" || h.state === "insecure") this.setMode("free");
      this.drawButtons();
      return;
    }
    if (what === "fix") {
      const fix = h.fix!; // Here reports "fix" only with one, and never clears it
      if (this.toastEl.dataset.kind === "unavailable") this.toastEl.hidden = true; // it came after all
      if (!this.you.getElement().isConnected) this.you.setLngLat(fix.at).addTo(this.tm.map);
      this.you.setLngLat(fix.at);
      this.youEl.dataset.coarse = String(fix.accuracy > 40);
      this.drawAccuracy();
      if (this.mode !== "free" && !this.pending && !inBox(fix.at, this.tm.limits.bounds)) {
        this.setMode(this.mode); // out of the map's reach: back to free, with the distance said
      } else if (this.pending) {
        this.pending = false;
        const m = this.mode;
        this.mode = "free";
        this.setMode(m, { quiet: true });
      } else if (this.shown) {
        this.shown = { from: this.shownNow(), at: fix.at, t0: performance.now() };
      }
      this.drawEdge();
      this.kick();
    }
    const hd = h.heading;
    this.youEl.dataset.heading = hd ? hd.source : "";
    if (hd) {
      this.you.setRotation(hd.deg);
      this.youEl.style.setProperty("--spread", `${hd.spread}deg`);
    }
    if (this.mode === "heading") this.kick();
  }

  // --- the camera -------------------------------------------------------------

  private kick() {
    if (!this.frame && this.mode !== "free") this.frame = requestAnimationFrame((t) => this.step(t));
  }

  /** One frame of following: the visitor eased toward the latest fix, the map toward the heading. */
  private step(now: number) {
    this.frame = 0;
    if (this.mode === "free" || !this.here.fix) return;
    if (this.touching || now < this.holdUntil || this.tm.map.isMoving()) {
      this.kick();
      return;
    }
    let busy = false;
    const at = this.shownNow(now);
    if (this.shown && now - this.shown.t0 < EASE_MS) busy = true;
    let bearingTo: number | undefined;
    const b = this.tm.map.getBearing();
    if (this.mode === "heading" && this.here.heading) {
      const d = turn(b, this.here.heading.deg);
      if (Math.abs(d) > 1.5) {
        bearingTo = b + d * TURN_EASE;
        busy = true;
      }
    }
    const map = this.tm.map;
    const r = rect(map.getContainer(), this.o.visible());
    const a = this.anchor(r);
    const q = map.project(at);
    if (bearingTo !== undefined || Math.hypot(q.x - a.x, q.y - a.y) > 0.5) {
      const bearing = bearingTo ?? b;
      map.jumpTo({ center: this.tm.centreFor(at, a, map.getZoom(), bearing), bearing });
    }
    if (busy) this.kick();
  }

  /**
   * An animated move that ends with the visitor at the anchor: around them
   * where they are there already (they stay the fixed point), else to them.
   * Moves go by the map's true centre (TrailMap.centreFor), which the bounds judge.
   */
  private camera(o: { zoom?: number; bearing?: number; duration: number }) {
    const map = this.tm.map;
    const at = this.shownNow();
    if (!at) return;
    const a = this.anchor(rect(map.getContainer(), this.o.visible()));
    const q = map.project(at);
    if (Math.hypot(q.x - a.x, q.y - a.y) < 2) {
      map.easeTo({ around: at, zoom: o.zoom, bearing: o.bearing, duration: o.duration });
      return;
    }
    const zoom = o.zoom ?? map.getZoom(), bearing = o.bearing ?? map.getBearing();
    map.easeTo({ center: this.tm.centreFor(at, a, zoom, bearing), zoom, bearing, duration: o.duration });
  }

  private shownNow(now = performance.now()): LngLat {
    const fix = this.here.fix!.at;
    const s = this.shown;
    if (!s) return fix;
    const t = Math.min(1, (now - s.t0) / EASE_MS);
    // A jump too long to be walking (a fresh fix after a dead spot) is not eased.
    const [dx, dy] = toLocal(s.from, s.at);
    if (Math.hypot(dx, dy) > 150) return s.at;
    return [s.from[0] + (s.at[0] - s.from[0]) * t, s.from[1] + (s.at[1] - s.from[1]) * t];
  }

  private anchor(r: Rect): { x: number; y: number } {
    const share = this.mode === "heading" ? ANCHOR.heading : ANCHOR.follow;
    return { x: (r.l + r.r) / 2, y: r.t + (r.b - r.t) * share };
  }
  private centre(): LngLat {
    const map = this.tm.map;
    const r = rect(map.getContainer(), this.o.visible());
    const c = map.unproject([(r.l + r.r) / 2, (r.t + r.b) / 2]);
    return [c.lng, c.lat];
  }

  // --- drawing -----------------------------------------------------------------

  private addLayers() {
    const map = this.tm.map;
    if (map.getSource("you-accuracy")) return;
    map.addSource("you-accuracy", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const before = map.getLayer("route-casing") ? "route-casing" : undefined;
    const you = getComputedStyle(document.documentElement).getPropertyValue("--you").trim() || "#1f6fe0";
    map.addLayer({ id: "you-accuracy", type: "fill", source: "you-accuracy", paint: { "fill-color": you, "fill-opacity": 0.12 } }, before);
    map.addLayer({ id: "you-accuracy-line", type: "line", source: "you-accuracy", paint: { "line-color": you, "line-opacity": 0.35, "line-width": 1 } }, before);
    this.drawAccuracy();
  }

  private drawAccuracy() {
    const src = this.tm.map.getSource("you-accuracy") as GeoJSONSource | undefined;
    const fix = this.here.fix;
    if (!src) return;
    if (!fix) return src.setData({ type: "FeatureCollection", features: [] });
    const [lng, lat] = fix.at;
    const mLat = 111_132, mLng = mLat * Math.cos((lat * Math.PI) / 180);
    const ring: LngLat[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * 2 * Math.PI;
      ring.push([lng + (fix.accuracy * Math.sin(a)) / mLng, lat + (fix.accuracy * Math.cos(a)) / mLat]);
    }
    src.setData({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } });
  }

  /** The visitor out of view: an arrow at the edge of the visible map, pointing to them, with the distance. */
  private drawEdge() {
    const fix = this.here.fix;
    const map = this.tm.map;
    if (!fix) return void (this.edge.hidden = true);
    const r = rect(map.getContainer(), this.o.visible());
    const p = map.project(fix.at);
    const IN = 22;
    // Down to the strip above a raised sheet: the arrow is 36 px high, and a far-away visitor needs it most.
    if (r.r - r.l < 120 || r.b - r.t < 48 || (p.x >= r.l && p.x <= r.r && p.y >= r.t && p.y <= r.b)) {
      this.edge.hidden = true;
      return;
    }
    const cx = (r.l + r.r) / 2, cy = (r.t + r.b) / 2;
    const dx = p.x - cx, dy = p.y - cy;
    const hw = (r.r - r.l) / 2 - IN - 20, hh = Math.max(0, (r.b - r.t) / 2 - IN);
    const t = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
    const x = cx + dx * t, y = cy + dy * t;
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    this.edge.hidden = false;
    this.edge.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    this.edge.querySelector<SVGElement>(".you-edge-arrow")!.style.transform = `rotate(${angle}deg)`;
    // Beyond the map's reach, how far the visitor is from the trail (as the far-away line says);
    // within it (panned past), how far from what the map shows, since they may stand on the trail.
    const away = inBox(fix.at, this.tm.limits.bounds) ? distance(this.centre(), fix.at) : this.tm.distanceToTrail(fix.at);
    const d = formatLive(away, this.o.lang);
    this.edge.querySelector(".you-edge-dist")!.textContent = d;
    this.edge.setAttribute("aria-label", this.o.s.youAreThere.replace("{d}", d));
  }

  private drawNorth() {
    const b = this.tm.map.getBearing();
    this.north.hidden = Math.abs(turn(0, b)) < 1;
    this.north.querySelector("svg")!.style.transform = `rotate(${-b}deg)`;
  }

  private drawButtons() {
    const { s } = this.o;
    this.locate.dataset.mode = this.mode;
    this.locate.dataset.state = this.here.state;
    const label =
      this.mode === "heading" ? s.locateHeading : this.mode === "follow" ? s.locateFollow : s.locateShow;
    this.locate.setAttribute("aria-label", label);
    this.locate.title = label;
    this.locate.setAttribute("aria-pressed", String(this.mode !== "free"));
    this.drawNorth();
  }

  private toast(msg: string, kind = "") {
    this.toastEl.dataset.kind = kind;
    this.toastEl.textContent = msg;
    this.toastEl.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toastEl.hidden = true), 6000);
  }
}

/** Milliseconds over which the shown position moves to a new fix (fixes come about every second). */
const EASE_MS = 900;

interface Rect {
  l: number;
  t: number;
  r: number;
  b: number;
}
function rect(c: HTMLElement, p: Padding): Rect {
  return { l: p.left, t: p.top, r: c.clientWidth - p.right, b: c.clientHeight - p.bottom };
}

