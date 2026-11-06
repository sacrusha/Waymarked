#!/usr/bin/env python3
"""Route a trail's legs over real paths, place its stations, and show the result
(docs/design/trail-content.md, route.geojson).

A printed map's route is intent, not geometry. This routes each leg from one
station to the next over the paths OpenStreetMap knows (footways, steps, streets
with no foot ban), writes route.geojson as one ordered line, and renders every
leg over the swisstopo Landeskarte or Luftbild so a person who knows the ground
can check it. Swiss trails only for the pictures (swisstopo); the routing works
anywhere OSM has paths.

    pip install pillow            # only for render and view
    python src/build/route-trail.py fetch
    python src/build/route-trail.py route [--dry]
    python src/build/route-trail.py verify
    python src/build/route-trail.py render [A-B ...] [--aerial] [--osm] [--intended] [--overview] [--out DIR]
    python src/build/route-trail.py view N [radius_m]  (a station over Landeskarte | Luftbild)
    python src/build/route-trail.py explain A-B        (the OSM ways a leg runs on)
    python src/build/route-trail.py place N lon lat    (move a station's position)
    python src/build/route-trail.py legs               (the build's legs, as `npm run check` prints them)

Every command takes --trail FOLDER; without it the only folder under trails/ (or
WAYMARKED_TRAIL, as the build does). Needs Python 3.10+ and Node 22.18+ (the legs come from the build's
own build/legs.ts, so the numbers equal `npm run check`) and network for the
first fetch and the map tiles. Downloads are cached in .cache/route/ (git-ignored).

Inputs in the trail folder, all optional except the stations:
  legspec.json         corrections, see below
  route-trace.geojson  the route as traced from a printed map. It only decides
                       between paths that exist: an edge's cost is its length
                       times a class factor times 1 + 1.5 * min(1, d / 40 m),
                       d being its distance from the trace.

legspec.json:
  {"attach": {"12": [lon, lat]},            where a station meets the path, when its
                                            nearest path is not the one to walk
   "5-6": {"via": [[lon, lat], ...],        the leg passes these (snapped to the nearest path node)
           "avoid": [[lon, lat, metres]],   the leg keeps out of these circles
           "note": "why"}}

The route is one line, not fragments: the build bridges every fragment end to
every fragment within 60 m, which makes shortcuts through blocks; one line has
no ends to bridge and a leg is the piece between its two stations. A stretch
walked twice is in the line twice. `verify` recomputes the legs the way the
build does and compares them with what was routed.
"""

from __future__ import annotations

import argparse
import glob
import hashlib
import heapq
import io
import json
import math
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / ".cache" / "route"
UA = {"User-Agent": "waymarked-route-trail (github.com/waymarked)"}
TILES = {
    "lk": "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
    "lb": "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg",
}
MAX_ZOOM = {"lk": 18, "lb": 20}  # the Landeskarte has no tiles beyond 18; it is enlarged
OVERPASS = ["https://overpass-api.de", "https://overpass.kumi.systems", "https://overpass.private.coffee"]
MARGIN_M = 300
TRACE_W, TRACE_D = 1.5, 40.0
WALKABLE = {"footway": 1.0, "path": 1.0, "steps": 1.1, "pedestrian": 1.0, "track": 1.1, "living_street": 1.2,
            "residential": 1.3, "service": 1.5, "unclassified": 1.6, "tertiary": 1.8, "secondary": 3.0,
            "primary": 4.0, "cycleway": 1.4, "bridleway": 1.2, "corridor": 1.5, "tertiary_link": 1.8, "secondary_link": 3.0}
ATTACH_TO = ("footway", "path", "steps", "pedestrian", "track", "living_street", "residential", "service",
             "unclassified", "tertiary", "cycleway")


# --- the trail folder -------------------------------------------------------

