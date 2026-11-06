# Robustness

## Purpose

Strangers use the site untrained, on whatever phone and browser they carry,
outdoors, for a few hours (docs/backlog.md, Purpose). A failure there is
not reported to us; the visitor just walks off with the leaflet or without
it. So every capability the site leans on (the map, location, the compass,
audio, storage) has a fallback that keeps the rest working and says in one
line what is missing, and browsers that depart from the specs are met where
their departure is known.

## Situation

- The cards are the leaflet: texts, photos, audio. Every other capability
  is help on top of them, and none of them may take the cards down.
- Visitors arrive from a sign's QR code: through the phone's camera app,
  Google Lens, or a messenger. Some of these open the site in their own
  in-app browser (a webview), which may refuse location or the compass
  without asking, keep no storage between visits, and stop audio when the
  screen locks.
- Switzerland has switched 3G off, which in the user's assessment retires
  phones from 2017 and earlier among the visitors here; devices that can't
  run the map are rare enough that saying so is sufficient for now
  (a static map: docs/backlog.md, Later).
- There is no telemetry and no device lab: a Samsung phone (Samsung
  Internet, Chrome), desktop browsers, and headless Chromium/Edge for
  scripted checks. iOS is known from documentation and model knowledge
  only.
- Known departures from the specs, and where the site meets them:
  - Samsung Internet lays a fixed page out under its bottom toolbar
    (docs/design/surface.md, Situation).
  - Samsung Internet and Chrome (auto dark) darken pages that do not
    declare a dark scheme. The site declares both (`color-scheme: light
    dark`, meta and CSS) and has a dark of its own (docs/design/brand.md,
    Dark).
  - iOS asks for the compass only from a tap, and gives a heading of its
    own (`webkitCompassHeading`); Android gives absolute orientation that
    the site turns into one (docs/design/surface.md, Walking help).
  - iOS plays audio only from a tap; lock-screen controls depend on the
    Media Session, which some webviews lack.
  - Mobile browsers discard tabs after screen-lock; the site saves where
    the visitor was when the page is hidden (surface.md, State).
  - Mobile GPUs drop the WebGL context after time in the background.
    MapLibre restores it itself on `webglcontextrestored`.

## How the site meets it

- The floor is iOS 15 (WebGL2, docs/backlog.md, Stack). The build lowers
  syntax to Safari 15, Chrome 100 and Firefox 100, the map's worker
  included (it is bundled, not copied); otherwise one class static block
  (Safari 16.4) would stop the whole script. CSS beyond the floor has a
  fallback before it (`vh` before `dvh`; colour mixing done in script). APIs
  are not polyfilled.
- No map (no WebGL2: an old or blocked GPU, WebGL switched off): MapLibre
  throws. The map's place then says that this device can't show the map,
  and that the texts and pictures are all there; it holds the language
  toggle. The cards work, opening half raised because there is no map to
  show. Walking help is not offered.
- A map style given as a URL (vector basemaps, the generic default) that
  fails to load leaves the map blank for the visit. The map says it isn't
  loading and tries again after 5, 10, 20, 40 and then every 60 seconds,
  and at once when the browser reports a connection. Tiles that fail are
  retried by MapLibre; dead spots are version 7's (offline).
- Location: refused, unavailable (no fix within 30 s, the webview case
  too), or not on https. Each says so in one line; refused and not on https
  also leave follow mode, while a fix arriving later clears "unavailable". Without the compass the
  GPS course stands in while walking (surface.md, Walking help).
- Audio that can't play says so in the player. Media Session actions a
  browser lacks are skipped.
- Storage that is missing or throws (private windows, webviews, blocked
  site data): the site starts fresh each time.

## Not known

- Whether Samsung Internet's dark mode shows the site's own dark or
  darkens it again: to be checked on the test phone with the browser's
  dark mode on.
- iOS as a whole: WebGL context restore after a long background, audio
  with the screen locked, the compass prompt, and whether MapLibre or the
  engine calls APIs newer than iOS 15 (the build lowers syntax, not APIs).
- In-app browsers: which ones the common QR paths open in this region, and
  what each of them refuses.
- Browser translation (Chrome, Samsung) offered over the site's own
  language toggle: the page's language is set to the one shown, and cards
  are re-rendered whole, so a translated card should survive a change of
  station. Untested.
- A fix that goes stale after a dead spot is used until the next one
  arrives (docs/backlog.md, Open).
