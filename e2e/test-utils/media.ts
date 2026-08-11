import fs from 'fs'
import path from 'path'

import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright'

/** JPEG fixture used by upload interception tests. */
export const SAMPLE_JPG = path.resolve( __dirname, '../fixtures/sample.jpg' )

/**
 * Dispatch dragenter → dragover → drop with a real File payload.
 * Needed for Cimo's capture-phase drop interceptor (and Gutenberg DropZone).
 */
export async function dropFile(
	target: Locator,
	filePath: string = SAMPLE_JPG,
	mimeType: string = 'image/jpeg'
) {
	const buffer = fs.readFileSync( filePath )
	const fileName = path.basename( filePath )
	// A plain array of byte values (rather than a base64 string, which also
	// requires `fetch()`/`atob()` that can run afoul of the block editor
	// iframe's CSP) serializes reliably as the evaluateHandle arg.
	const bytes = Array.from( buffer )

	// Note: Locator#evaluateHandle calls pageFunction as (element, arg), not
	// just (arg) — the element itself is unused here, but the parameter is
	// required so `arg` correctly receives our payload.
	const dataTransfer = await target.evaluateHandle(
		( element, { data, name, type } ) => {
			const file = new File( [ new Uint8Array( data ) ], name, { type } )
			const dt = new DataTransfer()
			dt.items.add( file )
			return dt
		},
		{ data: bytes, name: fileName, type: mimeType }
	)

	await target.dispatchEvent( 'dragenter', { dataTransfer } )
	await target.dispatchEvent( 'dragover', { dataTransfer } )
	await target.dispatchEvent( 'drop', { dataTransfer } )
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

type MediaItem = {
	id: number;
	mime_type: string;
	source_url: string;
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
 * Assert that a new media item was uploaded as WebP after `afterId`.
 */
export async function expectNewMediaIsWebp(
	requestUtils: RequestUtils,
	afterId: number,
	options: { timeout?: number } = {}
) {
	const timeout = options.timeout ?? 60_000

	await expect.poll(
		async () => {
			const created = await getMediaCreatedAfter( requestUtils, afterId )
			if ( ! created.length ) {
				return null
			}
			const newest = created[ 0 ]
			return {
				id: newest.id,
				mime: newest.mime_type,
				url: newest.source_url,
			}
		},
		{ timeout, message: 'Expected a new WebP media attachment after upload' }
	).toMatchObject( {
		mime: 'image/webp',
	} )

	const created = await getMediaCreatedAfter( requestUtils, afterId )
	const newest = created[ 0 ]
	expect( newest.source_url ).toMatch( /\.webp(\?|$)/i )
	return newest
}
