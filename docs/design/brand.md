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
  installed; Android and Windows don't.
- NAVO is the trail's author. The partner confirms that the city's "Baden
  ist." CI and the NAVO logo may appear on the site.

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
- Type: Helvetica Neue where the device has it, the bundled Public Sans
  elsewhere.
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

## Not known

- Who took the leaflet's cover photo; the site shows it without a credit, as
  the leaflet does.
- How the look holds in sun on real phones, Android especially, where it
  falls back to Public Sans.
