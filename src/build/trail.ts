// Reads a trail folder (docs/design/trail-content.md) into the Trail the
// browser receives. Runs in Node at build and dev time; never in the browser.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { imageSize } from "image-size";
import { marked } from "marked";
import type { Basemap, Item, LngLat, Localized, Logo, Trail } from "../app/trail-types.ts";
import { routeLines } from "../app/geo.ts";
import { computeLegs, type LegReport } from "./legs.ts";

/** An image as read from the folder: `file` is an absolute path, made a URL by the bundler. */
export type SourceImage = Omit<Trail["items"][number]["images"][number], "url"> & { file: string };
export type SourceAudio = { file: string; synthetic: boolean; stale: boolean };
export type SourceItem = Omit<Item, "images" | "audio"> & { images: SourceImage[]; audio: Record<string, SourceAudio>; dir: string };
export type SourceLogo = Omit<Logo, "url"> & { file: string };
export type SourceTrail = Omit<Trail, "items" | "mark" | "cover" | "footer"> & {
  items: SourceItem[];
  mark?: SourceLogo;
  cover?: SourceImage;
  footer: { logos: SourceLogo[]; text: Localized };
  /** theme.css in the trail folder, if there is one: the trail's own look, loaded after the engine's. */
  stylesheet?: string;
  dir: string;
  report: LegReport;
  /** What the folder has that the format doesn't know, likely typos: printed by `npm run check`, not fatal. */
  warnings: string[];
};

export class TrailError extends Error {}

/** The fields the format knows, per kind of object (docs/design/trail-content.md). */
const KNOWN = {
  trail: ["languages", "machineTranslated", "title", "subtitle", "publisher", "duration", "gettingThere", "links", "stationFields", "images", "theme", "signLabel", "mark", "cover", "footer", "map", "audio"],
  map: ["basemaps", "margin"],
  theme: ["accent", "accentDark"],
  footer: ["logos", "text"],
  audio: ["voices", "rate", "say"],
  station: ["title", "position", "fields", "images"],
  stationField: ["key", "label"],
  link: ["label", "url"],
  basemap: ["label", "style", "tiles", "tileSize", "maxzoom", "attribution"],
  image: ["file", "caption", "alt", "credit", "license"],
  logo: ["file", "alt", "url"],
};

interface Checks {
  loc: (v: unknown, where: string, required: boolean) => Localized;
  fail: (where: string, msg: string) => void;
  unknown: (o: unknown, kind: keyof typeof KNOWN, where: string) => void;
}

/**
 * Which trail to build: WAYMARKED_TRAIL (a folder name under trails/, or a
 * path, relative to the repository), else the only folder under trails/.
 */
export function resolveTrailDir(repoRoot: string, env = process.env.WAYMARKED_TRAIL): string {
  const trailsDir = join(repoRoot, "trails");
  if (env) {
    const byName = join(trailsDir, env);
    const dir = existsSync(byName) ? byName : resolve(repoRoot, env);
    if (!existsSync(join(dir, "trail.json"))) throw new TrailError(`WAYMARKED_TRAIL=${env}: no trail.json in ${dir}`);
    return dir;
  }
  const found = existsSync(trailsDir)
    ? readdirSync(trailsDir).filter((d) => existsSync(join(trailsDir, d, "trail.json")))
    : [];
  if (found.length === 1) return join(trailsDir, found[0]);
  if (found.length === 0) throw new TrailError(`No trail: ${trailsDir} has no folder with a trail.json.`);
  throw new TrailError(`Several trails in ${trailsDir} (${found.join(", ")}): set WAYMARKED_TRAIL to one of them.`);
}

/** The station folders in walking order: station n is the n-th (docs/design/trail-content.md, Order and numbers). */
export function stationFolders(dir: string): string[] {
  const stationsDir = join(dir, "stations");
  if (!existsSync(stationsDir)) return [];
  return readdirSync(stationsDir)
    .filter((d) => statSync(join(stationsDir, d)).isDirectory())
    .sort()
    .map((d) => join(stationsDir, d));
}

