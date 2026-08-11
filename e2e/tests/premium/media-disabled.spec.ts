import fs from 'fs'

import {
	test,
	expect,
	SAMPLE_MP4,
	SAMPLE_MP3,
	saveCimoOptions,
	uploadSampleViaMediaNew,
	getMediaFileByteLength,
	reloadCimoRuntime,
} from '../../test-utils'

test.describe.configure( { timeout: 240_000 } )

test.describe( 'Premium video/audio optimization disabled', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			video_optimization_enabled: 0,
			audio_optimization_enabled: 0,
			disable_thumbnail_generation: 1,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			video_optimization_enabled: 1,
			audio_optimization_enabled: 1,
			disable_thumbnail_generation: 0,
		} )
	} )

	test( 'disabled video optimization uploads original MP4 size', async ( {
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
		expect( media.mime_type ).toMatch( /^video\// )

		const uploadedSize = await getMediaFileByteLength(
			page,
			requestUtils,
			media.id
		)
		expect( uploadedSize ).toBeGreaterThan( originalSize * 0.9 )
		expect( uploadedSize ).toBeLessThanOrEqual( originalSize * 1.05 )
	} )

	test( 'disabled audio optimization uploads original MP3 size', async ( {
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
		expect( media.mime_type ).toMatch( /^audio\// )

		const uploadedSize = await getMediaFileByteLength(
			page,
			requestUtils,
			media.id
		)
		expect( uploadedSize ).toBeGreaterThan( originalSize * 0.9 )
		expect( uploadedSize ).toBeLessThanOrEqual( originalSize * 1.05 )
	} )
} )
