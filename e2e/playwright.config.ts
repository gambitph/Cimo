import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'url'

import dotenv from 'dotenv'
import path from 'path'

dotenv.config( { path: path.resolve( __dirname, '../.env' ) } )

export default defineConfig( {
	globalSetup: fileURLToPath(
		new URL( './config/global-setup.ts', 'file:' + __filename ).href
	),
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	timeout: 90_000,
	reporter: [
		[ 'list' ],
		[ 'html', { outputFolder: '../playwright-report', open: 'never' } ],
	],
	reportSlowTests: null,
	use: {
		baseURL: process.env.WP_BASE_URL,
		ignoreHTTPSErrors: true,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
		video: 'retain-on-failure',
	},
	projects: [
		{
			name: 'Cimo',
			use: {
				storageState: process.env.WP_AUTH_STORAGE,
				...devices[ 'Desktop Chrome' ],
			},
			testDir: './tests',
		},
	],
} )
