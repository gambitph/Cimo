import {
	test,
	expect,
	SAMPLE_JPG,
	dropFile,
	waitForCimoReady,
	saveCimoOptions,
	deletePage,
	reloadCimoRuntime,
} from '../test-utils'

test.describe.configure( { timeout: 180_000 } )

type CimoWindow = Window & {
	cimo?: {
		optimizeFiles?: (
			files: File | FileList | File[],
			options?: { showProgress?: boolean }
		) => Promise<Array<{
			file: File,
			metadata: Record<string, unknown> | null,
		}>>;
	};
	cimoSettings?: {
		selectFilesAllowedLocations?: string[];
		dropZoneAllowedLocations?: string[];
	};
}

async function waitForCimoPublicApi( page: import( '@playwright/test' ).Page ) {
	await waitForCimoReady( page )
	await page.waitForFunction( () => {
		return typeof ( window as CimoWindow ).cimo?.optimizeFiles === 'function'
	}, undefined, { timeout: 30_000 } )
}

test.describe( 'Developer integration API', () => {
	let pageId: number | null = null

	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
		await saveCimoOptions( requestUtils, {
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
			disable_thumbnail_generation: 0,
		} )
	} )

	async function openDevApiPage(
		requestUtils: import( '@wordpress/e2e-test-utils-playwright' ).RequestUtils,
		page: import( '@playwright/test' ).Page,
		html: string
	) {
		const draft = await requestUtils.createPage( {
			title: 'Cimo Dev API E2E',
			status: 'publish',
			content: `<!-- wp:html -->${ html }<!-- /wp:html -->`,
		} )
		pageId = draft.id

		await reloadCimoRuntime( page )
		await page.goto( `/?p=${ pageId }` )
		await waitForCimoPublicApi( page )
		return draft
	}

	test( 'enqueues Cimo on a marked frontend page and localizes selector filters', async ( {
		page,
		requestUtils,
	} ) => {
		await openDevApiPage(
			requestUtils,
			page,
			'<div class="cimo-e2e-dev-uploader"><input id="cimo-e2e-dev-file" type="file" accept="image/*" /></div>'
		)

		const runtime = await page.evaluate( () => {
			const settings = ( window as CimoWindow ).cimoSettings
			return {
				hasOptimizeFiles: typeof ( window as CimoWindow ).cimo?.optimizeFiles === 'function',
				selectFilesAllowedLocations: settings?.selectFilesAllowedLocations || [],
				dropZoneAllowedLocations: settings?.dropZoneAllowedLocations || [],
			}
		} )

		expect( runtime.hasOptimizeFiles ).toBe( true )
		expect( runtime.selectFilesAllowedLocations ).toContain( '.cimo-e2e-dev-uploader' )
		expect( runtime.dropZoneAllowedLocations ).toContain( '.cimo-e2e-dev-dropzone' )
	} )

	test( 'intercepts a frontend file input registered through PHP selectors', async ( {
		page,
		requestUtils,
	} ) => {
		await openDevApiPage(
			requestUtils,
			page,
			'<div class="cimo-e2e-dev-uploader"><label for="cimo-e2e-dev-file">Upload</label><input id="cimo-e2e-dev-file" type="file" accept="image/*" /></div>'
		)

		const fileInput = page.locator( '#cimo-e2e-dev-file' )
		await expect( fileInput ).toBeVisible()
		await fileInput.setInputFiles( SAMPLE_JPG )

		await expect.poll( async () => {
			return await fileInput.evaluate( ( input: HTMLInputElement ) => {
				const file = input.files?.[ 0 ]
				return file ? { type: file.type, name: file.name } : null
			} )
		}, {
			timeout: 60_000,
			message: 'Expected the PHP selector filter to replace the selected file with WebP',
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

	test( 'leaves a file input unchanged when it is outside allowed locations', async ( {
		page,
		requestUtils,
	} ) => {
		await openDevApiPage(
			requestUtils,
			page,
			'<div class="cimo-e2e-unrelated"><input id="cimo-e2e-unrelated-file" type="file" accept="image/*" /></div>'
		)

		const fileInput = page.locator( '#cimo-e2e-unrelated-file' )
		await expect( fileInput ).toBeVisible()
		await fileInput.setInputFiles( SAMPLE_JPG )

		await expect( async () => {
			const selected = await fileInput.evaluate( ( input: HTMLInputElement ) => {
				return input.files?.[ 0 ]?.type || null
			} )
			expect( selected ).toBe( 'image/webp' )
		} ).not.toPass( {
			timeout: 8_000,
		} )

		const selected = await fileInput.evaluate( ( input: HTMLInputElement ) => {
			const file = input.files?.[ 0 ]
			return {
				type: file?.type,
				name: file?.name,
			}
		} )
		expect( selected.type ).toBe( 'image/jpeg' )
		expect( selected.name ).toMatch( /\.jpe?g$/i )
	} )

	test( 'intercepts a frontend drop zone registered through PHP selectors', async ( {
		page,
		requestUtils,
	} ) => {
		await openDevApiPage(
			requestUtils,
			page,
			'<div class="cimo-e2e-dev-dropzone" style="min-height:120px"><p>Drop images here</p><input id="cimo-e2e-drop-file" type="file" accept="image/*" /></div>'
		)

		const dropZone = page.locator( '.cimo-e2e-dev-dropzone' )
		const fileInput = page.locator( '#cimo-e2e-drop-file' )
		await expect( dropZone ).toBeVisible()
		await dropFile( dropZone, SAMPLE_JPG, 'image/jpeg' )

		await expect.poll( async () => {
			return await fileInput.evaluate( ( input: HTMLInputElement ) => {
				const file = input.files?.[ 0 ]
				return file ? { type: file.type, name: file.name } : null
			} )
		}, {
			timeout: 60_000,
			message: 'Expected the drop-zone filter to put an optimized WebP on the nearby file input',
		} ).toMatchObject( {
			type: 'image/webp',
		} )
	} )

	test( 'window.cimo.optimizeFiles converts a File and returns metadata', async ( {
		page,
		requestUtils,
	} ) => {
		await openDevApiPage(
			requestUtils,
			page,
			'<input id="cimo-e2e-api-source" type="file" accept="image/*" />'
		)

		const sourceInput = page.locator( '#cimo-e2e-api-source' )
		await sourceInput.setInputFiles( SAMPLE_JPG )

		const results = await page.evaluate( async () => {
			const input = document.getElementById( 'cimo-e2e-api-source' ) as HTMLInputElement
			const optimizeFiles = ( window as CimoWindow ).cimo?.optimizeFiles
			if ( ! optimizeFiles || ! input.files ) {
				return null
			}

			const optimized = await optimizeFiles( input.files, { showProgress: false } )
			return optimized.map( ( { file, metadata } ) => ( {
				type: file.type,
				name: file.name,
				size: file.size,
				hasMetadata: metadata !== null,
				originalFormat: metadata?.originalFormat ?? null,
				convertedFormat: metadata?.convertedFormat ?? null,
			} ) )
		} )

		expect( results ).toHaveLength( 1 )
		expect( results?.[ 0 ].type ).toBe( 'image/webp' )
		expect( results?.[ 0 ].name ).toMatch( /\.webp$/i )
		expect( results?.[ 0 ].size ).toBeGreaterThan( 0 )
		expect( results?.[ 0 ].hasMetadata ).toBe( true )
		expect( results?.[ 0 ].originalFormat ).toBe( 'image/jpeg' )
		expect( results?.[ 0 ].convertedFormat ).toBe( 'image/webp' )
	} )

	test( 'window.cimo.optimizeFiles returns unsupported files unchanged', async ( {
		page,
		requestUtils,
	} ) => {
		await openDevApiPage(
			requestUtils,
			page,
			'<p>Developer API source page</p>'
		)

		const results = await page.evaluate( async () => {
			const optimizeFiles = ( window as CimoWindow ).cimo?.optimizeFiles
			if ( ! optimizeFiles ) {
				return null
			}

			const file = new File( [ 'plain text' ], 'note.txt', { type: 'text/plain' } )
			const optimized = await optimizeFiles( [ file ], { showProgress: false } )
			return optimized.map( ( { file: resultFile, metadata } ) => ( {
				type: resultFile.type,
				name: resultFile.name,
				hasMetadata: metadata !== null,
			} ) )
		} )

		expect( results ).toEqual( [
			{
				type: 'text/plain',
				name: 'note.txt',
				hasMetadata: false,
			},
		] )
	} )
} )
