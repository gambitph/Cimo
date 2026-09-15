import fs from 'fs'

import {
	test,
	expect,
	gotoCimoSettings,
	saveCimoOptions,
	SAMPLE_JPG,
	SAMPLE_LARGE_JPG,
	SAMPLE_PNG,
	openPopupAndGetByteLength,
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

async function openFileList( page ) {
	const viewButton = page.locator( '.cimo-bulk-optimize-button-view-images' )
	await expect( viewButton ).toBeEnabled( { timeout: 30_000 } )
	const list = page.locator( '.cimo-bulk-optimizer-image-list' )
	if ( ! await list.isVisible() ) {
		await viewButton.click()
	}
	await expect( list ).toBeVisible()
}

async function selectFilterTab(
	page,
	tab: 'unoptimized' | 'optimized' | 'skipped'
) {
	const labels = {
		unoptimized: /Unoptimized \(\d+\)/,
		optimized: /Optimized \(\d+\)/,
		skipped: /Skipped \(\d+\)/,
	}
	const tabs = page.locator( '.cimo-bulk-optimizer-image-list-tabs' )
	const option = tabs
		.getByRole( 'radio', { name: labels[ tab ] } )
		.or( tabs.getByRole( 'button', { name: labels[ tab ] } ) )
	await expect( option ).toBeVisible()
	await option.click()
}

function attachmentRows( page, attachmentId: number ) {
	return page.locator(
		`.cimo-bulk-optimizer-table tr[data-attachment-id="${ attachmentId }"]`
	)
}

function attachmentRow( page, attachmentId: number ) {
	return attachmentRows( page, attachmentId ).first()
}

async function waitForSingleOptimizeDone( page, attachmentId: number ) {
	// Rows leave the Unoptimized tab once optimize finishes (or skip).
	await expect( attachmentRows( page, attachmentId ) ).toHaveCount( 0, {
		timeout: 120_000,
	} )
}

async function getAttachmentCimoMeta( requestUtils, attachmentId: number ) {
	const attachments = await requestUtils.rest( {
		path: '/cimo/v1/attachments',
	} ) as Array<{
		id: number
		file: string
		filesize: number | null
		cimo: {
			bulk_optimization?: Record<string, {
				status?: string
				originalFilesize?: number
				convertedFilesize?: number
			}>
		} | null
	}>
	return attachments.find( ( item ) => item.id === attachmentId )
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
		await openFileList( page )
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
			new RegExp( `${ total } of ${ total } optimized`, 'i' )
		)
		await expect( progressText ).toContainText( /100%/ )
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

	test( 'optimizes images one by one from the file list', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await seedUnoptimizedImages( requestUtils, 2 )
		await gotoCimoSettings( admin, page )

		const total = await readUnoptimizedCount( page )
		expect( total ).toBeGreaterThanOrEqual( 2 )

		const progressText = page.locator( '.cimo-bulk-optimizer-progress-bar-text' )
		await openFileList( page )
		await selectFilterTab( page, 'unoptimized' )

		for ( let done = 0; done < total; done++ ) {
			const optimizeButton = page.locator( '.cimo-bulk-optimizer-action-optimize' ).first()
			await expect( optimizeButton ).toBeVisible()
			await optimizeButton.click()

			await expect.poll(
				async () => {
					const text = await progressText.innerText()
					const match = text.match( /(\d+)\s+of\s+(\d+)\s+optimized/i )
					return match ? Number( match[ 1 ] ) : 0
				},
				{
					timeout: 120_000,
					message: `Expected optimized count to reach ${ done + 1 }`,
				}
			).toBe( done + 1 )
		}

		await expect( progressText ).toContainText(
			new RegExp( `${ total } of ${ total } optimized`, 'i' )
		)
		await expect( progressText ).toContainText( /100%/ )
		await expect( page.getByText( /Unoptimized \(0\)/ ) ).toBeVisible()
		await expect( page.getByText( new RegExp( `Optimized \\(${ total }\\)` ) ) ).toBeVisible()
		await expect( page.locator( '.cimo-bulk-optimize-button' ) ).toBeDisabled()
	} )

	test( 'search filters the file list by name', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		const jpg = await requestUtils.uploadMedia( SAMPLE_JPG )
		const large = await requestUtils.uploadMedia( SAMPLE_LARGE_JPG )
		expect( jpg?.id ).toBeTruthy()
		expect( large?.id ).toBeTruthy()

		await gotoCimoSettings( admin, page )
		await readUnoptimizedCount( page )
		await openFileList( page )
		await selectFilterTab( page, 'unoptimized' )

		await expect( attachmentRow( page, jpg.id ) ).toBeVisible()
		await expect( attachmentRow( page, large.id ) ).toBeVisible()

		const search = page.getByPlaceholder( /Search by file name/i )
		await search.fill( 'sample-large' )

		await expect( attachmentRow( page, large.id ) ).toBeVisible()
		await expect( attachmentRows( page, jpg.id ) ).toHaveCount( 0 )
		await expect(
			page.locator( '.cimo-bulk-optimizer-table tbody tr' )
		).toHaveCount( 1 )
		await expect(
			attachmentRow( page, large.id ).locator( '.cimo-bulk-optimizer-filename-text' )
		).toContainText( /sample-large/i )

		await search.fill( '' )
		await expect( attachmentRow( page, jpg.id ) ).toBeVisible()
		await expect( attachmentRow( page, large.id ) ).toBeVisible()
	} )

	test( 'restore returns an optimized image to the original', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		const [ media ] = await seedUnoptimizedImages( requestUtils, 1 )
		const attachmentId = media.id as number

		const before = await getAttachmentCimoMeta( requestUtils, attachmentId )
		expect( before ).toBeTruthy()
		const originalFile = before!.file
		const originalFilesize = before!.filesize

		await gotoCimoSettings( admin, page )
		await readUnoptimizedCount( page )
		await openFileList( page )
		await selectFilterTab( page, 'unoptimized' )

		const row = attachmentRow( page, attachmentId )
		await row.locator( '.cimo-bulk-optimizer-action-optimize' ).click()
		await waitForSingleOptimizeDone( page, attachmentId )

		await selectFilterTab( page, 'optimized' )
		const optimizedRow = attachmentRow( page, attachmentId )
		await expect( optimizedRow ).toBeVisible()
		await expect(
			optimizedRow.locator( '.cimo-bulk-optimizer-action-restore' )
		).toBeVisible()

		const afterOptimize = await getAttachmentCimoMeta( requestUtils, attachmentId )
		expect( afterOptimize?.cimo?.bulk_optimization?.full?.status ).toBe( 'bulk' )

		await optimizedRow.locator( '.cimo-bulk-optimizer-action-restore' ).click()
		await expect( attachmentRows( page, attachmentId ) ).toHaveCount( 0, {
			timeout: 60_000,
		} )

		await selectFilterTab( page, 'unoptimized' )
		const restoredRow = attachmentRow( page, attachmentId )
		await expect( restoredRow ).toBeVisible()
		await expect(
			restoredRow.locator( '.cimo-bulk-optimizer-action-optimize' )
		).toBeVisible()
		await expect(
			restoredRow.locator( '.cimo-bulk-optimizer-action-restore' )
		).toHaveCount( 0 )

		const afterRestore = await getAttachmentCimoMeta( requestUtils, attachmentId )
		expect( afterRestore?.cimo?.bulk_optimization?.full ).toBeUndefined()
		expect( afterRestore?.file ).toBe( originalFile )
		if ( originalFilesize != null ) {
			expect( afterRestore?.filesize ).toBe( originalFilesize )
		}

		await expect( page.getByText( /Unoptimized \(1\)/ ) ).toBeVisible()
		await expect( page.getByText( /Optimized \(0\)/ ) ).toBeVisible()
		await expect( page.locator( '.cimo-bulk-optimize-button' ) ).toBeEnabled()
	} )

	test( 'unoptimized, optimized, and skipped filters work', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		const jpg = await requestUtils.uploadMedia( SAMPLE_JPG )
		const large = await requestUtils.uploadMedia( SAMPLE_LARGE_JPG )
		const png = await requestUtils.uploadMedia( SAMPLE_PNG )
		expect( jpg?.id && large?.id && png?.id ).toBeTruthy()

		await gotoCimoSettings( admin, page )
		const total = await readUnoptimizedCount( page )
		expect( total ).toBeGreaterThanOrEqual( 3 )

		await openFileList( page )
		await selectFilterTab( page, 'unoptimized' )
		await expect( attachmentRow( page, jpg.id ) ).toBeVisible()
		await expect( attachmentRow( page, large.id ) ).toBeVisible()
		await expect( attachmentRow( page, png.id ) ).toBeVisible()

		// Skip one manually.
		await attachmentRow( page, png.id )
			.locator( '.cimo-bulk-optimizer-action-skip' )
			.click()
		await expect( attachmentRows( page, png.id ) ).toHaveCount( 0 )
		await expect( page.getByText( /Skipped \(1\)/ ) ).toBeVisible()

		await selectFilterTab( page, 'skipped' )
		await expect( attachmentRow( page, png.id ) ).toBeVisible()
		await expect( attachmentRows( page, jpg.id ) ).toHaveCount( 0 )
		await expect(
			attachmentRow( page, png.id ).locator( '.cimo-bulk-optimizer-skip-reason' )
		).toContainText( /Skipped manually/i )

		// Optimize one from the unoptimized list.
		await selectFilterTab( page, 'unoptimized' )
		await attachmentRow( page, jpg.id )
			.locator( '.cimo-bulk-optimizer-action-optimize' )
			.click()
		await waitForSingleOptimizeDone( page, jpg.id )

		await expect( page.getByText( /Optimized \(1\)/ ) ).toBeVisible()

		await selectFilterTab( page, 'optimized' )
		await expect( attachmentRow( page, jpg.id ) ).toBeVisible()
		await expect( attachmentRows( page, large.id ) ).toHaveCount( 0 )
		await expect( attachmentRows( page, png.id ) ).toHaveCount( 0 )
		await expect(
			attachmentRow( page, jpg.id ).locator( '.cimo-bulk-optimizer-action-restore' )
		).toBeVisible()

		await selectFilterTab( page, 'unoptimized' )
		await expect( attachmentRow( page, large.id ) ).toBeVisible()
		await expect( attachmentRows( page, jpg.id ) ).toHaveCount( 0 )
		await expect( attachmentRows( page, png.id ) ).toHaveCount( 0 )

		await selectFilterTab( page, 'skipped' )
		await expect( attachmentRow( page, png.id ) ).toBeVisible()
		await expect( attachmentRows( page, jpg.id ) ).toHaveCount( 0 )
		await expect( attachmentRows( page, large.id ) ).toHaveCount( 0 )
	} )

	test( 'view links open current, optimized, and original file sizes', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		const media = await requestUtils.uploadMedia( SAMPLE_LARGE_JPG )
		const attachmentId = media.id as number
		const fixtureSize = fs.statSync( SAMPLE_LARGE_JPG ).size

		await gotoCimoSettings( admin, page )
		await readUnoptimizedCount( page )
		await openFileList( page )
		await selectFilterTab( page, 'unoptimized' )

		const row = attachmentRow( page, attachmentId )
		await expect( row ).toBeVisible()

		const before = await openPopupAndGetByteLength(
			page,
			row.locator( '.cimo-bulk-optimizer-action-view-image' )
		)
		expect( before.size ).toBeGreaterThan( 0 )
		// Uploaded original should match the fixture closely (allow minor WP rewrite).
		expect( Math.abs( before.size - fixtureSize ) ).toBeLessThan( 2048 )

		await row.locator( '.cimo-bulk-optimizer-action-optimize' ).click()
		await waitForSingleOptimizeDone( page, attachmentId )

		await selectFilterTab( page, 'optimized' )
		const optimizedRow = attachmentRow( page, attachmentId )
		await expect( optimizedRow ).toBeVisible()
		await expect(
			optimizedRow.locator( '.cimo-bulk-optimizer-action-view-image' )
		).toBeVisible()
		const viewOriginal = optimizedRow.locator(
			'.cimo-bulk-optimizer-action-view-original'
		)
		await expect( viewOriginal ).toBeVisible()

		const optimized = await openPopupAndGetByteLength(
			page,
			optimizedRow.locator( '.cimo-bulk-optimizer-action-view-image' )
		)

		const originalHref = await viewOriginal.getAttribute( 'href' )
		expect( originalHref ).toBeTruthy()
		const originalSize = await page.evaluate( async ( url ) => {
			const response = await fetch( url as string, { credentials: 'same-origin' } )
			if ( ! response.ok ) {
				throw new Error( `Failed to fetch original: ${ response.status }` )
			}
			return ( await response.arrayBuffer() ).byteLength
		}, originalHref )

		expect( optimized.size ).toBeGreaterThan( 0 )
		expect( originalSize ).toBeGreaterThan( 0 )
		expect( optimized.size ).toBeLessThan( originalSize )
		expect( Math.abs( originalSize - before.size ) ).toBeLessThan( 2048 )

		await optimizedRow.locator( '.cimo-bulk-optimizer-action-restore' ).click()
		await expect( attachmentRows( page, attachmentId ) ).toHaveCount( 0, {
			timeout: 60_000,
		} )

		await selectFilterTab( page, 'unoptimized' )
		const restoredRow = attachmentRow( page, attachmentId )
		await expect( restoredRow ).toBeVisible()
		await expect(
			restoredRow.locator( '.cimo-bulk-optimizer-action-view-original' )
		).toHaveCount( 0 )

		const restored = await openPopupAndGetByteLength(
			page,
			restoredRow.locator( '.cimo-bulk-optimizer-action-view-image' )
		)
		expect( Math.abs( restored.size - before.size ) ).toBeLessThan( 2048 )
	} )

	test( 'skipped files are excluded from bulk optimize and 100% progress', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		const keepA = await requestUtils.uploadMedia( SAMPLE_JPG )
		const keepB = await requestUtils.uploadMedia( SAMPLE_LARGE_JPG )
		const skipped = await requestUtils.uploadMedia( SAMPLE_PNG )
		expect( keepA?.id && keepB?.id && skipped?.id ).toBeTruthy()

		await gotoCimoSettings( admin, page )
		const initialUnoptimized = await readUnoptimizedCount( page )
		expect( initialUnoptimized ).toBeGreaterThanOrEqual( 3 )

		const progressText = page.locator( '.cimo-bulk-optimizer-progress-bar-text' )
		await openFileList( page )
		await selectFilterTab( page, 'unoptimized' )

		await attachmentRow( page, skipped.id )
			.locator( '.cimo-bulk-optimizer-action-skip' )
			.click()
		await expect( attachmentRows( page, skipped.id ) ).toHaveCount( 0 )
		await expect( page.getByText( /Skipped \(1\)/ ) ).toBeVisible()

		const toOptimize = initialUnoptimized - 1
		const bulkButton = page.locator( '.cimo-bulk-optimize-button' )
		await expect( bulkButton ).toContainText(
			new RegExp( `Bulk Optimize \\(${ toOptimize }\\)` )
		)

		await bulkButton.click()
		await waitForBulkIdle( page )

		await expect( progressText ).toContainText(
			new RegExp( `${ toOptimize } of ${ toOptimize } optimized`, 'i' )
		)
		await expect( progressText ).toContainText( /100%/ )
		await expect( page.getByText( /Unoptimized \(0\)/ ) ).toBeVisible()
		await expect(
			page.getByText( new RegExp( `Optimized \\(${ toOptimize }\\)` ) )
		).toBeVisible()
		await expect( page.getByText( /Skipped \(1\)/ ) ).toBeVisible()

		await selectFilterTab( page, 'skipped' )
		await expect( attachmentRow( page, skipped.id ) ).toBeVisible()
		await expect(
			attachmentRow( page, skipped.id ).locator( '.cimo-bulk-optimizer-skip-reason' )
		).toContainText( /Skipped manually/i )

		const skippedMeta = await getAttachmentCimoMeta( requestUtils, skipped.id )
		expect( skippedMeta?.cimo?.bulk_optimization?.full?.status ).toBe( 'skip' )

		const optimizedMeta = await getAttachmentCimoMeta( requestUtils, keepA.id )
		expect( optimizedMeta?.cimo?.bulk_optimization?.full?.status ).toBe( 'bulk' )
	} )
} )