export function loadTrail(dir: string): SourceTrail {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
  const unknown: Checks["unknown"] = (o, kind, where) => {
    if (!o || typeof o !== "object" || Array.isArray(o)) return;
    for (const k of Object.keys(o)) if (!KNOWN[kind].includes(k)) warnings.push(`${where}: unknown field "${k}", ignored`);
  };

  const trailFile = join(dir, "trail.json");
  const raw = readJson(trailFile);
  unknown(raw, "trail", "trail.json");
  unknown(raw.map, "map", "trail.json map");
  unknown(raw.theme, "theme", "trail.json theme");
  unknown(raw.footer, "footer", "trail.json footer");
  unknown(raw.audio, "audio", "trail.json audio");
  const languages: string[] = Array.isArray(raw.languages) && raw.languages.length ? raw.languages : [];
  if (!languages.length) fail("trail.json", `"languages" must list at least one language code, the first being the source language.`);
  const lang0 = languages[0] ?? "";
  const machineTranslated: string[] = Array.isArray(raw.machineTranslated) ? raw.machineTranslated : [];
  for (const l of machineTranslated) {
    if (!languages.includes(l)) fail("trail.json machineTranslated", `"${l}" is not in "languages"`);
    else if (l === lang0) fail("trail.json machineTranslated", `"${l}" is the source language, which is not a translation`);
  }

  const loc = (v: unknown, where: string, required: boolean): Localized => {
    if (v === undefined || v === null) {
      if (required) fail(where, `missing (expected { "${lang0}": "…" })`);
      return {};
    }
    if (typeof v !== "object" || Array.isArray(v)) {
      fail(where, `expected an object of texts per language, like { "${lang0}": "…" }`);
      return {};
    }
    const out: Localized = {};
    for (const [k, s] of Object.entries(v as Record<string, unknown>)) {
      if (typeof s !== "string") fail(`${where}.${k}`, "expected a string");
      else out[k] = s;
    }
    if (required && !out[lang0]) fail(where, `has no text in the source language "${lang0}"`);
    return out;
  };
  const checks: Checks = { loc, fail, unknown };

  const stationFields = (Array.isArray(raw.stationFields) ? raw.stationFields : []).map((f: any, i: number) => {
    unknown(f, "stationField", `trail.json stationFields[${i}]`);
    if (typeof f?.key !== "string") fail(`trail.json stationFields[${i}]`, `needs a "key"`);
    return { key: String(f?.key), label: loc(f?.label, `trail.json stationFields[${i}].label`, true) };
  });
  const fieldKeys = new Set(stationFields.map((f: { key: string }) => f.key));

  const basemaps: Basemap[] = (raw.map?.basemaps ?? []).map((b: any, i: number) => {
    const where = `trail.json map.basemaps[${i}]`;
    unknown(b, "basemap", where);
    if (!b?.style && !Array.isArray(b?.tiles)) fail(where, `needs "style" (a style URL) or "tiles" (raster tile URLs)`);
    if (b?.tiles && !b?.attribution) fail(where, `raster tiles need an "attribution"`);
    return { ...b, label: loc(b?.label, `${where}.label`, true) };
  });

  const manifest = readManifest(dir);
  const title0 = loc(raw.title, "trail.json title", true);
  const theme: Trail["theme"] = {};
  for (const k of ["accent", "accentDark"] as const) {
    const v = raw.theme?.[k];
    if (v === undefined) continue;
    if (typeof v !== "string" || !/^#[0-9a-f]{6}$/i.test(v)) fail(`trail.json theme.${k}`, `expected a colour as "#rrggbb"`);
    else theme[k] = v;
  }
  const signLabel = mapTexts(loc(raw.signLabel, "trail.json signLabel", false), (t) => marked.parseInline(t, { async: false }) as string);
  for (const [k, t] of Object.entries(signLabel)) if (!t.includes("{n}")) fail(`trail.json signLabel.${k}`, `needs "{n}" where the station's number goes`);
  const cover = raw.cover === undefined ? undefined : readImages(dir, [raw.cover], "trail.json cover", checks)[0];
  const footer = {
    logos: readLogos(dir, raw.footer?.logos, "trail.json footer.logos", checks),
    text: mapTexts(loc(raw.footer?.text, "trail.json footer.text", false), (t) => marked.parse(t, { async: false }) as string),
  };
  const mark = raw.mark === undefined ? undefined : readLogos(dir, [raw.mark], "trail.json mark", checks)[0];
  const stylesheet = existsSync(join(dir, "theme.css")) ? join(dir, "theme.css") : undefined;

  const item0: SourceItem = {
    n: 0,
    dir,
    title: title0,
    fields: {},
    body: readBodies(dir, languages),
    images: readImages(dir, raw.images, "trail.json", checks),
    audio: readAudio(dir, dir, languages, manifest, (l) => title0[l] ?? title0[lang0] ?? ""),
  };

  const folders = stationFolders(dir);
  if (!folders.length) fail("stations/", "no station folders");
  const stations: SourceItem[] = folders.map((sdir, i) => {
    const where = `stations/${basename(sdir)}/station.json`;
    const s = existsSync(join(sdir, "station.json")) ? readJson(join(sdir, "station.json")) : (fail(where, "missing"), {});
    unknown(s, "station", where);
    const p = s.position;
    const okPos = Array.isArray(p) && p.length === 2 && p.every((x: unknown) => typeof x === "number")
      && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
    if (!okPos) fail(where, `"position" must be [longitude, latitude] in WGS84 degrees`);
    const fields: Record<string, Localized> = {};
    for (const [k, v] of Object.entries(s.fields ?? {})) {
      if (!fieldKeys.has(k)) fail(`${where} fields.${k}`, `not declared in trail.json stationFields`);
      fields[k] = loc(v, `${where} fields.${k}`, false);
    }
    const title = loc(s.title, `${where} title`, true);
    return {
      n: i + 1,
      dir: sdir,
      title,
      position: okPos ? (p as LngLat) : undefined,
      fields,
      body: readBodies(sdir, languages),
      images: readImages(sdir, s.images, where, checks),
      audio: readAudio(dir, sdir, languages, manifest, (l) => title[l] ?? title[lang0] ?? ""),
    };
  });

  const routeFile = join(dir, "route.geojson");
  const route: GeoJSON.FeatureCollection = existsSync(routeFile)
    ? readJson(routeFile)
    : { type: "FeatureCollection", features: [] };
  if (route.type !== "FeatureCollection") fail("route.geojson", "must be a GeoJSON FeatureCollection");

  if (errors.length) throw new TrailError(`Trail ${dir} has errors:\n  ` + errors.join("\n  "));

  const positions = stations.map((s) => s.position!);
  const { legs, report } = computeLegs(route, positions);
  const length = legs.reduce((sum, l) => sum + l.length, 0);
  const all = [...positions, ...routeLines(route).flat()];
  const extent: [LngLat, LngLat] = [
    [Math.min(...all.map((c) => c[0])), Math.min(...all.map((c) => c[1]))],
    [Math.max(...all.map((c) => c[0])), Math.max(...all.map((c) => c[1]))],
  ];

  const margin = typeof raw.map?.margin === "number" ? raw.map.margin : undefined;
  return {
    limits: mapLimits(extent, margin),
    id: basename(dir),
    dir,
    languages,
    machineTranslated,
    subtitle: loc(raw.subtitle, "trail.json subtitle", false),
    publisher: loc(raw.publisher, "trail.json publisher", false),
    duration: loc(raw.duration, "trail.json duration", false),
    gettingThere: loc(raw.gettingThere, "trail.json gettingThere", false),
    links: (raw.links ?? []).map((l: any, i: number) => {
      unknown(l, "link", `trail.json links[${i}]`);
      return { url: String(l.url), label: loc(l.label, `trail.json links[${i}].label`, true) };
    }),
    stationFields,
    theme,
    signLabel,
    mark,
    cover,
    footer,
    stylesheet,
    basemaps,
    items: [item0, ...stations],
    route,
    legs,
    length,
    extent,
    report,
    warnings,
  };
}

/**
 * A trail is local: the map is bounded to its extent plus a generous margin
 * (`map.margin` metres, default the larger of 1.5 km and half the extent),
 * and its minimum zoom is the one at which that bounded area spans about
 * 320 px, a phone's width.
 */
function mapLimits(b: [LngLat, LngLat], marginM?: number): Trail["limits"] {
  const lat = (b[0][1] + b[1][1]) / 2;
  const mPerDegLat = 110574, mPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const extentM = Math.max((b[1][0] - b[0][0]) * mPerDegLng, (b[1][1] - b[0][1]) * mPerDegLat);
  const m = marginM ?? Math.max(1500, extentM / 2);
  const dLng = m / mPerDegLng, dLat = m / mPerDegLat;
  const bounds: [LngLat, LngLat] = [
    [b[0][0] - dLng, b[0][1] - dLat],
    [b[1][0] + dLng, b[1][1] + dLat],
  ];
  const sizeM = extentM + 2 * m;
  const metresPerPxAtZ0 = 156543.03 * Math.cos((lat * Math.PI) / 180);
  const minZoom = Math.round(Math.log2((metresPerPxAtZ0 * 320) / sizeM) * 10) / 10;
  return { bounds, minZoom };
}

/** A JSON file of the folder; a byte-order mark (some Windows editors write one) is allowed. */
export function readJson(file: string): any {
  try {
    return JSON.parse(readFileSync(file, "utf8").replace(/^\ufeff/, ""));
  } catch (e) {
    throw new TrailError(`${file}: ${(e as Error).message}`);
  }
}

/** text.<lang>.md in an item's folder, rendered to HTML. */
function readBodies(dir: string, languages: string[]): Localized {
  const out: Localized = {};
  for (const lang of languages) {
    const f = join(dir, `text.${lang}.md`);
    if (existsSync(f)) out[lang] = marked.parse(readFileSync(f, "utf8"), { async: false }) as string;
  }
  return out;
}

type Manifest = Record<string, { source?: string; bytes?: number }>;

/** audio.json: what build/make-audio.py made (and from which text); anything else in an audio slot is a recording. */
function readManifest(dir: string): Manifest {
  const f = join(dir, "audio.json");
  return existsSync(f) ? (readJson(f).files ?? {}) : {};
}

/** The hash make-audio.py records: the item's title and its text file, LF line ends. */
function audioSourceHash(title: string, md: string): string {
  const text = md.replace(/\r\n/g, "\n").replace(/\ufeff/g, "");
  return createHash("sha256").update(title + "\n" + text, "utf8").digest("hex");
}

/**
 * audio.<lang>.mp3 in an item's folder, with whether it is synthetic and
 * whether its text has changed since. A file of another size than the one
 * make-audio.py made is a recording put in its place.
 */
function readAudio(
  trailDir: string,
  dir: string,
  languages: string[],
  manifest: Manifest,
  title: (lang: string) => string,
): Record<string, SourceAudio> {
  const out: Record<string, SourceAudio> = {};
  for (const lang of languages) {
    const file = join(dir, `audio.${lang}.mp3`);
    if (!existsSync(file)) continue;
    const made = manifest[relative(trailDir, file).replace(/\\/g, "/")];
    const synthetic = !!made && (made.bytes === undefined || made.bytes === statSync(file).size);
    const textFile = join(dir, `text.${lang}.md`);
    const stale = synthetic && (!existsSync(textFile) || made.source !== audioSourceHash(title(lang), readFileSync(textFile, "utf8")));
    out[lang] = { file, synthetic, stale };
  }
  return out;
}

/** An image's pixel size, read from the file. */
function sizeOf(file: string, where: string, fail: Checks["fail"]): { width?: number; height?: number } {
  try {
    const { width, height } = imageSize(readFileSync(file));
    return { width, height };
  } catch {
    fail(where, `can't read the size of "${basename(file)}" (expected JPEG, PNG, WebP, GIF or SVG)`);
    return {};
  }
}

function readImages(dir: string, list: unknown, where: string, { loc, fail, unknown }: Checks): SourceImage[] {
  if (list === undefined) return [];
  if (!Array.isArray(list)) {
    fail(`${where} images`, "expected a list");
    return [];
  }
  return list.map((im: any, i: number) => {
    const w = `${where} images[${i}]`;
    unknown(im, "image", w);
    const file = join(dir, String(im?.file));
    const found = !!im?.file && existsSync(file);
    if (!found) fail(w, `file "${im?.file}" not found next to it`);
    return {
      file,
      ...(found ? sizeOf(file, w, fail) : {}),
      caption: loc(im?.caption, `${w}.caption`, false),
      alt: loc(im?.alt, `${w}.alt`, false),
      credit: im?.credit,
      license: im?.license,
    };
  });
}

function readLogos(dir: string, list: unknown, where: string, { loc, fail, unknown }: Checks): SourceLogo[] {
  if (list === undefined) return [];
  if (!Array.isArray(list)) {
    fail(where, "expected a list");
    return [];
  }
  return list.map((l: any, i: number) => {
    // A list (footer.logos) names the entry; a single logo (mark) is the field itself.
    const w = where.endsWith("logos") ? `${where}[${i}]` : where;
    unknown(l, "logo", w);
    const file = join(dir, String(l?.file));
    const found = !!l?.file && existsSync(file);
    if (!found) fail(w, `file "${l?.file}" not found next to trail.json`);
    return { file, ...(found ? sizeOf(file, w, fail) : {}), alt: loc(l?.alt, `${w}.alt`, true), href: l?.url };
  });
}

function mapTexts(t: Localized, f: (s: string) => string): Localized {
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, f(v)]));
}
