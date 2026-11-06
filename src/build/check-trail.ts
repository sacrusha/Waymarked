// npm run check: loads the trail folder the build would use and prints what
// the engine derived from it, so a trail's author can see problems before
// they show on the map.

import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTrail, resolveTrailDir, TrailError } from "./trail.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
try {
  const t = loadTrail(resolveTrailDir(repoRoot));
  const src = t.languages[0];
  console.log(`Trail ${t.id} (${t.languages.join(", ")}): ${t.items.length - 1} stations, ${(t.length / 1000).toFixed(2)} km along the route`);
  for (const l of t.legs) {
    const s = t.items[l.from];
    console.log(`  ${String(l.from).padStart(2)}→${String(l.to).padEnd(2)} ${String(l.length).padStart(5)} m${l.straight ? "  STRAIGHT LINE (no path along the route)" : ""}   ${s.title[src]}`);
  }
  const lb = t.limits.bounds;
  console.log(`Map bounded to ${lb[0][1].toFixed(4)},${lb[0][0].toFixed(4)} – ${lb[1][1].toFixed(4)},${lb[1][0].toFixed(4)}, minimum zoom ${t.limits.minZoom}`);
  console.log(`Stations' distance to the route (m): ${t.report.offRoute.map((d, i) => `${i + 1}:${d}`).join(" ")}`);
  console.log(`Gaps bridged between route fragments: ${t.report.bridges.length ? t.report.bridges.map((b) => `${b.length} m at ${b.at[1].toFixed(5)},${b.at[0].toFixed(5)}`).join("; ") : "none"}`);
  for (const lang of t.languages.slice(1)) {
    const gaps: string[] = [];
    const gap = (what: string, missing: (it: (typeof t.items)[number]) => boolean) => {
      const n = t.items.filter(missing).map((it) => it.n);
      if (n.length) gaps.push(`${what} missing for ${n.join(" ")}`);
    };
    const lacks = (a: Record<string, string> | undefined) => !!a?.[src] && !a[lang];
    gap("titles", (it) => !it.title[lang]);
    gap("texts", (it) => !!it.body[src] && !it.body[lang]);
    gap("fields", (it) => Object.values(it.fields).some(lacks));
    gap("image captions", (it) => it.images.some((im) => lacks(im.caption) || lacks(im.alt)));
    console.log(
      `Language ${lang}${t.machineTranslated.includes(lang) ? " (machine translation, marked as such in the cards)" : ""}: ` +
        (gaps.length ? gaps.join("; ") + " (the cards fall back to " + src + ")" : "complete"),
    );
  }
  for (const lang of t.languages) {
    const have = t.items.filter((it) => it.audio[lang]);
    const stale = have.filter((it) => it.audio[lang].stale).map((it) => it.n);
    const recorded = have.filter((it) => !it.audio[lang].synthetic).map((it) => it.n);
    const missing = t.items.filter((it) => !it.audio[lang] && it.body[lang]).map((it) => it.n);
    const mb = have.reduce((sum, it) => sum + statSync(it.audio[lang].file).size, 0) / 1048576;
    console.log(
      `Audio ${lang}: ${have.length} of ${t.items.length} items, ${mb.toFixed(1)} MB` +
        (recorded.length ? `; recordings: ${recorded.join(" ")}` : "") +
        (missing.length ? `; none for ${missing.join(" ")}` : "") +
        (stale.length ? `; TEXT CHANGED since the speech was made: ${stale.join(" ")} (run build/make-audio.py)` : ""),
    );
  }
  const far = t.report.offRoute.map((d, i) => [d, i + 1]).filter(([d]) => d > 50);
  if (far.length) console.log(`More than 50 m off the route: ${far.map(([d, n]) => `${n} (${d} m)`).join(", ")}`);
  if (t.warnings.length) console.log(`Fields the format doesn't know (a typo?), ignored:\n  ${t.warnings.join("\n  ")}`);
} catch (e) {
  if (e instanceof TrailError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
