// The legs the build derives from a trail's route.geojson, as JSON on stdout:
//   node src/build/route-legs.ts <trail folder> [route.geojson]
// It calls the build's own computeLegs on the build's own reading of the
// stations, so the numbers are those of `npm run check`.
// Used by build/route-trail.py (verify, render, legs).

import { join } from "node:path";
import { computeLegs } from "./legs.ts";
import { readJson, stationFolders } from "./trail.ts";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node src/build/route-legs.ts <trail folder> [route.geojson]");
  process.exit(1);
}
const stations = stationFolders(dir).map((d) => readJson(join(d, "station.json")).position);
const route = readJson(process.argv[3] ?? join(dir, "route.geojson"));
console.log(JSON.stringify(computeLegs(route, stations)));
