import {
	test,
	expect,
	SAMPLE_JPG,
	deletePage,
	getMaxMediaId,
	expectNewMediaIsWebp,
	waitForCimoReady,
	saveCimoOptions,
} from '../../test-utils'

test.describe.configure( { timeout: 300_000 } )

test.describe( 'Elementor image upload', () => {
	let pageId: number | null = null

	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 80,
			max_image_dimension: 0,
			disable_thumbnail_generation: 1,
			disable_wp_scaling: 1,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		if ( pageId ) {
			await deletePage( requestUtils, pageId )
			pageId = null
		}
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			disable_thumbnail_generation: 0,
		} )
	} )

	test( 'Image widget upload converts JPG to WebP', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await admin.visitAdminPage( 'plugins.php' )
		const elementorRow = page.locator(
			'tr[data-slug="elementor"], tr[data-plugin*="elementor/elementor.php"]'
		).first()
		await expect(
			elementorRow,
			'Elementor missing — run `npm run e2e:fetch-elementor` then re-run this suite'
		).toBeVisible( { timeout: 30_000 } )
		await expect( elementorRow ).toHaveClass( /active/ )

		const draft = await requestUtils.createPage( {
			title: 'Cimo Elementor E2E',
			status: 'draft',
			content: '<!-- wp:paragraph --><p>Elementor e2e</p><!-- /wp:paragraph -->',
		} )
		pageId = draft.id

		// Prefer Elementor's editor URL; fall back to the admin list/editor CTA.
		await page.goto(
			`/wp-admin/post.php?post=${ pageId }&action=elementor`
		)

		for ( let i = 0; i < 10; i++ ) {
			if ( await page.locator( '#elementor-panel, #elementor-editor-wrapper' ).first().isVisible().catch( () => false ) ) {
				break
			}

			const close = page.locator(
				'.dialog-close-button, .e-notice-bar__close, button[aria-label="Close"], .elementor-button:has-text("Skip")'
			).first()
			if ( await close.isVisible().catch( () => false ) ) {
				await close.click( { force: true } ).catch( () => {} )
				await page.waitForTimeout( 300 )
				continue
			}

			const editorCta = page.getByRole( 'link', { name: /Edit with Elementor/i } )
				.or( page.locator( 'a.elementor-edit-link, #elementor-switch-mode-button, .elementor-button[href*="action=elementor"]' ) )
				.first()
			if ( await editorCta.isVisible().catch( () => false ) ) {
				await editorCta.click()
				await page.waitForTimeout( 1000 )
				continue
			}

			await page.waitForTimeout( 500 )
		}

		await expect(
			page.locator( '#elementor-panel, #elementor-editor-wrapper' ).first()
		).toBeVisible( { timeout: 120_000 } )

		await waitForCimoReady( page )

		const afterId = await getMaxMediaId( requestUtils )

		const widgetsTab = page.locator(
			'#elementor-panel-header-add-button, .elementor-panel-navigation-tab[data-tab="elements"]'
		).first()
		if ( await widgetsTab.isVisible().catch( () => false ) ) {
			await widgetsTab.click()
		}

		const search = page.locator( '#elementor-panel-elements-search-input' )
		if ( await search.isVisible().catch( () => false ) ) {
			await search.fill( 'image' )
		}

		const imageWidget = page.locator(
			'.elementor-element[data-widget_type="image"], #elementor-panel-elements .title:text-is("Image")'
		).first()
		await expect( imageWidget ).toBeVisible( { timeout: 60_000 } )

		const previewFrame = page.frameLocator( '#elementor-preview-iframe' )
		const dropArea = previewFrame.locator(
			'.elementor-add-section-inner, .elementor-first-add, .elementor-empty-view'
		).first()

		if ( await dropArea.count() ) {
			await imageWidget.dragTo( dropArea ).catch( async () => {
				await imageWidget.dblclick()
			} )
		} else {
			await imageWidget.dblclick()
		}

		const imageWidgetInPreview = previewFrame.locator(
			'.elementor-widget-image'
		).first()
		await expect( imageWidgetInPreview ).toBeVisible( { timeout: 60_000 } )
		await imageWidgetInPreview.click()

		const chooseImage = page.locator(
			'.elementor-control-media .elementor-control-media-upload-button, .elementor-control-type-media .elementor-control-media__content, .elementor-control-media__preview'
		).first()
		await expect( chooseImage ).toBeVisible( { timeout: 30_000 } )
		await chooseImage.click()

		const mediaModal = page.locator( '.media-modal' )
		await expect( mediaModal ).toBeVisible( { timeout: 30_000 } )

		const uploadTab = mediaModal.getByRole( 'tab', { name: /Upload files/i } )
		if ( await uploadTab.isVisible().catch( () => false ) ) {
			await uploadTab.click()
		}

		const fileInput = mediaModal.locator( 'input[type="file"]' ).first()
		await expect( fileInput ).toBeAttached( { timeout: 15_000 } )
		await fileInput.setInputFiles( SAMPLE_JPG )

		const media = await expectNewMediaIsWebp( requestUtils, afterId, {
			timeout: 90_000,
		} )
		expect( media.mime_type ).toBe( 'image/webp' )
	} )
} )
