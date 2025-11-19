/**
 * This handles the upload and select files in the following areas:
 *
 * Dropping files from the Media Manager
 * Dropping files from the Media > Add Media File
 */

import { domReady } from '~cimo/shared/dom-ready'
import { convertImageClientSide, isFormatSupported } from '~cimo/shared/image-converter'
import { watchForEditorIframe } from '~cimo/shared/util'
import { saveMetadata } from '~cimo/shared/metadata-saver'

/**
 * Intercept editor media uploads and convert images to WebP on the client
 * before uploading to WordPress. This affects the block editor only.
 */

/**
 * Wrap a file with conversion if it's an image; otherwise return unchanged.
 * @param {File} file
 * @return {Promise<{file: File, metadata: Object|null}>} Promise resolving to the converted file and metadata, or the original on failure.
 */
async function maybeConvertFile( file ) {
	// If webp isn't supported we just return the original file.
	if ( ! isFormatSupported( 'webp' ) ) {
		return { file, metadata: null }
	}

	try {
	// TODO: This should decide on how to convert the asset depending on the type (e.g. image).
		const result = await convertImageClientSide( file, {
			format: 'webp',
			quality: window.cimoSettings?.webpQuality || 0.8,
			maxDimension: window.cimoSettings?.maxImageDimension || 0,
		} )
		return result
	} catch ( e ) {
	// On failure, fallback to original file to avoid breaking uploads
	// TODO: add a notice here so the user will know that it didn't work.
		console.error( e ) // eslint-disable-line no-console
		return { file, metadata: null }
	}
}

// TODO: Make this configurable.
const FILES_TO_CONVERT = [ 'image/jpg', 'image/jpeg', 'image/png', 'image/gif' ]

// Add event listener to the Media Manager's drop zone
function addDropZoneListenerToMediaManager( targetDocument ) {
	if ( ! targetDocument ) {
		return
	}

	// Check if the target document has a body element available
	if ( ! targetDocument.body ) {
		return
	}

	const customDropHandler = async event => {
		// If this is a synthetic change event dispatched by us after conversion, skip conversion.
		if ( event.__cimo_converted ) {
			return
		}

		// If we do not have any dropped files to convert that are included in FILES_TO_CONVERT, return
		const hasFilesToConvert = Array.from( event.dataTransfer.files ).some( file => FILES_TO_CONVERT.includes( file.type ) )
		if ( ! hasFilesToConvert ) {
			return
		}

		// TODO: We also want to filter out the target so we can set when this
		// is triggered. We might break other funcitonality that we don't have
		// the conversion to happen.
		if ( ! event.target.closest( '.media-frame-uploader' ) && // Allowed to drop in the Media Manager
			! event.target.closest( '.media-upload-form' ) && // Allowed to drop in the admin Media > Add Media File.
			! event.target.closest( '.editor-post-featured-image' ) && // Allowed to drop in the featured image drop zone.
			! event.target.closest( '.editor-styles-wrapper' ) && // Allowed to drop in the block editor when adding new image blocks
			! event.target.closest( '.uploader-window' ) ) { // Allowed to drop in the admin Media > Library grid view
			return
		}

		// DEV NOTE: Previously, we did a return here if the browser didn't
		// support webp (this worked for Safari), this makes it so that the
		// normal processing happens instead of our "interceptor". But since we
		// want to support a mix of video/audio/image files, we can't just stop
		// the entire handling of the drop event. We now just return the
		// original file but still proceed with our conversion logic.

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
		const optimizedResults = await Promise.all(
			files.map( maybeConvertFile )
		)

		// Extract files and metadata from results
		const optimizedFiles = optimizedResults.map( result => result.file )
		const conversionMetadata = optimizedResults.map( result => result.metadata )

		// Create a DataTransfer to hold the optimized file
		const dataTransfer = new DataTransfer()
		optimizedFiles.forEach( file => {
			dataTransfer.items.add( file )
		} )

		// Save the metadata to the server.
		await saveMetadata( conversionMetadata )

		// Check if the drop was initiated from a WordPress DropZone component,
		// if it is, then we will have to follow the simulation on how to make
		// the DropZone trigger and detect files properly.
		//
		// If this stops working, use SCRIPT_DEBUG true, then check the value
		// inside the DropZoneComponent.
		//
		// @see https://github.com/WordPress/gutenberg/blob/f8140c4fcc8db2d6078ad76fd433c79df3543860/packages/components/src/drop-zone/index.tsx#L59
		if ( event.target?.classList.contains( 'components-drop-zone' ) ) {
			// Create a drop event with conditional bubbling
			// Use bubbles: false when in iframe to prevent doubling, but true for main document
			const isInIframe = targetDocument !== document
			const dropEvent = new Event( 'drop', { bubbles: ! isInIframe } )

			// Define the dataTransfer property, DropZoneComponent's onDrop will
			// check this. This is the way to add a property to an Event object.
			Object.defineProperty( dropEvent, 'dataTransfer', {
				value: dataTransfer,
				writable: false,
			} )

			// Mark this event so we know conversion is already done
			dropEvent.__cimo_converted = true // eslint-disable-line camelcase

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
				// Use bubbles: false when in iframe to prevent doubling
				const isInIframe = targetDocument !== document
				const changeEvent = new Event( 'change', { bubbles: ! isInIframe } )

				// Mark this event so we know conversion is already done
				changeEvent.__cimo_converted = true // eslint-disable-line camelcase

				fileInput.dispatchEvent( changeEvent )

			// The image was dropped on the editor itself (body element), or on/adjacent to another block.
			} else {
				const dropEvent = new Event( 'drop', { bubbles: true } )

				// Define the dataTransfer property, DropZoneComponent's onDrop will
				// check this. This is the way to add a property to an Event object.
				Object.defineProperty( dropEvent, 'dataTransfer', {
					value: dataTransfer,
					writable: false,
				} )

				// Mark this event so we know conversion is already done
				dropEvent.__cimo_converted = true // eslint-disable-line camelcase

				// Target the current dropzone
				event.target.dispatchEvent( dropEvent )
			}
		}
	}

	// Add our custom drop listener
	if ( ! targetDocument.body.__cimo_dropzone_listener_attached ) {
		targetDocument.body.addEventListener( 'drop', customDropHandler, true ) // This needs to be true or else we cannot stop the default dropping behavior
		targetDocument.body.__cimo_dropzone_listener_attached = true // eslint-disable-line camelcase
	}

	// console.log( 'Drop zone listener added to Media Manager' )
}

domReady( () => {
	addDropZoneListenerToMediaManager( document )

	// Watch for the editor iframe to attach drop listeners there too
	watchForEditorIframe( iframeDocument => {
		addDropZoneListenerToMediaManager( iframeDocument )
	} )
} )
