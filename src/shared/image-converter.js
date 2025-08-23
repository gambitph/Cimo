/**
 * Lightweight client-side image conversion utility.
 *
 * Converts a File (image) to the desired format using Canvas APIs.
 * Supports optional resizing, scaling, and aspect ratio cropping.
 */

import { saveMetadata } from './metadata-saver'

// Supported output formats
const supportedFormats = [
	{ value: 'webp', mimeType: 'image/webp' },
	{ value: 'jpg', mimeType: 'image/jpeg' },
	{ value: 'png', mimeType: 'image/png' },
]

// Configuration for different formats
const config = {
	webp: {
		quality: 0.8, width: 'auto', height: 'auto',
	},
	jpg: {
		quality: 0.8, width: 'auto', height: 'auto',
	},
	png: {
		quality: 1.0, width: 'auto', height: 'auto',
	},
}

/**
 * @typedef {Object} ConvertOptions
 * @property {number}                                         [quality=0.8]        - For lossy formats in range [0,1]
 * @property {number}                                         [scale=1]            - Uniform scaling factor
 * @property {number|"auto"}                                  [width="auto"]       - Target width in pixels or 'auto'
 * @property {number|"auto"}                                  [height="auto"]      - Target height in pixels or 'auto'
 * @property {"auto"|"custom"|"1:1"|"4:3"|"16:9"|"3:2"|"5:4"} [aspectRatio="auto"] - Target aspect ratio
 * @property {"webp"|"jpg"|"png"}                             [format="webp"]      - Output format
 */

/**
 * Compute target dimensions from original size and options.
 * Mirrors the logic used in the user's ImageConverter.js for consistency.
 *
 * @param {number}         originalWidth
 * @param {number}         originalHeight
 * @param {ConvertOptions} options
 * @return {{ width: number, height: number }} - Object containing calculated width and height
 */
function calculateDimensions( originalWidth, originalHeight, options ) {
	options = options || {}
	const scale = !! options.scale ? options.scale : 1
	const width = !! options.width ? options.width : 'auto'
	const height = !! options.height ? options.height : 'auto'
	const aspectRatio = !! options.aspectRatio ? options.aspectRatio : 'auto'

	// Apply scale
	let newWidth = originalWidth * scale
	let newHeight = originalHeight * scale

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
 * @param {Object} fileItem              - Object containing the file to convert
 * @param {string} [outputFormat="webp"] - Output format for the converted image
 * @return {Promise<Blob>} - Promise that resolves to the converted image blob
 */
const convertImage = async ( fileItem, outputFormat = 'webp' ) => {
	return new Promise( ( resolve, reject ) => {
		const img = new Image()
		img.onload = async function() {
			const canvas = document.createElement( 'canvas' )

			// Calculate new dimensions based on configuration
			const formatConfig = config[ outputFormat ]
			const { width, height } = calculateDimensions( img.width, img.height, formatConfig )

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
			const quality = ( outputFormat === 'webp' || outputFormat === 'jpg' ) ? formatConfig.quality : undefined

			canvas.toBlob( function( blob ) {
				if ( blob ) {
					resolve( blob )
				} else {
					reject( new Error( 'Failed to convert image' ) )
				}
			}, format.mimeType, quality )
		}
		img.onerror = () => reject( new Error( 'Failed to load image' ) )
		img.src = URL.createObjectURL( fileItem.file )
	} )
}

/**
 * Convert an image File to the desired format (client-side).
 *
 * @param {File}           file      - Input image file.
 * @param {ConvertOptions} [options]
 * @return {Promise<File>} - Converted File in the specified format.
 */
async function convertImageClientSide( file, options ) {
	options = options || {}
	const format = options.format !== null ? options.format : 'webp'

	if ( ! ( file instanceof File ) ) {
		throw new Error( 'convertImageClientSide: input must be a File' )
	}

	if ( ! file.type || ! file.type.startsWith( 'image/' ) ) {
		// Not an image; return original file unchanged.
		return file
	}

	// Skip if already the desired format
	const formatInfo = supportedFormats.find( f => f.value === format )
	if ( formatInfo && file.type === formatInfo.mimeType ) {
		return file
	}

	// Create a fileItem object for the convertImage function
	const fileItem = { file }

	try {
		const start = performance.now()
		const convertedBlob = await convertImage( fileItem, format )
		const end = performance.now()

		// Get the file extension for the new format
		const extension = format === 'jpeg' ? 'jpg' : format
		// Prepend a unique identified to the filename
		const prefix = Math.random().toString( 36 ).substring( 2, 10 )
		const newName = prefix + '-' + file.name.replace( /\.[^/.]+$/, '' ) + '.' + extension

		const conversionMetadata = {
			originalFormat: file.type,
			originalFilesize: file.size,
			convertedFormat: formatInfo.mimeType,
			convertedFilesize: convertedBlob.size,
			conversionTime: end - start,
			compressionSavings: file.size > 0 ? convertedBlob.size / file.size : null,
		}

		// Dispatch the metadata to the server.
		saveMetadata( newName, conversionMetadata )

		const outFile = new File( [ convertedBlob ], newName, {
			type: formatInfo.mimeType,
			lastModified: Date.now(),
		} )
		return outFile
	} catch ( error ) {
		throw new Error( `Failed to convert image: ${ error.message }` )
	}
}

export {
	convertImageClientSide,
	convertImage,
}
