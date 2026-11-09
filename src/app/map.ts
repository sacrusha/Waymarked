// The map: basemap, route, numbered station markers, and the selection's
// highlight (selected, previous, next, and the leg to the next).

import { AttributionControl, LngLat as MLLngLat, Map as MLMap, Marker, MercatorCoordinate, setWorkerUrl, type IControl, type StyleSpecification } from "maplibre-gl";
// Bundled by Vite (?worker&url), so the build target lowers its syntax too (vite.config.ts).
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Basemap, Localized, Trail } from "./trail-types.ts";
import type { Strings } from "./strings.ts";
import { store } from "./store.ts";
import { textFor } from "./language.ts";
import { distance, onLine, routeLines, toLocal } from "./geo.ts";

setWorkerUrl(workerUrl);

/** Map styles from the trail, or an OSM-based default for a trail that names none. */
const DEFAULT_BASEMAPS: Basemap[] = [{ label: { en: "Map", de: "Karte" }, style: "https://tiles.openfreemap.org/styles/liberty" }];

export interface Padding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface View {
  center: [number, number];
  zoom: number;
}

const forcedColors = matchMedia("(forced-colors: active)");
/**
 * Paints a marker's tokens (style.css, .marker) into a canvas inside it. The
 * map under the markers is a canvas and stays light whatever a browser does
 * to the page; a browser that darkens pages by its own rules (Samsung
 * Internet) repaints CSS backgrounds and text but leaves canvases alone, so
 * markers painted the same way stay as light as the map
 * (docs/design/robustness.md). Without a 2D context, or where the visitor's
 * own forced colours apply, the CSS paint stays.
 */
