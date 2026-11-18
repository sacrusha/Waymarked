# Waymarked: a trail repository on Themenweg

Waymarked is the development repository for customer trails. The first is
the Stadtnaturweg Baden; `main` publishes it at sacrusha.github.io/Waymarked,
the address the society's members have.

The repository is a clone of the framework, Themenweg
(github.com/sacrusha/Themenweg, the remote `upstream`; its working copy sits
beside this one, `../themenweg`). Everything here that is not listed below
as Waymarked's own is Themenweg's: the engine in `src/`, `docs/`, the demo
trail `trails/rheinfall/`, README.md, CLAUDE.md. It is developed and fixed
in Themenweg and arrives here with `git pull upstream main`; a change made
to it here is missing from the framework and meets the next pull as a
conflict.

Themenweg is public and the user's portfolio piece. It names no customer,
no customer's trail and not this repository, so `upstream` has no push
address here.

Waymarked's own:

- `trails/stadtnaturweg-baden/`: the trail's content, and in its `docs/`
  what is known about the trail beyond the content (the partner and the
  rights, the look and the print it follows, what is open with the society).
- This file.
- One line in `.github/workflows/pages.yml`: it publishes Baden while the
  repository variable `THEMENWEG_TRAIL` is not set.

With two folders under `trails/`, the build, `npm run dev`, `npm run check`
and the scripts in `src/build/` need the environment variable
`THEMENWEG_TRAIL=stadtnaturweg-baden` (docs/design/trail-content.md).

The branch `archive` holds the repository's history from before it was
based on Themenweg. A trail handed over to its publisher goes into a fresh
clone of Themenweg.
