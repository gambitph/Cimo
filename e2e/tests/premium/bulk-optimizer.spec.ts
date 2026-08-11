import {
	test,
	expect,
	gotoCimoSettings,
	saveCimoOptions,
	SAMPLE_JPG,
	SAMPLE_LARGE_JPG,
} from '../../test-utils'

test.describe.configure( { timeout: 180_000 } )

async function seedUnoptimizedImages( requestUtils, count = 4 ) {
	const files = [ SAMPLE_JPG, SAMPLE_LARGE_JPG, SAMPLE_JPG, SAMPLE_LARGE_JPG ]
	const uploaded = []
	for ( let i = 0; i < count; i++ ) {
		const media = await requestUtils.uploadMedia( files[ i % files.length ] )
		expect( media?.id ).toBeTruthy()
		uploaded.push( media )
	}

	const listed = await requestUtils.rest( {
		path: '/wp/v2/media',
		params: { per_page: 100 },
	} ) as Array<{ id: number }>
	expect( listed.length ).toBeGreaterThanOrEqual( count )

	return uploaded
}

async function waitForBulkIdle( page ) {
	const button = page.locator( '.cimo-bulk-optimize-button' )
	await expect( button ).not.toHaveClass( /is-optimizing/, { timeout: 120_000 } )
	await expect( button ).not.toContainText( /Stop Optimization/i, {
		timeout: 30_000,
	} )
}

/**
 * Wait until BulkOptimizer finishes GET /cimo/v1/attachments.
 * While loading, the button already says "Bulk Optimize (0)" which caused
 * false reads of an empty library in slower CI.
 */
async function waitForBulkCollectionLoaded( page ) {
	await expect(
		page.locator( '.cimo-bulk-optimizer-progress-bar.is-loading' )
	).toHaveCount( 0, { timeout: 60_000 } )
	await expect(
		page.locator( '.cimo-bulk-optimizer-progress-bar-text' )
	).not.toContainText( '-', { timeout: 30_000 } )
}

async function readUnoptimizedCount( page ) {
	await waitForBulkCollectionLoaded( page )

	const bulkButton = page.locator( '.cimo-bulk-optimize-button' )
	await expect( bulkButton ).toContainText( /Bulk Optimize \(\d+\)/, {
		timeout: 30_000,
	} )
	// With seeded unoptimized media the button must become enabled.
	await expect( bulkButton ).toBeEnabled( { timeout: 30_000 } )

	const label = await bulkButton.innerText()
	return Number( ( label.match( /\((\d+)\)/ ) || [] )[ 1 ] || 0 )
}

test.describe( 'Premium bulk optimizer', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await saveCimoOptions( requestUtils, {
			disable_thumbnail_generation: 1,
			disable_wp_scaling: 1,
		} )
		await requestUtils.deleteAllMedia()
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
	} )

	test( 'bulk optimize completes with progress updates', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		const seeded = await seedUnoptimizedImages( requestUtils, 4 )
		expect( seeded ).toHaveLength( 4 )

		await gotoCimoSettings( admin, page )

		const progressText = page.locator( '.cimo-bulk-optimizer-progress-bar-text' )
		await expect( progressText ).toBeVisible( { timeout: 30_000 } )

		const total = await readUnoptimizedCount( page )
		expect( total ).toBeGreaterThanOrEqual( 4 )

		const bulkButton = page.locator( '.cimo-bulk-optimize-button' )
		await page.locator( '.cimo-bulk-optimize-button-view-images' ).click()
		await expect( page.locator( '.cimo-bulk-optimizer-image-list' ) ).toBeVisible()
		await expect( page.getByText( new RegExp( `Unoptimized \\(${ total }\\)` ) ) ).toBeVisible()

		const startedAt = Date.now()
		await bulkButton.click()

		await expect( bulkButton ).toHaveClass( /is-optimizing/ )
		await expect( bulkButton ).toContainText( /Stop Optimization/i )
		await expect(
			page.locator( '.cimo-bulk-optimizer-optimization-in-progress' )
		).toBeVisible()

		await expect.poll(
			async () => {
				const text = await progressText.innerText()
				const match = text.match( /(\d+)\s+of\s+(\d+)\s+optimized/i )
				if ( ! match ) {
					return 0
				}
				return Number( match[ 1 ] )
			},
			{
				timeout: 90_000,
				message: 'Expected bulk progress to advance',
			}
		).toBeGreaterThan( 0 )

		await waitForBulkIdle( page )

		const elapsedMs = Date.now() - startedAt
		expect( elapsedMs ).toBeLessThan( 120_000 )

		await expect( progressText ).toContainText(
			new RegExp( `${ total } of ${ total } optimized|100%`, 'i' )
		)
		await expect( bulkButton ).toBeDisabled()
		await expect( page.getByText( new RegExp( `Optimized \\(${ total }\\)` ) ) ).toBeVisible()
		await expect( page.getByText( /Unoptimized \(0\)/ ) ).toBeVisible()
	} )

	test( 'stop optimization leaves remaining unoptimized items', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await seedUnoptimizedImages( requestUtils, 4 )
		await gotoCimoSettings( admin, page )

		const total = await readUnoptimizedCount( page )
		expect( total ).toBeGreaterThanOrEqual( 4 )

		const bulkButton = page.locator( '.cimo-bulk-optimize-button' )
		await bulkButton.click()
		await expect( bulkButton ).toContainText( /Stop Optimization/i )

		await bulkButton.click()
		await waitForBulkIdle( page )

		const label = await bulkButton.innerText()
		if ( /Bulk Optimize/.test( label ) ) {
			const remaining = Number( ( label.match( /\((\d+)\)/ ) || [] )[ 1 ] || 0 )
			expect( remaining ).toBeGreaterThan( 0 )
		} else {
			test.info().annotations.push( {
				type: 'note',
				description: 'All items finished before stop could take effect',
			} )
			await expect( bulkButton ).toBeDisabled()
		}
	} )
} )
