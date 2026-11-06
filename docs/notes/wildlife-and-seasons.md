# Wildlife and seasons

Working note on two backlog items under "Later, unordered" (wildlife
integration; seasonal content): which sources exist, what each would add
station by station, under what licence, in which languages, and at what
effort. It describes the situation and the options. Nothing in it is decided.

## Purpose

A visitor who opens the site on any day finds what there is to see on the
trail **now**, and can go **deeper on a species** than a placard allows. The
trail's author is NAVO, a bird-protection society, and NAVO's members are the
first audience (backlog, Situation).

The sources don't say what "bird spotting" is for, so it is listed under
Questions. Each of its possible meanings (likely now, recently seen, identify
it, report it) leads to different sources.

## Situation

### Constraints every option meets

- **Static site** on GitHub Pages (backlog, Stack). Data gets in by one of
  three routes:
  - *built in*: fetched at build time and bundled;
  - *rebuilt on a schedule*: a GitHub Actions cron rebuilds the site, say
    daily. The site stays static, API keys stay in repository secrets, and
    the data is as fresh as the last build. GitHub's documented rule is that
    scheduled workflows in a public repository switch off after 60 days with
    no repository activity;
  - *fetched by the browser*: only from APIs that need no key and send
    `Access-Control-Allow-Origin: *`.
- **Forkability.** `src/` never names a trail. A Swiss source (ornitho.ch,
  Vogelwarte, Info Flora, MeteoSwiss, BAFU) can only be configured in the
  trail folder. The engine itself can rely only on sources that work
  anywhere: GBIF, iNaturalist, Wikidata/Wikipedia/Commons, Open-Meteo, and
  sun position computed locally.
- **Offline** (version 7). What is built in survives dead spots. What the
  browser fetches does not, unless it is cached.
- **Languages** de, en, fr (`trail.json`). The placard's German names are the
  source. API names often differ from them: iNaturalist gives "Hohler
  Lerchensporn" for the placard's "Hohlknolliger Lerchensporn", "Märzenbecher"
  for "Märzenglöckchen" and "Ahornblättrige Platane" for "Platanen". API names
  could serve as a fallback at most.
- **Licences.** Several sources below are CC BY-NC or "non-commercial only".
  The site already shows CC BY-NC-SA photos (placards 11, 12), and whether
  the public site may do so is open with the partner (backlog, Open).
- **Name matching is fragile.** In probes, iNaturalist's text search returned
  the genus for *Apus apus* and *Cinclus cinclus*. GBIF's strict match failed
  for *Coronella austriaca*, and GBIF's match and Wikidata disagree on the key
  for *Aster amellus*. Identifiers want pinning once per species when the
  content is authored, not resolving by name at run time. All 29 species named
  on the placards exist on Wikidata, with GBIF and iNaturalist IDs, and with
  Wikipedia articles in de, en, fr and it. The birds also carry eBird and
  xeno-canto IDs there.

### What the placards already say about seasons

| # | Species | Season on the placard |
|---|---|---|
| 1 | Alpensegler, Turmfalke, Gänsesäger, Dohle | Alpensegler arrive each April. Gänsesäger chicks drop 20 m from the tower (month not given). |
| 2 | Mauer-, Zauneidechse | Active in sun (no months) |
| 3 | Mauersegler | Breed May–July (20–30 pairs), then leave for Africa |
| 4 | Blutbuche, Mammutbaum | Blutbuche: dark red leaves in spring, greener through summer |
| 5 | Green roof, Mauerpfeffer | none |
| 6 | Edelkastanie, Rosskastanie | Marroni (no months) |
| 7 | Natternkopf, wild bees | none |
| 8 | Alpensegler | April to September (about 50 pairs). Their first circling of the castle marks spring. |
| 9 | Berg-Aster, Berg-Lauch, Bläulinge, Zauneidechse, Schlingnatter | Berg-Aster in late summer |
| 10 | Gänsesäger | none |
| 11 | Zimbelkraut, Mauerraute | Seed after flowering. Mauerraute evergreen. |
| 12 | Lerchensporn, Märzenglöckchen, Bärlauch | Mid-March flower carpet, dormant otherwise |
| 13 | Platanen, Grosser Abendsegler | Fruit balls in autumn and winter, visible from the lift |
| 14 | Wasseramsel, Bach-, Gebirgsstelze | All year, often more in winter |
| 15 | Schwarznuss, Ginkgo | none |

