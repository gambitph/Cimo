import fs from 'fs'
import path from 'path'

import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright'

/** JPEG fixture used by upload interception tests. */
export const SAMPLE_JPG = path.resolve( __dirname, '../fixtures/sample.jpg' )

/** Small PNG fixture for format conversion tests. */
export const SAMPLE_PNG = path.resolve( __dirname, '../fixtures/sample.png' )

/** Large JPEG (2000×1500) for max-dimension / progress tests. */
export const SAMPLE_LARGE_JPG = path.resolve(
	__dirname,
	'../fixtures/sample-large.jpg'
)

/** Short MP4 fixture for premium video upload optimization. */
export const SAMPLE_MP4 = path.resolve( __dirname, '../fixtures/sample.mp4' )

/** Short high-bitrate MP3 fixture for premium audio upload optimization. */
export const SAMPLE_MP3 = path.resolve( __dirname, '../fixtures/sample.mp3' )

/** Pre-converted WebP (from sample.jpg) for already-WebP upload paths. */
export const SAMPLE_WEBP = path.resolve( __dirname, '../fixtures/sample.webp' )

/** Larger WebP for re-encode / quality comparisons. */
export const SAMPLE_LARGE_WEBP = path.resolve(
	__dirname,
	'../fixtures/sample-large.webp'
)

/** Oversized JPEG (>2560px) for WordPress big-image scaling tests. */
export const SAMPLE_OVERSIZED_JPG = path.resolve(
	__dirname,
	'../fixtures/sample-oversized.jpg'
)

/** Verbose SVG fixture for premium SVG optimize tests. */
export const SAMPLE_SVG = path.resolve( __dirname, '../fixtures/sample.svg' )

/** HEIC fixture for premium HEIC → WebP upload tests. */
export const SAMPLE_HEIC = path.resolve( __dirname, '../fixtures/sample.heic' )

type DropFileSpec = {
	path: string;
	mimeType?: string;
}

/**
 * Dispatch dragenter → dragover → drop with one or more real File payloads.
 * Needed for Cimo's capture-phase drop interceptor (and Gutenberg DropZone).
 */
export async function dropFiles(
	target: Locator,
	files: DropFileSpec[]
) {
	const payloads = files.map( ( file ) => {
		const buffer = fs.readFileSync( file.path )
		return {
			data: Array.from( buffer ),
			name: path.basename( file.path ),
			type: file.mimeType || 'application/octet-stream',
		}
	} )

	const dataTransfer = await target.evaluateHandle(
		( element, filePayloads ) => {
			const dt = new DataTransfer()
			for ( const { data, name, type } of filePayloads ) {
				dt.items.add( new File( [ new Uint8Array( data ) ], name, { type } ) )
			}
			return dt
		},
		payloads
	)

	await target.dispatchEvent( 'dragenter', { dataTransfer } )
	await target.dispatchEvent( 'dragover', { dataTransfer } )
	await target.dispatchEvent( 'drop', { dataTransfer } )
}

/**
 * Dispatch dragenter → dragover → drop with a real File payload.
 * Needed for Cimo's capture-phase drop interceptor (and Gutenberg DropZone).
 */
export async function dropFile(
	target: Locator,
	filePath: string = SAMPLE_JPG,
	mimeType: string = 'image/jpeg'
) {
	await dropFiles( target, [ { path: filePath, mimeType } ] )
}

/**
 * Wait until Cimo's admin script has localized settings (interceptors are ready).
 */
export async function waitForCimoReady( page: Page ) {
	await page.waitForFunction( () => {
		return typeof ( window as Window & { cimoSettings?: unknown } ).cimoSettings === 'object'
	}, undefined, { timeout: 30_000 } )
}

/**
 * Dismiss leftover Gutenberg inserter / starter-pattern modals that can
 * intercept clicks on the image block placeholder (common on WordPress
 * "latest" in Playground).
 */
