# Layers

## Purpose

Another trail's owner can make the cards their own without touching the
engine, so engine updates reach a fork without conflicts. Everything inside
a card between its navigation is the trail's content; the engine also
offers a framework that makes the common card easy, and a trail may use it
or, later, bring its own.

## Situation

- A fork is a copy of the repository with its trail folder replaced
  (docs/backlog.md, version 6); its owner instructs an AI to change it, and
  takes engine updates by merging. A merge is clean as long as the fork
  changes only `trails/<id>/`.
- Developer AIs integrate changes, which shifts what a framework must do:
  clear seams and stated contracts matter more than plugin machinery.
- One trail exists. A mock trail (version 6) will be the first to try a
  different mix of content; how forks want to depart from the default is
  not known yet.
- The wildlife idea (docs/backlog.md, Later) brings several sounds to one
  card.

## How the site meets it

Three layers:

- **Shell** (`src/app/`): the map, the sheet, the selection, the address
  and history, the card's head (badge, title, the peek's slot for the way,
  "Here" and Listen) and end ("Next", the engine's line), prev / overview
  / next, the settings, walking help, the engine's words, and the audio.
- **Content framework** (`src/app/content/`): the blocks a card body is
  made of (sign row, machine-translation note, player view, fields, text,
  photos with credits; on the overview the cover, facts, links, publisher,
  footer), styled by a trail's `theme.css`.
- **Content** (`trails/<id>/`): the data and the look.

The seam is `src/app/content/context.ts`: a body renderer gets the item
and what the shell has prepared (the text accessor, the engine's words, the
item's audio track, the machine-translation note, and on the overview the
station list, which is navigation and so the shell's, for the body to
place) and returns the body. What the shell relies on in a body is stated
there: its first element is the lead the peek cuts into; `data-go` buttons
select; elements that take a sideways drag carry `data-no-swipe`.

Audio is the shell's: one audio element for the page, stopped when the
card changes unless the new card shows the same track, the lock screen
named from the track's data, the peek's Listen playing the item's track.
A body shows it through views (`.player[data-audio]`), any number, each
naming its track; the framework's view is `content/player-view.ts`. So
several sounds in one card share the one element and the lock screen.

## Not known

- Whether a trail brings its own body renderer, and in what form: blocks
  declared in `station.json` (a fork's AI edits data) or a template in the
  trail folder composed from the framework's functions (more freedom,
  code in the trail). `renderCard` takes a renderer; nothing selects one
  from a trail yet. Decided when the mock trail or a fork needs it.
- The build side: `src/build/trail.ts` reads and checks the shell's data
  (positions, route, extent, languages) and the framework's (texts, photos,
  audio) together, and rejects fields it doesn't know, so a custom body has
  nowhere to keep its own data yet.
- The card body's styles are still in `src/app/style.css` with the
  shell's; the player's are in `content/player.css`.
- Where the language toggle goes: it is a setting of the whole site, sits
  on the map because the map is always on screen, and an embedding page
  may want to own the choice (`?lang=` exists; hiding the toggle does not).
- On a card with several tracks, the peek's Listen plays the item's own;
  whether that suffices is a content question once a second track exists.
