import {
	test,
	expect,
	SAMPLE_JPG,
	dropFile,
	waitForCimoReady,
	waitForCimoEditorIframeReady,
	expectNewMediaIsWebp,
} from 'e2e/test-utils'

test.describe.configure( { timeout: 120_000 } )

test.describe( 'Upload interception (JPG → WebP)', () => {
	let pageId: string | null = null

	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
	} )

	test.afterEach( async ( { requestUtils } ) => {
		if ( pageId ) {
			await requestUtils.deletePost( pageId, 'pages' )
			pageId = null
		}
		await requestUtils.deleteAllMedia()
	} )

	async function openNewPage( admin, editor, page ) {
		await admin.createNewPost( {
			postType: 'page',
			title: 'Cimo Upload E2E',
			showWelcomeGuide: false,
		} )
		await editor.saveDraft()
		const postQuery = new URL( editor.page.url() ).search
		pageId = new URLSearchParams( postQuery ).get( 'post' )
		await waitForCimoReady( page )
		await waitForCimoEditorIframeReady( page )
	}

	test( 'image block Upload button converts JPG to WebP', async ( {
		admin,
		editor,
		page,
		requestUtils,
	} ) => {
		await openNewPage( admin, editor, page )
		const afterId = await requestUtils.getMaxMediaId()

		await editor.insertBlock( { name: 'core/image' } )

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
		await openNewPage( admin, editor, page )
		const afterId = await requestUtils.getMaxMediaId()

		await editor.insertBlock( { name: 'core/image' } )
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

		// Select the uploaded attachment in the modal if still open. The
		// upload lands on the "Upload files" tab, but the attachment only
		// becomes a selectable grid item under "Media Library" — switch
		// there first.
		if ( await modal.isVisible() ) {
			const libraryTab = modal.getByRole( 'tab', { name: /Media Library/i } )
			if ( await libraryTab.count() ) {
				await libraryTab.click()
			}

			const webpAttachment = modal.locator( `.attachment[data-id="${ media.id }"]` )
			await expect( webpAttachment ).toBeVisible( { timeout: 15_000 } )
			await expect( webpAttachment.locator( '.attachment-preview' ) ).toBeVisible( { timeout: 15_000 } )
			await webpAttachment.click()

			const selectButton = modal.getByRole( 'button', {
				name: /Select|Insert/i,
			} )

			for ( let i = 0; i < 6; i++ ) {
				const state = await webpAttachment.evaluate( ( el: HTMLElement ) => ( {
					className: el.className,
					ariaChecked: el.getAttribute( 'aria-checked' ),
				} ) )
				const btnDisabled = await selectButton.isDisabled()
				// eslint-disable-next-line no-console
				console.log( `DEBUG t+${ i * 1000 }ms:`, JSON.stringify( state ), 'btnDisabled=', btnDisabled )
				if ( ! btnDisabled ) {
					break
				}
				// eslint-disable-next-line no-await-in-loop
				await page.waitForTimeout( 1000 )
			}

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
		await openNewPage( admin, editor, page )
		const afterId = await requestUtils.getMaxMediaId()

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
		await openNewPage( admin, editor, page )
		const afterId = await requestUtils.getMaxMediaId()

		// Open the Page / Document sidebar (featured image lives there).
		const pageTab = page.getByRole( 'button', { name: 'Page', exact: true } )
		const documentTab = page.getByRole( 'button', {
			name: 'Document',
			exact: true,
		} )
		if ( await pageTab.count() ) {
			await pageTab.click()
		} else if ( await documentTab.count() ) {
			await documentTab.click()
		} else {
			await page.getByRole( 'button', { name: 'Settings', exact: true } ).click()
			await page.getByRole( 'tab', { name: /Page|Document/i } ).click()
		}

		const featured = page.locator( '.editor-post-featured-image' )
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
		const afterId = await requestUtils.getMaxMediaId()

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
