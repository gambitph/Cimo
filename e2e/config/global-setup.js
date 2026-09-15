/**
 * Playwright global setup: logs in as the WordPress admin user created by
 * `e2e/playground-blueprint.json` (admin / password) and persists the
 * resulting cookies + REST nonce to `STORAGE_STATE_PATH` (see
 * playwright.config.js), so:
 *
 * - Every browser context launched by a spec starts already logged in
 *   (`use.storageState` in playwright.config.js points at the same file).
 * - The worker-scoped `requestUtils` fixture (from
 *   `@wordpress/e2e-test-utils-playwright`) can make authenticated REST calls
 *   without each spec driving its own login.
 *
 * This is the same `RequestUtils.setupRest()` pattern used by Gutenberg's own
 * e2e suite (and Ahentic) rather than a bespoke Application Password /
 * Basic-auth flow — one fewer thing to explain, and it composes with the
 * `admin`/`page`/`editor` fixtures those packages already ship.
 */
const { RequestUtils } = require( '@wordpress/e2e-test-utils-playwright' )

module.exports = async function globalSetup() {
	const requestUtils = await RequestUtils.setup( {
		user: {
			username: process.env.WP_USERNAME || 'admin',
			password: process.env.WP_PASSWORD || 'password',
		},
		storageStatePath: process.env.STORAGE_STATE_PATH,
		baseURL: process.env.WP_BASE_URL,
	} )

	await requestUtils.setupRest()
}
