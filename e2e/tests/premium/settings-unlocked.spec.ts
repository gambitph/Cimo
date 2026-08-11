import {
	test,
	expect,
	gotoCimoSettings,
	SAMPLE_JPG,
} from '../../test-utils'

test.describe.configure( { timeout: 120_000 } )

test.describe( 'Premium settings unlocked', () => {
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

		await expect( page.locator( '.cimo-bulk-optimizer-upsell' ) ).toHaveCount( 0 )

		const bulkButton = page.locator( '.cimo-bulk-optimize-button' )
		await expect( bulkButton ).toBeVisible( { timeout: 30_000 } )
		await expect( bulkButton ).toContainText( /Bulk Optimize \(\d+\)/ )
		await expect( bulkButton ).not.toContainText( /with Premium/i )

		await expect(
			page.locator( '.cimo-bulk-optimize-button-view-images' )
		).toBeEnabled()
	} )
} )
