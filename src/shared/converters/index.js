import { ImageConverter } from './image-converter'
import { NullConverter } from './null-converter'
import { applyFilters } from '@wordpress/hooks'
import { isFormatSupported } from './util'

/**
 * Get the file converter for the given file.
 *
 * @param {File} _file - The file to get the converter for.
 * @return {Converter} - The file converter.
 */
export const getFileConverter = _file => {
	let file = _file
	// In some cases (e.g., when called from an iframe), the File object may come from a different window context,
	// so instanceof File can fail even if it's a valid File. Instead, check for file-like shape.
	if (
		! file ||
		typeof file !== 'object' ||
		typeof file.name !== 'string' ||
		typeof file.size !== 'number' ||
		typeof file.type !== 'string' ||
		typeof file.slice !== 'function'
	) {
		return new NullConverter( file )
	}

	// To preserve properties like name, lastModified, and type when the file comes from a different window context,
	// we reconstruct it as a new File object in the current context, if necessary.
	if ( ! ( file instanceof File ) ) {
		const fileLike = file
		file = new File(
			fileLike ? [ fileLike ] : [],
			fileLike?.name || 'unknown',
			{
				type: fileLike?.type || 'application/octet-stream',
				lastModified: typeof fileLike?.lastModified === 'number' ? fileLike.lastModified : Date.now(),
			}
		)
	}

	if ( file.type.startsWith( 'image/' ) ) {
		const imageOutputFormat = window.cimoSettings?.imageOutputFormat || 'webp'
		// If the browser doesn't support set output format, then we can't convert it.
		if ( ! isFormatSupported( imageOutputFormat ) ) {
			return new NullConverter( file )
		}
		if ( ImageConverter.supportsMimeType( file.type ) ) {
			return new ImageConverter( file, {
				format: imageOutputFormat,
				quality: window.cimoSettings?.webpQuality || 0.8,
				maxDimension: window.cimoSettings?.maxImageDimension || 0,
			} )
		}
	}

	return applyFilters( 'cimo.getFileConverter', null, file ) || ( new NullConverter( file ) )
}

/**
 * Check if any converter in the array requires conversion. Returns true if at
 * least one converter is NOT a NullConverter. Returns false if all are
 * NullConverter (i.e., no conversions needed).
 *
 * @param {Array} converters - Array of converter instances.
 * @return {boolean} - True if at least one converter is NOT a NullConverter,
 * false otherwise.
 */
export function requiresFileConversion( converters ) {
	return ! converters.every( converter => converter.constructor.name === 'NullConverter' )
}