def resolve_trail(arg: str | None) -> Path:
    """The folder like build/trail.ts resolveTrailDir: argument, WAYMARKED_TRAIL, or the only trail."""
    name = arg or os.environ.get("WAYMARKED_TRAIL")
    if name:
        d = ROOT / "trails" / name
        d = d if d.exists() else Path(name).resolve()
    else:
        found = [p for p in (ROOT / "trails").glob("*") if (p / "trail.json").exists()]
        if len(found) != 1:
            sys.exit("%s trails under trails/: give the folder or set WAYMARKED_TRAIL" % ("No" if not found else "Several"))
        d = found[0]
    if not (d / "stations").is_dir():
        sys.exit("%s has no stations/ folder" % d)
    return d


class Trail:
    def __init__(self, folder: Path):
        self.dir = folder
        self.route = folder / "route.geojson"
        self.spec_file = folder / "legspec.json"
        self.trace_file = folder / "route-trace.geojson"
        self.spec = json.loads(self.spec_file.read_text(encoding="utf8")) if self.spec_file.exists() else {}
        self.work = CACHE / folder.name
        self.work.mkdir(parents=True, exist_ok=True)

    def station_files(self) -> list[Path]:
        return sorted(p / "station.json" for p in (self.dir / "stations").iterdir() if (p / "station.json").exists())

    def stations(self) -> list[tuple[float, float]]:
        return [tuple(json.loads(f.read_text(encoding="utf8"))["position"]) for f in self.station_files()]

    def trace(self) -> list[list[list[float]]]:
        return lines_of(json.loads(self.trace_file.read_text(encoding="utf8"))) if self.trace_file.exists() else []

    def bbox(self) -> tuple[float, float, float, float]:
        pts = list(self.stations()) + [tuple(p) for l in self.trace() for p in l]
        la0, la1 = min(p[1] for p in pts), max(p[1] for p in pts)
        lo0, lo1 = min(p[0] for p in pts), max(p[0] for p in pts)
        dy = MARGIN_M / 110574
        dx = MARGIN_M / (111320 * math.cos(math.radians(la0)))
        return (round(lo0 - dx, 4), round(la0 - dy, 4), round(lo1 + dx, 4), round(la1 + dy, 4))


# --- geometry ---------------------------------------------------------------

def hav(a, b) -> float:
    la = math.radians((a[1] + b[1]) / 2)
    return math.hypot((a[0] - b[0]) * 111320 * math.cos(la), (a[1] - b[1]) * 110574)


def merc(lon, lat, z):
    n = 2 ** z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n


def lines_of(fc) -> list[list[list[float]]]:
    out = []
    for f in fc["features"]:
        g = f["geometry"]
        out += [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
    return out


def nearest_on_lines(lines, p):
    best = (1e9,)
    la = math.cos(math.radians(p[1]))
    for l in lines:
        for a, b in zip(l, l[1:]):
            ax, ay, bx, by = (a[0] - p[0]) * la, a[1] - p[1], (b[0] - p[0]) * la, b[1] - p[1]
            dx, dy = bx - ax, by - ay
            t = 0 if dx == dy == 0 else max(0, min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy)))
            d = math.hypot(ax + t * dx, ay + t * dy) * 111000
            if d < best[0]:
                best = (d,)
    return best[0]


# --- OSM --------------------------------------------------------------------

def _overpass(query: str) -> bytes:
    for _ in range(6):
        for host in OVERPASS:
            try:
                req = urllib.request.Request(host + "/api/interpreter", data=urllib.parse.urlencode({"data": query}).encode(), headers=UA)
                return urllib.request.urlopen(req, timeout=70).read()
            except Exception as e:  # the public servers fail often; try the next
                print("overpass", host, e, file=sys.stderr)
        time.sleep(4)
    sys.exit("Overpass did not answer; try again later")


