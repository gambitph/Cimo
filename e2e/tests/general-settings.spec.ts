import {
	test,
	expect,
	SAMPLE_OVERSIZED_JPG,
	SAMPLE_LARGE_JPG,
	saveCimoOptions,
	uploadSampleViaMediaNew,
	getMediaById,
	reloadCimoRuntime,
} from '../test-utils'

test.describe.configure( { timeout: 180_000 } )

test.describe( 'General settings (WP scaling & thumbnails)', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 80,
			max_image_dimension: 0,
			smart_optimization: 0,
			disable_wp_scaling: 1,
			disable_thumbnail_generation: 0,
			thumbnail_sizes: [],
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 80,
			max_image_dimension: 0,
			disable_wp_scaling: 1,
			disable_thumbnail_generation: 0,
			thumbnail_sizes: [],
		} )
	} )

	test( 'disabling WordPress automatic scaling keeps oversized uploads full size', async ( {
		page,
		requestUtils,
	} ) => {
		await saveCimoOptions( requestUtils, {
			disable_wp_scaling: 0,
			disable_thumbnail_generation: 1,
			max_image_dimension: 0,
			webp_quality: 80,
		} )
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_OVERSIZED_JPG
		)
		const details = await getMediaById( requestUtils, media.id )
		expect( details.mime_type ).toBe( 'image/webp' )
		expect( Math.max(
			details.media_details?.width || 0,
			details.media_details?.height || 0
		) ).toBeGreaterThan( 2560 )
	} )

	test( 'enabling WordPress automatic scaling caps oversized uploads at 2560px', async ( {
		page,
		requestUtils,
	} ) => {
		await saveCimoOptions( requestUtils, {
			disable_wp_scaling: 1,
			disable_thumbnail_generation: 1,
			max_image_dimension: 0,
			webp_quality: 80,
		} )
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_OVERSIZED_JPG
		)
		const details = await getMediaById( requestUtils, media.id )
		expect( details.mime_type ).toBe( 'image/webp' )
		expect( Math.max(
			details.media_details?.width || 0,
			details.media_details?.height || 0
		) ).toBeLessThanOrEqual( 2560 )
	} )

	test( 'disabling thumbnail generation skips intermediate sizes', async ( {
		page,
		requestUtils,
	} ) => {
		await saveCimoOptions( requestUtils, {
			disable_thumbnail_generation: 1,
			disable_wp_scaling: 1,
			max_image_dimension: 0,
		} )
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_LARGE_JPG
		)
		const details = await getMediaById( requestUtils, media.id )
		const sizes = details.media_details?.sizes || {}
		expect( Object.keys( sizes ) ).toHaveLength( 0 )
	} )

	test( 'thumbnail generation creates intermediate sizes by default', async ( {
		page,
		requestUtils,
	} ) => {
		await saveCimoOptions( requestUtils, {
			disable_thumbnail_generation: 0,
			thumbnail_sizes: [],
			disable_wp_scaling: 1,
			max_image_dimension: 0,
		} )
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_LARGE_JPG
		)
		const details = await getMediaById( requestUtils, media.id )
		const sizes = details.media_details?.sizes || {}
		expect( Object.keys( sizes ).length ).toBeGreaterThan( 0 )
		expect( sizes ).toHaveProperty( 'thumbnail' )
	} )
} )
