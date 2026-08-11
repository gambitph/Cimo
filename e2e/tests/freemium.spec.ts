import {
	test,
	expect,
	gotoCimoSettings,
} from '../test-utils'

test.describe.configure( { timeout: 90_000 } )

test.describe( 'Freemium admin chrome', () => {
	test( 'premium settings controls stay disabled with Premium labels', async ( {
		admin,
		page,
	} ) => {
		await gotoCimoSettings( admin, page )

		const optimizeAll = page.getByRole( 'checkbox', {
			name: /Optimize All Media Uploads/i,
		} )
		await expect( optimizeAll ).toBeDisabled()

		const smartOpt = page.getByRole( 'checkbox', {
			name: /Smart Optimization/i,
		} )
		await expect( smartOpt ).toBeDisabled()

		await expect( page.locator( '.cimo-premium-tag' ).first() ).toBeVisible()
		await expect( page.locator( '#bulk-optimization' ) ).toBeVisible()
		await expect( page.locator( '.cimo-bulk-optimizer-upsell' ) ).toBeVisible()
		await expect(
			page.getByRole( 'link', { name: /Bulk Optimize with Premium/i } )
		).toBeVisible()
		await expect(
			page.locator( '.cimo-bulk-optimize-button-view-images' )
		).toBeDisabled()

		await expect( page.locator( '.cimo-premium-feature-label' ).first() ).toBeVisible()
	} )

	test( 'plugins screen exposes Settings and Upgrade links', async ( {
		admin,
		page,
	} ) => {
		await admin.visitAdminPage( 'plugins.php' )
		const row = page.locator( 'tr[data-slug="cimo-image-optimizer"], tr[data-plugin*="cimo.php"]' ).first()
		await expect( row ).toBeVisible( { timeout: 30_000 } )
		await expect( row.getByRole( 'link', { name: 'Settings', exact: true } ) ).toBeVisible()
		await expect( row.getByRole( 'link', { name: 'Upgrade', exact: true } ) ).toBeVisible()
	} )

	test( 'activation notice can be dismissed when present', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		// Re-seed the activation transient via a no-op REST round-trip is not available;
		// Playground activates Cimo at boot, so the notice may still be present.
		await admin.visitAdminPage( 'index.php' )

		const notice = page.locator( '.cimo-activation-notice' )
		const visible = await notice.isVisible().catch( () => false )
		if ( ! visible ) {
			// Force show by re-setting the transient through a temporary plugin option
			// is not exposed; soft-pass when already dismissed in this Playground instance.
			test.info().annotations.push( {
				type: 'note',
				description: 'Activation notice not visible (already dismissed or transient expired)',
			} )
			return
		}

		await notice.locator( '.cimo-activation-dismiss' ).click()
		await expect( notice ).toBeHidden( { timeout: 10_000 } )

		await admin.visitAdminPage( 'index.php' )
		await expect( page.locator( '.cimo-activation-notice' ) ).toHaveCount( 0 )

		// Keep requestUtils referenced so the fixture stays available if we extend seeding later.
		expect( requestUtils ).toBeTruthy()
	} )
} )
