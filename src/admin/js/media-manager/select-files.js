/**
 * This handles the upload and select files in the following areas:
 *
 * Clicking the "Select Files" in the media manager
 * Clicking the "Upload" button from the Image Block
 * Clicking "Select Files" from the Media > Add Media File
 */
import { domReady } from '~cimo/shared/dom-ready'
import { getFileConverter, requiresFileConversion } from '~cimo/shared/converters'
import { watchForEditorIframe } from '~cimo/shared/util'
import { saveMetadata } from '~cimo/shared/metadata-saver'
import { ProgressModal } from './progress-modal'

// Add event listener to the Media Manager's drop zone
function addSelectFilesListenerToFileUploads( targetDocument ) {
	if ( ! window.wp && ! targetDocument ) {
		return
	}

	// Check if the target document has a body element available
	if ( ! targetDocument.body ) {
		return
	}

	const selectFilesListener = async event => {
		// Check if it's a file select.
		if ( event.target.type !== 'file' ) {
			return
		}

		// If this is a synthetic change event dispatched by us after conversion, skip conversion.
		if ( event.__cimo_converted ) {
			return
		}

		// Get the file converters for the incoming files.
		const fileConverters = Array.from( event.target.files )
			.map( file => getFileConverter( file ) )

		// Do not continue if we do not need to convert any files.
		if ( ! requiresFileConversion( fileConverters ) ) {
			return
		}

		// TODO: We need filter this so that we will only override this on file
		// selects that we want to, like the media manager picker or the image
		// block uploader.
		// Allow these locations to be able to select files.
		if ( ! event.target.closest( '.components-form-file-upload' ) && // Allow uploads to the image block
			! event.target.closest( '.media-frame' ) && // Allow uploads from the Media Manager
			! event.target.closest( '.media-upload-form' ) && // Allow uploads from the admin Media > Add Media File
			! event.target.closest( '.moxie-shim' ) ) { // Allow uploads from the admin Media > Library grid view
			return
		}

		// DEV NOTE: Previously, we did a return here if the browser didn't
		// support webp (this worked for Safari), this makes it so that the
		// normal processing happens instead of our "interceptor". But since we
		// want to support a mix of video/audio/image files, we can't just stop
		// the entire handling of the drop event. We now just return the
		// original file but still proceed with our conversion logic.

		// Prevent the default file handling
		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation()

		// Cancel the conversion if the user closes the progress modal.
		const onCancel = () => {
			// This is enough to cancel the entire process since the promises below will finish resolving.
			fileConverters.forEach( converter => converter.cancel() )
		}

		// Show the progress modal
		const progressModal = new ProgressModal( fileConverters, onCancel )
		progressModal.open()

		let hasError = false

		// Process and optimize each media file here,
		// e.g. converting to webp, resizing, compressing, etc.
		const optimizedResults = await Promise.all(
			fileConverters.map( async converter => {
				try {
					return await converter.convert()
				} catch ( error ) {
					hasError = true
					// eslint-disable-next-line no-console
					console.warn( error )

					// Add the error name in the metadata for selected error for displaying
					// as a note.
					const metadata = error.isDisplayNote ? {
						filename: converter.file.name,
						errorName: error.name,
					} : null

					return {
						file: converter.file, metadata,
					}
				}
			} )
		)

		// Extract files from results
		const optimizedFiles = optimizedResults.map( result => result.file )
		const conversionMetadata = optimizedResults.map( result => result.metadata )

		// Create a DataTransfer to hold the optimized file
		const dataTransfer = new DataTransfer()
		optimizedFiles.forEach( file => {
			dataTransfer.items.add( file )
		} )

		// Save the metadata to the server.
		await saveMetadata( conversionMetadata )

		// Assign the files to the input element
		event.target.files = dataTransfer.files

		// Simulate the user selecting our converted file/s
		const changeEvent = new Event( 'change', { bubbles: true } )
		// Mark this event so we know conversion is already done
		changeEvent.__cimo_converted = true // eslint-disable-line camelcase
		event.target.dispatchEvent( changeEvent )

		// If there's an error, do not close the progress modal so the user can read the error.
		if ( ! hasError ) {
			progressModal.close()
		}
	}

	if ( ! targetDocument.body.__cimo_selectfiles_listener_attached ) {
		targetDocument.body.addEventListener( 'change', selectFilesListener, true )
		targetDocument.body.__cimo_selectfiles_listener_attached = true // eslint-disable-line camelcase
	}
}

domReady( () => {
	// Add listeners to the main document
	addSelectFilesListenerToFileUploads( document )

	// Watch for the editor iframe
	watchForEditorIframe( iframeDocument => {
		addSelectFilesListenerToFileUploads( iframeDocument )
	} )
} )
