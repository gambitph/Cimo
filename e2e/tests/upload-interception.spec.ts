import {
	test,
	expect,
	SAMPLE_JPG,
	dropFile,
	waitForCimoReady,
	waitForCimoEditorIframeReady,
	dismissEditorOverlays,
	getMaxMediaId,
	deletePage,
	expectNewMediaIsWebp,
} from '../test-utils'

test.describe.configure( { timeout: 120_000 } )

test.describe( 'Upload interception (JPG → WebP)', () => {
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

	/**
	 * Seed a draft page via REST, then open it in the editor.
	 * Avoids `editor.saveDraft()`'s brittle "Draft saved" notice wait, which
	 * flakes on current Gutenberg + Playground.
	 */
	async function openNewPage( admin, editor, page, requestUtils ) {
		// Seed a non-empty block so Gutenberg does not open the "Choose a pattern"
		// starter modal (empty drafts / empty paragraphs still count as empty).
		const draft = await requestUtils.createPage( {
			title: 'Cimo Upload E2E',
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

	test( 'image block Upload button converts JPG to WebP', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await openNewPage( admin, editor, page, requestUtils )
		const afterId = await getMaxMediaId( requestUtils )

		await editor.insertBlock( { name: 'core/image' } )
		await dismissEditorOverlays( page )

		const fileInput = editor.canvas.locator(
			'.components-form-file-upload input[type="file"]'
		)
		await expect( fileInput ).toBeAttached( { timeout: 15_000 } )
		await fileInput.setInputFiles( SAMPLE_JPG )

		await expectNewMediaIsWebp( requestUtils, afterId )
		await expect(
			editor.canvas.locator( 'img[src*=".webp"]' ).first()
		).toBeVisible( { timeout: 30_000 } )
	} )

	test( 'image block Media Library drop converts JPG to WebP', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await openNewPage( admin, editor, page, requestUtils )
		const afterId = await getMaxMediaId( requestUtils )

		await editor.insertBlock( { name: 'core/image' } )
		await dismissEditorOverlays( page )
		await editor.canvas.getByRole( 'button', { name: 'Media Library' } ).click()

		const modal = page.locator( '.media-modal' )
		await expect( modal ).toBeVisible( { timeout: 15_000 } )

		const uploadTab = modal.getByRole( 'tab', { name: /Upload files/i } )
		if ( await uploadTab.count() ) {
			await uploadTab.click()
		}

		const dropTarget = modal.getByRole( 'tabpanel', { name: /Upload files/i } )
		await expect( dropTarget ).toBeVisible( { timeout: 15_000 } )
		await dropFile( dropTarget )

		const media = await expectNewMediaIsWebp( requestUtils, afterId )

		// Insert the uploaded attachment into the image block. Playwright
		// clicks on `.attachment` / `.check` do not reliably update
		// wp.media's Backbone selection (Select stays disabled), so drive
		// selection through the media frame API instead.
		if ( await modal.isVisible() ) {
			await page.evaluate( async ( id ) => {
				// wp.media is always present while the media modal is open.
				const wpMedia = ( window as any ).wp?.media
				if ( ! wpMedia?.frame ) {
					throw new Error( 'wp.media.frame is not available' )
				}

				const attachment = wpMedia.attachment( id )
				await new Promise( ( resolve, reject ) => {
					const result = attachment.fetch()
					result.done( resolve )
					result.fail( reject )
				} )
				wpMedia.frame.state().get( 'selection' ).reset( [ attachment ] )
			}, media.id )

			const selectButton = modal.locator( '.media-toolbar' ).getByRole( 'button', {
				name: 'Select',
				exact: true,
			} )
			await expect( selectButton ).toBeEnabled( { timeout: 10_000 } )
			await selectButton.click()
		}

		await expect(
			editor.canvas.locator( 'img[src*=".webp"]' ).first()
		).toBeVisible( { timeout: 30_000 } )
	} )

	test( 'dropping JPG on the editor canvas converts to WebP image block', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await openNewPage( admin, editor, page, requestUtils )
		const afterId = await getMaxMediaId( requestUtils )

		const canvas = editor.canvas.locator( '.editor-styles-wrapper' )
		await expect( canvas ).toBeVisible( { timeout: 15_000 } )
		await dropFile( canvas )

		await expectNewMediaIsWebp( requestUtils, afterId )
		await expect(
			editor.canvas.locator( '[data-type="core/image"] img[src*=".webp"]' ).first()
		).toBeVisible( { timeout: 30_000 } )
	} )

	test( 'dropping JPG on featured image converts to WebP', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await openNewPage( admin, editor, page, requestUtils )
		const afterId = await getMaxMediaId( requestUtils )

		// Open the Page / Document sidebar (featured image lives there).
		// Skip clicking tabs that are already selected — Playwright can hang
		// waiting for a stable click on an already-active tab.
		const featured = page.locator( '.editor-post-featured-image' )
		if ( ! await featured.isVisible() ) {
			const settingsButton = page.getByRole( 'button', {
				name: 'Settings',
				exact: true,
			} )
			if ( await settingsButton.count() ) {
				const pressed = await settingsButton.getAttribute( 'aria-pressed' )
				if ( pressed !== 'true' ) {
					await settingsButton.click()
				}
			}

			const pageTab = page.getByRole( 'button', { name: 'Page', exact: true } )
			const documentTab = page.getByRole( 'button', {
				name: 'Document',
				exact: true,
			} )
			const sidebarTab = ( await pageTab.count() )
				? pageTab
				: ( await documentTab.count() )
					? documentTab
					: page.getByRole( 'tab', { name: /Page|Document/i } )

			const selected = await sidebarTab.getAttribute( 'aria-selected' )
			if ( selected !== 'true' ) {
				await sidebarTab.click()
			}
		}

		await expect( featured ).toBeVisible( { timeout: 15_000 } )

		// Cimo's interceptor re-dispatches the converted file onto Gutenberg's
		// actual DropZone element (`.components-drop-zone`), which is nested
		// inside `.editor-post-featured-image`. Dropping on the outer
		// container directly doesn't reach it, so target the inner drop
		// zone when present.
		const innerDropZone = featured.locator(
			'.components-drop-zone, [data-is-drop-zone="true"]'
		).first()
		const dropTarget = ( await innerDropZone.count() ) ? innerDropZone : featured
		await dropFile( dropTarget )

		await expectNewMediaIsWebp( requestUtils, afterId )
		await expect(
			featured.locator( 'img[src*=".webp"]' ).first()
		).toBeVisible( { timeout: 30_000 } )
	} )

	test( 'Media Library admin upload converts JPG to WebP', async ( {
		page,
		requestUtils,
	} ) => {
		await page.goto( '/wp-admin/media-new.php' )
		await waitForCimoReady( page )
		const afterId = await getMaxMediaId( requestUtils )

		const fileInput = page.locator(
			'.media-upload-form input[type="file"], #async-upload, input[name="async-upload"]'
		).first()
		await expect( fileInput ).toBeAttached( { timeout: 15_000 } )
		await fileInput.setInputFiles( SAMPLE_JPG )

		const media = await expectNewMediaIsWebp( requestUtils, afterId )

		await page.goto( '/wp-admin/upload.php' )
		await expect(
			page.locator( `.attachment[data-id="${ media.id }"]` )
		).toBeVisible( { timeout: 30_000 } )
		await expect(
			page.locator(
				`.attachment[data-id="${ media.id }"] img[src*=".webp"], .media-icon img[src*=".webp"]`
			).first()
		).toBeVisible( { timeout: 15_000 } )
	} )
} )