export async function dismissEditorOverlays( page: Page ) {
	for ( let i = 0; i < 4; i++ ) {
		const patternDialog = page.getByRole( 'dialog', { name: /Choose a pattern/i } )
		if ( await patternDialog.isVisible().catch( () => false ) ) {
			await patternDialog.getByRole( 'button', { name: 'Close' } ).click()
			await patternDialog.waitFor( { state: 'hidden', timeout: 5_000 } ).catch( () => {} )
			continue
		}

		const overlay = page.locator( '.components-modal__screen-overlay' )
		if ( ! await overlay.count() ) {
			break
		}
		await page.keyboard.press( 'Escape' )
		await overlay.first().waitFor( { state: 'hidden', timeout: 3_000 } ).catch( () => {} )
	}
}

/**
 * Wait until drop/select listeners are attached inside the block editor iframe.
 */
export async function waitForCimoEditorIframeReady( page: Page ) {
	await page.waitForFunction( () => {
		const iframe = document.querySelector( 'iframe[name="editor-canvas"]' ) as HTMLIFrameElement | null
		const body = iframe?.contentDocument?.body as ( HTMLElement & {
			__cimo_dropzone_listener_attached?: boolean;
			__cimo_selectfiles_listener_attached?: boolean;
		} ) | null | undefined
		return !!(
			body?.__cimo_dropzone_listener_attached &&
			body?.__cimo_selectfiles_listener_attached
		)
	}, undefined, { timeout: 30_000 } )
}

export type MediaItem = {
	id: number;
	mime_type: string;
	source_url: string;
	media_details?: {
		width?: number;
		height?: number;
		filesize?: number;
		cimo?: Record<string, unknown>;
	};
}

/**
 * List media newest-first (id desc).
 */
export async function listMediaNewestFirst(
	requestUtils: RequestUtils
): Promise<MediaItem[]> {
	return await requestUtils.rest( {
		path: '/wp/v2/media',
		params: {
			per_page: 100,
			orderby: 'id',
			order: 'desc',
			context: 'edit',
		},
	} ) as MediaItem[]
}

/**
 * Highest media attachment ID currently in the library (0 if empty).
 */
export async function getMaxMediaId( requestUtils: RequestUtils ): Promise<number> {
	const media = await listMediaNewestFirst( requestUtils )
	if ( ! media.length ) {
		return 0
	}
	return media[ 0 ].id
}

/**
 * Newest media items created after `afterId`.
 */
export async function getMediaCreatedAfter(
	requestUtils: RequestUtils,
	afterId: number
): Promise<MediaItem[]> {
	const media = await listMediaNewestFirst( requestUtils )
	return media.filter( ( item ) => item.id > afterId )
}

/**
 * Force-delete a page by REST ID.
 * (`RequestUtils` in this package version has createPage but not deletePage.)
 */
export async function deletePage( requestUtils: RequestUtils, pageId: number ) {
	await requestUtils.rest( {
		method: 'DELETE',
		path: `/wp/v2/pages/${ pageId }`,
		params: {
			force: true,
		},
	} )
}

/**
 * Assert that a new media item with the given MIME was uploaded after `afterId`.
 */
export async function expectNewMediaMime(
	requestUtils: RequestUtils,
	afterId: number,
	mime: string | RegExp,
	options: { timeout?: number; urlPattern?: RegExp } = {}
) {
	const timeout = options.timeout ?? 60_000
	const mimeLabel = mime instanceof RegExp ? mime.toString() : mime

	await expect.poll(
		async () => {
			const created = await getMediaCreatedAfter( requestUtils, afterId )
			if ( ! created.length ) {
				return 'none'
			}
			const mimeType = created[ 0 ].mime_type
			if ( mime instanceof RegExp ) {
				return mime.test( mimeType ) ? mimeType : `unexpected:${ mimeType }`
			}
			return mimeType === mime ? mimeType : `unexpected:${ mimeType }`
		},
		{
			timeout,
			message: `Expected a new ${ mimeLabel } media attachment after upload`,
		}
	).toMatch( mime instanceof RegExp ? mime : new RegExp( `^${ mime.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }$` ) )

	const created = await getMediaCreatedAfter( requestUtils, afterId )
	const newest = created[ 0 ]
	if ( mime instanceof RegExp ) {
		expect( newest.mime_type ).toMatch( mime )
	} else {
		expect( newest.mime_type ).toBe( mime )
	}
	if ( options.urlPattern ) {
		expect( newest.source_url ).toMatch( options.urlPattern )
	}
	return newest
}

