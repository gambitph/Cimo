import {
	test,
	expect,
	SAMPLE_JPG,
	SAMPLE_PNG,
	saveCimoOptions,
	gotoCimoSettings,
	uploadSampleViaMediaNew,
	reloadCimoRuntime,
} from '../test-utils'

test.describe.configure( { timeout: 180_000 } )

function parseStatInt( text: string | null ) {
	if ( ! text ) {
		return 0
	}
	const digits = text.replace( /[^\d]/g, '' )
	return digits ? Number( digits ) : 0
}

test.describe( 'Settings page stats', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 60,
			max_image_dimension: 0,
			disable_wp_scaling: 1,
			disable_thumbnail_generation: 1,
			smart_optimization: 0,
		} )
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
			webp_quality: 80,
			disable_thumbnail_generation: 0,
		} )
	} )

	test( 'optimized uploads increase Media Files Optimized and storage saved', async ( {
		admin,
		page,
		requestUtils,
	} ) => {
		await gotoCimoSettings( admin, page )
		const stats = page.locator( '#cimo-stats' )
		await expect( stats ).toBeVisible()

		const mediaCountBefore = parseStatInt(
			await stats
				.locator( '.cimo-stats-column-small' )
				.filter( { hasText: 'Media Files Optimized' } )
				.locator( '.cimo-stat-value' )
				.textContent()
		)

		await reloadCimoRuntime( page )
		await uploadSampleViaMediaNew( page, requestUtils, SAMPLE_JPG )
		await uploadSampleViaMediaNew( page, requestUtils, SAMPLE_PNG )

		await gotoCimoSettings( admin, page )
		await expect.poll( async () => {
			const text = await page
				.locator( '#cimo-stats .cimo-stats-column-small' )
				.filter( { hasText: 'Media Files Optimized' } )
				.locator( '.cimo-stat-value' )
				.textContent()
			return parseStatInt( text )
		}, {
			timeout: 30_000,
			message: 'Expected Media Files Optimized to increase after uploads',
		} ).toBeGreaterThanOrEqual( mediaCountBefore + 2 )

		const savedText = await page
			.locator( '#cimo-stats .cimo-stats-column-big .cimo-stat-value' )
			.textContent()
		expect( savedText?.trim().length ).toBeGreaterThan( 0 )
		expect( savedText ).not.toMatch( /^0(\s|$)/ )
	} )
} )