function paintMarker(el: HTMLButtonElement) {
  if (!el.isConnected || forcedColors.matches) return;
  const canvas = el.querySelector("canvas") ?? document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const css = getComputedStyle(el);
  const px = (name: string) => parseFloat(css.getPropertyValue(name)) || 0;
  const size = px("--size");
  const edgeW = px("--m-edge-w");
  const haloW = px("--m-halo-w");
  if (!size) return;
  const box = size + 2 * haloW;
  const dpr = devicePixelRatio || 1;
  canvas.width = canvas.height = Math.round(box * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const c = box / 2;
  const disc = (r: number, colour: string) => {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, 2 * Math.PI);
    ctx.fillStyle = colour;
    ctx.fill();
  };
  if (haloW) disc(size / 2 + haloW, css.getPropertyValue("--m-halo").trim());
  disc(size / 2, css.getPropertyValue("--m-edge").trim());
  disc(size / 2 - edgeW, css.getPropertyValue("--m-fill").trim());
  const n = el.dataset.n ?? "";
  ctx.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
  ctx.fillStyle = css.getPropertyValue("--m-text").trim();
  ctx.textAlign = "center";
  const m = ctx.measureText(n);
  ctx.fillText(n, c, c + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  if (!canvas.isConnected) {
    canvas.setAttribute("aria-hidden", "true");
    el.replaceChildren(canvas);
    el.classList.add("drawn");
  }
}

export class TrailMap {
  readonly map: MLMap;
  private markers: HTMLButtonElement[] = [];
  private selected = 0;
  /** The leg the visitor is walking, where walking help knows it (guide.ts): emphasised instead of the selection's. */
  private walked?: number;
  private basemaps: Basemap[];
  private basemapIndex: number;
  private reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  /** What covers the map (the sheet, portrait), as insets; undefined until the layout says. */
  private covered?: Padding;

  private trail: Trail;
  private tx: (l?: Localized) => string;
  private s: Strings;

  constructor(container: HTMLElement, trail: Trail, lang: string, s: Strings, onSelect: (n: number) => void, initial: View | undefined) {
    this.trail = trail;
    this.tx = textFor(trail, lang);
    this.s = s;
    this.basemaps = trail.basemaps.length ? trail.basemaps : DEFAULT_BASEMAPS;
    // Remembered by label, so reordering the trail's basemaps doesn't remap a visitor's choice.
    const stored = store.get(`${trail.id}:basemap-label`);
    this.basemapIndex = Math.max(0, this.basemaps.findIndex((b) => b.label[trail.languages[0]] === stored));

    this.map = new MLMap({
      container,
      style: this.styleFor(this.basemaps[this.basemapIndex]),
      bounds: initial ? undefined : trail.extent,
      fitBoundsOptions: { padding: 40 },
      center: initial?.center,
      zoom: initial?.zoom,
      attributionControl: false,
      // The map turns only with the visitor (heading-up, walking.ts): a turn
      // by an unintended twist of two fingers only disorients. No tilt.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxZoom: 19,
      // A trail is local: panning and zooming can't lose it (docs/design/surface.md, Bounds),
      // within the part of the map the sheet leaves visible (bounded()).
      transformConstrain: (lngLat, zoom) => this.bounded(lngLat, zoom),
      minZoom: trail.limits.minZoom,
    });
    this.map.touchZoomRotate.disableRotation();
    this.map.keyboard.disableRotation();
    this.map.addControl(new AttributionControl({ compact: false }), "top-right");
    if (this.basemaps.length > 1) this.map.addControl(new BasemapSwitch(this), "top-left");
    container.setAttribute("aria-label", s.map);

    for (const item of trail.items.slice(1)) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "marker";
      el.textContent = el.dataset.n = String(item.n);
      el.setAttribute("aria-label", `${s.station} ${item.n}: ${this.tx(item.title)}`);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(item.n);
      });
      new Marker({ element: el, anchor: "center" }).setLngLat(item.position!).addTo(this.map);
      this.markers[item.n] = el;
    }
    const repaint = () => this.markers.forEach(paintMarker);
    repaint();
    document.fonts?.ready.then(repaint);
    document.fonts?.addEventListener("loadingdone", repaint);
    // A new pixel ratio (a window moved between screens, a page zoom) needs sharper or coarser canvases.
    addEventListener("resize", repaint);

    this.map.on("style.load", () => this.addTrailLayers());
    this.watchStyle(container);
    this.map.on("moveend", () => this.keepInside());
  }

  basemapLabel(i = this.basemapIndex): string {
    const l = this.basemaps[i].label;
    return this.tx(l) || Object.values(l)[0] || ""; // the engine's default basemap has its label in en and de only
  }

  get basemapCount(): number {
    return this.basemaps.length;
  }

  get basemapCurrent(): number {
    return this.basemapIndex;
  }

  setBasemap(i: number) {
    if (i === this.basemapIndex || i < 0 || i >= this.basemaps.length) return;
    this.basemapIndex = i;
    this.styleReady = false;
    store.set(`${this.trail.id}:basemap-label`, this.basemaps[i].label[this.trail.languages[0]] ?? "");
    // diff: false reloads the whole style, so style.load fires and the trail's layers are added again.
    this.map.setStyle(this.styleFor(this.basemaps[i]), { diff: false });
  }

  get strings() {
    return this.s;
  }

  /** How far the map may go (docs/design/surface.md, Bounds). */
  get limits() {
    return this.trail.limits;
  }

  /**
   * What covers the map now (portrait: the sheet below its top edge). The
   * bounds hold for the part left visible (bounded()), so the trail's edges
   * reach into the strip above a raised sheet; moving the sheet moves that
   * part, and the map follows where it would leave the bounds.
   */
  setCovered(p: Padding, settleMs = 0) {
    // A move that ends with the sheet elsewhere (walking on lowers it to peek) is
    // judged by where the sheet will be: while it travels, its passing positions
    // would clamp the pan to the old, larger cover. The latest position is applied after.
    const now = performance.now();
    if (settleMs) {
      this.settleUntil = now + settleMs;
      this.pending = undefined;
    } else if (now < this.settleUntil) {
      this.pending = p;
      clearTimeout(this.settleTimer);
      this.settleTimer = window.setTimeout(() => this.pending && this.setCovered(this.pending), this.settleUntil - now + 20);
      return;
    }
    const was = this.covered;
    if (was && was.top === p.top && was.bottom === p.bottom && was.left === p.left && was.right === p.right) return;
    this.covered = p;
    this.keepInside();
  }
  private settleUntil = 0;
  private pending?: Padding;
  private settleTimer?: number;

  /** Back inside the bounds, where a change of what is covered left the view outside them. */
  private keepInside() {
    const m = this.map;
    if (!m || m.isMoving()) return; // a move constrains every step itself, and its end comes back here
    const c = m.getCenter(), z = m.getZoom();
    const b = this.bounded(c, z);
    if (Math.abs(b.zoom - z) < 1e-6 && Math.abs(b.center.lng - c.lng) < 1e-9 && Math.abs(b.center.lat - c.lat) < 1e-9) return;
    m.jumpTo({ center: b.center, zoom: b.zoom });
  }

  /**
   * The map's constraint (MapLibre's transformConstrain): the middle of the
   * part of the map the sheet leaves visible stays inside the trail's bounds.
   * Their margins are generous and the minimum zoom shows them whole, so the
   * trail can't be lost; and anything inside them, the visitor near their
   * edge included, can be brought to the middle of the view, turned or not,
   * which is where following keeps the visitor. (Holding the whole view
   * inside kept a turned map, whose corners reach out first, away from
   * everything near the edge.)
   */
  private bounded(lngLat: MLLngLat, zoom: number): { center: MLLngLat; zoom: number } {
    const m = this.map as MLMap | undefined; // undefined while MapLibre constructs
    const z = Math.min(m?.getMaxZoom() ?? 19, Math.max(m?.getMinZoom() ?? this.trail.limits.minZoom, zoom ?? m?.getZoom() ?? 0));
    const p = this.covered;
    if (!m || !p) return { center: lngLat, zoom: z }; // the first view is set before the layout is known
    const size = worldSize(z);
    const [ox, oy] = toWorld((p.left - p.right) / 2, (p.top - p.bottom) / 2, m.getBearing());
    const [[west, south], [east, north]] = this.trail.limits.bounds;
    const nw = MercatorCoordinate.fromLngLat([west, north]), se = MercatorCoordinate.fromLngLat([east, south]);
    const hold = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const at = MercatorCoordinate.fromLngLat(lngLat);
    const vx = hold(at.x * size + ox, nw.x * size, se.x * size);
    const vy = hold(at.y * size + oy, nw.y * size, se.y * size);
    return { center: new MercatorCoordinate((vx - ox) / size, (vy - oy) / size).toLngLat(), zoom: z };
  }

  /**
   * The map centre that shows `at` at the screen point `pt` (container
   * pixels), at this zoom and bearing: a camera move by its true centre, so
   * the constraint judges where the map will be. (MapLibre's easeTo with an
   * offset constrains the point it places, as if it were the centre.)
   */
  centreFor(at: [number, number], pt: { x: number; y: number }, zoom: number, bearing: number): [number, number] {
    const el = this.map.getContainer();
    const size = worldSize(zoom);
    const [ox, oy] = toWorld(pt.x - el.clientWidth / 2, pt.y - el.clientHeight / 2, bearing);
    const a = MercatorCoordinate.fromLngLat(at);
    const c = new MercatorCoordinate(a.x - ox / size, a.y - oy / size).toLngLat();
    return [c.lng, c.lat];
  }

  /**
   * Metres from p to the trail: the nearest point of its route, or of a
   * station where that is nearer. Far off (a visitor at home), the route's
   * flat local geometry no longer holds, and the nearest of its points by
   * great circle is the answer at that scale.
   */
  distanceToTrail(p: [number, number]): number {
    const c = this.nearCache;
    if (c && c.p[0] === p[0] && c.p[1] === p[1]) return c.d; // asked on every frame of a move, for the same fix
    const lines = routeLines(this.trail.route);
    let d = Infinity;
    for (const it of this.trail.items.slice(1)) d = Math.min(d, distance(p, it.position!));
    for (const line of lines) for (const q of line) d = Math.min(d, distance(p, q));
    if (d <= 50_000) for (const line of lines) d = Math.min(d, onLine(p, line, 0)?.off ?? Infinity);
    this.nearCache = { p, d };
    return d;
  }
  private nearCache?: { p: [number, number]; d: number };

  view(): View {
    const c = this.map.getCenter();
    return { center: [c.lng, c.lat], zoom: this.map.getZoom() };
  }

  /** Highlights item n (0 = the trail): selected, previous, next, and the leg to the next. */
  select(n: number) {
    this.selected = n;
    this.markers.forEach((el, i) => {
      const state = i === n ? "selected" : i === n + 1 ? "next" : i === n - 1 && n > 1 ? "prev" : "";
      el.dataset.state = state;
      el.setAttribute("aria-current", i === n ? "true" : "false");
      // The marker's wrapper is positioned by MapLibre; raise the selection above its neighbours.
      el.style.zIndex = i === n ? "3" : state ? "2" : "1";
      paintMarker(el);
    });
    this.updateLeg();
  }

  /**
   * The first view of an arrival (no earlier view to keep): the whole trail
   * for item 0, else the station with the way on to the next.
   */
  frame(n: number, padding: Padding) {
    const leg = this.trail.legs.find((l) => l.from === n);
    const bounds = n === 0 ? this.trail.extent : boundsOf([this.trail.items[n].position!, ...(leg ? leg.coordinates : [])]);
    this.map.fitBounds(bounds, { padding: this.fitPadding(padding), maxZoom: n === 0 ? 17 : 18, linear: true, duration: 0 });
  }

  /**
   * After a selection change: move only as much as it takes to show the
   * selection (docs/design/surface.md, Camera). Already in view: nothing.
   * Outside: a straight pan that brings it just inside. Too far for a pan to
   * stay followable: zoom out until where the view was and the selection
   * both show. Never a flight, never a zoom-in.
   */
  reveal(n: number, padding: Padding) {
    const duration = this.reduceMotion.matches ? 0 : 450;
    const c = this.map.getContainer();
    const r = { l: padding.left, t: padding.top, r: c.clientWidth - padding.right, b: c.clientHeight - padding.bottom };
    const EDGE = 24; // a marker half off the edge is not in view
    if (r.r - r.l < 3 * EDGE || r.b - r.t < 2 * EDGE + 8) return; // no map left to show it in
    const zoom = this.map.getZoom();
    const inView = (p: [number, number]) => {
      const q = this.map.project(p);
      return q.x >= r.l + EDGE && q.x <= r.r - EDGE && q.y >= r.t + EDGE && q.y <= r.b - EDGE;
    };

    if (n === 0) {
      if (this.trail.items.slice(1).every((it) => inView(it.position!))) return;
      this.map.fitBounds(this.trail.extent, { padding: this.fitPadding(padding), maxZoom: zoom, bearing: this.map.getBearing(), linear: true, duration });
      return;
    }
    const pos = this.trail.items[n].position!;
    if (inView(pos)) return;
    const q = this.map.project(pos);
    const mx = Math.min(80, (r.r - r.l) * 0.2), my = Math.min(80, (r.b - r.t) * 0.2);
    const dx = q.x < r.l + mx ? q.x - (r.l + mx) : q.x > r.r - mx ? q.x - (r.r - mx) : 0;
    const dy = q.y < r.t + my ? q.y - (r.t + my) : q.y > r.b - my ? q.y - (r.b - my) : 0;
    if (Math.abs(dx) <= r.r - r.l && Math.abs(dy) <= r.b - r.t) {
      this.map.panBy([dx, dy], { duration });
      return;
    }
    const here = this.map.unproject([(r.l + r.r) / 2, (r.t + r.b) / 2]);
    this.map.fitBounds(boundsOf([[here.lng, here.lat], pos]), { padding: this.fitPadding(padding), maxZoom: zoom, bearing: this.map.getBearing(), linear: true, duration: duration * 1.5 });
  }

  /**
   * Padding around a framed area: the view, and a margin inside it that
   * narrows with the view, so a strip above a raised sheet still frames
   * within itself. Where the view leaves almost nothing, a small window.
   */
  private fitPadding(p: Padding): Padding {
    const c = this.map.getContainer();
    const MIN = 40;
    const axis = (size: number, a: number, b: number): [number, number] => {
      const view = size - a - b;
      if (view < MIN) {
        const k = Math.max(0, size - MIN) / Math.max(1, a + b);
        return [a * k, b * k];
      }
      const margin = Math.min(36, view / 5);
      return [a + margin, b + margin];
    };
    const [top, bottom] = axis(c.clientHeight, p.top, p.bottom);
    const [left, right] = axis(c.clientWidth, p.left, p.right);
    return { top, bottom, left, right };
  }

  /**
   * A basemap given as a style URL (vector) is one fetch: lost, the map stays
   * blank for the rest of the visit, though the page itself loaded. Until the
   * style arrives, an error that names no source is the style's; the map says
   * so and tries again, sooner when the browser reports a connection.
   * Tiles that fail are MapLibre's to retry, and dead spots are offline's
   * (docs/backlog.md, version 7).
   */
  private watchStyle(container: HTMLElement) {
    let tries = 0;
    let timer = 0;
    const note = document.createElement("p");
    note.className = "map-notice";
    note.setAttribute("role", "status");
    note.hidden = true;
    note.textContent = this.s.mapRetry;
    container.append(note);
    this.retryStyle = () => {
      clearTimeout(timer);
      timer = 0;
      this.styleReady = false;
      this.map.setStyle(this.styleFor(this.basemaps[this.basemapIndex]), { diff: false });
    };
    this.map.on("style.load", () => {
      this.styleReady = true;
      tries = 0;
      clearTimeout(timer);
      timer = 0;
      note.hidden = true;
    });
    this.map.on("error", (e) => {
      if (this.styleReady || "sourceId" in e || timer) return;
      note.hidden = false;
      timer = window.setTimeout(() => this.retryStyle(), Math.min(60, 5 * 2 ** tries++) * 1000);
    });
    addEventListener("online", () => timer && this.retryStyle());
  }
  private styleReady = false;
  private retryStyle = () => {};

  private styleFor(b: Basemap): string | StyleSpecification {
    if (b.style) return b.style;
    return {
      version: 8,
      sources: {
        basemap: { type: "raster", tiles: b.tiles!, tileSize: b.tileSize ?? 256, maxzoom: b.maxzoom ?? 19, attribution: b.attribution },
      },
      layers: [{ id: "basemap", type: "raster", source: "basemap" }],
    };
  }

  private addTrailLayers() {
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--accent").trim() || "#2a7fb8";
    const accentDark = css.getPropertyValue("--accent-dark").trim() || "#134a70";
    const m = this.map;
    m.addSource("route", { type: "geojson", data: drawnRoute(this.trail.route) });
    m.addSource("leg", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const round = { "line-cap": "round", "line-join": "round" } as const;
    m.addLayer({ id: "route-casing", type: "line", source: "route", layout: round, paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 13, 4, 18, 9], "line-opacity": 0.85 } });
    m.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: round,
      paint: { "line-color": accent, "line-width": ["interpolate", ["linear"], ["zoom"], 13, 2.5, 18, 5], "line-dasharray": [1.2, 1.4] },
    });
    m.addLayer({ id: "leg-casing", type: "line", source: "leg", layout: round, paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 13, 6, 18, 13] } });
    m.addLayer({ id: "leg", type: "line", source: "leg", layout: round, paint: { "line-color": accentDark, "line-width": ["interpolate", ["linear"], ["zoom"], 13, 3.5, 18, 7] } });
    this.updateLeg();
  }

  /**
   * The visitor walks the leg starting at station `from` (walking to the
   * selected station along the leg into it): that leg is the one emphasised.
   * undefined: the leg on from the selection, as without walking help.
   */
  emphasiseLeg(from: number | undefined) {
    if (from === this.walked) return;
    this.walked = from;
    this.updateLeg();
  }

  private updateLeg() {
    const src = this.map.getSource("leg") as import("maplibre-gl").GeoJSONSource | undefined;
    if (!src) return;
    const from = this.walked ?? this.selected;
    const leg = this.trail.legs.find((l) => l.from === from);
    src.setData({
      type: "FeatureCollection",
      features: leg ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: leg.coordinates } }] : [],
    });
  }
}

