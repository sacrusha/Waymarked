# secrets/

Local credentials. Git ignores everything in this folder except this README.

## cloudflare.env — deploying to Cloudflare Pages

The GitHub Pages workflow publishes every push to main. A repository that
can't use it (a private one on GitHub's free plan has no Pages), or whose
pushes shouldn't all go out, publishes from the maintainer's computer
instead: `npm run deploy` in `src/`, to Cloudflare Pages (the free plan is
enough). Nothing runs it but a person, so the site changes when someone
decides it should; a forgotten deploy leaves the previous version up.

It refuses while this file is incomplete or `src/` or the trail folder has
uncommitted changes, so what goes out is a commit. Then it runs
`npm run check` and `npm run build`, creates the Pages project on first use
(production branch `main`), and deploys `src/dist/` to it as production. It
touches no other project. A project created beforehand in the dashboard with
another production branch would get preview deployments instead.

The file, to be filled in:

    CLOUDFLARE_ACCOUNT_ID=
    CLOUDFLARE_API_TOKEN=
    CLOUDFLARE_PAGES_PROJECT=
    # THEMENWEG_TRAIL=

- `CLOUDFLARE_ACCOUNT_ID` — the 32-character account ID. In the Cloudflare
  dashboard, Workers & Pages → Overview, right-hand column; or in the URL
  after `dash.cloudflare.com/`.
- `CLOUDFLARE_API_TOKEN` — an API token (My Profile → API Tokens → Create
  Token → Custom token), limited to that one account, with these
  permissions:
  - Account · Cloudflare Pages · Edit — the project and its deployments
  - Account · Account Settings · Read — wrangler looks up the account

  No zone permissions are needed while the site uses its `pages.dev`
  address. An expiry date (TTL) on the token is a good idea.
- `CLOUDFLARE_PAGES_PROJECT` — the Pages project's name. The site's address
  becomes `<name>.pages.dev`; where another account holds that name,
  Cloudflare gives the project another address, which the deploy prints.
- `THEMENWEG_TRAIL` — the folder under `trails/` to publish, needed where
  there are several (docs/design/trail-content.md, Building and checking).

The deploy takes these names from this file only and ignores them in the
shell, so the file alone says which trail goes to which project.

If the token leaks, roll it in the dashboard (API Tokens → ⋯ → Roll) and put
the new value here.
