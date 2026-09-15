import fs from 'fs'

import {
	test,
	expect,
	saveCimoOptions,
	SAMPLE_LARGE_JPG,
	uploadSampleViaMediaNew,
	getMediaFileByteLength,
	reloadCimoRuntime,
	getCimoSettings,
} from '../../test-utils'

test.describe.configure( { timeout: 180_000 } )

test.describe( 'Premium smart optimization', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			disable_thumbnail_generation: 1,
			disable_wp_scaling: 1,
			webp_quality: 80,
			max_image_dimension: 0,
			smart_optimization: 1,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			smart_optimization: 1,
			webp_quality: 80,
			max_image_dimension: 0,
		} )
	} )

	test( 'smart optimization is on by default and yields smaller uploads than quality-only', async ( {
		page,
		requestUtils,
	} ) => {
		await reloadCimoRuntime( page )
		const defaults = await getCimoSettings( page )
		expect( String( defaults.smartOptimization ) ).toBe( '1' )

		const smartMedia = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_LARGE_JPG
		)
		const smartSize = await getMediaFileByteLength(
			page,
			requestUtils,
			smartMedia.id
		)
		expect( smartSize ).toBeGreaterThan( 0 )
		expect( smartSize ).toBeLessThan( fs.statSync( SAMPLE_LARGE_JPG ).size )

		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			smart_optimization: 0,
			webp_quality: 80,
			disable_thumbnail_generation: 1,
			disable_wp_scaling: 1,
			max_image_dimension: 0,
		} )
		await reloadCimoRuntime( page )
		const offSettings = await getCimoSettings( page )
		expect( String( offSettings.smartOptimization ) ).toBe( '0' )

		const plainMedia = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_LARGE_JPG
		)
		const plainSize = await getMediaFileByteLength(
			page,
			requestUtils,
			plainMedia.id
		)
		expect( plainSize ).toBeGreaterThan( 0 )

		expect( smartSize ).toBeLessThan( plainSize )
	} )
} )
