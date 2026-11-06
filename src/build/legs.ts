// Derives the legs between consecutive stations from route.geojson.
//
// The route may be one ordered line or a heap of unordered fragments (a trace
// of a printed map). Fragments become one graph: their vertices joined along
// each line, and each fragment end joined to the nearest vertex of every other
// fragment within GAP_M. Each station is attached at its nearest point on the
// route; a leg is the shortest path between two attachments. Where none
// exists, the leg is a straight line and is marked as such.

import type { Leg, LngLat } from "../app/trail-types.ts";

/** Largest gap between fragments that is bridged, metres. */
const GAP_M = 60;

export interface LegReport {
  /** Per station: distance from its position to the route, metres. */
  offRoute: number[];
  /** Gaps bridged between fragments: length in metres and where. */
  bridges: { length: number; at: LngLat }[];
  /** Legs drawn straight because the route has no path between them. */
  straight: string[];
}

export function computeLegs(route: GeoJSON.FeatureCollection, stations: LngLat[]): { legs: Leg[]; report: LegReport } {
  const lines: LngLat[][] = [];
  for (const f of route.features) {
    const g = f.geometry;
    if (g?.type === "LineString") lines.push(g.coordinates as LngLat[]);
    else if (g?.type === "MultiLineString") lines.push(...(g.coordinates as LngLat[][]));
  }
  const report: LegReport = { offRoute: [], bridges: [], straight: [] };
  const lat0 = stations.reduce((s, p) => s + p[1], 0) / Math.max(1, stations.length);
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110574;
  const xy = (p: LngLat): [number, number] => [p[0] * kx, p[1] * ky];
  const dist = (a: LngLat, b: LngLat) => Math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * ky);

  // Graph
  const nodes: LngLat[] = [];
  const adj: { to: number; w: number }[][] = [];
  const addNode = (p: LngLat) => (nodes.push(p), adj.push([]), nodes.length - 1);
  const link = (a: number, b: number) => {
    const w = dist(nodes[a], nodes[b]);
    adj[a].push({ to: b, w });
    adj[b].push({ to: a, w });
  };
  const lineNodes: number[][] = lines.map((line) => line.map(addNode));
  const segments: [number, number][] = [];
  for (const ids of lineNodes) for (let i = 1; i < ids.length; i++) (link(ids[i - 1], ids[i]), segments.push([ids[i - 1], ids[i]]));

  for (let a = 0; a < lineNodes.length; a++) {
    const ends = [lineNodes[a][0], lineNodes[a][lineNodes[a].length - 1]];
    for (const e of new Set(ends)) {
      for (let b = 0; b < lineNodes.length; b++) {
        if (b === a) continue;
        let best = -1, bestD = Infinity;
        for (const v of lineNodes[b]) {
          const d = dist(nodes[e], nodes[v]);
          if (d < bestD) (bestD = d), (best = v);
        }
        if (best >= 0 && bestD <= GAP_M && !adj[e].some((x) => x.to === best)) {
          link(e, best);
          if (bestD > 1) report.bridges.push({ length: Math.round(bestD), at: nodes[e] });
        }
      }
    }
  }

  // Attach stations at their nearest point on a segment
  const attach: number[] = stations.map((p) => {
    if (!segments.length) {
      report.offRoute.push(NaN);
      return -1;
    }
    const [px, py] = xy(p);
    let best = { d: Infinity, seg: 0, t: 0 };
    segments.forEach(([a, b], seg) => {
      const [ax, ay] = xy(nodes[a]), [bx, by] = xy(nodes[b]);
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
      const d = Math.hypot(ax + t * dx - px, ay + t * dy - py);
      if (d < best.d) best = { d, seg, t };
    });
    report.offRoute.push(Math.round(best.d));
    const [a, b] = segments[best.seg];
    const q: LngLat = [
      nodes[a][0] + best.t * (nodes[b][0] - nodes[a][0]),
      nodes[a][1] + best.t * (nodes[b][1] - nodes[a][1]),
    ];
    const id = addNode(q);
    link(id, a);
    link(id, b);
    return id;
  });

  const legs: Leg[] = [];
  for (let i = 1; i < stations.length; i++) {
    const path = attach[i - 1] >= 0 ? shortestPath(adj, attach[i - 1], attach[i]) : null;
    const from = i, to = i + 1;
    if (!path) {
      report.straight.push(`${from}→${to}`);
      legs.push({ from, to, straight: true, length: Math.round(dist(stations[i - 1], stations[i])), coordinates: [stations[i - 1], stations[i]] });
      continue;
    }
    const coordinates = path.map((n) => nodes[n]);
    let length = 0;
    for (let k = 1; k < coordinates.length; k++) length += dist(coordinates[k - 1], coordinates[k]);
    legs.push({ from, to, straight: false, length: Math.round(length), coordinates: coordinates.map(round6) });
  }
  return { legs, report };
}

function round6(p: LngLat): LngLat {
  return [Math.round(p[0] * 1e6) / 1e6, Math.round(p[1] * 1e6) / 1e6];
}

function shortestPath(adj: { to: number; w: number }[][], from: number, to: number): number[] | null {
  const n = adj.length;
  const d = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  d[from] = 0;
  // Graphs here are a few thousand nodes: a linear scan beats carrying a heap.
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && d[i] < best) (best = d[i]), (u = i);
    if (u < 0) return null;
    if (u === to) break;
    done[u] = 1;
    for (const { to: v, w } of adj[u]) if (d[u] + w < d[v]) (d[v] = d[u] + w), (prev[v] = u);
  }
  const path: number[] = [];
  for (let u = to; u >= 0; u = prev[u]) path.push(u);
  return path.reverse();
}
