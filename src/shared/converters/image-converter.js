import { Converter } from './converter-abstract'

// Supported output formats
const supportedFormats = [
	{ value: 'webp', mimeType: 'image/webp' },
	{ value: 'jpg', mimeType: 'image/jpeg' },
	{ value: 'png', mimeType: 'image/png' },
]

/**
 * ImageConverter
 * Client-side image converter using Canvas APIs.
 */
class ImageConverter extends Converter {
	static get mimeTypes() {
		// Accept all images supported by most browsers for conversion.
		return [
			'image/jpeg',
			'image/png',
			'image/webp',
			'image/jpg',
		]
	}

	static get showProgress() {
		return false
	}

	/**
	 * Compute target dimensions from original size and options.
	 * Mirrors the logic used in the user's ImageConverter.js for consistency.
	 *
	 * @param {number}         originalWidth
	 * @param {number}         originalHeight
	 * @param {ConvertOptions} options
	 * @return {{ width: number, height: number }} - Object containing calculated width and height
	 */
	calculateDimensions( originalWidth, originalHeight, options ) {
		options = options || {}
		const scale = !! options.scale ? options.scale : 1
		const width = !! options.width ? options.width : 'auto'
		const height = !! options.height ? options.height : 'auto'
		const aspectRatio = !! options.aspectRatio ? options.aspectRatio : 'auto'
		const maxDimension = !! options.maxDimension ? options.maxDimension : 0

		// Apply scale
		let newWidth = originalWidth * scale
		let newHeight = originalHeight * scale

		// Apply maxDimension if specified (resize based on largest side)
		if ( maxDimension && typeof maxDimension === 'number' && maxDimension > 0 ) {
			const largestSide = Math.max( newWidth, newHeight )
			if ( largestSide > maxDimension ) {
				const scaleFactor = maxDimension / largestSide
				newWidth = newWidth * scaleFactor
				newHeight = newHeight * scaleFactor
			}
		}

		// Apply custom width/height if specified
		if ( width !== 'auto' && typeof width === 'number' ) {
			newWidth = width
			if ( height === 'auto' ) {
				newHeight = ( originalHeight / originalWidth ) * newWidth
			}
		}

		if ( height !== 'auto' && typeof height === 'number' ) {
			newHeight = height
			if ( width === 'auto' ) {
				newWidth = ( originalWidth / originalHeight ) * newHeight
			}
		}

		// Apply aspect ratio (resize then crop to maintain aspect ratio without stretching)
		if ( aspectRatio !== 'auto' ) {
			if ( aspectRatio === 'custom' ) {
				// Custom aspect ratio will be handled by width/height inputs
				return { width: newWidth, height: newHeight }
			}

			const [ ratioW, ratioH ] = aspectRatio.split( ':' ).map( Number )
			const targetRatio = ratioW / ratioH
			const currentRatio = newWidth / newHeight

			if ( Math.abs( currentRatio - targetRatio ) > 0.01 ) { // Only adjust if significantly different
				if ( currentRatio > targetRatio ) {
					// Image is wider than target ratio
					// Resize to fit height, then crop width
					const targetHeight = newHeight
					const targetWidth = targetHeight * targetRatio
					newWidth = targetWidth
					newHeight = targetHeight
				} else {
					// Image is taller than target ratio
					// Resize to fit width, then crop height
					const targetWidth = newWidth
					const targetHeight = targetWidth / targetRatio
					newWidth = targetWidth
					newHeight = targetHeight
				}
			}
		}

		return { width: Math.round( newWidth ), height: Math.round( newHeight ) }
	}

