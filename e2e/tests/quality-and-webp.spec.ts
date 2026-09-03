import fs from 'fs'

import {
	test,
	expect,
	SAMPLE_LARGE_JPG,
	SAMPLE_LARGE_WEBP,
	saveCimoOptions,
	uploadSampleViaMediaNew,
	getMediaFileByteLength,
	reloadCimoRuntime,
} from '../test-utils'

test.describe.configure( { timeout: 180_000 } )

test.describe( 'WebP quality and already-WebP uploads', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 80,
			max_image_dimension: 0,
			disable_wp_scaling: 1,
			disable_thumbnail_generation: 1,
			smart_optimization: 0,
			skip_webp_optimization: 0,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 80,
			max_image_dimension: 0,
			disable_thumbnail_generation: 0,
			skip_webp_optimization: 0,
		} )
	} )

	test( 'lower WebP quality produces a smaller upload than higher quality', async ( {
		page,
		requestUtils,
	} ) => {
		await saveCimoOptions( requestUtils, {
			webp_quality: 20,
			smart_optimization: 0,
			max_image_dimension: 0,
			disable_thumbnail_generation: 1,
		} )
		await reloadCimoRuntime( page )

		const lowMedia = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_LARGE_JPG
		)
		const lowSize = await getMediaFileByteLength(
			page,
			requestUtils,
			lowMedia.id
		)
		expect( lowSize ).toBeGreaterThan( 0 )

		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 90,
			smart_optimization: 0,
			max_image_dimension: 0,
			disable_thumbnail_generation: 1,
		} )
		await reloadCimoRuntime( page )

		const highMedia = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_LARGE_JPG
		)
		const highSize = await getMediaFileByteLength(
			page,
			requestUtils,
			highMedia.id
		)
		expect( highSize ).toBeGreaterThan( 0 )
		expect( lowSize ).toBeLessThan( highSize )
	} )

	test( 'uploading an existing WebP stays WebP', async ( {
		page,
		requestUtils,
	} ) => {
		await reloadCimoRuntime( page )
		const originalSize = fs.statSync( SAMPLE_LARGE_WEBP ).size

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_LARGE_WEBP,
			'image/webp',
			{
				expectedMime: 'image/webp',
				urlPattern: /\.webp(\?|$)/i,
			}
		)
		expect( media.mime_type ).toBe( 'image/webp' )
		expect( media.source_url ).toMatch( /\.webp(\?|$)/i )

		const uploadedSize = await getMediaFileByteLength(
			page,
			requestUtils,
			media.id
		)
		expect( uploadedSize ).toBeGreaterThan( 0 )
		// Re-encode may shrink or skip if larger; either way upload must succeed.
		expect( uploadedSize ).toBeLessThanOrEqual( originalSize * 1.25 )
	} )

	test( 'can leave an oversized WebP unchanged', async ( {
		page,
		requestUtils,
	} ) => {
		await saveCimoOptions( requestUtils, {
			max_image_dimension: 800,
			skip_webp_optimization: 1,
		} )
		await reloadCimoRuntime( page )

		const originalSize = fs.statSync( SAMPLE_LARGE_WEBP ).size
		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_LARGE_WEBP,
			'image/webp',
			{
				expectedMime: 'image/webp',
				urlPattern: /\.webp(\?|$)/i,
			}
		)

		expect( media.media_details?.width ?? 0 ).toBeGreaterThan( 800 )
		expect( await getMediaFileByteLength( page, requestUtils, media.id ) ).toBe( originalSize )
	} )
} )
