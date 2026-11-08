# The surface

## Purpose

One screen that serves every way the site is used, without mode switches:
planning at home, walking between stations, reading at a station, reading
through afterwards, arriving mid-trail via a sign's QR code. The visitor is
untrained and uses the site for a few hours in their life; whatever they
have built up (where they are, what is around, where they were reading)
survives every interaction. The map is the spatial anchor and never leaves
the screen.

## Situation

- Trail websites fail by having pages: overview, map, station 1..n. Every
  page change discards the walker's orientation, which is why a single PDF
  competes with them.
- Sheet-over-map is Google Maps' pattern. What trail sites lack is its
  coupling to a station sequence, the map's selection state and GPS; trail
  sites are built on CMS pages.
- Half of the visitors read maps poorly; they need a direction and a
  distance more than a better map.
- Phones in portrait, outdoors, in sun, one-handed; desktops and landscape
  at home. Mobile browsers discard tabs after screen-lock, and some
  (Samsung Internet) lay a fixed page out under their bottom toolbar: the
  surface takes the window's inner height, the one height the sheet's
  bounds and the visible map are measured from. Browsers and devices that
  fail the map, the location or the audio: docs/design/robustness.md.
- The map is MapLibre GL. The basemap may rotate (heading-up), which keeps
  labels readable only on vector tiles.

## How the site meets it

Two axes on one surface.

Along the trail (horizontal): item 0 is the trail itself (length, walking time,
start, getting there); items 1..n are the stations in order. Tapping a
marker, prev/next, or swiping the sheet are the same action: the selection
changes, the map pans to it. On the map the selected station is highlighted,
previous and next in a secondary highlight, the route segment to the next
emphasised. Markers carry the station numbers; numbers are how people match
ground signage to the map. The overview (item 0) is one tap away from every
card, not only from the trail's ends: it is where the whole trail is seen.

Bounds: a trail is local. The map is bounded to the trail's extent with
generous margins and a matching minimum zoom, both derived from the trail's
data, so panning and zooming can't lose the trail. What the bounds hold is
the centre of the visible map, not its whole area: follow mode must be
able to put the visitor at its anchor anywhere inside the bounds, turned
or not, and the margins are wide enough that half a view past the edge
still shows trail. A visitor out of view,
far away or panned past, sees their own position as an arrow at the map's
edge, without a distance: the card's tag gives the way to the station, and
a second figure on the map (from the map's centre to the visitor) was read
as the same; tapped, it follows them where the map can go.

Depth (vertical): the sheet. In portrait it rests at a peek height over the
map and grows as the visitor scrolls, then its content scrolls; any
position between is legal. Implementation sketch, not a rule: the map fixed
behind a scroll container whose top is a transparent spacer that passes
touches to the map; the card begins below it. Peek holds a handle, the
title row ("7 · Title", and beside it the way to the station, the
station the visitor is at, or else the language choice) and one orientation row (prev as a small button, the
overview, "Next 8" over the leg's length and walking time, "350 m · 6 min",
in the button's own height; while walking to it, the live arrow and
distance join "Next 8" and the leg's line stays, so the peek keeps its
height): about 110–130 px, 15–18 % of a phone
viewport; a title on two lines adds one line. At full extent a
strip of map (about 15 %) remains; with GPS follow mode centring the map on
the visitor, that strip shows them, their heading and the selected station.
Same map, less of it. Untrained visitors did not discover that the
minimised sheet scrolls. Peek shows the first half-line of what the card
opens with, cut off; that is the trail's content (a sign row, a photo), so
it says "more" on some trails better than on others. The site's own word
is "Weiterlesen ∨" on a faded wash at the sheet's bottom edge, shown while
the card's content goes on below the screen's edge, at any sheet height and
side by side alike: not until the scroll's end, since a short card can
still rise to full extent over blank paper, and full extent stays reachable
on every card so the sheet's travel is the same from card to card. It reads
as a link, and testers tapped it: a tap turns the page, the line half under
the wash coming up to just below the head so nothing is skipped, and
stopping where the card's end reaches the screen's edge, so it never
scrolls over blank paper. From the peek the same tap raises the sheet. It
is the scroll the finger would make, so it adds no position or state of
its own, and a drag starting on it still scrolls. The sheet bounces briefly
when a different station is selected while minimised, and when the head is
tapped beside its controls: the head is the sheet's grip, and the bounce
answers the tap with "this moves" without moving it. Neither bounces where
the card's content is all on screen. A visitor arriving (first visit, link,
QR code) finds the sheet at peek.

