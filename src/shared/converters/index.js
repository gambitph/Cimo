import { ImageConverter } from './image-converter'
import { NullConverter } from './null-converter'
import { applyFilters } from '@wordpress/hooks'

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
		let format = 'webp'

		// If webp is not supported, use the same format of the file.
		if ( ! isFormatSupported( format ) ) {
			format = file.type
		}

		if ( ImageConverter.supportsMimeType( file.type ) ) {
			return new ImageConverter( file, {
				format,
				quality: window.cimoSettings?.webpQuality || 0.8,
				maxDimension: window.cimoSettings?.maxImageDimension || 0,
				initialQuality: 1, // Initial quality for smart optimization.
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

/**
 * Check if a specific image format is supported by the browser
 *
 * @param {string} format - Format name ('webp', 'jpg', 'png', 'avif') or MIME type ('image/webp')
 * @return {boolean} - True if format is supported, false otherwise
 */
function isFormatSupported( format ) {
	if ( ! format || typeof format !== 'string' ) {
		return false
	}

	// Map format names to MIME types
	const formatMap = {
		webp: 'image/webp',
		avif: 'image/avif',
	}

	// Get MIME type (either from map or use as-is if already a MIME type)
	const mimeType = formatMap[ format.toLowerCase() ] || ( format.startsWith( 'image/' ) ? format : null )

	if ( ! mimeType ) {
		return false
	}

	// Create a test canvas and check if toDataURL supports the format
	const canvas = document.createElement( 'canvas' )
	canvas.width = 1
	canvas.height = 1

	try {
		const dataUrl = canvas.toDataURL( mimeType )
		// If the browser doesn't support the format, it falls back to image/png
		// Check if the data URL starts with the requested mime type
		return dataUrl.startsWith( `data:${ mimeType }` )
	} catch ( e ) {
		return false
	}
}
