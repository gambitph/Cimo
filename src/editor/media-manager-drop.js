/**
 * This handles the upload and select files in the following areas:
 *
 * Dropping files from the Media Manager
 */

const domReady = require( '@wordpress/dom-ready' )
const converter = require( '../shared/image-converter' )

/**
 * Intercept editor media uploads and convert images to WebP on the client
 * before uploading to WordPress. This affects the block editor only.
 */

/**
 * Wrap a file with conversion if it's an image; otherwise return unchanged.
 * @param {File} file
 * @return {Promise<File>} Promise resolving to the converted file, or the original on failure.
 */
async function maybeConvertFile( file ) {
	// try {
	// TODO: This should decide on how to convert the asset depending on the type (e.g. image).
	return await converter.convertImageClientSide( file, { quality: 0.8, format: 'webp' } )
	// } catch ( e ) {
	// On failure, fallback to original file to avoid breaking uploads
	// TODO: add a notice here so the user will know that it didn't work.
	// 	return file
	// }
}

// Add event listener to the Media Manager's drop zone
function addDropZoneListenerToMediaManager() {
	// Add our custom drop listener
	document.body.addEventListener( 'drop', async event => {
		// If the file dropped is webp, just return
		// TODO: We want to support other file types
		if ( event.dataTransfer.files[ 0 ].type === 'image/webp' ) {
			return
		}

		// Prevent default browser behavior
		event.preventDefault()
		event.stopPropagation()

		// Hide the drop files to upload note
		document.querySelector( '.uploader-window' )?.setAttribute( 'style', 'display: none;' )

		// Handle the drop event ourselves.
		const files = Array.from( event.dataTransfer.files )
		if ( ! files.length ) {
			return
		}

		// Process and optimize each image file here,
		// e.g. resizing or compressing
		const optimizedFiles = await Promise.all(
			files.map( maybeConvertFile )
		)

		// Create a DataTransfer to hold the optimized file
		const dataTransfer = new DataTransfer()
		optimizedFiles.forEach( file => {
			dataTransfer.items.add( file )
		} )

		// Find the file input inside the drop zone or media modal
		const fileInput = document.querySelector( '.media-modal input[type="file"]' )

		// Assign the files to the input element
		fileInput.files = dataTransfer.files

		// Dispatch a change event to trigger the native upload flow
		const changeEvent = new Event( 'change', { bubbles: true } )
		fileInput.dispatchEvent( changeEvent )
	}, true ) // This needs to be true or else we cannot stop the default dropping behavior

	// console.log( 'Drop zone listener added to Media Manager' )
}

domReady( () => {
	addDropZoneListenerToMediaManager()
} )