def osm(tr: Trail, kind: str, refresh: bool = False) -> list[dict]:
    """kind 'highways' (ways with geometry) or 'features' (named things and trees, for labels)."""
    bb = tr.bbox()
    f = CACHE / ("%s-%s.json" % (kind, hashlib.sha1(repr(bb).encode()).hexdigest()[:10]))
    if refresh or not f.exists():
        box = "%f,%f,%f,%f" % (bb[1], bb[0], bb[3], bb[2])
        if kind == "highways":
            q = '[out:json][timeout:60];way["highway"](%s);out geom;' % box
        else:
            q = ('[out:json][timeout:60];(node["natural"="tree"](%s);nwr["name"](%s);nwr["tourism"](%s);nwr["historic"](%s);)'
                 ';out center tags;') % ((box,) * 4)
        f.write_bytes(_overpass(q))
        print("fetched", kind, "->", f)
    return json.loads(f.read_text(encoding="utf8"))["elements"]


# --- routing ----------------------------------------------------------------

class Router:
    def __init__(self, tr: Trail):
        self.tr = tr
        trace = tr.trace()
        pts = []
        for l in trace:  # densified to ~5 m
            for a, b in zip(l, l[1:]):
                n = max(1, int(hav(a, b) / 5))
                pts += [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n)]
            pts.append(tuple(l[-1]))
        self.grid: dict = {}
        for p in pts:
            self.grid.setdefault((int(p[0] * 2000), int(p[1] * 3000)), []).append(p)
        self.edges = []  # (a, b, factor, highway)
        for w in osm(tr, "highways"):
            t = w["tags"]
            h = t.get("highway")
            foot_yes = t.get("foot") in ("yes", "designated", "permissive")
            if h not in WALKABLE or t.get("foot") == "no" or (t.get("access") in ("private", "no") and not foot_yes):
                continue
            if h == "cycleway" and not foot_yes:
                continue
            f = 2.2 if h == "service" and t.get("service") in ("parking_aisle", "driveway") else WALKABLE[h]
            g = [(round(c["lon"], 6), round(c["lat"], 6)) for c in w["geometry"]]
            self.edges += [(a, b, f, h) for a, b in zip(g, g[1:]) if a != b]
        self.adj: dict = {}
        for a, b, f, h in self.edges:
            m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            w = hav(a, b) * f * (1 + TRACE_W * min(1.0, self.trace_dist(m) / TRACE_D))
            self.adj.setdefault(a, []).append((b, w))
            self.adj.setdefault(b, []).append((a, w))
        self.nodes = list(self.adj)

    def trace_dist(self, p) -> float:
        if not self.grid:
            return 0.0
        best, cx, cy = 1e3, int(p[0] * 2000), int(p[1] * 3000)
        for dx in (-2, -1, 0, 1, 2):
            for dy in (-2, -1, 0, 1, 2):
                for q in self.grid.get((cx + dx, cy + dy), ()):
                    best = min(best, hav(p, q))
        return best

    def snap_edge(self, p):
        best, la = (1e9, None, None, None), math.cos(math.radians(p[1]))
        for a, b, f, h in self.edges:
            if h not in ATTACH_TO:
                continue
            ax, ay, bx, by = (a[0] - p[0]) * la, a[1] - p[1], (b[0] - p[0]) * la, b[1] - p[1]
            dx, dy = bx - ax, by - ay
            L = dx * dx + dy * dy
            t = 0 if L == 0 else max(0, min(1, -(ax * dx + ay * dy) / L))
            d = math.hypot(ax + t * dx, ay + t * dy) * 111000
            if d < best[0]:
                best = (d, a, b, (round(a[0] + (b[0] - a[0]) * t, 6), round(a[1] + (b[1] - a[1]) * t, 6)))
        return best

    @staticmethod
    def dijkstra(adj, s, t, avoid=()):
        dist, prev, h = {s: 0}, {}, [(0, s)]
        while h:
            d, u = heapq.heappop(h)
            if u == t:
                break
            if d > dist.get(u, 1e18):
                continue
            for v, w in adj[u]:
                if avoid and v[0] != "S" and any(hav(v, (x[0], x[1])) < x[2] for x in avoid):
                    continue
                if d + w < dist.get(v, 1e18):
                    dist[v], prev[v] = d + w, u
                    heapq.heappush(h, (d + w, v))
        if t not in dist:
            return None
        path = [t]
        while path[-1] != s:
            path.append(prev[path[-1]])
        return path[::-1]

    def legs(self) -> list[dict]:
        S, spec = self.tr.stations(), self.tr.spec
        att = spec.get("attach", {})
        adj = {k: list(v) for k, v in self.adj.items()}
        snap = []
        for i, p in enumerate(S, 1):
            d, a, b, q = self.snap_edge(tuple(att[str(i)]) if str(i) in att else p)
            node = ("S", i)  # a station joins the network at the nearest point of the nearest path
            adj[node] = [(a, hav(q, a)), (b, hav(q, b))]
            adj[a] = adj[a] + [(node, hav(q, a))]
            adj[b] = adj[b] + [(node, hav(q, b))]
            snap.append((node, q))
            print("station %2d: %3.0f m from the nearest path" % (i, hav(p, q)))
        coord = {n: n for n in adj if n[0] != "S"}
        coord.update({n: q for n, q in snap})
        out = []
        for a in range(1, len(S)):
            sp = spec.get("%d-%d" % (a, a + 1), {})
            stops = [snap[a - 1][0]] + [min(self.nodes, key=lambda k: hav(k, tuple(v))) for v in sp.get("via", [])] + [snap[a][0]]
            pts = []
            for s_, t_ in zip(stops, stops[1:]):
                path = self.dijkstra(adj, s_, t_, [tuple(x) for x in sp.get("avoid", [])])
                if not path:
                    pts = None
                    break
                pts += path if not pts else path[1:]
            if pts is None:
                print("NO PATH %d->%d: drawn straight" % (a, a + 1))
                out.append({"from": a, "to": a + 1, "coordinates": [list(S[a - 1]), list(S[a])], "length": round(hav(S[a - 1], S[a])), "straight": True})
                continue
            c = [list(coord[n]) for n in pts]
            i = 1
            while i < len(c) - 1:  # drop out-and-back spurs (a, b, a)
                if c[i - 1] == c[i + 1]:
                    del c[i:i + 2]
                    i = max(1, i - 1)
                else:
                    i += 1
            L = sum(hav(x, y) for x, y in zip(c, c[1:]))
            out.append({"from": a, "to": a + 1, "coordinates": c, "length": round(L), "straight": False})
            print("leg %2d->%-2d %4d m" % (a, a + 1, round(L)))
        return out


