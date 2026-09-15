import fs from 'fs'

import {
	test,
	expect,
	saveCimoOptions,
	SAMPLE_MP4,
	SAMPLE_MP3,
	uploadSampleViaMediaNew,
	getMediaById,
	getMediaFileByteLength,
	reloadCimoRuntime,
	waitForOptimizedUploadMeta,
} from '../../test-utils'

test.describe.configure( { timeout: 240_000 } )

test.describe( 'Premium video and audio uploads', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			disable_thumbnail_generation: 1,
			disable_wp_scaling: 1,
			video_optimization_enabled: 1,
			audio_optimization_enabled: 1,
			video_quality: 3,
			audio_quality: 128,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
	} )

	test( 'uploading an MP4 optimizes the video file', async ( {
		page,
		requestUtils,
	} ) => {
		const originalSize = fs.statSync( SAMPLE_MP4 ).size
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_MP4,
			'video/mp4'
		)
		expect( media?.id ).toBeTruthy()

		const details = await getMediaById( requestUtils, media.id )
		expect( details.mime_type ).toMatch( /^video\// )

		const cimo = await waitForOptimizedUploadMeta( requestUtils, media.id )
		expect( cimo?.optimized_during_upload ).toBeTruthy()
		expect( Number( cimo?.convertedFilesize ) ).toBeGreaterThan( 0 )
		expect( Number( cimo?.convertedFilesize ) ).toBeLessThan(
			Number( cimo?.originalFilesize ) || originalSize
		)

		const uploadedSize = await getMediaFileByteLength(
			page,
			requestUtils,
			media.id
		)
		expect( uploadedSize ).toBeLessThan( originalSize )
	} )

	test( 'uploading an MP3 optimizes the audio file', async ( {
		page,
		requestUtils,
	} ) => {
		const originalSize = fs.statSync( SAMPLE_MP3 ).size
		await reloadCimoRuntime( page )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_MP3,
			'audio/mpeg'
		)
		expect( media?.id ).toBeTruthy()

		const details = await getMediaById( requestUtils, media.id )
		expect( details.mime_type ).toMatch( /^audio\// )

		const cimo = await waitForOptimizedUploadMeta( requestUtils, media.id )
		expect( cimo?.optimized_during_upload ).toBeTruthy()
		expect( Number( cimo?.convertedFilesize ) ).toBeGreaterThan( 0 )
		expect( Number( cimo?.convertedFilesize ) ).toBeLessThan(
			Number( cimo?.originalFilesize ) || originalSize
		)

		const uploadedSize = await getMediaFileByteLength(
			page,
			requestUtils,
			media.id
		)
		expect( uploadedSize ).toBeLessThan( originalSize )
	} )
} )
