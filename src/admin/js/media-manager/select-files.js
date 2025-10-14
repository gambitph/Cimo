/**
 * This handles the upload and select files in the following areas:
 *
 * Clicking the "Select Files" in the media manager
 * Clicking the "Upload" button from the Image Block
 * Clicking "Select Files" from the Media > Add Media File
 */
import { domReady } from '~cimo/shared/dom-ready'
import { convertImageClientSide, isFormatSupported } from '~cimo/shared/image-converter'
import { watchForEditorIframe } from '~cimo/shared/util'
import { saveMetadata } from '~cimo/shared/metadata-saver'

/**
 * Wrap a file with conversion if it's an image; otherwise return unchanged.
 * @param {File} file
 * @return {Promise<{file: File, metadata: Object|null}>} Promise resolving to the converted file and metadata, or the original on failure.
 */
async function maybeConvertFile( file ) {
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

		// If we do not have any selected files to convert that are included in FILES_TO_CONVERT, return
		const hasFilesToConvert = Array.from( event.target.files ).some( file => FILES_TO_CONVERT.includes( file.type ) )
		if ( ! hasFilesToConvert ) {
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

		// If the format is not supported, return
		if ( ! isFormatSupported( 'webp' ) ) {
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
		const optimizedResults = await Promise.all(
			files.map( maybeConvertFile )
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
