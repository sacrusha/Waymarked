# The trail's brand

## Purpose

The site wears the trail's design, not Waymarked's: it replaces carrying the
leaflet (backlog, version 2), so it reads as the same trail as the leaflet
and the signs on the ground. Waymarked's own mark is one footer line. What
makes the look one trail's lives in its folder; the engine carries what any
trail's look can use.

## Situation

- The screen is used outdoors, in sun, one-handed, by untrained visitors
  (docs/design/surface.md). Print colours that work at placard size can fail
  on a phone: the placards' green `#68BD45` carries white text at 2.3:1.
- Stadtnaturweg Baden's printed design (sources in `.tmp/BadenDrafts/`):
  - Placards: Helvetica Neue; a white top strip with the city's red
    "Baden ist." wordmark and "STADTNATURWEG **TAFEL n**" in green; a green
    `#68BD45` band with the title and text in white (grey `#939598` on
    placard 1 only: heritage protection at the Stadtturm objected to green); a large photo bleeding off the edge and round photos in white
    rings overlapping it, named on dark grey `#58595B` tags in capitals; a
    footer with the NAVO logo, "Natur- und Vogelschutzverein
    Baden/Ennetbaden", "Mit Unterstützung von: umwelt-cockpit.baden.ch".
  - Leaflet: Helvetica Neue (condensed for running text); headings and text
    in blue `#0C537F`; green `#6CB52D` panels and number discs with white
    text; a cover photo of the Limmat; the city's "Baden ist." and "STADT
    BADEN" marks and the NAVO logo.
- Helvetica Neue is licensed and can't be bundled. iOS and macOS have it
  installed; Android and Windows don't. baden.ch serves its own licensed
  webfont (Monotype, Neue Helvetica LT Pro), a licence not known to cover
  this site; navobaden.ch uses BirdLife Switzerland's theme with Noto Sans, a
  generic face.
- TeX Gyre Heros (GUST e-foundry, from URW Nimbus Sans) is a free
  Helvetica with its metrics, in Regular and Bold with italics, no Medium.
  Its licence (GUST Font License, LPPL) lets it be bundled; a subset is a
  modified version, which the licence asks to be renamed and requires to
  carry a notice of its changes and where to get the original.
- NAVO is the trail's author. The partner confirms that the city's "Baden
  ist." CI and the NAVO logo may appear on the site.
- Phones are set to dark by their owners, always or from sunset, and some
  browsers darken pages by their own rules (docs/design/robustness.md).
  The print has no dark version. The trail's basemaps are light: the
  Landeskarte and the aerial photo as raster tiles, the vector "Karte
  hell" by name.

## How the site meets it

The engine gives every trail: two colours from `trail.json` `theme`
(markers, route, buttons, favicon); a sign label that opens each station
card the way its sign names it, with the trail's mark beside it; a cover
photo for item 0, the mark on it; a footer of logos
and text at the end of item 0, with "Gebaut mit Waymarked" as the last line
below it; photos as one group (the first large, the rest as insets, one
credits line); and a trail stylesheet, `theme.css`, loaded after the
engine's (docs/design/trail-content.md).

Baden's folder uses them so:

- Colours: the print green `#68BD45` where it is a surface or a line
  (route, markers, the photo band); a darker green `#357A1F` wherever white
  text sits on green or green is text (buttons, number discs, the sign
  label), 5.3:1; the leaflet's blue for titles and headings.
- Type: Helvetica Neue where the device has it, elsewhere Waymarked
  Heros: TeX Gyre Heros renamed and subset to Latin, honouring the
  licence's requests as well as its conditions (`fonts/`, its README says
  what changed; `make-fonts.py` remakes it). Only Regular and Bold exist,
  so the engine's 600 to 800 weights all render Bold there.
- Station card: the placard's top strip first, "Baden ist." left and
  "STADTNATURWEG **TAFEL n**" right; the photos as the
  placard's panel, on a green band: the large photo edge to edge, the round
  photos in white rings overlapping its lower edge, names on grey tags, the
  credits on the band.
- Item 0: the leaflet's cover photo with "Baden ist." at its top right; the
  station list's numbers as the leaflet's filled discs; the footer as the
  leaflet's back, the "STADT BADEN" and NAVO logos side by side, under them
  the placard footer's names and the umwelt-cockpit line in small grey
  capitals.
- The marks are SVGs drawn from the print's own vectors: "Baden ist." from
  the placards (`baden-ist.svg`), "STADT BADEN" from the leaflet
  (`stadt-baden.svg`); the NAVO logo is the placards' raster (`navo.png`).

### Dark

Purpose: the site follows the visitor's preference; set to dark, they get
a dark site that is still the trail's, not one a browser has darkened by
its own rules.

The site follows the device's setting, and changes with it while open;
there is no switch, which would be one more thing to learn
(docs/design/surface.md).

- The sheet and the controls over the map turn: a green-black paper, light
  text, the same layout and sizes.
- The map stays the map, at full strength: outdoors, in sun, its contrast
  matters most, and the phone's brightness already follows the light
  around it. The route, the markers and the visitor's dot keep their light
  colours on it. What sits on the map is the map's: it is painted on
  canvas, as the map is, from colour tokens that are the same in both
  schemes (`--marker`, `--prev`, `--next`, `--you` and their kin), and
  the page elements over it carry only what a page element gives, a
  button, its label, the focus ring, the touch target
  (src/app/on-map.ts). So the site's own dark can't reach it, and
  neither can a browser that darkens pages by its own rules
  (docs/design/robustness.md).
- The trail's two colours: `accentDark` carries white text on buttons in
  both. Where the accent is text or a line on paper (the sign label,
  links, focus), dark uses `accent` itself if it reads at 6:1 on the dark
  paper, else `accent` lightened until it does; the engine derives it, so
  a trail gives no third colour. The visitor's blue, an engine colour,
  is a lighter blue where it is text or an icon in the sheet.
- Logos are drawn for paper: in the footer each sits on its own white
  plate. The trail's mark is not plated: it already has to stand on the
  cover photo.

Baden's folder: on dark paper the print green reads at 7.5:1, so the
placard's own green, too light for text on white, is the sign label's and
the links' colour. Headings take the leaflet's blue lightened (`#86c0e6`),
running text a light neutral for the print's black; the photo band is the
dark green with the credits in white, as the light green would glare.

## Not known

- Who took the leaflet's cover photo; the site shows it without a credit, as
  the leaflet does.
- How the look holds in sun on real phones, Android especially, where it
  falls back to Waymarked Heros; and the dark look in daylight, for a phone set
  to dark all day.
- Whether swisstopo offers a dark style of its vector basemap; the site
  would need a basemap field for a dark variant to use one.
