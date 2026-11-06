# The trail folder

## Purpose

Everything that makes the site one particular trail lives in one folder,
`trails/<id>/`; the engine in `src/` reads it and never names a trail. This
folder is the fork interface: another trail's site is this repository with
the folder replaced, and removing a trail (Baden, when the framework goes
public) is removing one path. Its layout is written for an AI filling it from
a trail's leaflet, placards and tracks, with the trail's person beside it.

## Situation

- Sources are printed: a leaflet with a map and a station list, placards with
  text and photos, sometimes a GPX track. Positions and routes are traced or
  georeferenced, so they are approximate, and a route often arrives as
  unordered fragments rather than one line.
- The site carries languages per field from the start, so every text has
  room for more languages without a change of shape. Visitors who don't read
  the trail's language (Baden: German) are served by translations; a
  publisher rarely has them, and one made by machine is useful at once and
  can be wrong (Languages, below).
- Photos carry their own credits and licences, which travel with them.
- One build makes one trail's site.

## Layout

```
trails/<id>/
  trail.json             the trail: item 0 of the sheet, map, theme
  text.<lang>.md         item 0's text (optional)
  audio.<lang>.mp3       item 0's text spoken (optional)
  audio.json             what build/make-audio.py made, and from which text
  route.geojson          the route as drawn (optional)
  route-trace.geojson    the route as traced from the printed map; input of build/route-trail.py (optional)
  legspec.json           corrections to the routing: via points, hints (optional)
  theme.css              the trail's look beyond its colours (optional)
  <image files>          item 0's photos, cover and logos, named in trail.json
  stations/
    01-<slug>/
      station.json       one station
      text.<lang>.md     its text (optional)
      audio.<lang>.mp3   its text spoken (optional)
      <image files>      its photos, listed in station.json
    02-<slug>/
    ...
```

**Texts** are objects keyed by language code, `{ "de": "…", "en": "…" }`. The
first code in `trail.json` `languages` is the source language and must be
present wherever a text is required; other languages may be missing, and the
site falls back to the source language.

**Order and numbers.** Station folders sort by name; the n-th folder is
station n, and n is the number on the map marker, in the URL (`#7`) and, on a
real trail, on the signs. So folders are named with a two-digit prefix in
walking order; the slug after it is only for people.

### trail.json

| Field | | |
|---|---|---|
| `languages` | required | Language codes; the first is the source language. With more than one, the site shows a language toggle (Languages, below). |
| `machineTranslated` | list | The languages, other than the source, whose texts are machine translations nobody has reviewed. The cards in those languages say so. |
| `title` | required, text | The trail's name. Page title and item 0's heading. |
| `shortTitle` | text | Item 0's heading where room is short (as a station's). |
| `subtitle` | text | One line under the title; also the page description. |
| `publisher` | text | Who publishes the trail, shown at the end of item 0. |
| `duration` | text | Walking time as the publisher states it. Not derived. |
| `gettingThere` | text | How to reach the start. |
| `links` | list | `{ "label": text, "url": "…" }`, shown in item 0. |
| `stationFields` | list | The short facts every station card shows, in order: `{ "key": "…", "label": text }`. The keys are the trail's own (Baden: `standort`, `gegenstand`). |
| `images` | list | Photos for item 0, as for stations. |
| `theme` | object | `accent` (markers, route) and `accentDark` (selection, buttons, the favicon; must carry white text), as `"#rrggbb"`. |
| `signLabel` | text | How the trail's signs name a station, with `{n}` for its number and Markdown bold (Baden: `"Stadtnaturweg **Tafel {n}**"`). Opens each station card, so a visitor standing at a sign sees the card is the sign's. |
| `mark` | logo | The trail's or its publisher's mark, as a footer logo below: beside the sign label on each station card, and on the cover (without one, at the top of item 0). |
| `cover` | image | One photo, as in `images`, that opens item 0 edge to edge. |
| `footer` | object | The end of item 0, who stands behind the trail: `logos`, a list of `{ "file": "navo.png", "alt": text, "url": "…" }` (`url` optional, the logo links there), and `text`, a text in Markdown. Below it the engine adds its own one line. |
| `map.basemaps` | list | The basemaps, first is the default; with more than one the map shows a toggle. Each is `{ "label": text, "style": "<MapLibre style URL>" }` for vector tiles, or `{ "label": text, "tiles": ["…/{z}/{x}/{y}.jpeg"], "tileSize": 256, "maxzoom": 19, "attribution": "<HTML>" }` for raster tiles. Without any, the engine uses an OSM-based vector map. |
| `map.margin` | number | Metres the map may show beyond the trail's extent (stations and route). Default: the larger of 1.5 km and half the extent. The minimum zoom follows from it: the bounded area spans about a phone's width. |

