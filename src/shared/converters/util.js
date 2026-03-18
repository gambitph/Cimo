// Cache for format support results to avoid redundant checks
const formatSupportCache = {}

/**
 * Check if a specific image format is supported by the browser
 *
 * @param {string} format - Format name ('webp', 'jpg', 'png', 'avif') or MIME type ('image/webp')
 * @return {boolean} - True if format is supported, false otherwise
 */
export async function isFormatSupported( format ) {
	if ( ! format || typeof format !== 'string' ) {
		return false
	}

	const key = format.toLowerCase()

	// Return cached result if already checked
	if ( key in formatSupportCache ) {
		return formatSupportCache[ key ]
	}

	// Map format names to MIME types
	const formatMap = {
		webp: 'image/webp',
		avif: 'image/avif',
	}

	// Get MIME type (either from map or use as-is if already a MIME type)
	const mimeType =
		formatMap[ key ] || ( key.startsWith( 'image/' ) ? key : null )

	if ( ! mimeType ) {
		formatSupportCache[ key ] = false
		return false
	}

	let supported = false

	// Check for AVIF decoding support first since it may not be supported even
	// if the library can encode it. If the browser can't decode it, then
	// it's not useful to convert to AVIF.
	if ( key === 'avif' ) {
		 supported = await supportsAvifDecode()
	} else {
		// Create a test canvas and check if toDataURL supports the format
		const canvas = document.createElement( 'canvas' )
		canvas.width = 1
		canvas.height = 1

		try {
			const dataUrl = canvas.toDataURL( mimeType )
			// If the browser doesn't support the format, it falls back to image/png
			// Check if the data URL starts with the requested mime type
			supported = dataUrl.startsWith( `data:${ mimeType }` )
		} catch ( e ) {
			supported = false
		}
	}

	formatSupportCache[ key ] = supported
	return supported
}

function supportsAvifDecode() {
	return new Promise( resolve => {
		const img = new Image()

		img.onload = () => resolve( true )
		img.onerror = () => resolve( false )

		img.src =
			'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A='
	} )
}