Transitions the site initiates: exactly one. "Next: 8 Title →" at a card's
end moves along the trail and collapses the sheet to peek; the visitor is
about to walk. Everything else follows the finger. No page loads; the map
never unmounts; selection changes animate.

Camera: the map moves only when it must, so the visitor never loses track
of where they were. The view that counts is the part of the map the sheet
or the card leaves visible, for the in-view test and for the bounds alike;
a station under the sheet is not in view, and the trail's edges must be
reachable in whatever strip of map remains. A selection already in view moves nothing; one outside
the view is panned to, smoothly; a zoom-out follows only when the view is
too close to show it. The zoom-out, pan, zoom-in flight suits spread-out
maps, not a trail inside a town. While the map follows the visitor (Walking
help), the visitor is the fixed point instead: a selection out of view
zooms the map out around them until it shows, and the overview ends
following.

Listening: where a station has audio (docs/design/trail-content.md), its
card opens with a player, a large "Vorlesen" (read aloud) button, the
length, and a position slider, so a visitor can listen instead of reading
and then put the phone away. The button is in the card only: some
testers (an anecdotal sample) missed a small one in the peek, and the
peek's slot went to the language choice. One audio element belongs to the page, not the card, because cards are
re-rendered at every selection. Audio belongs to the card in view: selecting
another card stops it, so nothing plays that the screen doesn't show. While
it plays, the lock screen and headphones carry the media controls (play,
pause, seek) with the station's number and title.

