import {
	test,
	expect,
	SAMPLE_LARGE_JPG,
	gotoCimoSettings,
	saveCimoOptions,
	saveSettingsUi,
	getCimoSettings,
	reloadCimoRuntime,
	uploadSampleViaMediaNew,
	getMediaById,
} from '../test-utils'

test.describe.configure( { timeout: 120_000 } )

test.describe( 'Cimo settings', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 80,
			max_image_dimension: 0,
			disable_wp_scaling: 1,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 80,
			max_image_dimension: 0,
			disable_wp_scaling: 1,
		} )
	} )

	test( 'settings page loads with stats and image controls', async ( {
		admin,
		page,
	} ) => {
		await gotoCimoSettings( admin, page )

		await expect( page.locator( '#cimo-stats' ) ).toBeVisible()
		await expect( page.getByText( 'Total Storage Saved' ) ).toBeVisible()
		await expect( page.getByRole( 'heading', { name: 'General Settings' } ) ).toBeVisible()
		await expect( page.getByRole( 'heading', { name: 'Image Optimization Settings' } ) ).toBeVisible()
		await expect( page.locator( '.cimo-webp-quality-range-control' ) ).toBeVisible()
		await expect( page.getByLabel( 'Maximum Image Dimension' ) ).toBeVisible()
		await expect( page.locator( '.cimo-save-button' ) ).toBeVisible()
	} )

	test( 'saving quality and max dimension updates runtime and upload', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await saveCimoOptions( requestUtils, {
			webp_quality: 55,
			max_image_dimension: 800,
			disable_wp_scaling: 1,
		} )

		await gotoCimoSettings( admin, page )
		await expect( page.getByLabel( 'Maximum Image Dimension' ) ).toHaveValue( '800' )

		// UI save smoke: tweak max dimension and persist via Save Changes.
		await page.getByLabel( 'Maximum Image Dimension' ).fill( '640' )
		await saveSettingsUi( page )

		await reloadCimoRuntime( page )
		const settings = await getCimoSettings( page )
		expect( Number( settings.webpQuality ) ).toBe( 55 )
		expect( Number( settings.maxImageDimension ) ).toBe( 640 )

		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_LARGE_JPG
		)
		const details = await getMediaById( requestUtils, media.id )
		const width = details.media_details?.width || 0
		const height = details.media_details?.height || 0
		expect( Math.max( width, height ) ).toBeLessThanOrEqual( 640 )
		expect( details.mime_type ).toBe( 'image/webp' )
	} )

	test( 'Recommended and Reset presets update image controls', async ( {
		admin,
		page,
	} ) => {
		await gotoCimoSettings( admin, page )

		const imageSection = page.locator( '.cimo-settings-section' ).filter( {
			has: page.getByRole( 'heading', { name: 'Image Optimization Settings' } ),
		} )
		await imageSection.getByRole( 'button', { name: 'Recommended' } ).click()
		await expect( page.getByLabel( 'Maximum Image Dimension' ) ).toHaveValue( '1920' )

		await imageSection.getByRole( 'button', { name: 'Reset to Default' } ).click()
		await expect( page.getByLabel( 'Maximum Image Dimension' ) ).toHaveValue( '' )
	} )
} )
