# E2E Testing

Cimo's end-to-end tests verify client-side upload interception, settings,
post-upload stats, freemium chrome, and (when premium is mounted) bulk
optimization across WordPress admin.

WordPress is provided by [`@wp-playground/cli`](https://www.npmjs.com/package/@wp-playground/cli)
(WASM PHP + SQLite, **no Docker**). Playwright's `webServer` boots it
automatically before the suite runs.

## Prerequisites

Just Node **20+** — no Docker, Composer, or separate WordPress install.

For **premium** specs you also need `pro__premium_only/` checked out under
the free plugin root (clone `bfintal/cimo-premium` into that directory).
Playground mounts the plugin tree as a real directory, so a symlink that
points outside the mount will not expose premium files inside WASM PHP.

## Usage

### Free suite

Build the plugin assets first (Playground mounts this repo; enqueue needs `build/`):

```bash
npm run build:e2e
```

Run free e2e tests (Playground starts on port `9410` if nothing is already listening):

```bash
npm run test:e2e
```

or with the Playwright UI:

```bash
npm run test:debug
```

### Premium suite

```bash
# Mount premium (once), e.g.:
# ln -sfn /path/to/cimo-premium pro__premium_only

npm run build:e2e:premium
npm run test:e2e:premium
```

Premium uses port `9411`, `playwright.premium.config.js`, and
`e2e/playground-blueprint.premium.json` (seeds a mock Freemius `premium` plan).

After premium builds, restore the free build type if you need free packaging:

```bash
node scripts/update-build-type.js free
```

Locally, Playwright reuses an already-running Playground on the suite's port
when present (fast repeat runs). In CI it always boots fresh. If a stale
instance is misbehaving after editing PHP/JS that Playground mounted at boot,
kill whatever is listening on that port and re-run.

Optional overrides (defaults differ per config):

```
WP_PORT=9410          # free; premium config defaults to 9411
WP_BASE_URL=http://127.0.0.1:9410
WP_USERNAME=admin
WP_PASSWORD=password
```

## CI

| Repo | Workflow | Suites |
|------|----------|--------|
| Free (`gambitph/Cimo`) | `.github/workflows/e2e-tests.yml` | Free only (`build:e2e` → `test:e2e`) |
| Premium (`bfintal/cimo-premium`) | `pro__premium_only/.github/workflows/e2e-tests.yml` | Free then premium (checks out free as root + premium as `pro__premium_only/`) |

## What is covered

### Free

| Surface | Flow |
|---------|------|
| Image block | Upload button → JPG → WebP |
| Image block | Media Library modal drop → JPG → WebP |
| Block editor | Drop JPG on canvas → WebP image block |
| Page sidebar | Drop JPG on Featured Image → WebP |
| Media → Add New | File picker → JPG → WebP in library |
| Settings | Load/save, quality + max dimension affect upload |
| Media Library grid | Drop → WebP |
| Media modal | Select Files → WebP |
| PNG / multi-file | Convert to WebP |
| Progress modal | Cancel when visible |
| Post-upload | Sidebar stats + attachment meta box |
| Freemium | Disabled premium controls, bulk upsell, plugins links |

### Premium (`e2e/tests/premium/`)

| Surface | Flow |
|---------|------|
| Settings | Gated controls enabled; working bulk UI (not upsell) |
| Bulk optimizer | Progress, complete 4 images under timeout, stop mid-run |

## Files

| Path | Role |
| --- | --- |
| `../playwright.config.js` | Free suite; Playground on 9410; ignores `tests/premium/` |
| `../playwright.premium.config.js` | Premium suite; Playground on 9411 |
| `playground-blueprint.json` | Login + activate Cimo (free) |
| `playground-blueprint.premium.json` | Activate + seed Freemius premium plan |
| `config/global-setup.js` | Cookie-authenticates via `RequestUtils.setup()`, persists `storageState` |
| `test-utils/` | Shared fixtures + upload/settings/drop helpers |
| `tests/*.spec.ts` | Free browser specs |
| `tests/premium/*.spec.ts` | Premium browser specs |
| `.auth/` | Gitignored; written by global setup |

## Troubleshooting

- **`browserType.launch: Executable doesn't exist`** — run
  `npx playwright install chromium` once per machine.
- **Stale plugin behaviour after editing PHP** — Playground snapshots the
  mount at boot. Stop the process on the suite port and re-run.
- **Composer/settings never appear / `cimoSettings` missing** — run
  `npm run build:e2e` (or `build:e2e:premium`) so `build/admin/` exists for enqueue.
- **Premium suite missing Bulk Optimizer** — ensure `pro__premium_only/` is present,
  `CIMO_BUILD` is `premium`, and the Freemius seed in the premium blueprint applied.

## Dev Notes

- Pattern mirrors [Ahentic e2e](https://github.com/bfintal/ahentic/tree/master/tests/e2e)
  (Playground CLI + `@wordpress/e2e-test-utils-playwright`).
- Gutenberg e2e workflow: https://github.com/WordPress/gutenberg/blob/trunk/.github/workflows/end2end-test.yml
