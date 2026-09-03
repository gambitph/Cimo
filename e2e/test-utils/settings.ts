import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { Admin, RequestUtils } from '@wordpress/e2e-test-utils-playwright'

import { waitForCimoReady } from './media'

export type CimoOptions = {
	webp_quality?: number;
	skip_webp_optimization?: number;
	max_image_dimension?: number;
	disable_wp_scaling?: number;
	smart_optimization?: number;
	optimize_all_media?: number;
	[ key: string ]: unknown;
}

/**
 * Merge partial options into stored `cimo_options` via REST.
 */
export async function saveCimoOptions(
	requestUtils: RequestUtils,
	partial: CimoOptions
) {
	const settings = await requestUtils.rest( {
		path: '/wp/v2/settings',
	} ) as { cimo_options?: CimoOptions }

	const current = settings.cimo_options || {}
	await requestUtils.rest( {
		method: 'POST',
		path: '/wp/v2/settings',
		data: {
			cimo_options: {
				...current,
				...partial,
			},
		},
	} )
}

/**
 * Open Settings → Cimo and wait for the React settings app.
 */
export async function gotoCimoSettings( admin: Admin, page: Page ) {
	await admin.visitAdminPage( 'options-general.php', 'page=cimo-settings' )
	await expect( page.locator( '#cimo-admin-settings' ) ).toBeVisible( {
		timeout: 30_000,
	} )
	await expect( page.locator( '.cimo-admin-settings-wrap' ) ).toBeVisible( {
		timeout: 30_000,
	} )
}

/**
 * Click Save Changes and wait for the success notice.
 */
export async function saveSettingsUi( page: Page ) {
	const saveButton = page.locator( '.cimo-save-button' )
	await expect( saveButton ).toBeVisible()
	await saveButton.click()
	await expect( page.getByText( 'Settings saved successfully!' ) ).toBeVisible( {
		timeout: 15_000,
	} )
}

/**
 * Read localized `window.cimoSettings` after the upload runtime has loaded.
 */
export async function getCimoSettings( page: Page ) {
	await waitForCimoReady( page )
	return await page.evaluate( () => {
		return ( window as Window & {
			cimoSettings?: Record<string, unknown>;
		} ).cimoSettings || {}
	} )
}

/**
 * Open an admin surface that enqueues `cimo-script` so localized settings refresh.
 */
export async function reloadCimoRuntime( page: Page ) {
	await page.goto( '/wp-admin/media-new.php' )
	await waitForCimoReady( page )
}
