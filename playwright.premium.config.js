/**
 * Playwright config for Cimo's premium e2e suite.
 *
 * Requires `pro__premium_only/` on disk and a prior `npm run build:e2e:premium`.
 * Uses a separate Playground port/blueprint that seeds a mock Freemius premium plan.
 */
const path = require( 'path' )
const { defineConfig, devices } = require( '@playwright/test' )

const PORT = process.env.WP_PORT || '9411'
const baseURL = process.env.WP_BASE_URL || `http://127.0.0.1:${ PORT }`
process.env.WP_BASE_URL = baseURL
process.env.WP_USERNAME = process.env.WP_USERNAME || 'admin'
process.env.WP_PASSWORD = process.env.WP_PASSWORD || 'password'

const STORAGE_STATE_PATH = path.join( __dirname, 'e2e/.auth/admin.premium.json' )
process.env.STORAGE_STATE_PATH = STORAGE_STATE_PATH

const PLAYGROUND_BLUEPRINT = path.join(
	__dirname,
	'e2e/playground-blueprint.premium.json'
)

module.exports = defineConfig( {
	testDir: './e2e/tests/premium',
	globalSetup: require.resolve( './e2e/config/global-setup.js' ),
	fullyParallel: false,
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	timeout: 120_000,
	reporter: process.env.CI
		? [ [ 'github' ], [ 'html', { open: 'never' } ] ]
		: [ [ 'list' ], [ 'html', { outputFolder: 'playwright-report-premium', open: 'never' } ] ],
	reportSlowTests: null,
	webServer: {
		command: [
			'npx @wp-playground/cli server',
			'--mount=.:/wordpress/wp-content/plugins/cimo',
			`--blueprint=${ PLAYGROUND_BLUEPRINT }`,
			'--php=8.2',
			`--port=${ PORT }`,
		].join( ' ' ),
		port: Number( PORT ),
		reuseExistingServer: ! process.env.CI,
		timeout: 180 * 1000,
		stdout: 'pipe',
		stderr: 'pipe',
	},
	use: {
		baseURL,
		storageState: STORAGE_STATE_PATH,
		ignoreHTTPSErrors: true,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
		video: 'retain-on-failure',
		...devices[ 'Desktop Chrome' ],
	},
} )
