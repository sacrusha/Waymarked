// Small geometry for walking help: distances, bearings, and where a walker is
// along a leg. Local and flat (a trail spans a few kilometres): metres on a
// plane tangent at the walker, good to well under a metre at that scale.

import type { LngLat } from "./trail-types.ts";

const M_PER_DEG_LAT = 111_132;
const RAD = Math.PI / 180;

/** p relative to origin o, in metres east and north. */
export function toLocal(o: LngLat, p: LngLat): [number, number] {
  return [(p[0] - o[0]) * M_PER_DEG_LAT * Math.cos(o[1] * RAD), (p[1] - o[1]) * M_PER_DEG_LAT];
}

/** Great-circle distance in metres (haversine): also right for a visitor far from the trail. */
export function distance(a: LngLat, b: LngLat): number {
  const dLat = (b[1] - a[1]) * RAD, dLng = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearing(a: LngLat, b: LngLat): number {
  const φ1 = a[1] * RAD, φ2 = b[1] * RAD, Δλ = (b[0] - a[0]) * RAD;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return norm(Math.atan2(y, x) / RAD);
}

/** An angle in [0, 360). */
export function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** The signed difference b − a in (−180, 180]: the short way round. */
export function turn(a: number, b: number): number {
  const d = norm(b - a);
  return d > 180 ? d - 360 : d;
}

export interface OnLine {
  /** Metres from the walker to the nearest point of the line. */
  off: number;
  /** Metres along the line from its start to that point. */
  along: number;
  /** The line's length in metres. */
  length: number;
  /** The point `ahead` metres further along the line (its end if nearer). */
  ahead: LngLat;
}

/** Where `p` is relative to a polyline: how far off it, how far along it, and a point ahead on it. */
export function onLine(p: LngLat, line: LngLat[], ahead: number): OnLine | undefined {
  if (line.length < 2) return undefined;
  const pts = line.map((q) => toLocal(p, q));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  let best = { off: Infinity, along: 0 };
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    // The walker is the origin: project (0,0) onto the segment.
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const off = Math.hypot(ax + t * dx, ay + t * dy);
    if (off < best.off) best = { off, along: cum[i - 1] + t * Math.sqrt(len2) };
  }
  const length = cum[cum.length - 1];
  return { ...best, length, ahead: pointAt(line, cum, Math.min(length, best.along + ahead)) };
}

function pointAt(line: LngLat[], cum: number[], at: number): LngLat {
  for (let i = 1; i < line.length; i++) {
    if (cum[i] >= at) {
      const seg = cum[i] - cum[i - 1];
      const t = seg ? (at - cum[i - 1]) / seg : 0;
      return [line[i - 1][0] + t * (line[i][0] - line[i - 1][0]), line[i - 1][1] + t * (line[i][1] - line[i - 1][1])];
    }
  }
  return line[line.length - 1];
}

/** True when p lies inside the box [[west, south], [east, north]]. */
export function inBox(p: LngLat, box: [LngLat, LngLat]): boolean {
  return p[0] >= box[0][0] && p[0] <= box[1][0] && p[1] >= box[0][1] && p[1] <= box[1][1];
}
