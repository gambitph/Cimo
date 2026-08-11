import {
	test,
	expect,
	SAMPLE_JPG,
	saveCimoOptions,
	deletePage,
	waitForCimoReady,
	reloadCimoRuntime,
} from '../../test-utils'

test.describe.configure( { timeout: 180_000 } )

test.describe( 'Premium optimize all media uploads', () => {
	let pageId: number | null = null

	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			optimize_all_media: 1,
			webp_quality: 80,
			max_image_dimension: 0,
			disable_thumbnail_generation: 1,
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
			optimize_all_media: 0,
			disable_thumbnail_generation: 0,
		} )
	} )

	test( 'frontend file input converts JPG to WebP when Optimize All is on', async ( {
		page,
		requestUtils,
	} ) => {
		const draft = await requestUtils.createPage( {
			title: 'Cimo Optimize All E2E',
			status: 'publish',
			content:
				'<!-- wp:html --><form id="cimo-e2e-optimize-all"><label for="cimo-e2e-file">Upload</label><input id="cimo-e2e-file" type="file" accept="image/*" /></form><!-- /wp:html -->',
		} )
		pageId = draft.id

		await reloadCimoRuntime( page )
		await page.goto( `/?p=${ pageId }` )
		await waitForCimoReady( page )

		const settings = await page.evaluate( () => {
			return ( window as Window & {
				cimoSettings?: { optimizeAllMedia?: number | string };
			} ).cimoSettings
		} )
		expect( String( settings?.optimizeAllMedia ) ).toBe( '1' )

		const fileInput = page.locator( '#cimo-e2e-file' )
		await expect( fileInput ).toBeVisible()
		await fileInput.setInputFiles( SAMPLE_JPG )

		await expect.poll( async () => {
			return await fileInput.evaluate( ( input: HTMLInputElement ) => {
				const file = input.files?.[ 0 ]
				return file ? { type: file.type, name: file.name } : null
			} )
		}, {
			timeout: 60_000,
			message: 'Expected Optimize All to replace the selected file with WebP',
		} ).toMatchObject( {
			type: 'image/webp',
		} )

		const converted = await fileInput.evaluate( ( input: HTMLInputElement ) => {
			const file = input.files?.[ 0 ]
			return {
				type: file?.type,
				name: file?.name,
			}
		} )
		expect( converted.type ).toBe( 'image/webp' )
		expect( converted.name ).toMatch( /\.webp$/i )
	} )
} )
