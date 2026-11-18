# The look of the Stadtnaturweg Baden

## Purpose

The site reads as the same trail as the Stadtnaturweg's leaflet and the
placards on the ground (docs/design/brand.md, whose purpose this is for any
trail). Here: the print this trail's look follows, and how its folder uses
the engine's handles for it.

## Situation

- The printed design (sources in `.tmp/BadenDrafts/`):
  - Placards: Helvetica Neue; a white top strip with the city's red
    "Baden ist." wordmark and "STADTNATURWEG **TAFEL n**" in green; a green
    `#68BD45` band with the title and text in white (grey `#939598` on
    placard 1 only: heritage protection at the Stadtturm objected to
    green); a large photo bleeding off the edge and round photos in white
    rings overlapping it, named on dark grey `#58595B` tags in capitals; a
    footer with the NAVO logo, "Natur- und Vogelschutzverein
    Baden/Ennetbaden", "Mit Unterstützung von: umwelt-cockpit.baden.ch".
  - Leaflet: Helvetica Neue (condensed for running text); headings and text
    in blue `#0C537F`; green `#6CB52D` panels and number discs with white
    text; a cover photo of the Limmat; the city's "Baden ist." and "STADT
    BADEN" marks and the NAVO logo.
- The placards' green `#68BD45` carries white text at 2.3:1: fine at
  placard size, not on a phone in the sun.
- Helvetica Neue is licensed and can't be bundled. iOS and macOS have it
  installed; Android and Windows don't. baden.ch serves its own licensed
  webfont (Monotype, Neue Helvetica LT Pro), a licence not known to cover
  this site; navobaden.ch uses BirdLife Switzerland's theme with Noto Sans,
  a generic face.
- TeX Gyre Heros (GUST e-foundry, from URW Nimbus Sans) is a free
  Helvetica with its metrics, in Regular and Bold with italics, no Medium.
  Its licence (GUST Font License, LPPL) lets it be bundled; a subset is a
  modified version, which the licence asks to be renamed and requires to
  carry a notice of its changes and where to get the original.
- The partner confirms that the city's "Baden ist." CI and the NAVO logo
  may appear on the site.
- The print has no dark version. The trail's basemaps are light: the
  Landeskarte and the aerial photo as raster tiles, the vector "Karte
  hell" by name.

## How the folder meets it

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
  "STADTNATURWEG **TAFEL n**" right; the photos as the placard's panel, on
  a green band: the large photo edge to edge, the round photos in white
  rings overlapping its lower edge, names on grey tags, the credits on the
  band.
- Item 0: the leaflet's cover photo with "Baden ist." at its top right; the
  station list's numbers as the leaflet's filled discs; the footer as the
  leaflet's back, the "STADT BADEN" and NAVO logos side by side, under them
  the placard footer's names and the umwelt-cockpit line in small grey
  capitals.
- The marks are SVGs drawn from the print's own vectors: "Baden ist." from
  the placards (`baden-ist.svg`), "STADT BADEN" from the leaflet
  (`stadt-baden.svg`); the NAVO logo is the placards' raster (`navo.png`).
- Dark: on dark paper the print green reads at 7.5:1, so the placard's own
  green, too light for text on white, is the sign label's and the links'
  colour. Headings take the leaflet's blue lightened (`#86c0e6`), running
  text a light neutral for the print's black; the photo band is the dark
  green with the credits in white, as the light green would glare.

## Not known

- Who took the leaflet's cover photo; the site shows it without a credit, as
  the leaflet does.
- How the look holds in sun on real phones, Android especially, where it
  falls back to Waymarked Heros; and the dark look in daylight, for a phone
  set to dark all day.
- Type weights: the engine sets 600, 650, 750 and 800; Waymarked Heros has
  only Regular and Bold, so labels such as "Standort" weigh as much as
  headings, and iOS's Helvetica Neue (with Medium) renders them otherwise
  again. The placards use Regular, Medium and Bold.
- The basemap buttons over the map render in Arial on every device without
  Helvetica Neue: MapLibre's container sets its own font, not `--font`
  (docs/backlog.md, Open).
