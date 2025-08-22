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
	try {
		// TODO: This should decide on how to convert the asset depending on the type (e.g. image).
		return await converter.convertImageClientSide( file, { quality: 0.8, format: 'webp' } )
	} catch ( e ) {
		// On failure, fallback to original file to avoid breaking uploads
		// TODO: add a notice here so the user will know that it didn't work.
		return file
	}
}

function setupSpecificMediaManagerListener() {
	if ( ! window.wp || ! window.wp.media ) {
		return
	}

	// Hook into the Select frame (most common for image selection)
	const originalSelectOpen = window.wp.media.view.MediaFrame.Select.prototype.open

	window.wp.media.view.MediaFrame.Select.prototype.open = function() {
		const result = originalSelectOpen.apply( this, arguments )

		setTimeout( () => {
			addDropZoneListenerToMediaManager( this )
		}, 100 )

		return result
	}
}

// Add event listener to the Media Manager's drop zone
function addDropZoneListenerToMediaManager( mediaFrame ) {
	if ( ! mediaFrame || ! mediaFrame.content ) {
		return
	}

	// Find the drop zone in the Media Manager
	// TODO: This needs to have a better way to be selected / identified.
	const dropZone = document.querySelector( '.supports-drag-drop' )

	if ( ! dropZone ) {
		return
	}

	// Add our custom drop listener
	dropZone.addEventListener( 'drop', async event => {
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
		await handleMediaManagerDrop( event )
	}, true ) // This needs to be true or else we cannot stop the default dropping behavior

	// console.log( 'Drop zone listener added to Media Manager' )
}

// Let's do the conversion.
const handleMediaManagerDrop = async event => {
	const files = Array.from( event.dataTransfer.files )
	if ( ! files.length ) {
		return
	}

	// Process and optimize each image file here,
	// e.g. resizing or compressing
	const optimizedFiles = await Promise.all(
		files.map( maybeConvertFile )
	)

	dispatchOriginalDrop( optimizedFiles )
}

// To truly mimic a user file drop in the Media Library, we need to use the native File API and
// trigger the file input element that the Media Library uses internally.
// This approach finds the file input and sets its files property, then dispatches a change event.
const dispatchOriginalDrop = files => {
	const dropZone = document.querySelector( '.supports-drag-drop' )
	if ( dropZone ) {
		// Find the file input inside the drop zone or media modal
		const fileInput =
			// dropZone.querySelector('input[type="file"]') ||
			document.querySelector( '.media-modal input[type="file"]' ) // ||
			// document.querySelector('input[type="file"].upload'); // fallback selectors

		if ( fileInput ) {
			// Create a DataTransfer to hold the optimized file
			const dataTransfer = new DataTransfer()
			files.forEach( file => {
				dataTransfer.items.add( file )
			} )

			// Assign the files to the input element
			fileInput.files = dataTransfer.files

			// Dispatch a change event to trigger the native upload flow
			const changeEvent = new Event( 'change', { bubbles: true } )
			fileInput.dispatchEvent( changeEvent )
		} else {
			// console.warn( 'Could not find file input in Media Library modal.' )
		}
	}
}

domReady( () => {
	setupSpecificMediaManagerListener()
} )
