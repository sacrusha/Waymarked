# Waymarked

A forkable website for a waymarked trail: an interpretive, nature, heritage,
art or discovery trail with stations along a route. One screen serves
planning at home, walking between stations with GPS, reading or listening at
a station, and arriving mid-trail from a sign's QR code. The map is the
spatial anchor and never leaves the screen.

The engine is in `src/`; a trail is one folder under `trails/` with its
stations, texts, photos, audio, route and look. The first trail is the
Stadtnaturweg Baden (AG), 15 placards by NAVO Baden/Ennetbaden with the city
of Baden.

To run it on your own computer: install [Node.js](https://nodejs.org) 22.18 or
newer, then in `src/` run `npm install` and `npm run dev`. `npm run dev:https`
serves it to phones in your network for GPS; `npm run check` validates the
trail folder.

What it is for, how it is built and why, and what is open: `docs/`.
