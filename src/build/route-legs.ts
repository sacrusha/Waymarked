// The legs the build derives from a trail's route.geojson, as JSON on stdout:
//   node src/build/route-legs.ts <trail folder> [route.geojson]
// It calls the build's own computeLegs, so the numbers are those of `npm run check`.
// Used by build/route-trail.py (verify, render, legs).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { computeLegs } from "./legs.ts";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node src/build/route-legs.ts <trail folder> [route.geojson]");
  process.exit(1);
}
const stationsDir = join(dir, "stations");
const stations = readdirSync(stationsDir)
  .sort()
  .map((d) => join(stationsDir, d, "station.json"))
  .map((f) => JSON.parse(readFileSync(f, "utf8")).position);
const route = JSON.parse(readFileSync(process.argv[3] ?? join(dir, "route.geojson"), "utf8"));
console.log(JSON.stringify(computeLegs(route, stations)));
