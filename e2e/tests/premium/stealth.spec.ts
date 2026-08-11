import {
	test,
	expect,
	SAMPLE_JPG,
	saveCimoOptions,
	uploadSampleViaMediaNew,
	openAttachmentInLibraryModal,
	reloadCimoRuntime,
	waitForCimoReady,
} from '../../test-utils'

test.describe.configure( { timeout: 180_000 } )

test.describe( 'Premium stealth mode', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			stealth_mode_enabled: 1,
			show_optimization_toggle: 1,
			disable_thumbnail_generation: 1,
			webp_quality: 80,
			smart_optimization: 0,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			stealth_mode_enabled: 0,
			show_optimization_toggle: 0,
			disable_thumbnail_generation: 0,
		} )
	} )

	test( 'hides media modal sidebar stats and attachment meta box', async ( {
		page,
		requestUtils,
	} ) => {
		await reloadCimoRuntime( page )
		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_JPG
		)

		await openAttachmentInLibraryModal( page, media.id )
		await expect(
			page.locator( '.media-modal .cimo-media-manager-metadata' )
		).toHaveCount( 0 )

		await page.goto( `/wp-admin/post.php?post=${ media.id }&action=edit` )
		await expect( page.locator( '#cimo-data-meta-box' ) ).toHaveCount( 0 )
	} )

	test( 'optimization toggle uses Media Optimization label', async ( {
		page,
	} ) => {
		await page.goto( '/wp-admin/media-new.php' )
		await waitForCimoReady( page )
		await expect( page.locator( '#cimo-optimization-toggle' ) ).toBeVisible( {
			timeout: 15_000,
		} )
		await expect(
			page.getByText( 'Media Optimization On' )
		).toBeVisible()
		await expect(
			page.getByText( 'Cimo Optimization On' )
		).toHaveCount( 0 )
	} )
} )
