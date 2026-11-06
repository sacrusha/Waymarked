// The map: basemap, route, numbered station markers, and the selection's
// highlight (selected, previous, next, and the leg to the next).

import { AttributionControl, LngLat as MLLngLat, Map as MLMap, Marker, MercatorCoordinate, setWorkerUrl, type IControl, type StyleSpecification } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Basemap, Trail } from "./trail-types.ts";
import type { Strings } from "./strings.ts";
import { store } from "./store.ts";
import { toLocal } from "./geo.ts";

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
  private lang: string;
  private s: Strings;

  constructor(container: HTMLElement, trail: Trail, lang: string, s: Strings, onSelect: (n: number) => void, initial: View | undefined) {
    this.trail = trail;
    this.lang = lang;
    this.s = s;
    this.basemaps = trail.basemaps.length ? trail.basemaps : DEFAULT_BASEMAPS;
    // Remembered by label, so reordering the trail's basemaps doesn't remap a visitor's choice.
    const stored = store.get(`${trail.id}:basemap-label`);
    this.basemapIndex = Math.max(0, this.basemaps.findIndex((b) => b.label[trail.languages[0]] === stored));

    this.map = new MLMap({
      container,
      style: this.styleFor(this.basemaps[this.basemapIndex]),
      bounds: initial ? undefined : trail.bounds,
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
      el.textContent = String(item.n);
      el.setAttribute("aria-label", `${s.station} ${item.n}: ${item.title[lang] ?? item.title[trail.languages[0]]}`);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(item.n);
      });
      new Marker({ element: el, anchor: "center" }).setLngLat(item.position!).addTo(this.map);
      this.markers[item.n] = el;
    }

    this.map.on("style.load", () => this.addTrailLayers());
    this.map.on("moveend", () => this.keepInside());
  }

  basemapLabel(i = this.basemapIndex): string {
    const l = this.basemaps[i].label;
    return l[this.lang] ?? l[this.trail.languages[0]] ?? Object.values(l)[0] ?? "";
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
   * bounds hold for the part left visible, so the trail's edges reach into
   * the strip above a raised sheet; a lowered sheet uncovers map that may lie
   * past them, and the map moves back inside.
   */
  setCovered(p: Padding) {
    const was = this.covered;
    if (was && was.top === p.top && was.bottom === p.bottom && was.left === p.left && was.right === p.right) return;
    this.covered = p;
    this.keepInside();
  }

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
   * The map's constraint (MapLibre's transformConstrain): the visible part of
   * the map, not the whole canvas, stays inside the trail's bounds, zoomed in
   * where it would be larger than they are. A turned map shows a turned
   * rectangle; its extent along north and east is what is held inside.
   */
  private bounded(lngLat: MLLngLat, zoom: number): { center: MLLngLat; zoom: number } {
    const m = this.map as MLMap | undefined; // undefined while MapLibre constructs
    const z = Math.min(m?.getMaxZoom() ?? 19, Math.max(m?.getMinZoom() ?? this.trail.limits.minZoom, zoom ?? m?.getZoom() ?? 0));
    const p = this.covered;
    if (!m || !p) return { center: lngLat, zoom: z }; // the first view is set before the layout is known
    const el = m.getContainer();
    const w = Math.max(1, el.clientWidth - p.left - p.right), h = Math.max(1, el.clientHeight - p.top - p.bottom);
    const rad = (m.getBearing() * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    // The visible part's centre, from the canvas centre, in world pixels (x east, y south).
    const sx = (p.left - p.right) / 2, sy = (p.top - p.bottom) / 2;
    const ox = sx * cos - sy * sin, oy = sx * sin + sy * cos;
    const ew = Math.abs(w * cos) + Math.abs(h * sin), eh = Math.abs(w * sin) + Math.abs(h * cos);
    const [[west, south], [east, north]] = this.trail.limits.bounds;
    const nw = MercatorCoordinate.fromLngLat([west, north]), se = MercatorCoordinate.fromLngLat([east, south]);
    let zz = z;
    let size = 512 * 2 ** zz; // MapLibre's world size in pixels at this zoom
    const need = Math.max(ew / ((se.x - nw.x) * size), eh / ((se.y - nw.y) * size));
    if (need > 1) {
      zz += Math.log2(need);
      size = 512 * 2 ** zz;
    }
    const hold = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
    const at = MercatorCoordinate.fromLngLat(lngLat);
    const vx = hold(at.x * size + ox, nw.x * size + ew / 2, se.x * size - ew / 2);
    const vy = hold(at.y * size + oy, nw.y * size + eh / 2, se.y * size - eh / 2);
    return { center: new MercatorCoordinate((vx - ox) / size, (vy - oy) / size).toLngLat(), zoom: zz };
  }

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
    });
    this.updateLeg();
  }

  /**
   * The first view of an arrival (no earlier view to keep): the whole trail
   * for item 0, else the station with the way on to the next.
   */
  frame(n: number, padding: Padding) {
    const leg = this.trail.legs.find((l) => l.from === n);
    const bounds = n === 0 ? this.trail.bounds : boundsOf([this.trail.items[n].position!, ...(leg ? leg.coordinates : [])]);
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
      this.map.fitBounds(this.trail.bounds, { padding: this.fitPadding(padding), maxZoom: zoom, bearing: this.map.getBearing(), linear: true, duration });
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
  walking(from: number | undefined) {
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
 * (there and back, Baden's 5→6 and 7→8) has it twice in its data, and two
 * dashed lines on one stretch fill each other's gaps until it looks solid.
 * A segment lying within a metre of one already drawn, at both ends, is
 * dropped; what is left is joined back into runs, so the dashes flow on.
 * The data stays as it is: the legs are built from it (build/legs.ts).
 */
function drawnRoute(route: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const lines: [number, number][][] = [];
  for (const f of route.features) {
    const g = f.geometry;
    if (g.type === "LineString") lines.push(g.coordinates as [number, number][]);
    else if (g.type === "MultiLineString") lines.push(...(g.coordinates as [number, number][][]));
  }
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
