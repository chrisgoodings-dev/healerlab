# HealerLab

HealerLab is a World of Warcraft healer progression planner created as an HTML/CSS/JavaScript university project. A user enters a public character, the site retrieves data from Raider.IO, and a local decision engine turns that data into explainable Mythic+ and gear recommendations.

## What the MVP demonstrates

- Semantic HTML and a responsive CSS interface.
- Form input, validation and DOM updates with JavaScript.
- `fetch()` and asynchronous API handling.
- A real external API call to Raider.IO through a small same-origin proxy.
- Data normalisation, sorting, weighting and recommendation generation.
- Graceful errors and an offline demo mode.
- Automated unit tests for the analysis logic.
- A deployable public site using Cloudflare Pages + Pages Functions.

## Run locally

Requires Node.js 20 or newer.

```bash
npm run dev
```

Open `http://127.0.0.1:5173`.

The local server proxies `/api/character` to Raider.IO. If the development machine cannot reach Raider.IO, click **Load example** to exercise the complete analysis UI with local sample data.

## Run the tests

```bash
npm test
```

## Build

```bash
npm run build
```

This copies the static site into `dist/`.

## Deploy to Cloudflare Pages

1. Put this project in a GitHub or GitLab repository.
2. In Cloudflare, create a Pages project and connect the repository.
3. Build command: `npm run build`
4. Build output directory: `dist`
5. The `functions/api/character.js` file is deployed as the `/api/character` Pages Function.
6. After deployment, Cloudflare provides a public `*.pages.dev` address.
7. Optionally add a custom subdomain such as `healer.chrisgoodings.uk` in the Pages project's custom-domain settings.

No API secret is required for the current Raider.IO endpoint. Warcraft Logs would be a later server-side integration because its OAuth client secret must not be shipped to the browser.

## Project structure

```text
healerlab/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       ├── analysis.js
│       └── demo-data.js
├── functions/
│   └── api/
│       └── character.js
├── scripts/
│   └── build.mjs
├── tests/
│   └── analysis.test.mjs
├── dev-server.mjs
├── package.json
└── README.md
```

## Recommendation model

The MVP deliberately uses transparent heuristics rather than claiming to calculate perfect healing performance.

For each dungeon, the analysis compares the run with the character's own strongest run. The priority rises when the dungeon has a lower score, a lower key level, or a recorded over-time completion. This makes the recommendation relative to the player's current profile rather than comparing them with an arbitrary elite player.

Gear analysis calculates the mean item level across returned equipment slots, then ranks slots that sit below that personal baseline. Major armour, weapon and trinket slots receive a small weighting because replacing them can be more consequential than replacing a low-impact slot. This is an **upgrade-opportunity heuristic**, not a stat-weight simulation.

## Sensible next features

- Current-season dungeon metadata and loot tables from Blizzard APIs.
- A target-score planner using current season scoring rules.
- Warcraft Logs OAuth + GraphQL integration for cooldown and cast analysis.
- Raid composition utility/buff coverage.
- Saved characters and weekly plans.

## Official Blizzard API integration

HealerLab combines two external data sources. Raider.IO supplies Mythic+ performance and progression observations. Blizzard's official API supplies equipped item IDs, equipped item levels, item metadata, and item media. The Cloudflare Worker obtains a Battle.net OAuth access token with the client-credentials flow; the client secret never reaches browser JavaScript.

Production configuration:

- Public client ID: stored as `BLIZZARD_CLIENT_ID` in `wrangler.jsonc`.
- Secret: stored only as the Cloudflare Worker secret `BLIZZARD_CLIENT_SECRET`.
- Character equipment: `/profile/wow/character/{realmSlug}/{characterName}/equipment`.
- Item lookup: exposed by HealerLab at `/api/blizzard/item?region=eu&id={itemId}`.
- If Blizzard is unavailable, `/api/character` falls back to Raider.IO equipment so the analysis remains usable.

For local Blizzard testing, create an ignored `.dev.vars` file:

```text
BLIZZARD_CLIENT_SECRET=your-secret-here
```

The public client ID is already configured by the project. Never commit `.dev.vars`, `.env`, an OAuth access token, or the Blizzard client secret.

## Academic note

Keep a clear distinction between external data and your own processing in the report. Raider.IO supplies observations. HealerLab's JavaScript performs the validation, transformation, ranking and recommendation logic.


## Blizzard Journal loot enrichment

HealerLab now resolves the Midnight Season 2 dungeon identities through Blizzard's Journal API. Each dungeon is requested independently so a single Worker invocation only makes a small number of Blizzard subrequests. The Journal response supplies official journal instance IDs, encounter loot item IDs/names and instance media. These official identities are merged into the curated healer eligibility and slot model used by the gear planner.

This is intentionally hybrid: Blizzard is authoritative for identity/media, while the curated model still supplies healer-specific armor/weapon/trinket eligibility where the Journal response alone is not sufficient to make a safe recommendation.
