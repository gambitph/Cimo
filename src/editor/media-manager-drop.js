const domReadyModule = require( '@wordpress/dom-ready' )
const domReady = domReadyModule.default || domReadyModule
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

	// const frameContent = mediaFrame.content.get()

	// Find the drop zone in the Media Manager
	const dropZone = document.querySelector( '.supports-drag-drop' )
	// console.log( dropZone )
	// const dropZone = frameContent.$el.find( '[id^="__wp-uploader-"]' )

	if ( dropZone ) {
		// Remove any existing listeners to avoid duplicates
		// dropZone.off( 'drop' )

		// Add our custom drop listener
		dropZone.addEventListener( 'drop', async event => {
			// If the file dropped is webp, just return
			if ( event.dataTransfer.files[ 0 ].type === 'image/webp' ) {
				return
			}

			// Prevent default browser behavior
			event.preventDefault()
			event.stopPropagation()

			// dropZone.on( 'drop', function( event ) {
			// console.log( 'File dropped in Media Manager!' )

			// Hide the drop files to upload note
			// document.querySelector( '.uploader-window' )?.setAttribute( 'style', '' )
			document.querySelector( '.uploader-window' )?.setAttribute( 'style', 'display: none;' )

			// // Handle the drop event
			await handleMediaManagerDrop( event )
		}, true ) // This needs to be true or else we cannot stop the default dropping behavior

		// console.log( 'Drop zone listener added to Media Manager' )
	}
}

const handleMediaManagerDrop = async event => {
	const file = event.dataTransfer.files[ 0 ]
	if ( ! file ) {
		return
	}

	// Process and optimize the image file here,
	// e.g. resizing or compressing
	// const optimizedFile = await optimizeImage(file);
	const optimizedFile = file.type.startsWith( 'image/' )
		? await maybeConvertFile( file )
		: file

	// JUST TESTING THIS:
	// Now simulate dropping this processed file on the original drop zone
	// Instead of dispatching a new Event, we manually call the drop handler logic with the adjusted file
	// To truly mimic a user file drop in the Media Library, we need to use the native File API and
	// trigger the file input element that the Media Library uses internally.
	// This approach finds the file input and sets its files property, then dispatches a change event.

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
			dataTransfer.items.add( optimizedFile )

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

// WORKING: 1st method, we overlap our own dropzone, and.
domReady( () => {
	/* When the Media Manager opens, add an event listener to the drop zone */
	setupSpecificMediaManagerListener()
} )