/**
 * The route as drawn: each stretch once. A route that walks a stretch twice
 * (there and back) has it twice in its data, and two
 * dashed lines on one stretch fill each other's gaps until it looks solid.
 * A segment lying within a metre of one already drawn, at both ends, is
 * dropped; what is left is joined back into runs, so the dashes flow on.
 * The data stays as it is: the legs are built from it (build/legs.ts).
 */
function drawnRoute(route: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const lines = routeLines(route);
  const origin = lines.find((l) => l.length)?.[0];
  if (!origin) return route;
  const TOL = 1; // metres
  const kept: [number, number, number, number][] = []; // segments in local metres
  const near = (x: number, y: number) =>
    kept.some(([ax, ay, bx, by]) => {
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
      return Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= TOL;
    });
  const runs: [number, number][][] = [];
  for (const line of lines) {
    let run: [number, number][] = [];
    for (let i = 1; i < line.length; i++) {
      const [ax, ay] = toLocal(origin, line[i - 1]), [bx, by] = toLocal(origin, line[i]);
      if (near(ax, ay) && near(bx, by)) {
        if (run.length > 1) runs.push(run);
        run = [];
        continue;
      }
      kept.push([ax, ay, bx, by]);
      if (!run.length) run.push(line[i - 1]);
      run.push(line[i]);
    }
    if (run.length > 1) runs.push(run);
  }
  return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: runs } }] };
}

