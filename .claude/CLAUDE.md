# Waymarked: a trail repository on Themenweg

Waymarked is the repository for what isn't for the public: customer trails
in development, and the business around Themenweg, assessments of trails
that are no project included. The first customer trail is the Stadtnaturweg
Baden; `main` publishes it at sacrusha.github.io/Waymarked, the address the
society's members have.

The repository is a clone of the framework, Themenweg
(github.com/sacrusha/Themenweg, the remote `upstream`; its working copy sits
beside this one, `../themenweg`). Everything here that is not listed below
as Waymarked's own is Themenweg's: the engine in `src/`, `docs/`, the demo
trail `trails/rheinfall/`, README.md, CLAUDE.md. It is developed and fixed
in Themenweg and arrives here with `git pull upstream main`; a change made
to it here is missing from the framework and meets the next pull as a
conflict.

Themenweg is open, the user's portfolio piece, managed by Graculus.ch, which
teaches AI proficiency; it would serve an English heritage trail as readily
as one in Aargau. It names no customer, no customer's trail and not this
repository, and holds no marketing, business strategy or assessment of
others' trails, so `upstream` has no push address here.

Waymarked is public on GitHub for now and is to be taken private. While it
is public, `business/` and `docs/Content/` are kept out of `main`
(`.git/info/exclude`) and committed only to the local branch `business`,
which is never pushed; the working copies are the current ones, the branch
their last saved state.

Waymarked's own:

- `trails/stadtnaturweg-baden/`: the trail's content, and in its `docs/`
  what is known about the trail beyond the content (the partner and the
  rights, the look and the print it follows, what is open with the society).
- `business/`: where further trails can come from: trails that exist and
  their publishers (prospects.md), places where one could be made from
  material that exists (seeds.md); what the region's offerings do that
  Themenweg doesn't, with the regional examples of docs/catalogue.md
  (market.md); and what publishers can buy instead and who pays
  (vendors-and-funding.md).
- `docs/Content/`: working papers on the Stadtnaturweg's printed panels and
  leaflet (draft E7); its README says what they are.
- This file.
- One line in `.github/workflows/pages.yml`: it publishes Baden while the
  repository variable `THEMENWEG_TRAIL` is not set.

With two folders under `trails/`, the build, `npm run dev`, `npm run check`
and the scripts in `src/build/` need the environment variable
`THEMENWEG_TRAIL=stadtnaturweg-baden` (docs/design/trail-content.md).

The branch `archive` holds the repository's history from before it was
based on Themenweg. A trail handed over to its publisher goes into a fresh
clone of Themenweg.
