# Stadtnaturweg Baden

What is known about this trail beyond its content: who stands behind it,
what may be published, what was done to the content and what is open. The
product, the engine and the folder's format are the framework's: docs/.

## Purpose

The Stadtnaturweg's placards and leaflet as a site on the visitor's phone.
Its first audience is NAVO's members, who receive it as a demo and give
feedback: a real trail gives access to real users' feedback, which a mock
trail does not.

## Situation

- The trail: Stadtnaturweg Baden (AG), 15 placards by NAVO (Natur- und
  Vogelschutzverein Baden/Ennetbaden), supported by the city of Baden. NAVO
  is the trail's author.
- Published at sacrusha.github.io/Waymarked, the address NAVO's members
  have.
- Rights: our partner acquired the rights to publish the Baden content, and
  confirms that the city's "Baden ist." CI and the NAVO logo may appear on
  the site. Photo credits are per image (including CC BY-NC-SA 4.0 from
  Infoflora on placards 11 and 12) and travel with the content; the leaflet
  names no photographers.
- The content is in a public repository, in `main` and in the history of
  the `archive` branch. The framework, Themenweg, never held it.
- Source PDFs and their extraction: `.tmp/BadenDrafts/` (git-ignored, on
  the user's computer only).
- The folder holds the placard texts and photos with credits, the leaflet's
  intro and station list, generated audio, and a route of 3.25 km routed
  leg by leg over OSM footways with `src/build/route-trail.py`
  (docs/design/trail-content.md); the leaflet's hand-drawn line is kept as
  intent (`route-trace.geojson`), confirmed corrections in `legspec.json`.
  Traced, the line ran along a road for cars where pedestrians take a
  footpath under a bridge. Legs 5 to 6 and 7 to 8 walk one stretch twice.
- Station dots sit on the objects they name where those could be told from
  the Landeskarte and Luftbild (1–5, 8, 11, 14), else at the leaflet's pin.
  Nothing has been checked on the ground yet; the placards' own positions
  are not known. Stations 6 and 7 are 17 m apart.
- A station card's short facts are the leaflet's Standort and Gegenstand,
  its title the placard's title (the leaflet's Thema). The sign label,
  "Stadtnaturweg **Tafel n**", is what the placards print and stays German
  in every language.
- Between stations 12 and 13, down at the river, a lift leads up to the
  railway station, both ways: a quick way off the trail, and a quick way
  on for visitors arriving by train, who enter at 12 or 13 and may walk
  the trail backwards. The lift takes about 3 minutes in a normal worst
  case (no queue).
- The map defaults to swisstopo's Landeskarte: it says "this is
  Switzerland, not Google", which is appreciated locally. The aerial photo
  and the vector "Karte hell" are the other two.
- Content is German. English and French are Claude's translations of the
  German placards, unreviewed: nobody who knows the species or the
  languages has read them. French short titles exist where the
  translations ran long.
- Speech: German is read by de-DE Seraphina at +8 %: the two Swiss
  Standard German voices were judged weaker in a listening test, and 0 %
  too slow. Seraphina is a multilingual voice, which is what the German
  provisions in `make-audio.py` are for (docs/design/trail-content.md,
  Making the speech): "Urtümliche Sonnenanbeter" as a title and "Gänsesäger
  brüten in Höhlen." opening a paragraph came out English.
- The placards and leaflet print www.navobaden.ch/stadtnaturweg with a QR
  code and info/map/headphones icons: an existing offering, not yet looked
  at.
- The trail is not listed on Aargau Tourismus's tour portal or on
  deinbaden.ch (Nov 2026), where the region's other trails are found
  (business/market.md, Being found).
- iPhones are within reach only through NAVO members, so an iOS check is a
  request relayed to them, with what to look at (docs/design/robustness.md).
- The look, and the print it follows: brand.md beside this file.

## Later, unordered

- Seasonal content and wildlife (docs/backlog.md, Later): Alpensegler from
  April, Lerchensporn in early spring. Sources, licences and options for
  both: wildlife-and-seasons.md beside this file.
- Easy wins in content: more on the Stadtturm and similar additions beyond
  the placards.
- Getting away (docs/backlog.md, Later): from the current location directly
  to 12 or 13 and the lift to the railway station.

## Open

- While framework and trail shared one repository, Baden was to be purged
  from its GitHub history before others fork it. Others now fork
  Themenweg; whether the content in this public repository's history needs
  anything is not settled.

With the partner:

- Image licensing for the public site beyond the demo (CC BY-NC-SA items,
  individual photographers).
- The "STADT BADEN" administrative logo sits in item 0's footer on the
  reading that the partner's okay for "Baden ist." covers it.

For NAVO:

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
- Item 0 links to www.navobaden.ch/stadtnaturweg, the printed address,
  which does not exist yet. The leaflet's NAVO box text is not in item 0.
- Whether the trail is signposted on the ground, which decides how much
  navigation the site carries between stations.
- The spoken "Station n" could become the placards' own label ("Tafel n"),
  a content call that remakes every file.

On the ground:

- The route is routed over OSM paths and unchecked on the ground; the
  router's own doubts per leg: the out-and-back at the ruin (1→2, 2→3),
  the passage between the Pfaffechappe wings (4→5), the riverside
  walkway's public stretch (10→11), the Kurpark's north entrance (14→15).
  Leg distances are unchecked at branches, heights against the ground (the
  ruin's stairs, the climb to the Schartenfels).
- A station's dot marks the object where it could be identified, else the
  leaflet's pin; the placard, where the visitor stands, is what "arrived"
  wants (docs/backlog.md, Open).
- "Hier: n" at 25 m with the 6/7 pair 17 m apart; the GPS course in the old
  town's lanes.

Texts and speech:

- German speech: the current files ("Hier ist Station n: Titel.", short
  paragraph openers joined by a comma) are checked only by a speech
  recognizer, not yet by ear; item 0's "Stadt-Naturweg" reads only weakly
  as German there. How the voice sounds to a Swiss listener on these texts
  (species names, `NAVO`, the pace) nobody has listened through yet.
- Translations (en, fr) are unreviewed, and so are the French short titles
  of stations 1, 2, 4, 8 and 12 (Claude's, where the French titles were cut
  off in the card's head); the English and French voices mispronounce
  German names (Stadtturm, Bezirksgebäude, Schartenfels). The
  machine-translation note opens every card in a marked language, possibly
  more than a visitor needs.
