/**
 * This handles the upload and select files in the following areas:
 *
 * Dropping files from the Media Manager
 * Dropping files from the Media > Add Media File
 */

import { domReady } from '~cimo/shared/dom-ready'
import { getFileConverter, requiresFileConversion } from '~cimo/shared/converters'
import { watchForEditorIframe } from '~cimo/shared/util'
import { saveMetadata } from '~cimo/shared/metadata-saver'
import { ProgressModal } from './progress-modal'
import { applyFilters } from '@wordpress/hooks'

/**
 * Intercept editor media uploads and convert images to WebP on the client
 * before uploading to WordPress. This affects the block editor only.
 */

// Allowed locations to be able to select files.
const ALLOWED_LOCATIONS = applyFilters( 'cimo.dropZone.allowedLocations', [
	'.media-frame-uploader', // Allowed to drop in the Media Manager
	'.media-upload-form', // Allowed to drop in the admin Media > Add Media File
	'.editor-post-featured-image', // Allowed to drop in the featured image drop zone
	'.editor-styles-wrapper', // Allowed to drop in the block editor when adding new image blocks
	'.uploader-window', // Allowed to drop in the admin Media > Library grid view
	'.uploader-editor', // Allowed to drop in the WooCommerce description editor
	'.block-library-utils__media-control', // Allowed to drop in the block editor image block media control
] )

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
		if ( window.cimoSettings?.disableOptimization ) {
			return
		}

		// If this is a synthetic change event dispatched by us after conversion, skip conversion.
		if ( event.__cimo_converted ) {
			return
		}

		// Get the file converters for the incoming files.
		const fileConverters = Array.from( event.dataTransfer.files )
			.map( file => getFileConverter( file ) )

		// Do not continue if we do not need to convert any files.
		if ( ! requiresFileConversion( fileConverters ) ) {
			return
		}

		// TODO: We also want to filter out the target so we can set when this
		// is triggered. We might break other funcitonality that we don't have
		// the conversion to happen.

		// Find the matched element based on the locations
		let matchedElement
		for ( const location of ALLOWED_LOCATIONS ) {
			matchedElement = event.target.closest( location )
			if ( matchedElement ) {
				break
			}
		}

		// Allowed a fallback to drop in the Media Manager
		matchedElement = matchedElement || event.target.closest( '.supports-drag-drop' )
			?.querySelector( '.media-frame-uploader' )

		if ( ! matchedElement ) {
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

		// Cancel the conversion if the user closes the progress modal.
		const onCancel = () => {
			// This is enough to cancel the entire process since the promises below will finish resolving.
			fileConverters.forEach( converter => converter.cancel() )
		}

		// Show the progress modal
		const progressModal = new ProgressModal( fileConverters, onCancel )
		progressModal.open()

		// Process and optimize each media file here,
		// e.g. converting to webp, resizing, compressing, etc.
		const optimizedResults = await Promise.all(
			fileConverters.map( async converter => {
				try {
					const result = await converter.optimize()
					if ( result.error ) {
						// eslint-disable-next-line no-console
						console.warn( result.error )
					}
					return result
				} catch ( error ) {
					// eslint-disable-next-line no-console
					console.warn( error )
					return { file: converter.file, metadata: null }
				}
			} )
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

		// Find the correct target to dispatch the event to
		let target = event.target.closest( '.components-drop-zone, [data-is-drop-zone="true"]' ) || event.target
		// This specifically handles the WooCommerce/classic description editor
		if ( event.target?.closest( '.uploader-editor-content' ) ) {
			target = event.target.closest( '.uploader-editor-content' )
		}

		// Check if the drop was initiated from a WordPress DropZone component,
		// if it is, then we will have to follow the simulation on how to make
		// the DropZone trigger and detect files properly.
		//
		// If this stops working, use SCRIPT_DEBUG true, then check the value
		// inside the DropZoneComponent.
		//
		// @see https://github.com/WordPress/gutenberg/blob/f8140c4fcc8db2d6078ad76fd433c79df3543860/packages/components/src/drop-zone/index.tsx#L59
		if ( target?.classList.contains( 'components-drop-zone' ) || target?.getAttribute( 'data-is-drop-zone' ) === 'true' || target?.classList.contains( 'uploader-editor-content' ) ) {
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
			target.dispatchEvent( dropEvent )
		} else {
			// TODO: There might be a better way to do this.
			// Find the file input based on the matched element
			const fileInput = matchedElement.querySelector( 'input[type="file"]' ) ||
				// Find inside the Media Manager modal
				document.querySelector( '.media-modal input[type="file"]' ) ||
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
				target.dispatchEvent( dropEvent )
			}
		}

		// Close when optimization finishes, including when we fall back to the original file after an error.
		progressModal.close()
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
