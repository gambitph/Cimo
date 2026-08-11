# E2E Testing

Cimo's end-to-end tests verify that client-side upload interception actually
converts JPEG uploads to WebP across the main WordPress admin surfaces.

WordPress is provided by [`@wp-playground/cli`](https://www.npmjs.com/package/@wp-playground/cli)
(WASM PHP + SQLite, **no Docker**). Playwright's `webServer` boots it
automatically before the suite runs.

## Prerequisites

Just Node **20+** — no Docker, Composer, or separate WordPress install.

## Usage

Build the plugin assets first (Playground mounts this repo; enqueue needs `build/`):

```bash
npm run build:e2e
```

Run e2e tests (Playground starts on port `9410` if nothing is already listening):

```bash
npm run test:e2e
```

or with the Playwright UI:

```bash
npm run test:debug
```

Locally, `playwright.config.js` reuses an already-running Playground on port
`9410` when present (fast repeat runs). In CI it always boots fresh. If a stale
instance is misbehaving after editing PHP/JS that Playground mounted at boot,
kill whatever is listening on `9410` and re-run.

Optional overrides (defaults are set in `playwright.config.js`):

```
WP_PORT=9410
WP_BASE_URL=http://127.0.0.1:9410
WP_USERNAME=admin
WP_PASSWORD=password
```

## What is covered

| Surface | Flow |
|---------|------|
| Image block | Upload button → JPG → WebP |
| Image block | Media Library modal drop → JPG → WebP |
| Block editor | Drop JPG on canvas → WebP image block |
| Page sidebar | Drop JPG on Featured Image → WebP |
| Media → Add New | File picker → JPG → WebP in library |

## Files

| Path | Role |
| --- | --- |
| `../playwright.config.js` | Boots `@wp-playground/cli` as Playwright's `webServer`; auth/`baseURL`/storage state |
| `playground-blueprint.json` | Logs in as `admin`, activates Cimo |
| `config/global-setup.js` | Cookie-authenticates via `RequestUtils.setup()`, persists `storageState` |
| `test-utils/` | Shared fixtures + upload/drop helpers |
| `tests/*.spec.ts` | Browser-driven upload interception specs |
| `.auth/` | Gitignored; written by global setup |

## Troubleshooting

- **`browserType.launch: Executable doesn't exist`** — run
  `npx playwright install chromium` once per machine.
- **Stale plugin behaviour after editing PHP** — Playground snapshots the
  mount at boot. Stop the process on port `9410` and re-run.
- **Composer/settings never appear / `cimoSettings` missing** — run
  `npm run build:e2e` so `build/admin/` exists for enqueue.

## Dev Notes

- Pattern mirrors [Ahentic e2e](https://github.com/bfintal/ahentic/tree/master/tests/e2e)
  (Playground CLI + `@wordpress/e2e-test-utils-playwright`).
- Gutenberg e2e workflow: https://github.com/WordPress/gutenberg/blob/trunk/.github/workflows/end2end-test.yml
