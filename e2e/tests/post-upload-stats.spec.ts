import {
	test,
	expect,
	uploadSampleViaMediaNew,
	openAttachmentInLibraryModal,
	expectCimoSidebarStats,
	expectCimoMetaBox,
} from '../test-utils'

test.describe.configure( { timeout: 120_000 } )

test.describe( 'Post-upload Cimo stats', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
	} )

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllMedia()
	} )

	test( 'media modal sidebar shows optimization stats', async ( {
		page,
		requestUtils,
	} ) => {
		const media = await uploadSampleViaMediaNew( page, requestUtils )

		await openAttachmentInLibraryModal( page, media.id )
		await expectCimoSidebarStats( page )
	} )

	test( 'attachment edit meta box shows optimization stats after reload', async ( {
		page,
		requestUtils,
	} ) => {
		const media = await uploadSampleViaMediaNew( page, requestUtils )

		// Reload attachment edit so PHP meta box reads persisted `_wp_attachment_metadata.cimo`.
		await page.goto( `/wp-admin/post.php?post=${ media.id }&action=edit` )
		await expectCimoMetaBox( page )

		await page.reload()
		await expectCimoMetaBox( page )
	} )
} )
