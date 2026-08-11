import {
	test,
	expect,
	SAMPLE_JPG,
	saveCimoOptions,
	uploadSampleViaMediaNew,
	deletePage,
	reloadCimoRuntime,
	gotoCimoSettings,
} from '../../test-utils'

test.describe.configure( { timeout: 180_000 } )

test.describe( 'Premium LQIP', () => {
	let pageId: number | null = null

	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			lqip_enabled: 1,
			disable_thumbnail_generation: 1,
			webp_quality: 80,
			max_image_dimension: 800,
			smart_optimization: 0,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		if ( pageId ) {
			await deletePage( requestUtils, pageId )
			pageId = null
		}
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			lqip_enabled: 0,
			disable_thumbnail_generation: 0,
			max_image_dimension: 0,
		} )
	} )

	test( 'published image block gets LQIP data attributes', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await gotoCimoSettings( admin, page )
		await expect(
			page.getByRole( 'checkbox', { name: /Enable LQIP/i } )
		).toBeChecked()

		await reloadCimoRuntime( page )
		const media = await uploadSampleViaMediaNew(
			page,
			requestUtils,
			SAMPLE_JPG
		)

		const draft = await requestUtils.createPage( {
			title: 'Cimo LQIP E2E',
			status: 'publish',
			content: `<!-- wp:image {"id":${ media.id }} -->
<figure class="wp-block-image"><img src="${ media.source_url }" alt="LQIP e2e" class="wp-image-${ media.id }"/></figure>
<!-- /wp:image -->`,
		} )
		pageId = draft.id

		await page.goto( `/?p=${ pageId }` )

		const lqipImage = page.locator( 'img[data-cimo-lqip-src]' ).first()
		await expect( lqipImage ).toBeAttached( { timeout: 30_000 } )
		await expect( lqipImage ).toHaveAttribute(
			'data-cimo-lqip-src',
			/.+/
		)
		const src = await lqipImage.getAttribute( 'src' )
		expect( src ).toMatch( /^data:image\// )
	} )
} )
