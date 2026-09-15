import {
	test,
	expect,
	gotoCimoSettings,
	SAMPLE_JPG,
	saveCimoOptions,
} from '../../test-utils'

test.describe.configure( { timeout: 120_000 } )

test.describe( 'Premium settings unlocked', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		// Prior premium specs often leave smart_optimization off; restore defaults
		// so this smoke test asserts the true premium out-of-box settings.
		await saveCimoOptions( requestUtils, {
			smart_optimization: 1,
			optimize_all_media: 0,
			show_optimization_toggle: 0,
			stealth_mode_enabled: 0,
		} )
	} )

	test( 'premium build enables gated controls and working bulk UI', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await requestUtils.deleteAllMedia()
		await requestUtils.uploadMedia( SAMPLE_JPG )

		await gotoCimoSettings( admin, page )

		await expect( page.locator( '.cimo-admin-settings-wrap.cimo-is-premium' ) ).toBeVisible()

		const optimizeAll = page.getByRole( 'checkbox', {
			name: /Optimize All Media Uploads/i,
		} )
		await expect( optimizeAll ).toBeEnabled()

		const smartOpt = page.getByRole( 'checkbox', {
			name: /Smart Optimization/i,
		} )
		await expect( smartOpt ).toBeEnabled()
		await expect( smartOpt ).toBeChecked()

		await expect( page.locator( '.cimo-bulk-optimizer-upsell' ) ).toHaveCount( 0 )
		await expect( page.locator( '.cimo-settings-premium-placeholder' ) ).toHaveCount( 0 )
		await expect( page.locator( '.cimo-premium-feature-label' ) ).toHaveCount( 0 )
		await expect(
			page.getByRole( 'heading', { name: /Optimize beyond uploads/i } )
		).toHaveCount( 0 )

		await expect(
			page.getByRole( 'heading', { name: /Low Quality Image Placeholder Settings/i } )
		).toBeVisible()
		await expect(
			page.getByRole( 'checkbox', { name: /Enable LQIP/i } )
		).toBeVisible()

		await expect(
			page.getByRole( 'heading', { name: /Video Optimization Settings/i } )
		).toBeVisible()
		await expect(
			page.getByRole( 'checkbox', { name: /Enable Video Optimization/i } )
		).toBeEnabled()

		await expect(
			page.getByRole( 'heading', { name: /Audio Optimization Settings/i } )
		).toBeVisible()
		await expect(
			page.getByRole( 'checkbox', { name: /Enable Audio Optimization/i } )
		).toBeEnabled()

		await expect(
			page.getByRole( 'heading', { name: /Stealth Mode/i } )
		).toBeVisible()
		await expect(
			page.getByRole( 'checkbox', { name: /^Stealth Mode$/i } )
		).toBeEnabled()

		const bulkButton = page.locator( '.cimo-bulk-optimize-button' )
		await expect( bulkButton ).toBeVisible( { timeout: 30_000 } )
		await expect(
			page.locator( '.cimo-bulk-optimizer-progress-bar.is-loading' )
		).toHaveCount( 0, { timeout: 60_000 } )
		await expect( bulkButton ).toContainText( /Bulk Optimize \([1-9]\d*\)/ )
		await expect( bulkButton ).not.toContainText( /with Premium/i )
		await expect( bulkButton ).toBeEnabled()

		await expect(
			page.locator( '.cimo-bulk-optimize-button-view-images' )
		).toBeEnabled()
	} )
} )