def intended_file(tr: Trail) -> Path:
    return tr.work / "legs_intended.json"


def cmd_route(tr: Trail, dry: bool) -> None:
    legs = Router(tr).legs()
    intended_file(tr).write_text(json.dumps({"legs": legs}))
    line: list = []
    for lg in legs:
        for p in lg["coordinates"]:
            if not line or line[-1] != p:
                line.append(p)
    fc = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": {"type": "LineString", "coordinates": line}}]}
    print("%d legs, one line of %d points" % (len(legs), len(line)))
    if not dry:
        tr.route.write_text(json.dumps(fc, separators=(",", ":")), encoding="utf8")
        print("wrote", tr.route)


# --- the build's own legs ---------------------------------------------------

def build_legs(tr: Trail) -> dict:
    r = subprocess.run(["node", str(ROOT / "src" / "build" / "route-legs.ts"), str(tr.dir)], capture_output=True, text=True, encoding="utf8")
    if r.returncode:
        sys.exit(r.stderr or "node failed (Node 22.18+ needed)")
    return json.loads(r.stdout)


def cmd_legs(tr: Trail) -> None:
    d = build_legs(tr)
    for l in d["legs"]:
        print("  %2d->%-2d %5d m%s" % (l["from"], l["to"], l["length"], "  STRAIGHT" if l["straight"] else ""))
    print("station to route (m):", d["report"]["offRoute"])
    print("bridges:", d["report"]["bridges"], "straight:", d["report"]["straight"])