/**
 * Assert that a new media item was uploaded as WebP after `afterId`.
 */
export async function expectNewMediaIsWebp(
	requestUtils: RequestUtils,
	afterId: number,
	options: { timeout?: number } = {}
) {
	return await expectNewMediaMime( requestUtils, afterId, 'image/webp', {
		timeout: options.timeout,
		urlPattern: /\.webp(\?|$)/i,
	} )
}

/**
 * Assert that N new WebP media items were uploaded after `afterId`.
 */
export async function expectNewMediaCount(
	requestUtils: RequestUtils,
	afterId: number,
	count: number,
	options: { timeout?: number; mime?: string } = {}
) {
	const timeout = options.timeout ?? 90_000
	const mime = options.mime ?? 'image/webp'

	await expect.poll(
		async () => {
			const created = await getMediaCreatedAfter( requestUtils, afterId )
			return created.filter( ( item ) => item.mime_type === mime ).length
		},
		{
			timeout,
			message: `Expected ${ count } new ${ mime } attachments after upload`,
		}
	).toBe( count )

	return ( await getMediaCreatedAfter( requestUtils, afterId ) )
		.filter( ( item ) => item.mime_type === mime )
}

/**
 * Upload via Media → Add New file picker.
 * By default raster images (non-WebP) wait for WebP conversion.
 * Pass `expectedMime` to assert a different outcome (e.g. optimization off).
 */
export async function uploadSampleViaMediaNew(
	page: Page,
	requestUtils: RequestUtils,
	filePath: string = SAMPLE_JPG,
	mimeType: string = 'image/jpeg',
	options: {
		expectedMime?: string | RegExp;
		timeout?: number;
		urlPattern?: RegExp;
	} = {}
) {
	await page.goto( '/wp-admin/media-new.php' )
	await waitForCimoReady( page )
	const afterId = await getMaxMediaId( requestUtils )

	const fileInput = page.locator(
		'.media-upload-form input[type="file"], #async-upload, input[name="async-upload"]'
	).first()
	await expect( fileInput ).toBeAttached( { timeout: 15_000 } )
	await fileInput.setInputFiles( {
		name: path.basename( filePath ),
		mimeType,
		buffer: fs.readFileSync( filePath ),
	} )

	if ( options.expectedMime ) {
		return await expectNewMediaMime(
			requestUtils,
			afterId,
			options.expectedMime,
			{
				timeout: options.timeout ?? 120_000,
				urlPattern: options.urlPattern,
			}
		)
	}

	if (
		mimeType.startsWith( 'image/' ) &&
		mimeType !== 'image/webp' &&
		mimeType !== 'image/svg+xml'
	) {
		return await expectNewMediaIsWebp( requestUtils, afterId, {
			timeout: options.timeout,
		} )
	}

	await expect.poll( async () => {
		return ( await getMediaCreatedAfter( requestUtils, afterId ) ).length
	}, { timeout: options.timeout ?? 120_000 } ).toBeGreaterThan( 0 )

	return ( await getMediaCreatedAfter( requestUtils, afterId ) )[ 0 ]
}

/**
 * Wait until Cimo attachment meta marks the media as optimized during upload.
 */
export async function waitForOptimizedUploadMeta(
	requestUtils: RequestUtils,
	mediaId: number,
	timeout = 180_000
) {
	await expect.poll(
		async () => {
			const attachments = await requestUtils.rest( {
				path: '/cimo/v1/attachments',
			} ) as Array<{
				id: number
				cimo: {
					optimized_during_upload?: boolean
					originalFilesize?: number
					convertedFilesize?: number
					compressionSavings?: number
				} | null
			}>
			const item = attachments.find( ( entry ) => entry.id === mediaId )
			if ( ! item?.cimo?.optimized_during_upload ) {
				return null
			}
			return item.cimo
		},
		{
			timeout,
			message: `Expected Cimo upload optimization metadata for media ${ mediaId }`,
		}
	).not.toBeNull()

	const attachments = await requestUtils.rest( {
		path: '/cimo/v1/attachments',
	} ) as Array<{
		id: number
		cimo: {
			optimized_during_upload?: boolean
			originalFilesize?: number
			convertedFilesize?: number
		} | null
	}>
	return attachments.find( ( entry ) => entry.id === mediaId )?.cimo
}