Over half the stations carry a season already. The rest have well-known
seasons (flowering, leaf colour, fruit, reptile activity) that someone would
have to write and check.

### What open data shows near Baden

GBIF records within 10 km of the trail by month (Jan…Dec, all years, as of
November 2026; computed with the API's month facet):

| Species | Records by month |
|---|---|
| Alpensegler | 0 0 1 5 8 1 12 4 1 0 0 0 |
| Mauersegler | 0 0 0 6 27 21 12 0 0 0 0 0 |
| Gänsesäger | 23 14 30 22 23 8 0 7 0 10 12 28 |
| Wasseramsel | 12 3 7 3 1 1 0 0 1 5 2 6 |
| Mauereidechse | 0 6 39 53 36 40 20 17 12 3 2 0 |
| Hohler Lerchensporn | 0 0 44 33 1 0 0 0 0 0 0 0 |
| Märzenglöckchen | 4 32 29 5 0 1 1 0 1 0 0 0 |
| Berg-Aster | 1 2 0 0 2 0 4 19 22 7 1 0 |
| Rosskastanie | 0 1 5 14 24 6 6 6 4 5 0 0 |

The counts show when people recorded a species, not when it is there. For
plants they peak at flowering and come close to a flowering calendar. For
birds the numbers are small and follow observer effort; the dipper's winter
increase on the placard doesn't show up. As a check on authored windows they
work. As the source of truth they are weak.

## Sources

The effort ratings are rough: **S** is hours, **M** a day or two, **L** more,
or anything that needs a partner.

### Season windows authored in the trail folder

- **What:** for each species at a station, the months it can be seen and
  what is seen then (arriving, breeding, flowering, fruit, leaf colour,
  active on warm days). The site then shows "now", "soon" and "not now" on
  each card, and item 0 shows a "now on the trail" line.
- **Sources:** the placards (table above), NAVO's own knowledge, Info Flora
  flowering months (e.g. *Corydalis cava*: "3-4"), the karch/info fauna
  species pages (Mauereidechse active "March or early April" to "October or
  November" north of the Alps), and the GBIF facets as a check.
- **Licence:** months are facts, written by hand. No licence travels with
  them.
- **Languages:** written once per language, like other fields.
- **Forkable:** fully. It is a field in `station.json` (layout to be
  documented in docs/design/trail-content.md), and every trail has seasons.
  Works offline.
- **Effort:** S–M for the engine, S for Baden's data if NAVO checks it.
- **Example, today (6 November):** the swifts are gone (Alpensegler since
  September). Gänsesäger, dipper, wagtails, kestrel and jackdaws are about.
  The Edelkastanie's fruit has been ripe since 2 October (MeteoSwiss, below).
  The plane trees carry their fruit balls. Lizards come out only on a warm,
  sunny day: Mauereidechse records near Baden run into November.

### Wikidata, as the key per species

- **What:** one Wikidata ID per species. From it, a build looks up the GBIF,
  iNaturalist, eBird and xeno-canto IDs, the Wikipedia article in each
  language, a Commons image and sometimes a Commons sound. P51 is set for
  Gebirgsstelze, Wasseramsel and Dohle (bird recordings) and for Mauersegler
  (a file named "Mauersegler.ogg", possibly the spoken name; unchecked).
- **Access:** SPARQL and `wbgetentities`, no key, CORS open.
- **Licence:** CC0.
- **Effort:** S at build time. Enrichment from one scientific name per
  species works for any fork.

### Wikipedia summaries (de, en, fr, it)

- **What:** an article's lead, a thumbnail and a link. All 29 placard
  species have articles in all four languages.
- **Access:** `/api/rest_v1/page/summary/<title>` on each language's
  Wikipedia, no key, CORS open. Wikimedia throttles bursts (a probe ran into
  "too many requests"), so a build fetch with a User-Agent works better than
  a fetch from every visitor's browser.
- **Licence:** text CC BY-SA 4.0 (attribution, link, share-alike for the
  excerpt). Image licences vary per file.
- **Adds:** "deeper" text in all three site languages at once. It is
  general, not about Baden, and its voice is not NAVO's.
- **Effort:** S–M (build fetch, cache, credit line).

### Wikimedia Commons sounds and photos

- **What:** recordings for the birds on the placards. A search for "Alpine
  swift" returned 4 audio files: a xeno-canto recording (XC483586) and two
  German pronunciation files. There are about 10 for the kestrel and about
  13 for "dipper", among them other dipper species. Many are xeno-canto
  recordings copied to Commons. The Alpensegler's trill and the
  Mauersegler's "srie-srie" are things a visitor could hear on the spot.
- **Licence:** Commons accepts free licences only (no NC), so CC BY / BY-SA /
  CC0. Each file is credited.
- **Fits** the card's audio slot pattern (bundled files with credits).
  Choosing a good recording is a human task.
- **Effort:** S–M per trail for the picking. The engine part is small.

### National species pages: Vogelwarte, Info Flora, info fauna (karch)

- **Vogelwarte, "Vögel der Schweiz":** one page per species, in de, fr, it
  and en. The URL is `vogelwarte.ch/<lang>/voegel-der-schweiz/<name>/`, with
  a slug per language (fr `les-oiseaux-de-suisse/martinet-a-ventre-blanc/`,
  en `birds-of-switzerland/alpine-swift/`). The page is rendered by
  JavaScript, so I could not confirm which sections it shows (description,
  voice, seasonal chart, atlas map, Red List). It is the Swiss authority
  NAVO works alongside.
- **Info Flora:** `infoflora.ch/de/flora/<genus-species>.html`, in de, fr,
  it and en. It gives flowering months, habitat, the national and regional
  Red List, an atlas map and photos marked © (no licence named). Data use
  follows the "Richtlinien InfoSpecies"; the contact is info@infoflora.ch.
- **info fauna / karch** (reptiles): species page, prose on the activity
  season, a link to the distribution map, a PDF fact sheet. In de, fr and
  it, no English. Marked "© info fauna".
- **Licence:** none of the three offers reuse terms. **Linking** is free;
  quoting or embedding needs permission.
- **Adds:** the most authoritative "go deeper" for a Swiss trail, one tap
  away.
- **Forkable:** as authored links per species in the trail folder (or URL
  templates per language), not in the engine.
- **Effort:** S (authored links), plus asking if more than links is wanted.

### GBIF (occurrence data)

- **Access:** no key, CORS open. The month, year and dataset facets give
  local seasonality in one request.
- **Swiss data in it is generalised:** InfoSpecies publishes its national
  databanks (breeding birds from ornitho.ch, fauna, reptiles, vascular
  plants) on 5 km grid cells "to respect the currently nationally agreed
  ethical framework". Exact points come only from eBird, iNaturalist,
  observation.org and others.
- **Licence per dataset:** eBird and the InfoSpecies bird, fauna and plant
  databanks are CC BY 4.0. iNaturalist, observation.org and the Swiss
  National Reptile Databank are CC BY-NC 4.0.
- **Adds:** seasonality checks and "is it here at all" for any species and
  any fork. It does not tell you what was seen this week: the eBird copy in
  GBIF lags by about a year.
- **Effort:** S (build-time facets).

### iNaturalist

- **Access:** no key for reads, CORS open, a `histogram` endpoint by month,
  localised common names, and per-photo licences on taxa. Rate guidance is
  about one request a second; that is from memory, because the practices
  page refused automated reading.
- **Coverage here is thin:** about 540 observations of all taxa within 2 km
  of the trail. 257 Mauereidechse records in Aargau; 7 Alpensegler.
- **Licence:** observations are mostly CC BY-NC. Photos vary
  (CC0/BY/BY-NC/all rights reserved), and an engine must filter by licence.
- **Adds:** a generic, worldwide fallback for seasonality and photos. iNat
  obscures the coordinates of threatened taxa.
- **Effort:** S–M.

### eBird

- **Access:** API 2.0 needs a key tied to an account. Its terms forbid
  sharing the key, which rules out putting it in page code. That leaves the
  scheduled rebuild with the key in a repository secret. Use is
  non-commercial; commercial use needs written permission. Derived datasets
  must carry the same terms. I could not confirm the current attribution
  wording; eBird asks that its data be cited.
- **Coverage here:** in the GBIF copy, 1,361 records and 88 species within
  2 km. Since 2021, 385 of 403 bird records within 1.5 km are eBird's.
  Hotspot L27381986 (about 47.4735, 8.3102) sits between the
  Landvogteischloss and the river.
- **Adds:** the only open source of *recent, exact* bird records near the
  trail ("seen in the last 30 days"). The feed is sparse.
- **Effort:** M (scheduled build, key, empty-feed handling, terms).

### ornitho.ch (Swiss Ornithological Institute)

- **What:** the platform Swiss birders, NAVO members likely among them,
  report to. Its data far outnumbers eBird's for Switzerland (inference: GBIF's
  breeding databank is "mainly mobilised via ornitho.ch"). Visitors to the
  site can see public observations, and the platform protects rare breeders
  and rare reptiles automatically.
- **Access and licence:** the registration terms let the Institute pass data
  to authorities, conservation organisations and researchers, and name no
  API and no reuse route for third parties. ornitho.de, the sister portal,
  runs a formal application per project. Treat it as **closed** unless the
  Institute agrees.
- **Adds:** the richest "seen recently around Baden" and the members' own
  records. Separately, a "report what you saw" link (ornitho.ch, NaturaList
  app) is free and fits a bird-protection society's aims.
- **Effort:** S for the link. L for data: it needs NAVO to ask the Institute.

### xeno-canto

- API v3 needs a key (v2 is switched off). The website sits behind a
  bot-blocker, so it could not be read for this note. Recordings carry
  per-file CC licences, many of them NC. Recordist, licence and XC number
  must be shown. For a static site, the free-licensed ones are already on
  Commons (above). xeno-canto directly matters only if a recording is wanted
  that Commons lacks.

### MeteoSwiss phenology (open data)

- **What:** a phenology station at **Ehrendingen (OHD), 2.9 km away**, 490 m,
  with records since 1975. Mellingen (MIG) is 6.5 km away. It records,
  among others:
  - Rosskastanie: leaf-out, flowering, leaf colour, leaf fall;
  - Buche (Rotbuche): leaf-out, colour, fall;
  - Edelkastanie: leaf-out, flowering, fruit ripe, leaf colour, fall;
    8 years of data;
  - Hasel, Huflattich, Buschwindröschen, Kirschbaum and others.

  Its 2026 dates:

  | Species | Phase | 2026 |
  |---|---|---|
  | Rosskastanie | leaf-out | 11 April |
  | Rosskastanie | flowering | 28 April |
  | Rosskastanie | leaf colour | 17 October |
  | Buche | leaf-out | 17 April |
  | Buche | leaf colour | 28 October |
  | Edelkastanie | flowering | 13 June |
  | Edelkastanie | fruit ripe | 2 October |
- **Access:**
  `data.geo.admin.ch/ch.meteoschweiz.ogd-phenology/ohd/ogd-phenology_ohd_y.csv`
  (22 KB, CORS open). The file is updated through the year (last modified
  5 November 2026), and the current-year bulk file daily.
- **Licence:** free use; cite "Source: MeteoSwiss".
- **Adds:** for stations 4 and 6, *this year's* dates measured 3 km away
  rather than averages. The Blutbuche is a beech mutation, so Rotbuche dates
  stand in for it approximately. Also first flowers in spring for item 0.
- **Forkable:** Swiss trails only, as a station code in the trail folder.
- **Effort:** S–M.

### Weather and daylight

- **Open-Meteo:** no key, CORS open, free for non-commercial use under
  10,000 calls a day; data CC BY 4.0. Whether the limit counts per visitor IP
  or per site is not stated. It could say "sunny and 20 °C: a good hour for
  lizards" (stations 2, 9) or "cold, swifts feed low".
- **MeteoSwiss local forecasts** (CC BY, hourly, by postcode) exist as open
  data, but each parameter file covers all of Switzerland (about 32 MB), so
  they fit a build, not a browser.
- **Sun position** computed in the browser (no data, any fork): dusk, when
  the Grosser Abendsegler hunts along the river (13) and swifts gather in
  screaming flocks.
- **Effort:** S each. How much these add over authored windows is a matter
  of taste.

### The Limmat

- **What:** BAFU gauging station 2243 "Baden, Limmatpromenade" sits about
  110 m from station 13's dot. It measures water level, discharge and water
  temperature (6 November 2026, 15:10: 10.99 °C, 28.05 m³/s).
- **Access:** api.existenz.ch, an unofficial relay (free for non-commercial
  use, CORS open, no guarantee). BAFU's official delivery terms (a 2020 PDF)
  are not checked here.
- **Adds:** a live line at the river stations (10, 13, 14). How it serves the
  purpose is unclear: it says what the river is like, not what can be seen.
- **Effort:** S.

### Trees

- No open tree register for the city of Baden turned up. Zurich and Bern
  publish theirs on opendata.swiss. OSM has tree nodes around the trail, but
  almost none carry a species: 15 of 358 in a cached extract around
  stations 4–5. The placard trees are best authored by hand: position,
  height, age.
- Phenology for the beech, the horse chestnut and the sweet chestnut:
  MeteoSwiss, above. Ginkgo, Schwarznuss, Platane and Mammutbaum have no
  open phenology here. Their autumn and fruit seasons would be authored.

### People's calendars

- **NAVO** publishes events and a yearly programme PDF (navobaden.ch/events;
  no feed found). Its "Kartierung Segler & Schwalben" project maps swift nest
  sites in Ennetbaden. Its newsletter is called "Alpensegler".
- **Historisches Museum Baden** (in the Landvogteischloss) runs visits to
  the Alpensegler attic, where the chicks are ringed (summer, 20 places,
  registration).
- **No webcam** of the Baden colonies turned up.
- **Adds:** the strongest "now" for members: a guided visit beats a data
  feed. It needs someone to keep it current.
- **Effort:** S engine-wise (dated notes in the trail folder). The upkeep is
  ongoing.

## Per station

| # | What "now" could say | Deeper | Sources |
|---|---|---|---|
| 1 | Alpensegler here or not (April–September); kestrel and jackdaws all year; goosander chicks' drop in spring | Vogelwarte pages ×4; calls (kestrel, jackdaw on Commons) | authored, GBIF check, Commons, Vogelwarte |
| 2 | Lizard season (March to October/November) plus "warm and sunny now?" | karch pages; Wikipedia | authored, Open-Meteo, karch |
| 3 | Mauersegler May–July, absent otherwise; dusk flights | Vogelwarte; "srie-srie" recording | authored, Commons, sun |
| 4 | Beech leaf-out and colour this year (Rotbuche at Ehrendingen) | Wikipedia; tree facts authored | MeteoSwiss, authored |
| 5 | Green roof in flower (Mauerpfeffer early summer), insects | Info Flora | authored |
| 6 | Chestnut flowering, fruit ripe this year; horse chestnut flowering, colour | Info Flora; Wikipedia | MeteoSwiss, authored |
| 7 | Natternkopf flowering (summer), wild bees | Info Flora | authored, GBIF check |
| 8 | Alpensegler arrived or not; first arrival; museum attic visits | Vogelwarte; recording | authored, Commons, museum |
| 9 | Berg-Aster in late summer, Berg-Lauch, butterflies; lizard weather | Info Flora, karch | authored, Open-Meteo |
| 10 | Goosanders all year, more in winter; chicks in spring | Vogelwarte | authored, eBird (if wanted) |
| 11 | Zimbelkraut flowering; Mauerraute evergreen | Info Flora | authored |
| 12 | The March carpet: soon, now or over | Info Flora | authored, GBIF check |
| 13 | Plane fruit (autumn/winter); Abendsegler at dusk; river temperature | Wikipedia | authored, sun, Limmat |
| 14 | Dipper and wagtails all year, more in winter | Vogelwarte; dipper recording | authored, Commons, eBird (if wanted) |
| 15 | Ginkgo autumn gold; walnut fruit | Wikipedia | authored |

A cheap core covers every station: authored windows, Wikidata-keyed
Wikipedia, national-page links and Commons recordings. Live sources add to
a few stations at most.

## Not known

- Which sections the Vogelwarte species pages show (rendered by
  JavaScript), and whether Vogelwarte or BirdLife Schweiz would let
  their text, voices or photos be used beyond a link.
- Whether NAVO members already report on ornitho.ch, and whether NAVO
  counts the Limmat for the winter waterbird census. Either would make
  NAVO's own data the natural "seen recently".
- Whether eBird's terms allow showing API data on a public page built
  ahead of time (the redistribution clause), and what attribution they
  require now.
- Whether Open-Meteo's daily cap counts per visitor or per site, if called
  from the browser.
- BAFU's terms for hydrology data shown on a site, and whether an official
  CORS-enabled endpoint exists beside the unofficial relay.
- Whether Baden has a tree register (the city's GIS was not searched
  directly).
- How Wikipedia leads read next to the placard's voice. They are general and
  sometimes long.

## Questions for the user

1. **What is "bird spotting" for?** Knowing what is likely now (authored
   seasons), seeing what others saw recently (eBird, or ornitho.ch with
   permission), identifying what one sees or hears (recordings, links to
   identification apps), or reporting sightings (link to ornitho.ch, or to
   NAVO). They differ in sources, effort and upkeep.
2. **Who keeps the season content true?** Would NAVO write or check a
   season table per species, and perhaps a note like "Alpensegler back
   since …" each spring? Without someone doing it, only the data-derived
   parts stay current.
3. **Sensitive sightings.** The national framework publishes at 5 km,
   ornitho.ch hides rare breeders and reptiles, and the Schlingnatter is
   rare. What is NAVO's position on showing exact recent sightings on a
   public site?
4. **Asking Vogelwarte or BirdLife.** Does NAVO, as a BirdLife section, want
   to ask for recent public ornitho.ch records around Baden, or for use of
   species texts and voices? It is the only route to the richest source.
5. **Non-commercial.** Does the site, co-published by the city, count as
   non-commercial? That governs the CC BY-NC sources (iNaturalist,
   observation.org, the reptile databank, most xeno-canto recordings), eBird
   and Open-Meteo's free tier. It is part of the same question as the open
   image licensing.
6. **Whose voice is "deeper"?** Cards speak as NAVO's placards. Is text from
   elsewhere (Wikipedia, CC BY-SA) acceptable there with a credit, or does
   anything beyond a link need NAVO's review first?
7. **Live river and weather lines.** Is there a purpose for them beyond
   curiosity? Or are they out?
8. **Events.** May the site carry NAVO's programme and the museum's
   Alpensegler visits, and who enters them?
