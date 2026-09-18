import fs from 'fs'

import {
	test,
	expect,
	SAMPLE_STILL_GIF,
	SAMPLE_ANIMATED_GIF,
	SAMPLE_ANIMATED_WEBP,
	SAMPLE_ANIMATED_TRANSPARENT_GIF,
	saveCimoOptions,
	uploadSampleViaMediaNew,
	getMediaFileByteLength,
	fetchUrlBytes,
	isAnimatedWebp,
	reloadCimoRuntime,
} from '../test-utils'

test.describe.configure( { timeout: 180_000 } )

async function sampleImageAlpha(
	page: import( '@playwright/test' ).Page,
	url: string,
	x: number,
	y: number
) {
	return await page.evaluate( async ( { src, sampleX, sampleY } ) => {
		const image = new Image()
		image.crossOrigin = 'anonymous'
		image.src = src
		await image.decode()
		const canvas = document.createElement( 'canvas' )
		canvas.width = image.naturalWidth
		canvas.height = image.naturalHeight
		const context = canvas.getContext( '2d' )
		if ( ! context ) {
			throw new Error( 'Canvas 2D is unavailable' )
		}
		context.clearRect( 0, 0, canvas.width, canvas.height )
		context.drawImage( image, 0, 0 )
		return context.getImageData( sampleX, sampleY, 1, 1 ).data[ 3 ]
	}, { src: url, sampleX: x, sampleY: y } )
}

test.describe( 'Animated WebP', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 80,
			max_image_dimension: 0,
			disable_wp_scaling: 1,
			disable_thumbnail_generation: 1,
			smart_optimization: 0,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 80,
			max_image_dimension: 0,
			disable_thumbnail_generation: 0,
		} )
	} )

	test( 'converts an animated GIF to animated WebP', async ( {
		page,
		requestUtils,
	} ) => {
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_ANIMATED_GIF,
			'image/gif'
		)

		expect( media.mime_type ).toBe( 'image/webp' )
		expect( media.source_url ).toMatch( /\.webp(\?|$)/i )
		expect( isAnimatedWebp( await fetchUrlBytes( page, media.source_url ) ) ).toBe( true )
		expect( await getMediaFileByteLength( page, requestUtils, media.id ) ).toBeGreaterThan( 0 )
	} )

	test( 'converts a still GIF to still WebP', async ( {
		page,
		requestUtils,
	} ) => {
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_STILL_GIF,
			'image/gif'
		)

		expect( media.mime_type ).toBe( 'image/webp' )
		expect( media.source_url ).toMatch( /\.webp(\?|$)/i )
		expect( isAnimatedWebp( await fetchUrlBytes( page, media.source_url ) ) ).toBe( false )
	} )

	test( 'optimizes an animated WebP and keeps it animated', async ( {
		page,
		requestUtils,
	} ) => {
		await reloadCimoRuntime( page )
		const originalSize = fs.statSync( SAMPLE_ANIMATED_WEBP ).size

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_ANIMATED_WEBP,
			'image/webp',
			{
				expectedMime: 'image/webp',
				urlPattern: /\.webp(\?|$)/i,
			}
		)

		expect( media.mime_type ).toBe( 'image/webp' )
		expect( isAnimatedWebp( await fetchUrlBytes( page, media.source_url ) ) ).toBe( true )

		const uploadedSize = await getMediaFileByteLength( page, requestUtils, media.id )
		expect( uploadedSize ).toBeGreaterThan( 0 )
		expect( uploadedSize ).toBeLessThanOrEqual( originalSize * 1.25 )
	} )

	test( 'converts a transparent animated GIF to animated WebP and keeps the background transparent', async ( {
		page,
		requestUtils,
	} ) => {
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_ANIMATED_TRANSPARENT_GIF,
			'image/gif'
		)

		expect( media.mime_type ).toBe( 'image/webp' )
		expect( isAnimatedWebp( await fetchUrlBytes( page, media.source_url ) ) ).toBe( true )

		const width = media.media_details?.width ?? 0
		const height = media.media_details?.height ?? 0
		expect( width ).toBeGreaterThan( 1 )
		expect( height ).toBeGreaterThan( 1 )
		expect( await sampleImageAlpha( page, media.source_url, 0, 0 ) ).toBe( 0 )
		expect( await sampleImageAlpha( page, media.source_url, width - 1, 0 ) ).toBe( 0 )
		expect( await sampleImageAlpha( page, media.source_url, 80, 80 ) ).toBeGreaterThan( 200 )
	} )

	test( 'resizes an animated GIF without flattening it', async ( {
		page,
		requestUtils,
	} ) => {
		await saveCimoOptions( requestUtils, {
			max_image_dimension: 80,
		} )
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_ANIMATED_GIF,
			'image/gif'
		)

		expect( media.mime_type ).toBe( 'image/webp' )
		expect( Math.max(
			media.media_details?.width ?? 0,
			media.media_details?.height ?? 0
		) ).toBeLessThanOrEqual( 80 )
		expect( isAnimatedWebp( await fetchUrlBytes( page, media.source_url ) ) ).toBe( true )
	} )
} )