### Languages

Purpose: a visitor who doesn't read the trail's language can use it, at the
station and at home, and is told how far to trust what they read.

**What a language is.** A code in `languages`, and for each text the
language's entry: `title`, `fields`, captions and alts, item 0's fields and
`text.<lang>.md`, and optionally `audio.<lang>.mp3`. Nothing needs all of it:
what a language lacks, the card shows in the source language. Texts that are
the trail's own words stay in the source language by leaving the other
entries out. Baden's `signLabel` ("Stadtnaturweg **Tafel 3**") is what the
signs print, so the card shows it as the sign does, in German, in every
language; the same goes for the logos' names. The site's own words (buttons,
hints) are `app/strings.ts`, in German, English and French; a language the
engine has no strings for gets English. `npm run check` lists per language
what is missing.

**Which language opens.** The address's `?lang=en` if the trail has it (a
link or a sign's QR code can name a language); else the visitor's earlier
choice; else the first of the browser's languages the trail has; else English
if the trail has it, else the source language.

**The toggle.** In every card's title row: the current code and a ∨
("DE ∨"); a tap opens the device's own picker with the languages by their
own names ("Deutsch", "English", "Français") (docs/design/surface.md,
Language). A choice is remembered. Changing language
reloads the page, after saving where the visitor is (station, sheet, map
view), which is why the map, card, walking help and the audio player need no
live switching; playing audio stops.

**Machine translations.** Marked by `machineTranslated` in `trail.json`,
per language. Every card whose text is shown in a marked language opens with
a note, "Machine translation (original: German), not checked by the
publisher. It may contain errors.", with a button to the original. The note
is the site's words in the visitor's language; it is the same pattern as the
synthetic-voice note under the player, which stays: audio in a marked
language is a synthetic voice reading a machine translation. A language
leaves the list when a person who knows it has reviewed all of its texts;
the note then goes. Baden's English and French are Claude's translations of
the German placards; nobody who knows the species or the languages has read
them. They give the common names of animals and plants in the language, and
keep place names as the signs print them, with a short gloss where the
name's meaning helps ("Landvogteischloss (bailiffs' castle)").

### theme.css

