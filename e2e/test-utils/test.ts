import {
	test as base,
	expect,
} from '@wordpress/e2e-test-utils-playwright'

import { ExtendedRequestUtils } from './requestUtils'

const test = base.extend<{
	requestUtils: ExtendedRequestUtils;
}>( {
	requestUtils: async ( {}, use ) => {
		const requestUtils = await ExtendedRequestUtils.setup( {
			baseURL: process.env.WP_BASE_URL,
			user: {
				username: process.env.WP_USERNAME,
				password: process.env.WP_PASSWORD,
			},
		} )

		await use( requestUtils )
	},
} )

export { test, expect }
