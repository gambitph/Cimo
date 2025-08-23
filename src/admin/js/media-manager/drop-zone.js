/**
 * This handles the upload and select files in the following areas:
 *
 * Dropping files from the Media Manager
 * Dropping files from the Media > Add Media File
 */

const domReady = require( '@wordpress/dom-ready' )
const converter = require( '../../../shared/image-converter' )

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
		const convertedFile = await converter.convertImageClientSide( file, { quality: 0.8, format: 'webp' } )
		return convertedFile
	} catch ( e ) {
	// On failure, fallback to original file to avoid breaking uploads
	// TODO: add a notice here so the user will know that it didn't work.
		console.error( e ) // eslint-disable-line no-console
		return file
	}
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

		// TODO: We also want to filter out the target so we can set when this
		// is triggered. We might break other funcitonality that we don't have
		// the conversion to happen.

		// Prevent default browser behavior
		event.preventDefault()
		event.stopPropagation()

		// Hide the drop files to upload note. Sometimes, like in Elementor, if
		// there are multiple media managers opened, this can be many, hide them
		// all.
		let uploaderWindow
		while ( ( uploaderWindow = document.querySelector( '.uploader-window[style*="display: block"]' ) ) ) {
			uploaderWindow.style.display = 'none'
		}

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

		// Check if the drop was initiated from a WordPress DropZone component,
		// if it is, then we will have to follow the simulation on how to make
		// the DropZone trigger and detect files properly.
		//
		// If this stops working, use SCRIPT_DEBUG true, then check the value
		// inside the DropZoneComponent.
		//
		// @see https://github.com/WordPress/gutenberg/blob/f8140c4fcc8db2d6078ad76fd433c79df3543860/packages/components/src/drop-zone/index.tsx#L59
		if ( event.target?.classList.contains( 'components-drop-zone' ) ) {
			// Create a drop event
			const dropEvent = new Event( 'drop', { bubbles: true } )

			// Define the dataTransfer property, DropZoneComponent's onDrop will
			// check this. This is the way to add a property to an Event object.
			Object.defineProperty( dropEvent, 'dataTransfer', {
				value: dataTransfer,
				writable: false,
			} )

			// Target the current dropzone
		   event.target.dispatchEvent( dropEvent )
	   } else {
			// Find the file input inside the Media Manager modal
			// TODO: There might be a better way to do this.
			const fileInput = document.querySelector( '.media-modal input[type="file"]' ) ||
				// Fallback, this is the Media > Add Media File
				document.querySelector( '.media-upload-form input[type="file"]' ) ||
				// Just in case
				document.querySelector( 'input[type="file"]' )

			if ( fileInput ) {
				// Assign the files to the input element
				fileInput.files = dataTransfer.files

				// Dispatch a change event to trigger the native upload flow
				const changeEvent = new Event( 'change', { bubbles: true } )
				fileInput.dispatchEvent( changeEvent )
			}
		}
	}, true ) // This needs to be true or else we cannot stop the default dropping behavior

	// console.log( 'Drop zone listener added to Media Manager' )
}

domReady( () => {
	addDropZoneListenerToMediaManager()
} )
