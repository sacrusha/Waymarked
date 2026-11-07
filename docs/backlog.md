# Backlog

## Purpose

A trail's website that strangers use, untrained, for two to four hours in
their lives: planning at home, walking between stations, reading at a
station, browsing afterwards, arriving mid-trail from a sign. One fluid
surface serves all of these; nothing the visitor has built up (where am I,
what is around, where was I reading) is thrown away by a page change. The
map lets the half of people who are weak at reading maps navigate
physically, with GPS. The engine is generic; a trail is a folder of content,
so another trail is a fork with its folder replaced.

## Situation

- Engine in `src/`, trails in `trails/<id>/`; `src/` never names a trail.
  The trail folder is the fork interface; its layout is documented in
  docs/design/trail-content.md by whoever builds the content pipeline.
- First trail: Stadtnaturweg Baden (AG), 15 placards by NAVO (Natur- und
  Vogelschutzverein Baden/Ennetbaden), supported by the city of Baden.
  Source PDFs and their extraction: `.tmp/BadenDrafts/` (git-ignored).
  The trail folder holds the placard texts and photos with credits, the
  leaflet's intro and station list, generated audio, and a route of 3.25 km
  routed leg by leg over OSM footways with `src/build/route-trail.py`
  (docs/design/trail-content.md); the leaflet's hand-drawn line is kept as
  intent (`route-trace.geojson`), confirmed corrections in `legspec.json`.
  Station dots sit on the objects they name where those could be told from
  the Landeskarte and Luftbild (1–5, 8, 11, 14), else at the leaflet's pin.
  Nothing has been checked on the ground yet; the placards' own positions
  are not known.
- Rights: our partner acquired the rights to publish the Baden content. The
  framework starts with a real trail rather than a mock one because a real
  trail gives access to real user feedback. When Waymarked becomes a generic
  framework used by others, the Baden trail is replaced with a mock trail
  and purged from the GitHub history; it lives in one folder so the purge is
  one path. Photo credits are per image (including CC BY-NC-SA 4.0 from
  Infoflora on placards 11 and 12) and travel with the content; the leaflet
  names no photographers.
- Map: swisstopo, free, no key, attribution required, fair use (their
  example: 20,000 users a day). Raster WMTS in EPSG:3857 (pixelkarte-farbe,
  -grau, swissimage) is the classic look; vector styles (basemap,
  lightbasemap, imagerybasemap at vectortiles.geo.admin.ch) keep labels
  upright when the map rotates. Baden defaults to the Landeskarte
  (docs/design/surface.md, Basemap). Generic trails default to an OSM-based
  basemap.
- Between stations 12 and 13, down at the river, a lift leads up to the
  railway station, both ways: a quick way off the trail, and a quick way
  on for visitors arriving by train, who enter at 12 or 13 and may walk
  the trail backwards. The lift takes about 3 minutes in a normal worst
  case (no queue).
- Stack: Vite, TypeScript, MapLibre GL (needs WebGL2: iOS 15+), static
  build, GitHub Pages via Actions; development mostly on local previews.
  UI framework is the implementer's call, within forkability.
- Content is German; the site toggles languages; machine translations
  (English and French, by Claude, unreviewed) demonstrate the function.
- The placards and leaflet print www.navobaden.ch/stadtnaturweg with a QR
  code and info/map/headphones icons: an existing offering, not yet looked
  at.
- First audience: NAVO members, who receive the demo and give feedback.
  The impressive deliverable for them comes before everything generic.
- Forkers have an environment like ours (Claude Code, Opus or better), so
  fork instructions address an AI with the person beside it. The
  generic/specific separation is architecture from version 1 on; the
  framework version is a check, not a build.
- Design of the one screen: docs/design/surface.md; the trail's look:
  docs/design/brand.md; browsers and devices out of spec, and what the
  site does when a capability fails: docs/design/robustness.md; shell,
  content framework and content: docs/design/layers.md.

## Versions

Each ends with a working site more useful than the last. Items state the
purpose they serve; how is the implementer's.

State: 1–5 are built, reviewed and pushed to github.com/sacrusha/Waymarked;
`npm run check`, `npm run build` and `route-trail.py verify` pass. Verified
in headless browsers and by the user on desktop and Android (Samsung
browser): flow, camera, audio voices, navigation against the bounds. The
site deploys to sacrusha.github.io/Waymarked through the Pages workflow.
Not yet: a ground test in Baden, iOS.

### 1. Walkable surface — the interaction model can be tested on phones in Baden

- Map (swisstopo) with the 15 numbered stations and the route; selected,
  previous and next distinguishable.
- The sheet: item 0 (the trail) and one card per station with title and the
  leaflet's Standort/Gegenstand/Thema; prev/next; a marker tap selects;
  "Next" at a card's end collapses the sheet.
- Portrait: scroll-driven sheet over a fixed map. Landscape and desktop:
  side by side with a draggable divider. One DOM.
- Selected station in the URL, so screen-lock and reload land where the
  visitor was, and a sign's QR code can deep-link.
- Deployed to GitHub Pages; `npm run dev` for local previews.

### 2. The placards in the sheet — the site replaces carrying the leaflet

- Full placard texts, photos with captions and credits, item 0 from the
  leaflet's intro.
- The city's design as the trail's brand; Waymarked's own mark a footer line.

### 3. Audio — a station can be listened to instead of read

- Per-station audio in the card, usable while walking (plays on, screen
  locked). Demonstration with pre-generated speech files from the placard
  texts through Microsoft's neural voices via edge-tts (unofficial
  endpoint, fine for a demo; the official Azure service has the same voices
  for production). German is read by de-DE Seraphina at +8 %: the two Swiss
  Standard German voices were judged weaker in a listening test, and 0 %
  too slow. Real recordings would replace the files, same slot. The spoken
  "Station n" could become the sign's own label ("Tafel n"), a content call
  that remakes every file.

