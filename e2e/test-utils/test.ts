/**
 * Re-export `@wordpress/e2e-test-utils-playwright`'s `test` (which already
 * provides `page`/`admin`/`editor`/`requestUtils`, wired to
 * `STORAGE_STATE_PATH` from playwright.config.js). Import `test`/`expect`
 * from here rather than `@playwright/test` directly so specs stay on the
 * WordPress fixtures.
 */
export { test, expect } from '@wordpress/e2e-test-utils-playwright'
