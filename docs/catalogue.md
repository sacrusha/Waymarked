# What can make a trail more interesting

## Purpose

Someone facing a given trail, with Themenweg and their AI, looks here for
what could be done with it: what the trail's nature allows, what it does
for the walker, an example to look at, and where Themenweg stands with it.
It is a list to pick from, not a list to complete: a trail is better for
the few entries its ground and its sources carry well than for many it
carries thinly.

## Situation

- Each entry says what it does, what the trail must have for it where
  that isn't obvious ("Needs"), examples, and Themenweg's state: **can
  do** (a content choice in today's slots), **upgrade** (engine work,
  named), or **bad fit** (why). Families and schools have their own
  section, which maps their offerings onto the entries.
- Examples from the demo trail (`trails/rheinfall/`) name its station;
  the others were read on the pages named.
- The verdicts (what is decoration, what is a bad fit) are an
  interpreter's reading, not yet reviewed by the user.
- In the families table, "variant of" names the entry an offering is, with
  a child as the reader.
- What a card can hold today (docs/design/trail-content.md): a sign label,
  short facts per station (`stationFields`), the text in Markdown, photos
  after the text with captions and credits, one audio file per language;
  item 0 adds a cover, the walking time, getting there and links; the
  trail's basemaps, any number, historic ones included; per leg its length
  and walking time.
- The text's Markdown is rendered at build time and raw HTML passes
  through: links, lists, tables and a `<details>` disclosure work in any
  card. The synthetic speech says what the card shows: a closed
  `<details>` is spoken as its summary only (docs/design/trail-content.md,
  Making the speech).
- The site is static and keeps no state per visitor beyond where they are
  (docs/design/surface.md, State): no accounts, no uploads, no scores.

## What makes it stick

An interpreter's test for every entry below. A trail is remembered when:

- the stations are chapters of one idea, so the last one closes something
  the first one opened;
- the screen sends the eyes back to the thing: the card asks the visitor to
  look, listen or compare before it explains;
- a question comes before its answer, and the walk to the next station is
  time to think about it;
- there are people in it: who built, painted, lived, saw;
- change is made visible: then and now, the season, the scale.

Decoration is what reads the same anywhere: a quiz on what the text just
said, points and badges, live figures that change nothing the visitor sees,
a general encyclopedia paragraph, more text for its own sake. Entries below
say where they tip into it.

## Every trail

### A thread through the stations

One idea, a question or a narrator carries from the first station to the
last, and item 0 opens it. Needs: an author who chooses what the trail is
about rather than what lies on it. Examples: the demo trail's item 0 names
three roles of the falls, an obstacle to boatmen, a source of power, a
picture for painters and poets, says each was fought over and some
questions are still open, and the stations take them up in turn; station 3
ends on one still open, a power station proposed in 2024. Themenweg: can
do, in the texts; on a trail with signs their texts usually come first, so
a thread is added in item 0 and at the cards' ends rather than by
rewriting placards.

### The walk between stations