def cmd_verify(tr: Trail) -> None:
    if not intended_file(tr).exists():
        sys.exit("run `route` first")
    built, want = build_legs(tr)["legs"], json.loads(intended_file(tr).read_text())["legs"]
    bad = 0
    for x, y in zip(built, want):
        dev = max(max(nearest_on_lines([y["coordinates"]], p) for p in x["coordinates"]),
                  max(nearest_on_lines([x["coordinates"]], p) for p in y["coordinates"]))
        flag = "" if dev < 3 and abs(x["length"] - y["length"]) <= 2 and not x["straight"] else "   <-- DIFFERS"
        bad += bool(flag)
        print("%2d->%-2d build %4d m  routed %4d m  max deviation %.1f m%s" % (x["from"], x["to"], x["length"], y["length"], dev, flag))
    print("all legs as routed" if not bad else "%d legs differ: a station attached to another path than intended; add an \"attach\" hint" % bad)


def cmd_explain(tr: Trail, name: str) -> None:
    seg = {}
    for w in osm(tr, "highways"):
        g = [(round(c["lon"], 6), round(c["lat"], 6)) for c in w["geometry"]]
        for a, b in zip(g, g[1:]):
            seg[frozenset((a, b))] = w
    lg = [l for l in json.loads(intended_file(tr).read_text())["legs"] if "%d-%d" % (l["from"], l["to"]) == name][0]
    c, runs = [tuple(p) for p in lg["coordinates"]], []
    for a, b in zip(c, c[1:]):
        w = seg.get(frozenset((a, b)))
        t = w["tags"] if w else {}
        k = (w["id"] if w else None, t.get("highway"), t.get("name"), t.get("surface"), t.get("bridge"), t.get("tunnel"), t.get("foot"))
        if runs and runs[-1][0] == k:
            runs[-1][1] += hav(a, b)
        else:
            runs.append([k, hav(a, b)])
    print(name, lg["length"], "m")
    for k, d in runs:
        print("  %4.0f m  %s  (way %s)" % (d, " ".join(str(x) for x in k[1:] if x), k[0]))


def cmd_place(tr: Trail, n: int, lon: float, lat: float) -> None:
    f = tr.station_files()[n - 1]
    s = f.read_text(encoding="utf8")
    new, k = re.subn(r'("position"\s*:\s*\[\s*)[-0-9.]+(\s*,\s*)[-0-9.]+',
                     lambda m: "%s%.6f%s%.6f" % (m.group(1), lon, m.group(2), lat), s, count=1)
    if k != 1:
        sys.exit("no position in %s" % f)
    with open(f, "w", encoding="utf8", newline="") as fh:
        fh.write(new)
    print("station %d -> %.6f, %.6f" % (n, lon, lat))


# --- pictures ---------------------------------------------------------------

def _tile(layer: str, z: int, x: int, y: int) -> bytes:
    f = CACHE / "tiles" / layer / str(z) / str(x) / ("%d.jpg" % y)
    if not f.exists():
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(urllib.request.urlopen(urllib.request.Request(TILES[layer].format(z=z, x=x, y=y), headers=UA), timeout=60).read())
    return f.read_bytes()


