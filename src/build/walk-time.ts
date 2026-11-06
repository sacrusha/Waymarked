// Walking time along a line with heights, at the pace the Swiss yellow
// signposts are reckoned at: 4.2 km/h on the level, slower uphill and on
// steep descents. Walkers calibrate themselves against those times ("I need
// one and a half times the signs"), so one fixed pace that matches them is
// one a visitor can scale (docs/design/trail-content.md, route.geojson).
//
// The formula is Schweizer Wanderwege's polynomial in the slope, with the
// constants as swisstopo's map viewer publishes them (the Schweizmobil
// variant: slope in tenths, the polynomial within ±40 %, linear beyond):
// github.com/geoadmin/web-mapviewer, packages/geoadmin-elevation-profile/src/utils.ts.

const C = [
  14.271, 3.6991, 2.5922, -1.4384, 0.32105, 0.81542, -0.090261, -0.20757, 0.010192, 0.028588, -0.00057466, -0.0021842,
  1.5176e-5, 8.6894e-5, -1.3584e-7, -1.4026e-6,
];

/** Minutes per horizontal kilometre at a slope given in tenths (rise * 10 / run). */
export function minutesPerKm(slope: number): number {
  if (slope <= -4) return -9 * slope;
  if (slope >= 4) return 17 * slope;
  let m = 0;
  for (let i = C.length - 1; i >= 0; i--) m = m * slope + C[i];
  return m;
}

/** Steps the slope is taken over: shorter ones turn the height model's noise (a wall, a kerb) into climbs. */
const STEP_M = 10;

/**
 * Minutes to walk a line of [lon, lat, height] points, or undefined where a
 * point has no height. `dist` gives metres between two points.
 */
export function walkMinutes<P extends number[]>(line: P[], dist: (a: P, b: P) => number): number | undefined {
  if (line.length < 2 || line.some((p) => typeof p[2] !== "number")) return undefined;
  // Resampled every STEP_M along the line (the last step shorter), heights interpolated.
  const along = [0];
  for (let i = 1; i < line.length; i++) along.push(along[i - 1] + dist(line[i - 1], line[i]));
  const total = along[along.length - 1];
  if (!total) return 0;
  const heightAt = (s: number) => {
    let i = 1;
    while (i < along.length - 1 && along[i] < s) i++;
    const span = along[i] - along[i - 1];
    const t = span ? (s - along[i - 1]) / span : 0;
    return line[i - 1][2] + t * (line[i][2] - line[i - 1][2]);
  };
  let minutes = 0;
  for (let s = 0, z = heightAt(0); s < total; ) {
    const run = Math.min(STEP_M, total - s);
    const z2 = heightAt(s + run);
    minutes += (run * minutesPerKm(((z2 - z) * 10) / run)) / 1000;
    s += run;
    z = z2;
  }
  return minutes;
}