### 4. Walking help — the map-weak half can walk it

- You-are-here with heading cone; follow mode; heading-up rotation.
- Arrow and distance to the next station in the sheet's peek state.
- Compass permission flow (iOS needs a gesture) and GPS-course fallback.

### 5. Languages — a visitor who doesn't read German can use it

- Language toggle; the content model carries languages per field from
  version 1 on.
- Machine translations (Sonnet) as the demonstration.

### 6. Framework check — someone else can fork it for their trail

- Mock trail, README with fork instructions for an AI, docs/ as CLAUDE.md
  lays out.
- Baden purged from the GitHub history (Situation: rights). The purge is
  one path for content; the backlog and design docs cite Baden throughout
  and need their examples replaced.
- Legs taken as given: `route-trail.py` could write one feature per leg so
  the build uses them instead of re-deriving legs from one merged line and
  checking the two against each other (`verify`, `legs_intended.json`);
  derivation would remain only for traced fragments. Simpler, and it
  touches the route section of docs/design/trail-content.md.

### 7. Offline — tiles and content survive dead spots

### 8. QR codes — printable per-station codes for the signs

## Later, unordered

- Report a problem: a link on the site that opens a report with what the
  visitor saw and the state that explains it (station, language, device and
  browser, screen size, location on or off); at first it goes directly to
  GitHub as an issue. A GitHub issue needs an account and is public, which
  limits who reports and what a report may carry (no position).
- Wildlife integration: bird watching, sightings, species information.
- Seasonal content: what is to be seen now (Alpensegler from April,
  Lerchensporn in early spring). Sources, licences and options for both:
  docs/notes/wildlife-and-seasons.md.
- Easy wins in content: more on the Stadtturm and similar additions beyond
  the placards.
- Walking time from where the visitor is — what is left to the next
  station or the trail's end, at the fixed pace of the precomputed times
  (docs/design/trail-content.md, route.geojson). It belongs near
  "Next", with the way's arrow and distance. A visitor off the route needs
  a time from anywhere, which may want a pathing grid precomputed at build
  time rather than routing on the phone.
- A static map image generated at build time (tiles over the trail's
  extent, the route and numbered stations, attribution in the image): what
  the map's place shows where a device can't run the map
  (docs/design/robustness.md), the preview image of a shared link, the page
  without JavaScript, a print view, perhaps a last resort offline.
- Getting away: from the current location directly to 12 or 13 and the
  lift to the railway station; "the next train I can reasonably catch".

## Open

- Image licensing for the public site beyond the demo (CC BY-NC-SA items,
  individual photographers): with the partner.
- The leaflet's cover photo, item 0's cover on the site, has no credit.
- Placard 3's small photo: the site credits Hugo Bischof as the legible
  print does; an invisible stale layer in the PDF says BirdLife Schweiz.
  For NAVO to confirm.
- Print errors corrected on the site, for NAVO to know: Tafel 1 "aus 20
  Metern Höhe", Tafel 3 "über 100 Kilometern pro Stunde"; the leaflet's
  "Bergaster" and "Bergstelze" follow the placards (Berg-Aster,
  Gebirgsstelze). The leaflet names a Flaumeiche at station 9 that the
  placard never mentions.
- Placard 15's large photo is Infoflora's (Christophe Bornand) without a
  printed licence; 11 and 12 print CC BY-NC-SA 4.0 for theirs.
- Station 9: the leaflet's list says Schartenfels, its photo caption "Der
  westliche Lägernkopf (9)". The intro promises two viewpoints; only 9 is
  named as one.
- The route is routed over OSM paths and unchecked on the ground; the
  router's own doubts per leg: the out-and-back at the ruin (1→2, 2→3),
  the passage between the Pfaffechappe wings (4→5), the riverside
  walkway's public stretch (10→11), the Kurpark's north entrance (14→15).
- A station's dot marks the object (what you look at) where it could be
  identified, else the leaflet's pin; the placard (where you stand) is
  what "arrived" wants. One position per station so far.
- Whether the trail is signposted on the ground, which decides how much
  navigation the site carries between stations.
- Walking help, untested on the ground: compass steadiness, "Hier: n" at
  25 m with the 6/7 pair 17 m apart, whether the locate button's first
  tap should only follow rather than also turn the map, whether a
  walker with the sheet raised minds lowering it to reach the locate
  button (the controls slide out as the map strip shrinks), and whether
  30 s is the right age for a fix to go stale (the dot grey, the way and
  "Hier" withdrawn until the next fix).
- CLAUDE.md's layout names `docs/brand/`, `docs/user-flow.md` and
  `secrets/`, none of which exist; the brand doc is docs/design/brand.md
  and deploys need no local credentials. The user's file.
- German speech: the current files ("Hier ist Station n: Titel.", short
  paragraph openers joined by a comma; docs/design/trail-content.md, Making
  the speech) are checked only by a speech recognizer, not yet by ear;
  item 0's "Stadt-Naturweg" reads only weakly as German there.
- Translations (en, fr) are unreviewed, and so are the French short titles
  of stations 1, 2, 4, 8 and 12 (Claude's, where the French titles were cut
  off in the card's head); the English and French voices
  mispronounce German names. The machine-translation note opens every card
  in a marked language, possibly more than a visitor needs.
- The "STADT BADEN" administrative logo sits in item 0's footer on the
  reading that the partner's okay for "Baden ist." covers it.
- Item 0 links to www.navobaden.ch/stadtnaturweg, the printed address,
  which does not exist yet. The leaflet's NAVO box text is not in item 0.
