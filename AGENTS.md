# AGENTS.md

## Cursor Cloud specific instructions

Cimo is a WordPress plugin (client-side image → WebP/AVIF conversion on upload). It only runs inside a WordPress install, so end-to-end testing needs a running WordPress with the built plugin activated.

### Environment (already provisioned in the VM snapshot)
- Node 22, PHP 8.3, Composer, and Docker are installed. Dependencies (`node_modules`, Composer `vendor/`) are refreshed by the startup update script.
- Docker is required for the WordPress test environment (`@wordpress/env`). The Docker daemon is not managed by systemd here; if `docker ps` fails, start it with `sudo dockerd` (a background/tmux process) — the daemon is configured for the `fuse-overlayfs` storage driver and `iptables-legacy`.

### Build / run / lint (see `package.json`, `BUILD.md`)
- Dev (watch): `npm run start` — builds into `build/` and watches. This is the intended dev workflow.
- One-shot build + zip: `npm run build` (its `prebuild` runs `npm run lint`, i.e. `lint:js` + `lint:css`).
- Lint only: `npm run lint`. PHP lint: `composer run lint:php` (PHPCS, WordPress standards).
- Built assets in `build/` must exist for the plugin to work in WordPress; `npm run start`/`build` generate them.

### Shared WordPress dev environment (all three sibling plugins)
- A `wp-env` project lives at `/home/ubuntu/wp-dev` with a `.wp-env.json` that mounts Cimo, Interactions and Stackable (by absolute path) into one WordPress site. It is kept out of the repos on purpose.
- Start/stop: `cd /home/ubuntu/wp-dev && npx wp-env start` / `npx wp-env stop`. Run WP-CLI: `npx wp-env run cli wp <cmd>`.
- Site: http://localhost:8888/wp-admin (user `admin`, password `password`). wp-env auto-activates the mounted plugins on start.
- Hello-world check: upload a JPG/PNG via an Image block in the editor; Cimo converts it to `.webp` on upload (verify the attachment mime with `wp post list --post_type=attachment --fields=ID,post_mime_type,guid`).
- After changing plugin source, rebuild assets (`npm run build` or keep `npm run start` watching); wp-env serves the repo directory live, so no reinstall is needed.