/** MapLibre's world size in pixels at a zoom. */
function worldSize(zoom: number): number {
  return 512 * 2 ** zoom;
}

/** A screen offset (x right, y down) in world pixels (x east, y south) on a map turned by `bearing`. */
function toWorld(sx: number, sy: number, bearing: number): [number, number] {
  const r = (bearing * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  return [sx * cos - sy * sin, sx * sin + sy * cos];
}

function boundsOf(pts: [number, number][]): [[number, number], [number, number]] {
  const lng = pts.map((p) => p[0]), lat = pts.map((p) => p[1]);
  return [
    [Math.min(...lng), Math.min(...lat)],
    [Math.max(...lng), Math.max(...lat)],
  ];
}

/** The basemaps side by side, the current one marked: nothing to learn, nothing hidden. */
class BasemapSwitch implements IControl {
  private el = document.createElement("div");
  private tm: TrailMap;
  constructor(tm: TrailMap) {
    this.tm = tm;
  }
  onAdd() {
    this.el.className = "maplibregl-ctrl basemap-switch";
    this.el.setAttribute("role", "radiogroup");
    this.el.setAttribute("aria-label", this.tm.strings.basemap);
    const buttons: HTMLButtonElement[] = [];
    const mark = () =>
      buttons.forEach((b, i) => b.setAttribute("aria-checked", String(i === this.tm.basemapCurrent)));
    for (let i = 0; i < this.tm.basemapCount; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.textContent = this.tm.basemapLabel(i);
      b.addEventListener("click", () => {
        this.tm.setBasemap(i);
        mark();
      });
      buttons.push(b);
    }
    mark();
    this.el.append(...buttons);
    return this.el;
  }
  onRemove() {
    this.el.remove();
  }
}
