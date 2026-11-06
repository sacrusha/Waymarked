# Waymarked

A forkable repo for an interpretive trail, nature trail, educational trail, heritage trail, heritage walk, town trail, history walk, culture trail, discovery trail, learning path, self-guided trail, walking tour, sculpture trail, art walk, story walk, audio tour, waymarked route.

Product definition, constraints and versions: docs/backlog.md.

## Layout

- README.md — public github landing
- docs/ — for people and agents working on the project: backlog.md (the
  product's situation, versions, what is open), design/ (one file per part of
  the site: its purpose, the situation it meets, how the site meets it, what
  isn't known), user-flow.md (the screens and their words), brand/ (the
  mark: its guidelines, SVG masters and the scripts that draw them), and
  working notes.
- src/ — the site, in whatever layout its toolchain expects.
- secrets/ — local deploy credentials, git-ignored except its README.

## Docs

Docs carry situation and purpose. Situation is kept current, with one home
per fact and pointers elsewhere; purpose is refined, stated first, and must not be
displaced by the rules or rulings that came from it — write the purpose and
situation behind a ruling instead. A purpose the sources don't give is asked
for, not supplied. History, evidence and logs are git's: describe what is,
not what happened.
