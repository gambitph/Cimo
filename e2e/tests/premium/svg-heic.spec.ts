import fs from 'fs'

import {
	test,
	expect,
	SAMPLE_SVG,
	SAMPLE_HEIC,
	saveCimoOptions,
	uploadSampleViaMediaNew,
	getMediaById,
	getMediaFileByteLength,
	reloadCimoRuntime,
	waitForOptimizedUploadMeta,
} from '../../test-utils'

test.describe.configure( { timeout: 240_000 } )

test.describe( 'Premium SVG and HEIC uploads', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			svg_upload: 1,
			svg_optimization_enabled: 1,
			disable_thumbnail_generation: 1,
			disable_wp_scaling: 1,
			webp_quality: 80,
			max_image_dimension: 0,
			smart_optimization: 0,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			svg_upload: 0,
			disable_thumbnail_generation: 0,
		} )
	} )

	test( 'uploading an SVG optimizes and keeps image/svg+xml', async ( {
		page,
		requestUtils,
	} ) => {
		const originalSize = fs.statSync( SAMPLE_SVG ).size
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_SVG,
			'image/svg+xml',
			{ expectedMime: 'image/svg+xml' }
		)
		expect( media.mime_type ).toBe( 'image/svg+xml' )

		const cimo = await waitForOptimizedUploadMeta( requestUtils, media.id )
		expect( cimo?.optimized_during_upload ).toBeTruthy()
		expect( Number( cimo?.convertedFilesize ) ).toBeGreaterThan( 0 )
		expect( Number( cimo?.convertedFilesize ) ).toBeLessThanOrEqual(
			Number( cimo?.originalFilesize ) || originalSize
		)

		const uploadedSize = await getMediaFileByteLength(
			page,
			requestUtils,
			media.id
		)
		expect( uploadedSize ).toBeLessThanOrEqual( originalSize )
	} )

	test( 'uploading a HEIC converts to WebP', async ( {
		page,
		requestUtils,
	} ) => {
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_HEIC,
			'image/heic'
		)
		expect( media.mime_type ).toBe( 'image/webp' )
		expect( media.source_url ).toMatch( /\.webp(\?|$)/i )

		const details = await getMediaById( requestUtils, media.id )
		expect( details.mime_type ).toBe( 'image/webp' )

		const cimo = await waitForOptimizedUploadMeta( requestUtils, media.id )
		expect( cimo?.optimized_during_upload ).toBeTruthy()
	} )
} )
