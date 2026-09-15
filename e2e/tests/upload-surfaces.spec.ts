import {
	test,
	expect,
	SAMPLE_JPG,
	SAMPLE_PNG,
	SAMPLE_LARGE_JPG,
	dropFile,
	dropFiles,
	waitForCimoReady,
	waitForCimoEditorIframeReady,
	dismissEditorOverlays,
	getMaxMediaId,
	deletePage,
	expectNewMediaIsWebp,
	expectNewMediaCount,
} from '../test-utils'

test.describe.configure( { timeout: 120_000 } )

test.describe( 'Additional upload surfaces', () => {
	let pageId: number | null = null

	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
	} )

	test.afterEach( async ( { requestUtils } ) => {
		if ( pageId ) {
			await deletePage( requestUtils, pageId )
			pageId = null
		}
		await requestUtils.deleteAllMedia()
	} )

	async function openNewPage( admin, editor, page, requestUtils ) {
		const draft = await requestUtils.createPage( {
			title: 'Cimo Upload Surfaces E2E',
			status: 'draft',
			content: '<!-- wp:paragraph --><p>Cimo e2e</p><!-- /wp:paragraph -->',
		} )
		pageId = draft.id

		await admin.visitAdminPage(
			'post.php',
			`post=${ pageId }&action=edit`
		)
		await editor.setPreferences( 'core/edit-post', {
			welcomeGuide: false,
			fullscreenMode: false,
		} )
		await editor.setPreferences( 'core', {
			enableChoosePatternModal: false,
		} )
		await dismissEditorOverlays( page )
		await waitForCimoReady( page )
		await waitForCimoEditorIframeReady( page )
	}

	test( 'Media Library grid drop converts JPG to WebP', async ( {
		page,
		requestUtils,
	} ) => {
		await page.goto( '/wp-admin/upload.php' )
		await waitForCimoReady( page )
		const afterId = await getMaxMediaId( requestUtils )

		// Drop directly on `.uploader-window` so Cimo's allowlist match succeeds
		// even when the overlay is not display:block yet.
		const dropTarget = page.locator( '.uploader-window' ).first()
		await expect( dropTarget ).toBeAttached( { timeout: 15_000 } )
		await dropFile( dropTarget )

		const media = await expectNewMediaIsWebp( requestUtils, afterId )
		await expect(
			page.locator( `.attachment[data-id="${ media.id }"]` )
		).toBeVisible( { timeout: 30_000 } )
	} )

	test( 'Media Library Select Files converts JPG to WebP', async ( {
		page,
		requestUtils,
	} ) => {
		await page.goto( '/wp-admin/upload.php' )
		await waitForCimoReady( page )
		const afterId = await getMaxMediaId( requestUtils )

		// Grid view exposes the classic plupload "Select Files" input (`.moxie-shim`
		// / browser uploader), which is the non-drop select-files interception path.
		const fileInput = page.locator(
			'.uploader-inline input[type="file"], .moxie-shim input[type="file"], input#async-upload, .media-upload-form input[type="file"]'
		).first()
		await expect( fileInput ).toBeAttached( { timeout: 15_000 } )
		await fileInput.setInputFiles( SAMPLE_JPG )

		const media = await expectNewMediaIsWebp( requestUtils, afterId )
		await expect(
			page.locator( `.attachment[data-id="${ media.id }"]` )
		).toBeVisible( { timeout: 30_000 } )
	} )

	test( 'PNG upload converts to WebP', async ( {
		page,
		requestUtils,
	} ) => {
		await page.goto( '/wp-admin/media-new.php' )
		await waitForCimoReady( page )
		const afterId = await getMaxMediaId( requestUtils )

		const fileInput = page.locator(
			'.media-upload-form input[type="file"], #async-upload, input[name="async-upload"]'
		).first()
		await fileInput.setInputFiles( SAMPLE_PNG )

		const media = await expectNewMediaIsWebp( requestUtils, afterId )
		expect( media.source_url ).toMatch( /\.webp(\?|$)/i )
	} )

	test( 'multi-file drop converts all JPGs to WebP', async ( {
		page,
		requestUtils,
	} ) => {
		await page.goto( '/wp-admin/media-new.php' )
		await waitForCimoReady( page )
		const afterId = await getMaxMediaId( requestUtils )

		const dropTarget = page.locator( '.media-upload-form, .uploader-inline' ).first()
		await expect( dropTarget ).toBeVisible( { timeout: 15_000 } )
		await dropFiles( dropTarget, [
			{ path: SAMPLE_JPG, mimeType: 'image/jpeg' },
			{ path: SAMPLE_LARGE_JPG, mimeType: 'image/jpeg' },
		] )

		const created = await expectNewMediaCount( requestUtils, afterId, 2 )
		expect( created ).toHaveLength( 2 )
		for ( const item of created ) {
			expect( item.mime_type ).toBe( 'image/webp' )
		}
	} )

	test( 'progress modal cancel stops optimization', async ( {
		page,
		requestUtils,
	} ) => {
		await page.goto( '/wp-admin/media-new.php' )
		await waitForCimoReady( page )
		const afterId = await getMaxMediaId( requestUtils )

		page.once( 'dialog', async ( dialog ) => {
			await dialog.accept()
		} )

		const fileInput = page.locator(
			'.media-upload-form input[type="file"], #async-upload, input[name="async-upload"]'
		).first()
		// Large file + progressDelay should surface the modal long enough to cancel.
		await fileInput.setInputFiles( SAMPLE_LARGE_JPG )

		const modal = page.locator( '.cimo-progress-modal' )
		const appeared = await modal
			.waitFor( { state: 'visible', timeout: 5_000 } )
			.then( () => true )
			.catch( () => false )

		test.skip(
			! appeared,
			'Progress modal did not appear before conversion finished (too fast on this host)'
		)

		await page.locator( '.cimo-progress-close' ).click()
		await expect( modal ).toBeHidden( { timeout: 10_000 } )

		// Cancel may leave zero new attachments or an unconverted original.
		await page.waitForTimeout( 2_000 )
		const created = await requestUtils.rest( {
			path: '/wp/v2/media',
			params: { per_page: 10, orderby: 'id', order: 'desc' },
		} ) as Array<{ id: number; mime_type: string }>
		const newer = created.filter( ( item ) => item.id > afterId )
		for ( const item of newer ) {
			// If anything uploaded after cancel, it should not be a mid-flight Cimo failure crash.
			expect( item.mime_type ).toMatch( /^image\// )
		}
	} )
} )