def draw(out: Path, bb, pad_m, layer="lk", zoom=18, scale=1, legs=(), osm_lines=(), stations=(), labels=(), cand=()):
    """bb = (lon0, lat0, lon1, lat1). zoom is the detail wanted: the Landeskarte is fetched at 18 and enlarged."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        sys.exit("pip install pillow")
    zt = min(zoom, MAX_ZOOM[layer])
    k = 2 ** (zoom - zt) * scale  # enlargement of a tile pixel
    la = bb[1]
    pad = (pad_m / (111320 * math.cos(math.radians(la))), pad_m / 110574)
    x0, y1 = merc(bb[0] - pad[0], bb[1] - pad[1], zt)
    x1, y0 = merc(bb[2] + pad[0], bb[3] + pad[1], zt)
    tx0, tx1, ty0, ty1 = int(x0), int(x1), int(y0), int(y1)
    im = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            im.paste(Image.open(io.BytesIO(_tile(layer, zt, tx, ty))).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
    box = [int(v) for v in ((x0 - tx0) * 256, (y0 - ty0) * 256, (x1 - tx0) * 256, (y1 - ty0) * 256)]
    im = im.crop(box).resize((int((box[2] - box[0]) * k), int((box[3] - box[1]) * k)), Image.LANCZOS)
    dr = ImageDraw.Draw(im, "RGBA")
    try:
        font = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font = ImageFont.load_default()

    def px(p):
        X, Y = merc(p[0], p[1], zt)
        return ((X - x0) * 256 * k, (Y - y0) * 256 * k)
    for l, col in osm_lines:
        dr.line([px(p) for p in l], fill=col, width=3)
    for lg in legs:
        dr.line([px(p) for p in lg["coordinates"]], fill=(255, 120, 0, 215), width=9)
    for c in cand:
        dr.line([px(p) for p in c], fill=(255, 0, 255, 255), width=5)
    for i, s in stations:
        q = px(s)
        if -50 < q[0] < im.width + 50 and -50 < q[1] < im.height + 50:
            dr.ellipse([q[0] - 12, q[1] - 12, q[0] + 12, q[1] + 12], fill=(255, 255, 0, 255), outline=(0, 0, 0, 255), width=3)
            dr.text((q[0] + 15, q[1] - 15), str(i), fill=(0, 0, 0, 255), font=font, stroke_width=3, stroke_fill=(255, 255, 255, 255))
    for p, txt in labels:
        q = px(p)
        dr.ellipse([q[0] - 5, q[1] - 5, q[0] + 5, q[1] + 5], outline=(0, 255, 255, 255), width=3)
        dr.text((q[0] + 8, q[1] + 4), txt, fill=(0, 0, 0, 255), font=font, stroke_width=2, stroke_fill=(0, 255, 255, 255))
    mpp = 156543.03 * math.cos(math.radians(la)) / 2 ** zt / k
    dr.rectangle([20, im.height - 40, 20 + 50 / mpp, im.height - 30], fill=(0, 0, 0, 255))
    dr.text((20, im.height - 75), "50 m   orange = leg as the build computes it, blue = OSM paths, yellow = stations",
            fill=(0, 0, 0, 255), font=font, stroke_width=2, stroke_fill=(255, 255, 255, 255))
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out)
    return im


def osm_overlay(tr: Trail):
    cols = {"footway": (0, 110, 255, 230), "path": (0, 110, 255, 230), "steps": (150, 0, 200, 230), "pedestrian": (0, 170, 200, 230),
            "track": (0, 150, 0, 230), "cycleway": (0, 170, 200, 230)}
    return [([(g["lon"], g["lat"]) for g in w["geometry"]], cols.get(w["tags"].get("highway"), (110, 110, 110, 200))) for w in osm(tr, "highways")]


def cmd_render(tr: Trail, names, aerial, with_osm, intended, overview, out: Path) -> None:
    legs = json.loads(intended_file(tr).read_text())["legs"] if intended else build_legs(tr)["legs"]
    st = list(enumerate(tr.stations(), 1))
    layer = "lb" if aerial else "lk"
    ov = osm_overlay(tr) if with_osm else []
    todo = [("overview", legs)] if overview else [("%02d-%02d" % (l["from"], l["to"]), [l]) for l in legs if not names or "%d-%d" % (l["from"], l["to"]) in names]
    for name, ls in todo:
        c = [p for l in ls for p in l["coordinates"]]
        bb = (min(p[0] for p in c), min(p[1] for p in c), max(p[0] for p in c), max(p[1] for p in c))
        extent = max(hav((bb[0], bb[1]), (bb[2], bb[1])), hav((bb[0], bb[1]), (bb[0], bb[3]))) + 70
        z = 18 if not aerial else 19
        sc = max(1, int(1500 * 0.404 / extent * 2 ** (z - 18)))  # about 1500 px on the long side
        f = out / ("leg_%s%s.png" % (name, "_air" if aerial else "")) if not overview else out / "overview.png"
        draw(f, bb, 35, layer, z, sc if not overview else 1, ls, ov, st)
        print(f)


def cmd_view(tr: Trail, n: int, radius: float) -> None:
    from PIL import Image  # noqa: F401  (clear error from draw otherwise)
    S = tr.stations()
    p = S[n - 1]
    ov = []
    for e in osm(tr, "features"):
        t = e.get("tags", {})
        c = (e["lon"], e["lat"]) if e["type"] == "node" else (e["center"]["lon"], e["center"]["lat"])
        if hav(c, p) > radius * 1.5:
            continue
        if t.get("species"):
            ov.append((c, t["species"][:14]))
        elif "name" in t and not t.get("shop") and t.get("amenity") not in ("restaurant", "cafe", "fast_food", "bar", "pharmacy", "parking") and (e["type"] != "way" or "building" in t):
            ov.append((c, t["name"][:22]))
    out = tr.work / "view"
    a = draw(out / "_a.png", (p[0], p[1], p[0], p[1]), radius, "lk", 20, 1, (), (), [(n, p)], ov)
    b = draw(out / "_b.png", (p[0], p[1], p[0], p[1]), radius, "lb", 20, 1, (), (), [(n, p)], ov)
    im = Image.new("RGB", (a.width + b.width + 10, a.height), "white")
    im.paste(a, (0, 0))
    im.paste(b, (a.width + 10, 0))
    f = out / ("station_%02d.png" % n)
    im.save(f)
    print(f)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["fetch", "route", "verify", "render", "view", "explain", "place", "legs"])
    ap.add_argument("args", nargs="*", help="leg names A-B (render, explain), or N [radius] (view), or N lon lat (place)")
    ap.add_argument("--trail", help="trail folder (name under trails/, or a path)")
    ap.add_argument("--dry", action="store_true", help="route: do not write route.geojson")
    ap.add_argument("--aerial", action="store_true", help="render: Luftbild instead of Landeskarte")
    ap.add_argument("--osm", action="store_true", help="render: draw the OSM paths")
    ap.add_argument("--intended", action="store_true", help="render: the routed legs, not what the build computes from route.geojson")
    ap.add_argument("--overview", action="store_true", help="render: the whole trail in one picture")
    ap.add_argument("--out", help="render: output folder (default .cache/route/<trail>/out)")
    ap.add_argument("--refresh", action="store_true", help="fetch: download again")
    a = ap.parse_args()
    tr = Trail(resolve_trail(a.trail))
    if a.command == "fetch":
        osm(tr, "highways", a.refresh)
        osm(tr, "features", a.refresh)
    elif a.command == "route":
        cmd_route(tr, a.dry)
    elif a.command == "verify":
        cmd_verify(tr)
    elif a.command == "legs":
        cmd_legs(tr)
    elif a.command == "explain":
        cmd_explain(tr, a.args[0])
    elif a.command == "place":
        cmd_place(tr, int(a.args[0]), float(a.args[1]), float(a.args[2]))
    elif a.command == "view":
        cmd_view(tr, int(a.args[0]), float(a.args[1]) if len(a.args) > 1 else 50)
    elif a.command == "render":
        cmd_render(tr, set(a.args), a.aerial, a.osm, a.intended, a.overview, Path(a.out) if a.out else tr.work / "out")


if __name__ == "__main__":
    main()