	/**
	 * Convert single image
	 * @param {Object}         fileItem              - Object containing the file to convert
	 * @param {string}         [outputFormat="webp"] - Output format for the converted ima	ge
	 * @param {ConvertOptions} [options]             - Options for the conversion
	 * @return {Promise<Blob>} - Promise that resolves to the converted image blob
	 */
	async convertImage( fileItem, outputFormat = 'webp', options = {} ) {
		options = options || {}
		let quality = !! options.quality ? options.quality : 0.8
		let maxDimension = !! options.maxDimension ? options.maxDimension : 0

		// Fix quality and maxDimension if they are strings
		if ( typeof quality === 'string' ) {
			quality = parseFloat( quality ) / 100
			if ( ! quality ) {
				quality = 0.8
			}
		}
		if ( typeof maxDimension === 'string' ) {
			maxDimension = parseFloat( maxDimension )
		}

		return new Promise( ( resolve, reject ) => {
			const img = new Image()
			let objectUrl = null

			img.onload = async () => {
				const canvas = document.createElement( 'canvas' )

				// Calculate new dimensions based on configuration
				const { width, height } = this.calculateDimensions( img.width, img.height, {
					maxDimension,
				} )

				canvas.width = width
				canvas.height = height
				const ctx = canvas.getContext( '2d' )

				// Calculate source dimensions for cropping (maintain aspect ratio)
				const sourceAspectRatio = img.width / img.height
				const targetAspectRatio = width / height

				let sourceHeight = img.height,
					sourceWidth = img.width,
					sourceX = 0,
					sourceY = 0

				if ( Math.abs( sourceAspectRatio - targetAspectRatio ) > 0.01 ) {
					// Need to crop the source image to match target aspect ratio
					if ( sourceAspectRatio > targetAspectRatio ) {
						// Source is wider, crop width
						sourceWidth = img.height * targetAspectRatio
						sourceX = ( img.width - sourceWidth ) / 2 // Center the crop
					} else {
						// Source is taller, crop height
						sourceHeight = img.width / targetAspectRatio
						sourceY = ( img.height - sourceHeight ) / 2 // Center the crop
					}
				}

				// Draw image with cropping to maintain aspect ratio
				ctx.drawImage( img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height )

				const format = supportedFormats.find( f => f.value === outputFormat )
				// Only use quality for lossy formats
				const q = ( outputFormat === 'webp' || outputFormat === 'jpg' ) ? quality : undefined

				canvas.toBlob( function( blob ) {
					// Clean up resources
					URL.revokeObjectURL( objectUrl )
					objectUrl = null

					// Clear canvas to free memory
					ctx.clearRect( 0, 0, canvas.width, canvas.height )
					canvas.width = 0
					canvas.height = 0

					if ( blob ) {
						resolve( blob )
					} else {
						reject( new Error( 'Failed to convert image' ) )
					}
				}, format.mimeType, q )
			}

			img.onerror = () => {
				// Clean up on error too
				if ( objectUrl ) {
					URL.revokeObjectURL( objectUrl )
					objectUrl = null
				}
				reject( new Error( 'Failed to load image' ) )
			}

			objectUrl = URL.createObjectURL( fileItem.file )
			img.src = objectUrl
		} )
	}

	/**
	 * Convert an image file to the desired format and options.
	 * @return {Promise<{file: File|Blob, metadata?: Object}>} Promise resolving to the converted file and optional metadata.
	 */
	async convert() {
		const file = this.file
		const format = this.options?.format || 'webp'

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
			return { file, metadata: null }
		}

		// Not an image; return original file unchanged.
		if ( ! file.type || ! file.type.startsWith( 'image/' ) ) {
			return { file, metadata: null }
		}

		// Skip if already the desired format
		const formatInfo = supportedFormats.find( f => f.value === format )
		if ( formatInfo && file.type === formatInfo.mimeType ) {
			return { file, metadata: null }
		}

		// Check if the browser supports the desired output format
		const testCanvas = document.createElement( 'canvas' )
		if ( formatInfo && ! testCanvas.toDataURL( formatInfo.mimeType ).startsWith( `data:${ formatInfo.mimeType }` ) ) {
			// If not supported, skip conversion and return the original file
			// eslint-disable-next-line no-console
			console.error( '[Cimo] ' + format + ' is not supported by the browser, please use another modern browser' )
			return { file, metadata: null }
		}

		// Detect if the image is an animated GIF, if so just return the file unchanged
		if ( file.type === 'image/gif' ) {
			// Read the first few bytes to check for animation
			const buffer = await file.slice( 0, 50 * 1024 ).arrayBuffer()
			const bytes = new Uint8Array( buffer )

			// Look for multiple Graphic Control Extension blocks (0x21, 0xF9, 0x04)
			let gceCount = 0
			for ( let i = 0; i < bytes.length - 2; i++ ) {
				if (
					bytes[ i ] === 0x21 &&
					bytes[ i + 1 ] === 0xF9 &&
					bytes[ i + 2 ] === 0x04
				) {
					gceCount++
					// If more than one GCE block, it's animated
					if ( gceCount > 1 ) {
						return { file, metadata: null }
					}
				}
			}
			// If not animated, continue to convert
		}

		// Create a fileItem object for the convertImage function
		const fileItem = { file }

		try {
			const start = performance.now()
			const convertedBlob = await this.convertImage( fileItem, format, {
				quality: this.options?.quality || 0.8,
				maxDimension: this.options?.maxDimension || 0,
			} )
			const end = performance.now()

			// Get the file extension for the new format
			const extension = format === 'jpeg' ? 'jpg' : format
			// Prepend a unique identified to the filename
			// const prefix = Math.random().toString( 36 ).substring( 2, 10 )
			const newName = file.name.replace( /\.[^/.]+$/, '' ) + '.' + extension

			const conversionMetadata = {
				filename: newName,
				originalFormat: file.type,
				originalFilesize: file.size,
				convertedFormat: formatInfo.mimeType,
				convertedFilesize: convertedBlob.size,
				conversionTime: end - start,
				compressionSavings: file.size > 0 ? convertedBlob.size / file.size : null,
			}

			// Create the new File object in the same context as the input file
			// This ensures cross-context compatibility (iframe vs main window)
			const fileConstructor = file.constructor
			const outFile = new fileConstructor( [ convertedBlob ], newName, {
				type: formatInfo.mimeType,
				lastModified: Date.now(),
			} )

			return { file: outFile, metadata: conversionMetadata }
		} catch ( error ) {
			throw new Error( `Failed to convert image: ${ error.message }` )
		}
	}
}

export { ImageConverter }