Most of the visit is walking, not standing at a sign. A card can end with
something for the leg ahead: what to look out for on the way, a question
to talk over, what the next station will answer. Needs: legs with
something to see or long enough to talk. Example: in the Royal
Geographical Society's walk around Lancaster, stop 23 runs on into the
walk through a nature reserve, with the view of the Ashton Memorial,
castle and priory to come, the allotments, and the birds to look out for
(Discovering Britain, discoveringbritain.org, the walk's written guide).
Themenweg: can do, as the text's last paragraph, just before "Next".
Whether a text for the leg should play by itself as the visitor walks is
open, and a website can't do it with the phone in the pocket: browsers
stop delivering position updates to a hidden page (Chrome, Safari and
Firefox alike), so nothing on the page learns that the visitor has
arrived. Audio already playing carries on. Starting by position with the
screen off needs a native app; a site can play one track paced to the
walk, or advance while the screen is on.

### Arrival and departure

Where to start and end by public transport, parking, the walking time and
the climbs, pushchair and wheelchair notes, toilets, places to eat and
rest, the best season or time of day, ways off the trail. Needs: nothing
but someone who knows the ground. Examples: the demo trail's item 0 names
the station to start from and a second one on the way, the steps and short
climbs, the paid grounds; the Lancaster walk above gives directions from
the railway station, the level and terrain, alternative directions round
the steps between stops 5 and 6 for pushchairs and wheelchairs, and which
stops the toilets are near; ages 5 to 12, not for pushchairs, fire pits on
the way (Muggestutz Zwergenweg, interlaken.swiss). Themenweg: can do in
item 0 (`gettingThere`, `duration`, its text) and per leg (length, walking
time, time to the end); upgrade: points of interest as a map layer;
getting away from where the visitor stands (docs/backlog.md, Later).

### Route variants

Shorter loops, half-days, a side trip to a station off the line. Example:
the Lancaster walk is 3 miles, with a shorter route of 2 miles that covers
stops 1 to 20. Themenweg: one route per trail; upgrade: variants and
stages (docs/backlog.md, Later).

## Where the place has a past

### Then and now

An old photograph, painting or aerial view from where the visitor stands,
to compare with what is in front of them. It works when the viewpoint
matches and the card says what to compare. Needs: pictures with a known
viewpoint and their rights. Examples: paintings of 1788 and 1842 and a
colour photograph of 1923 at the quay, with "compare the pictures with the
falls in front of you" (demo trail, station 4); walking tours whose stops
stand where a historic photograph was taken, with a then-and-now
comparison and the visitor's own photograph from the same spot (On This
Spot, an app, onthisspot.ca). Themenweg: can do, as photos after the text;
upgrade: a pair shown together or as a slider, and the trail's own picture
placed inside the text.

### Old maps

The ground as it was mapped a century or more ago, under the same route and
stations. Needs: a historic map as tiles or a georeferenced scan; in
Switzerland, swisstopo's time series; in Great Britain, the National
Library of Scotland's georeferenced Ordnance Survey maps
(geo.nls.uk/maps/api, terms per layer). Example: "Map of 1880" among the demo trail's basemaps.
Themenweg: can do, as a basemap; upgrade: a choice of years.

### What is gone

The building, the mill, the bridge no longer there; often the sign is all
that remains. A reconstruction drawing from the visitor's viewpoint or the
last photograph does most of what augmented reality promises, with the
eyes on the place rather than on a camera view. Needs: a picture of what
stood there. Example: the panels of the Geschichtsmeile Berliner Mauer
stand where the Wall stood; the one at Potsdamer Platz shows in four
photographs the square around 1930, Europe's busiest, its sealing off in
1961, the death strip between the walls (berlin.de,
Gedenktafel-Datenbank). Themenweg: can do, as photos; open: a station
whose object is not a point, or not there (docs/backlog.md, Open, one
position per station). Augmented reality: bad fit, for where it puts the
visitor's eyes; what browsers support for it on phones was not checked.

### Milestones and sources

A timeline of the place, the sources a claim rests on, further reading for
home. Example: the demo trail's item 0 links Goethe's travel notes of 1797,
which its stations quote. Themenweg: can do, as a list, table or links in
the text; it is for after the walk, so it belongs at a card's end.

### Voices

People who were there: residents remembering, a letter, a traveller's
notes, the maker of a thing. Recorded voices are the strongest form, and
they keep a trail from sounding like its signs. Needs: an oral-history
archive or people to interview, and the rights. Examples: walks built from
eleven former residents' interviews in the Exmoor Oral History Archive,
two loops of about an hour, MP3s to download (Dulverton sound walks,
swheritage.org.uk); the sculptor speaking at each work (The work's story,
below); Goethe's notes of 1797 quoted at the demo trail's falls
(stations 3, 5, 6 and 9). Themenweg: can do, a recording in a station's
audio slot or a quote in its text; upgrade: more than one sound per card (the shell plays
several, the build has nowhere to keep them: docs/design/layers.md).

## Where there is living nature

### What is there now

The visitor on any day learns what is to be seen today: arrived, in
flower, gone for the year. It answers the question every nature trail
leaves open, and gives a reason to come back. Needs: someone who knows the
seasons per species and keeps them true; the windows are written by hand
from the signs and the publisher's knowledge, and open data (phenology
records, occurrence counts by month) checks them. Example: a list per month
of the plants "you may typically see in flower this month depending on
weather-related conditions", each with its area and bed (UC Botanical
Garden at Berkeley, botanicalgarden.berkeley.edu, What's In Bloom).
Themenweg: upgrade (seasonal content, docs/backlog.md, Later).

