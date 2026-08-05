# E2E Testing

Cimo's end-to-end tests verify that client-side upload interception actually
converts JPEG uploads to WebP across the main WordPress admin surfaces.

## Usage

Node.js **20+** is recommended (see [`.nvmrc`](../.nvmrc)).

Create an `.env` file in the plugin root:

```
WP_BASE_URL=http://localhost:8889
WP_AUTH_STORAGE=wp-auth.json
WP_USERNAME=admin
WP_PASSWORD=password
CIMO_SLUG=Cimo/cimo
```

`CIMO_SLUG` is `{folder}/{main-php-without-extension}`. With `@wordpress/env`
mounting this repo as `.`, the folder name is typically `Cimo`.

Start a local WordPress environment (requires Docker):

```bash
npx @wordpress/env start
```

Build the plugin for testing (skips packaging):

```bash
npm run build:e2e
```

Run e2e tests:

```bash
npm run test
```

or with the Playwright UI:

```bash
npm run test:debug
```

## What is covered

| Surface | Flow |
|---------|------|
| Image block | Upload button → JPG → WebP |
| Image block | Media Library modal drop → JPG → WebP |
| Block editor | Drop JPG on canvas → WebP image block |
| Page sidebar | Drop JPG on Featured Image → WebP |
| Media → Add New | File picker → JPG → WebP in library |

## Dev Notes

- Pattern mirrors [Interactions e2e](https://github.com/gambitph/Interactions/tree/master/e2e)
- Basis: https://github.com/meszarosrob/wordpress-e2e-playwright-intro-2023
- Gutenberg e2e workflow: https://github.com/WordPress/gutenberg/blob/trunk/.github/workflows/end2end-test.yml