Controls: the basemap choice shows its options side by side with the
selection highlighted, the least surprising control for a visitor who never
learns the site; screen space allows it for now. When the sheet leaves
only a strip of map, the strip is the map's: the controls give way, and
stay findable by a visitor who never learns the site. They slide out as the
strip shrinks, following the sheet (the basemap choice up off
the screen, the map's buttons down under the card), and come back as it
grows: their form never changes, so there is nothing to learn, and lowering
the sheet, the gesture for more map, is what brings them back. The
attribution stays. The sheet's handle looks draggable and is: dragging
it does what scrolling does. The locate button
(and the north button while the map is turned) rides above the sheet's top
edge at the right, where the thumb of the hand holding the phone reaches;
side by side, in the map's lower right corner.

Landscape and desktop: same DOM, map beside sheet, a classic draggable
divider with limits; chosen by aspect ratio, not device.

Walking help (its version: docs/backlog.md): the half of visitors who read
maps poorly get a direction and a distance from where they stand, and a map
turned the way they face, so that ahead on the map is ahead on the ground.

- The visitor on the map: a blue dot, the blue every map app uses for
  "you", its accuracy as a pale circle, and a cone toward where they face
  while a heading is known. A fix older than 30 s (a dead spot, the lift,
  the page back from the background) is stale: the dot goes grey and the
  peek's way and "Here" wait for the next fix, since a walker has gone some
  40 m by then, as far as "at a station" lasts.
- The locate button: a tap shows the visitor and follows them. On a phone
  the first tap also turns the map with them (heading-up, the visitor placed
  low in the visible map so more of what is ahead shows); the next tap
  keeps following with north up, the next turns again. On a desktop, with
  no compass, a tap follows north up and the next lets go. Panning lets go;
  pinching keeps following. A turned map stays turned when let go, with a
  north button to set it straight. Following keeps the visitor in the part
  of the map the sheet leaves visible, at any sheet height, so the strip
  above a raised sheet still shows them.
- Heading: the compass where the device has one and allows it; else the GPS
  course while walking (between fixes at walking pace, so a jumping fix
  gives no direction). A compass without an estimate of its own error (iOS
  reports that, uncalibrated or under interference) shows its widest cone
  and gives way to the course while walking. The compass on iOS needs a permission asked from a
  tap: the locate button's tap asks it first, so it still counts as the
  tap's. Location and the compass need a secure page (https); a phone on a
  local preview gets one from the https dev server
  (docs/design/trail-content.md, Building and checking).
- Permission: the browser asks on the first tap only. Once allowed,
  location comes back on later visits and after a reload without a tap,
  and follow mode resumes as the visitor left it (State). Refused, or
  without https, the map says so in one line, with how to allow it.
- The way, in the peek. The station walked to is the selected one until the
  visitor is at it, then the next. Walking to the selected station, the
  title row shows an arrow and the distance to it; at it, the title row
  shows the language choice again and "Next 9" gains the arrow and the distance from where they
  stand; on the overview, "Start at 1" does. The arrow aims along the leg
  into the target where the visitor is on it (at a point a little ahead on
  the route, so it follows bends and stairs; where the leg passes close to
  itself, as at a switchback, the fold they were on is kept, since a fix
  can't tell the folds apart) and the distance is what is
  left of the leg; off the route, both are the straight line. The arrow
  points the way in the world while a heading is known, else as on the map.
  On that leg into the selected station, the map emphasises it instead of
  the leg on.
- Arrival: within 25 m of a station, with a fix better than 50 m, the
  visitor is at it until 40 m away. At a station other than the selected
  one, the title row offers its card ("Here: 9"); the card never switches
  by itself, because the visitor may be reading. Where stations stand closer
  than that (Baden's 6 and 7, 17 m apart), the selected one wins. A station
  the visitor leaves in the cards while standing at it ("Next" at the end
  of its card) is acknowledged: they know where they are, so the way to the
  chosen station shows, and no offer of the acknowledged one until they
  have left it.

State: the selected station in the URL (`#7`), so reload, share and QR
deep-links land on a station with the sheet at peek; the sheet's
position, the view and follow mode survive a reload in the tab. Each station change
is a history entry, so Back steps back through the cards; leaving the site
on Back would surprise.

Language: with more than one, a compact choice in the title row, the
current code and a ∨ ("DE ∨", as government sites show it); a tap opens
the device's own picker with the languages by their own names. It is a
setting of the whole site and sits on every card's head, where the
visitor's eye is; it gives way while the slot shows the way or "Here". A
visitor scanning a placard for the first time sees it: location is only
asked for from the locate button's tap, so there is no way to show yet. The site opens in the visitor's browser
language where the trail has it. Details and the machine-translation note:
docs/design/trail-content.md, Languages.

Basemap: the Landeskarte is the default. It says "this is Switzerland, not
Google", which is appreciated locally. Heading-up turns it, and its labels
turn with it, as in swisstopo's own app: a walker steers by the route, the
numbered markers (which stay upright) and their own dot, not by street
names. The vector map stays the option that keeps labels upright once the
map rotates; the site never switches the visitor's basemap by itself.

Attribution: swisstopo's line stays visible over whatever map remains.

## Not known

- Whether the Stadtnaturweg is signposted on the ground.
- Snap points versus free positions for the sheet; to be decided on real
  phones.
- The landscape divider's limits per aspect ratio, almost certainly
  different for the map's side and the card's.
- Whether audio should carry on, or continue with the next station's, when
  the visitor walks on; today it stops with the card. Background playback
  with the screen locked is expected from the browsers' media session but
  untested on iOS and Android.
- Whether the arrival suggestion ("Here: 9") is noticed and is enough; and
  whether 25 m suits placards whose mapped positions are ±5–10 m and set
  beside their objects (docs/backlog.md, Situation).
- Walking help on real phones: the compass direction held flat, raised, and
  in landscape (on Android the site turns orientation into a heading; iOS
  gives one),
  whether heading-up feels steady or nervous at walking pace, the GPS
  course in the old town's lanes, and whether the first tap should turn the
  map or only follow.
- Whether the leg's line in "Next" (0.8 rem) reads in sunlight.
- Whether the strip above a raised sheet should keep the selected station
  in view too while following; today the peek's arrow points to it.
- Whether "Weiterlesen" and the head's bounce are noticed, in sunlight at
  the screen's bottom edge, and are enough. Whether a visitor who tapped
  "Weiterlesen" then scrolls by finger, or keeps tapping; and how one who
  only taps gets back down to the map (today: dragging the head down). If
  that fails, the fallback is a visible button that opens and closes the
  sheet.
- Whether the mark's band (28 px, the full width) is tall enough to hit at
  the screen's bottom edge.
- Whether a station link (a QR code at its placard) should land at full
  extent: the visitor standing there wants the text. For the overview, the
  map may be the point.