### Sounds to listen for

The call of the bird on the sign, played so the visitor can hear it in the
trees. Needs: freely licensed recordings (Wikimedia Commons carries many
from xeno-canto) and a person to pick good ones. Example: fifteen roundels
on benches and posts along a Hampshire walking route, each a QR code to the
song of a bird often heard at that place (Bird Song Trail, The Watercress
Way, thewatercressway.org.uk). Themenweg: can do with one sound per card,
the audio slot, at the cost of the read-aloud text; upgrade: several sounds
per card (as Voices).

### Look closer

A prompt that makes the visitor find the thing: the lichen on the north
side, the nest box behind the third loophole, the year cut in the lintel.
Cheap, and what most children's offerings rest on. Example: numbered
markers, each with a puzzle in four parts: find the thing near the marker,
learn a fact about it, look closely at some part of it, bring back an
answer; no question needs knowledge brought from home ("Making a nature
trail", woodlands.co.uk, 2006). Themenweg: can do, in the text; an answer
can sit in a `<details>` (see Situation on speech) or open the next
station's card, so walking on reveals it.

### Report what you saw

A link to where sightings are recorded (iNaturalist, eBird, a national
portal), or a photo post where visitors' pictures become a time-lapse of
the place. Example: Chronolog, a bracket that holds the visitor's phone,
photos sent in and joined into one time-lapse, used by parks and schools
(chronolog.io). Themenweg: can do, as a link; the time-lapse is the
partner's, the site links to it. Collecting reports itself: bad fit
(static site, no accounts).

## Where the landscape or a scale is the subject

### Viewpoints

What the visitor sees from here, named: peaks, villages, the river's
course. Needs: a view worth naming. Example: at Panorama Point above
Paradise, a panel's photograph of the view south names the peaks in it left
to right, Mount Adams, Mount Hood and Mount St. Helens among them
(Mount Rainier National Park, nps.gov). Themenweg: can do, as a labelled
photograph; an interactive panorama would be an upgrade of uncertain worth
over the photo.

### A scale made walkable

Distance as the content: planets, Earth's history, a river's length.
Examples: the solar system along 10 km of a former railway, now a cycle
path, at 1 to 575,872,239, Mercury 100 m from the Sun and Pluto 10.3 km
(York Solar System, york.ac.uk/solar); 4.6 km for 4.6 billion years (Deep
Time Walk, deeptimewalk.org, a guided walk and an app). Themenweg: can do;
the legs' lengths shown in "Next" carry the scale without extra work.

### The ground underfoot

Geology, soils, water under the surface: a section drawing of where one
stands, a rock to touch. Example: why the falls formed where hard limestone
meets an old channel filled with gravel, with photographs of 1913 and 2026
at low water, when the rock lies bare (demo trail, station 2). Themenweg:
can do, as photos and drawings; an animation or video: upgrade (no video
slot).

## Where there are works and makers

### The work's story

Why a work stands where it stands, who made it, its moves and repairs, the
artist's own words. Examples: a phone tour in which each sculptor greets
the visitor at their sculpture, in video or audio, from where the visitor
stands; each plaque carries a short address or QR code into the tour, which
goes on by "Next" and "Previous" (Price Sculpture Forest, Washington,
sculptureforest.org); a page per work with its commission and the artist's
own words (Forest of Dean Sculpture Trail, forestofdean-sculpture.org.uk);
how each painter of the falls wanted to see them (demo trail, station 4).
Themenweg: can do; the artist's voice as a recording in the audio slot.

## Where the ground changes with the date

### Opening hours, keys, closures, events

A cemetery closed on Saturdays, a key arranged in advance, a stretch
flooded, a guided tour on a date at a station. Needs: someone who enters
and removes them. Examples: the demo trail says where admission is charged
and that the boats do not run all year (item 0, station 9), which holds
every year; each US national park keeps a page of current closures and
cautions, each with its date (nps.gov, a park's Alerts & Conditions).
Themenweg: what holds every year can go in the text now; anything dated
needs validity in time, the same upgrade seasonal content needs
(docs/backlog.md, Later). Booking
and newsletters are the publisher's website's.

## Families and schools

What the offerings do, decomposed. Most are entries above with a child as
the reader; the rest need state, a person or a physical object.

| Offering | Seen at | Themenweg |
|---|---|---|
| Observation questions, "can you find…" | "Making a nature trail" (woodlands.co.uk) | Variant of Look closer. |
| A story or character carried station by station | Muggestutz Zwergenweg (interlaken.swiss); StoryWalk | Variant of A thread; an invented character serves the trail where it leads children to what is really there. StoryWalk puts a picture book's pages on stakes at children's eye level along a path (kellogghubbard.org/storywalk); image-led pages want a picture before the text: upgrade. |
| A track per audience: adults, families, schools | Woking Palace's children's audio tour, for children to listen to while their adult listens to the adult guide (archaeologyuk.org; izi.TRAVEL) | Upgrade: a second text per station, chosen by the visitor and falling back to the main one, much as languages do. Today a trail could carry the children's part as a section of each card. A children's text wants its own audio: children not yet reading confidently are who it is for. |
| Station quiz | Actionbound, quiz trails in an app (actionbound.com) | Variant of Look closer, as a question with its answer revealed; a scored quiz is an upgrade and, as a test of the text just read, decoration. |
| A riddle per station whose answers make a code or word at the end | Multi-caches: each stage gives a number that goes into the final coordinates (geocaching.com) | Can do: the answers stay with the visitor (paper or memory) and the last card names the solution behind a `<details>`. Checking an answer typed in: small upgrade. |
| A checklist of things spotted or stations visited | i-SPY books: points per thing spotted by its rarity, a certificate and badge at 1,000 (Collins, collins.co.uk) | Upgrade, small: kept on the visitor's phone. As a tally it is decoration; as a list of things to find it is Look closer. |
| Printable sheets, teachers' factsheets, glossary | English Heritage's teachers' kits per site, by key stage, some translated, with hazard information (english-heritage.org.uk, a site's School Visits) | Can do as linked PDFs or a section in item 0; upgrade: a printable view of the trail (docs/backlog.md, Later). |
| Finding posts by map and answering at each | Permanent orienteering courses: posts in a park, a map to download (British Orienteering, britishorienteering.org.uk/pocs) | Can do: the map, the way to the next station and "Here" are the navigation; the tasks are content. A class running it as a race: the teacher's, not the site's. |
| Play posts and hands-on elements on the ground | Muggestutz Zwergenweg | The ground's; the site names them and says what to do there. |
| A physical kit handed out: tools, a quest, roles for a group | Explorer backpacks with binoculars, torch, magnifier and compass, lent free with a trail to complete (Norwich Cathedral, cathedral.org.uk) | Bad fit: an object handed out. Roles and quests can be content; the kit is the publisher's. |
| A reward at the end: patch, certificate, sticker | Junior Ranger (nps.gov) | Bad fit for the site: a person or a counter hands it out. A printable certificate is a linked file. |
| Paid team puzzle trails, booked online, puzzles in installations | Treasure Trails, mystery trails through towns, printed at home or in an app (treasuretrails.co.uk); Foxtrail in Switzerland (foxtrail.ch) | Bad fit as an engine: booking, payment and installations. What carries over is the town itself as the puzzle's material, which is Look closer. |
| Teachers seeing their pupils' answers, leaderboards | Actionbound's challenges: whoever set one sees every player's or team's results on a leaderboard | Bad fit: accounts, a server, and children's data. |
| Augmented-reality characters | Gruffalo Spotter: clues led to footprint markers in the forest where the app showed the character animated (Forestry England, forestryengland.uk, 2017 and 2021) | Bad fit (What is gone). |

## Not known

- Which entries visitors notice and use on the ground; none of them has
  been watched on a real trail with this site.
- Whether a children's track is wanted beside the main text, or whether a
  section in each card serves families as well.
- Whether publishers can keep dated content (seasons, closures, events)
  current; without someone doing it, it goes stale on the site, which is
  worse than a sign saying nothing.
- How much a then-and-now pair gains from a slider over two photos.
