import {
	test,
	expect,
	SAMPLE_JPG,
	saveCimoOptions,
	uploadSampleViaMediaNew,
	reloadCimoRuntime,
	waitForCimoReady,
} from '../../test-utils'

test.describe.configure( { timeout: 180_000 } )

async function setOptimizationToggle( page, enabled: boolean ) {
	const toggle = page.locator( '#cimo-optimization-toggle' )
	await expect( toggle ).toBeVisible( { timeout: 15_000 } )
	const isChecked = await toggle.isChecked()
	if ( isChecked === enabled ) {
		return
	}
	// Custom slider intercepts clicks on the input; click the label instead.
	await page.locator( 'label.cimo-optimization-toggle-switch' ).click()
	if ( enabled ) {
		await expect( toggle ).toBeChecked()
	} else {
		await expect( toggle ).not.toBeChecked()
	}
}

test.describe( 'Premium optimization toggle', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			show_optimization_toggle: 1,
			persist_optimization_toggle: 1,
			webp_quality: 80,
			max_image_dimension: 0,
			disable_thumbnail_generation: 1,
			disable_wp_scaling: 1,
			smart_optimization: 0,
		} )
	} )

	test.afterEach( async ( { requestUtils, page } ) => {
		await page.evaluate( () => {
			localStorage.removeItem( 'cimo_optimization_toggle' )
		} ).catch( () => {} )
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			show_optimization_toggle: 0,
			persist_optimization_toggle: 0,
			disable_thumbnail_generation: 0,
		} )
	} )

	test( 'turning the toggle off leaves JPG uploads as JPEG', async ( {
		page,
		requestUtils,
	} ) => {
		await page.goto( '/wp-admin/media-new.php' )
		await waitForCimoReady( page )
		await setOptimizationToggle( page, false )

		await expect.poll( async () => {
			return await page.evaluate( () => {
				return Boolean(
					( window as Window & { cimoSettings?: { disableOptimization?: boolean } } )
						.cimoSettings?.disableOptimization
				)
			} )
		} ).toBe( true )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_JPG,
			'image/jpeg',
			{ expectedMime: 'image/jpeg' }
		)
		expect( media.mime_type ).toBe( 'image/jpeg' )
		expect( media.source_url ).toMatch( /\.jpe?g(\?|$)/i )
	} )

	test( 'turning the toggle back on converts JPG to WebP', async ( {
		page,
		requestUtils,
	} ) => {
		await page.goto( '/wp-admin/media-new.php' )
		await waitForCimoReady( page )
		await setOptimizationToggle( page, false )
		await setOptimizationToggle( page, true )

		await reloadCimoRuntime( page )
		await page.goto( '/wp-admin/media-new.php' )
		await waitForCimoReady( page )
		await setOptimizationToggle( page, true )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_JPG
		)
		expect( media.mime_type ).toBe( 'image/webp' )
	} )
} )