The trail's look beyond its two colours: the engine loads it after its own
stylesheet, and `url()`s in it resolve next to it. It sets the engine's
tokens on `:root` (`--font`, `--heading` for titles and headings, `--ink`,
`--muted`, `--paper`, `--wash`, `--line`, `--radius`) and may restyle the
card's classes. The site follows the device into dark (docs/design/brand.md,
Dark), and a token set on `:root` holds in both: a colour the theme sets
needs its dark value too, in `@media (prefers-color-scheme: dark)` after
it (Baden's does so). The card body's classes are the content
framework's (src/app/content/, docs/design/layers.md), its styles still in
src/app/style.css, so an engine change can move them; photos carry `data-shape` (`square`,
`portrait`, `landscape`) and the first is `.photo-lead`, the rest inside
`.photo-insets`. Baden's reproduces its placards (docs/design/brand.md).

### station.json

| Field | | |
|---|---|---|
| `title` | required, text | The station's heading (Baden: the placard's title, the leaflet's Thema). |
| `shortTitle` | text | The title in fewer words, for where room is short: the card's head (two lines beside the language choice) and the lock screen while it plays. The title stays everywhere else (the station list, "Next", the page title, the spoken intro). A language without one shows its own title; `npm run check` lists titles over about 36 characters that have none. Baden's are French only, where the translations ran long. |
| `position` | required | `[longitude, latitude]`, WGS84 degrees, GeoJSON order. |
| `fields` | object | Values for the trail's `stationFields`, by key; each a text. Keys not declared there are an error. |
| `images` | list | `{ "file": "turmfalke.jpg", "caption": text, "alt": text, "credit": "…", "license": "…" }`. `file` is next to `station.json` (JPEG, PNG, WebP, GIF or SVG); `alt` defaults to the caption; the build reads each photo's size from the file, so the card reserves its space and knows its shape. The card shows them after the text as one group: the first large, the rest as insets after it, the caption with each, and one line naming each credit and licence with the captions of its photos. |

### text.&lt;lang&gt;.md

The long text of an item (a placard's text, the trail's introduction), one
file per language, in Markdown. Bold carries what the placard prints bold
(Baden: species names).

### audio.&lt;lang&gt;.mp3

Purpose: a visitor can listen to an item instead of reading it, walking with
the phone in a pocket. The slot is `audio.<lang>.mp3` next to the
`text.<lang>.md` it speaks, one per language, MP3 because every browser plays
it. A file in the slot is all the site needs: the card then shows a player
(the site's words: `strings.ts`), and the browser's media controls, lock
screen included, show the item's number and title. No `station.json` entry.
An item with no file shows no player.

The language rule follows the text's: the card plays the file of the language
it shows. Where an item has no text in the visitor's language and the card
shows the source language's text, it plays the source language's file; where
it has the text but no file, there is no player, never speech that doesn't
match the screen.

Two kinds of file fill the slot, and the card tells them apart: a real
recording (put there by hand), and speech made by `build/make-audio.py`, which
lists every file it made in `audio.json`, with its size, and which the card
marks "read aloud by a synthetic voice". A file of another size than the one
listed is a recording put over a made file: the card shows it as a recording,
and the script never overwrites a file it did not make
(`--overwrite-recordings` says otherwise).

**Making the speech.** The script speaks, per `text.<lang>.md`, the item's
title ("Station 7. Title." for a station, so the listener can match the sign)
and the text with its Markdown removed, through Microsoft's neural voices via
`edge-tts` (an unofficial endpoint, no key: right for a demonstration; the
official Azure service has the same voices for production). Reproduce:

```
pip install edge-tts
python src/build/make-audio.py           # new and changed texts only
python src/build/make-audio.py --force   # everything again
python src/build/make-audio.py --dry-run # print what would be spoken
```

It needs the network and Python 3.10 or newer; it is incremental by a hash of
title and text recorded in `audio.json`, together with voice, rate and
pronunciation. Settings are the optional `audio` object in `trail.json`, read
by the script only:

| Field | | |
|---|---|---|
| `audio.voices` | object | Voice per language code. Defaults: `de` de-CH-LeniNeural (Swiss Standard German), `en` en-GB-SoniaNeural, `fr` fr-CH-ArianeNeural, `it` it-IT-ElsaNeural. `edge-tts --list-voices` lists them. |
| `audio.rate` | text or object | Speaking speed in edge-tts syntax, one value or one per language code. Default `-5%`. |
| `audio.say` | object | Pronunciation: written text → text to speak, where the voice gets a word wrong (Baden: `NAVO` → `Navo`). A value may itself be an object by language code, where the words differ (`"Baden/Ennetbaden": { "de": "Baden und Ennetbaden", "en": "Baden and Ennetbaden" }`). |

`npm run check` reports per language how many items have audio, the size, the
items whose text changed since the speech was made (run the script again) and
the items without audio.

### route.geojson

A GeoJSON FeatureCollection of LineStrings or MultiLineStrings: one ordered
line or any number of unordered fragments. It is drawn as it is, except that
a stretch it passes twice (there and back) is drawn once, so its dashes stay
dashes. For the leg
from each station to the next (its highlight on the map, the distance in the
card), the build joins the fragments into one network, bridging gaps of up
to 60 m between a fragment's end and another fragment, attaches each station
at its nearest point on it, and takes the shortest path. Where no path
exists, the leg is a straight line and the check says so. The trail's length
is the sum of its legs, from station 1 to the last.

#### Routing the legs over real paths

A printed map's route is intent: hand-drawn, schematic, and a traced copy of it
follows the drawing, not the paths people walk (at Baden it ran along a road for
cars where pedestrians take a footpath under a bridge). A visitor uses the line
to find the next station, so it has to be what is walked. `build/route-trail.py`
(Python 3.10+, Node 22.18+, `pip install pillow` for the pictures) does that
from the stations and OpenStreetMap:

1. Put the traced route in the folder as `route-trace.geojson` (optional) and
   place each station on the object it names, not beside it: a building's
   roof, a tree's crown, the river's bank. `view N` shows station N over the
   map and the aerial side by side (below), with OSM's named things; where a
   path runs under tree canopy the two together show it.
   `place N lon lat` moves a station.
2. `fetch` downloads the OSM paths around the trail (cached in `.cache/route/`,
   git-ignored). `route` routes every leg over them: footways and steps are
   cheapest, streets cost more, roads with no foot access are closed, and a
   path far from the trace costs more, so the trace only decides between
   paths that exist. It writes `route.geojson` as one ordered line: the
   build's bridging of fragment ends makes shortcuts through blocks, which one
   line avoids, and a stretch walked twice (Baden's legs 5 to 6 and 7 to 8) is
   in the line twice.
3. `verify` recomputes the legs the way the build does and compares them
   with what was routed; `render` draws every leg over the map
   (`--aerial` over the aerial, `--osm` with the OSM paths) for someone who
   knows the ground to check. `explain A-B` lists the OSM ways a leg runs on.
4. A correction goes into `legspec.json` and `route` runs again: `via`
   (the leg passes these points), `avoid` (it keeps out of these circles),
   `attach` (where a station meets the path, when its nearest path is not the
   one to walk). The file is the record of what a person who knows the ground
   said; every leg is routed again from it and the trace.

The pictures are drawn on the trail's raster basemaps (`map.basemaps` entries
with `tiles`): the first is the map, the next the aerial (Baden: the
Landeskarte and the Luftbild). A trail without a raster basemap is drawn on
OpenStreetMap's map and has no aerial. The routing works wherever OSM maps the
paths.

## Building and checking

In `src/`: `npm run check` loads the folder as the build would, reports
errors by file and field, and prints each leg's length, each station's
distance to the route, the gaps it bridged, and the map's bounds, so a wrong join shows before
it shows on the map. It also lists the fields the format doesn't know, most
likely typos; they are ignored, and the build warns about them too. `npm run dev` serves the site and reloads when a file
in the folder changes; `npm run build` writes it to `src/dist/`.

On a phone in the same network, location and the compass need a secure page,
which `http://<computer>:5173` is not. `npm run dev:https` serves the same
site over https on port 5443, beside `npm run dev`, with a self-signed
certificate: the phone warns once that the connection is not private (go on
via Advanced, or Show Details on iOS), and the certificate is kept between
starts (`src/node_modules/.vite-https/`), so it stays accepted until
node_modules is renewed or a year has passed. Vite prints the address to
open (`Network: https://…:5443/`).

The build uses the only folder under `trails/` that has a `trail.json`; with
several, the environment variable `WAYMARKED_TRAIL` names one (a folder name
under `trails/`, or a path, relative to the repository). The Pages workflow reads it from the repository
variable of the same name.

## Not known

- Whether the marking per language is fine enough once people review only
  some of a language's texts, and whether the note above every card is more
  than a visitor needs after seeing it once.
- Whether a translation outlives a change to the source text: the speech
  records a hash of its source and the check says when it is out of date,
  translations have no such record.
- How the voices sound when an English or French voice reads German names
  (Stadtturm, Bezirksgebäude, Schartenfels); nobody has listened through yet.
- How the synthetic voice sounds to a Swiss listener on the Baden texts
  (species names, `NAVO`, the pace); nobody has listened through yet.
- Whether leg distances from a traced route are close enough to guide by;
  Baden's are unchecked at branches (backlog, Open). Routed over OSM paths
  (above) the legs follow what pedestrians walk, but only a person who knows
  the ground can say so: the pictures from `render` are for that.
- Where OSM lacks a path that exists (a riverside walkway, a track under
  canopy), the router cannot take it; the leg then follows the paths that are
  mapped.
