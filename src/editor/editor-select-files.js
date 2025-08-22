/**
 * This handles the upload and select files in the following areas:
 *
 * Clicking the "Select Files" in the media manager
 * Clicking the "Upload" button from the Image Block
 * Clicking "Select Files" from the Media > Add Media File
 */
const domReady = require( '@wordpress/dom-ready' )
const converter = require( '../shared/image-converter' )

/**
 * Wrap a file with conversion if it's an image; otherwise return unchanged.
 * @param {File} file
 * @return {Promise<File>} Promise resolving to the converted file, or the original on failure.
 */
async function maybeConvertFile( file ) {
	try {
		// TODO: This should decide on how to convert the asset depending on the type (e.g. image).
		return await converter.convertImageClientSide( file, { quality: 0.8, format: 'webp' } )
	} catch ( e ) {
		// On failure, fallback to original file to avoid breaking uploads
		// TODO: add a notice here so the user will know that it didn't work.
		return file
	}
}

// Add event listener to the Media Manager's drop zone
function addSelectFilesListenerToFileUploads() {
	if ( ! window.wp ) {
		return
	}

	document.body.addEventListener( 'change', async event => {
		// Check if it's a file select.
		if ( event.target.type !== 'file' ) {
			return
		}

		// TODO: We need filter this so that we will only override this on file
		// selects that we want to, like the media manager picker or the image
		// block uploader.

		// If the file is image/webp, then just do the normal behavior.
		// TODO: We want to support other file types
		if ( event.target.files[ 0 ].type === 'image/webp' ) {
			return
		}

		// Prevent the default file handling
		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation()

		// Get the files.
		const files = Array.from( event.target.files )

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

		// Assign the files to the input element
		event.target.files = dataTransfer.files

		// Simulate the user selecting our converted file/s
		const changeEvent = new Event( 'change', { bubbles: true } )
		event.target.dispatchEvent( changeEvent )
	}, true )
}

domReady( () => {
	addSelectFilesListenerToFileUploads()
} )
