import fs from 'fs'
import path from 'path'

import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

import type { ExtendedRequestUtils } from './requestUtils'

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
	const base64 = buffer.toString( 'base64' )

	// Decode the base64 payload into bytes directly (no `fetch()` of a data:
	// URL) so this also works inside contexts with a restrictive CSP, such as
	// the block editor's iframe.
	const dataTransfer = await target.evaluateHandle(
		( { data, name, type } ) => {
			const byteString = atob( data )
			const bytes = new Uint8Array( byteString.length )
			for ( let i = 0; i < byteString.length; i++ ) {
				bytes[ i ] = byteString.charCodeAt( i )
			}
			const file = new File( [ bytes ], name, { type } )
			const dt = new DataTransfer()
			dt.items.add( file )
			return dt
		},
		{ data: base64, name: fileName, type: mimeType }
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

/**
 * Assert that a new media item was uploaded as WebP after `afterId`.
 */
export async function expectNewMediaIsWebp(
	requestUtils: ExtendedRequestUtils,
	afterId: number,
	options: { timeout?: number } = {}
) {
	const timeout = options.timeout ?? 60_000

	await expect.poll(
		async () => {
			const created = await requestUtils.getMediaCreatedAfter( afterId )
			if ( ! created.length ) {
				return null
			}
			const newest = created[ 0 ]
			return {
				id: newest.id,
				mime: newest.mime_type,
				url: newest.source_url as string,
			}
		},
		{ timeout, message: 'Expected a new WebP media attachment after upload' }
	).toMatchObject( {
		mime: 'image/webp',
	} )

	const created = await requestUtils.getMediaCreatedAfter( afterId )
	const newest = created[ 0 ]
	expect( newest.source_url ).toMatch( /\.webp(\?|$)/i )
	return newest
}
