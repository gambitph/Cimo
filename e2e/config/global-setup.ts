import { request } from '@playwright/test'

import { ExtendedRequestUtils } from 'e2e/test-utils'

async function globalSetup() {
	const requestContext = await request.newContext( {
		baseURL: process.env.WP_BASE_URL,
		ignoreHTTPSErrors: true,
	} )
	const requestUtils = new ExtendedRequestUtils( requestContext, {
		storageStatePath: process.env.WP_AUTH_STORAGE,
		user: {
			username: process.env.WP_USERNAME,
			password: process.env.WP_PASSWORD,
		},
	} )

	await requestUtils.setupRest()

	const plugins = await requestUtils.getActivePlugins()

	for ( const slug of Object.keys( plugins ) ) {
		await requestUtils.deactivatePlugin( slug )
	}

	await requestUtils.activatePlugin( process.env.CIMO_SLUG )

	await requestContext.dispose()
}

export default globalSetup
