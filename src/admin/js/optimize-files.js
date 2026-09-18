import { getFileConverter, requiresFileConversion } from '~cimo/shared/converters'
import { saveMetadata } from '~cimo/shared/metadata-saver'
import { cacheConverterNotice } from '~cimo/shared/upload-notice-cache'
import { ProgressModal } from './media-manager/progress-modal'

/**
 * Normalize the public API input shape. Integrators may pass a single File,
 * FileList, DataTransfer file list, or plain array of File objects.
 *
 * @param {File|FileList|Array<File>} files Files to optimize.
 * @return {Array<File>} Normalized file array.
 */
const normalizeFiles = files => {
	if ( ! files ) {
		return []
	}

	if ( typeof files.length === 'number' ) {
		return Array.from( files )
	}

	return [ files ]
}

/**
 * Optimize an existing converter list and save Cimo metadata before the
 * caller's upload flow continues.
 *
 * Interceptors use this after they have already checked whether conversion is
 * required. The public API usually calls optimizeFiles() instead.
 *
 * @param {Array}   fileConverters              Converter instances.
 * @param {Object}  options                     Options for the optimization run.
 * @param {boolean} [options.showProgress=true] Whether to show Cimo's progress modal.
 * @return {Promise<Array<{file: File, metadata: Object|null}>>} Optimized files and metadata.
 */
export const optimizeFileConverters = async ( fileConverters, options = {} ) => {
	const converters = Array.isArray( fileConverters ) ? fileConverters : []

	if ( window.cimoSettings?.disableOptimization ) {
		return converters.map( converter => ( {
			file: converter.file,
			metadata: null,
		} ) )
	}

	const showProgress = options.showProgress !== false

	// Cancel the conversion if the user closes the progress modal.
	const onCancel = () => {
		// This is enough to cancel the entire process since the promises below will finish resolving.
		converters.forEach( converter => converter.cancel() )
	}

	// Show the progress modal.
	const progressModal = showProgress
		? new ProgressModal( converters, onCancel )
		: null

	progressModal?.open()

	try {
		// Process and optimize each media file here,
		// e.g. converting to webp, resizing, compressing, etc.
		const optimizedResults = await Promise.all(
			converters.map( async converter => {
				try {
					const result = await converter.optimize()
					cacheConverterNotice( result )
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

		// Save the metadata to the server.
		await saveMetadata( optimizedResults.map( result => result.metadata ?? null ) )

		return optimizedResults.map( result => ( {
			file: result.file,
			metadata: result.metadata ?? null,
		} ) )
	} finally {
		// Close when optimization finishes, including when we fall back to the original file after an error.
		progressModal?.close()
	}
}

/**
 * Public optimization entry point exposed as window.cimo.optimizeFiles().
 *
 * Cimo only handles pre-upload optimization here. The integrator remains
 * responsible for uploading results.map( result => result.file ) through their
 * normal upload flow.
 *
 * @param {File|FileList|Array<File>} files                       Files to optimize before upload.
 * @param {Object}                    options                     Options for the optimization run.
 * @param {boolean}                   [options.showProgress=true] Whether to show Cimo's progress modal.
 * @return {Promise<Array<{file: File, metadata: Object|null}>>} Files for the caller to upload.
 */
export const optimizeFiles = async ( files, options = {} ) => {
	if ( window.cimoSettings?.disableOptimization ) {
		return normalizeFiles( files ).map( file => ( {
			file,
			metadata: null,
		} ) )
	}

	// Use Cimo's shared converter resolver so free and premium converters follow
	// the same path as Media Library uploads.
	const fileConverters = normalizeFiles( files ).map( file => getFileConverter( file ) )

	if ( ! requiresFileConversion( fileConverters ) ) {
		return fileConverters.map( converter => ( {
			file: converter.file,
			metadata: null,
		} ) )
	}

	return optimizeFileConverters( fileConverters, options )
}