/**
 * Byte length of a URL fetched in the page context (same-origin cookies).
 */
export async function fetchUrlByteLength( page: Page, url: string ) {
	return await page.evaluate( async ( targetUrl ) => {
		const response = await fetch( targetUrl, { credentials: 'same-origin' } )
		if ( ! response.ok ) {
			throw new Error( `Failed to fetch ${ targetUrl }: ${ response.status }` )
		}
		return ( await response.arrayBuffer() ).byteLength
	}, url )
}

/**
 * Click a control that opens a new tab/window and return that document's byte size.
 */
export async function openPopupAndGetByteLength(
	page: Page,
	clickLocator: Locator
) {
	const [ popup ] = await Promise.all( [
		page.waitForEvent( 'popup' ),
		clickLocator.click(),
	] )
	await popup.waitForLoadState( 'domcontentloaded' )
	const url = popup.url()
	const size = await popup.evaluate( async () => {
		const response = await fetch( window.location.href, {
			credentials: 'same-origin',
		} )
		if ( ! response.ok ) {
			throw new Error( `Failed to fetch popup URL: ${ response.status }` )
		}
		return ( await response.arrayBuffer() ).byteLength
	} )
	await popup.close()
	return { size, url }
}

/**
 * Media file size from edit-context REST (falls back to downloading source_url).
 */
export async function getMediaFileByteLength(
	page: Page,
	requestUtils: RequestUtils,
	mediaId: number
) {
	const media = await getMediaById( requestUtils, mediaId )
	const reported = media.media_details?.filesize
	if ( typeof reported === 'number' && reported > 0 ) {
		return reported
	}
	if ( ! media.source_url ) {
		throw new Error( `Media ${ mediaId } has no source_url or filesize` )
	}
	return await fetchUrlByteLength( page, media.source_url )
}

/**
 * Fetch a single media item (edit context includes media_details).
 */
export async function getMediaById(
	requestUtils: RequestUtils,
	id: number
): Promise<MediaItem> {
	return await requestUtils.rest( {
		path: `/wp/v2/media/${ id }`,
		params: { context: 'edit' },
	} ) as MediaItem
}

/**
 * Assert Cimo sidebar stats are visible in the open media modal.
 */
export async function expectCimoSidebarStats( page: Page ) {
	const root = page.locator( '.media-modal .cimo-media-manager-metadata' ).first()
	await expect( root ).toBeVisible( { timeout: 30_000 } )
	await expect( root.locator( '.cimo-converted' ) ).toContainText( /WebP/i )
	await expect( root.locator( '.cimo-compression-savings' ) ).toBeVisible()
	return root
}

/**
 * Assert the attachment edit screen meta box shows Cimo optimization data.
 */
export async function expectCimoMetaBox( page: Page ) {
	const box = page.locator( '#cimo-data-meta-box' )
	await expect( box ).toBeVisible( { timeout: 15_000 } )
	await expect( box ).not.toContainText( /Cimo did not optimize this attachment/i )
	await expect( box.locator( '.cimo-converted, .cimo-compression-savings' ).first() ).toBeVisible( {
		timeout: 15_000,
	} )
	return box
}

/**
 * Open an attachment in the Media Library grid modal.
 */
export async function openAttachmentInLibraryModal( page: Page, mediaId: number ) {
	await page.goto( '/wp-admin/upload.php' )
	const attachment = page.locator( `.attachment[data-id="${ mediaId }"]` )
	await expect( attachment ).toBeVisible( { timeout: 30_000 } )
	await attachment.click()
	await expect( page.locator( '.media-modal' ) ).toBeVisible( { timeout: 15_000 } )
}
