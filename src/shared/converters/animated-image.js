let webpModulePromise = null

/**
 * Return the output dimensions after applying Cimo's maximum-dimension rule.
 *
 * @param {number} width        - Source width.
 * @param {number} height       - Source height.
 * @param {number} maxDimension - Largest permitted output side.
 * @return {{ width: number, height: number }} Output dimensions.
 */
function getOutputDimensions( width, height, maxDimension ) {
	if ( ! maxDimension || Math.max( width, height ) <= maxDimension ) {
		return { width, height }
	}

	// Scale both sides by the same factor so animation frames retain their aspect ratio.
	const scale = maxDimension / Math.max( width, height )
	return {
		width: Math.round( width * scale ),
		height: Math.round( height * scale ),
	}
}

/**
 * Draw GIF patches onto a full-size canvas while honoring the disposal method.
 *
 * @param {Array<Object>} frames - Frames returned by gifuct-js.
 * @param {number}        width  - GIF canvas width.
 * @param {number}        height - GIF canvas height.
 * @return {Array<{data: Uint8Array, duration: number}>} Fully composited frames.
 */
function composeGifFrames( frames, width, height ) {
	const canvas = document.createElement( 'canvas' )
	const patchCanvas = document.createElement( 'canvas' )
	canvas.width = width
	canvas.height = height
	const context = canvas.getContext( '2d' )
	const patchContext = patchCanvas.getContext( '2d' )

	if ( ! context || ! patchContext ) {
		throw new Error( 'Canvas is unavailable for GIF conversion' )
	}

	return frames.map( frame => {
		const {
			left,
			top,
			width: frameWidth,
			height: frameHeight,
		} = frame.dims
		const previousCanvas =
			frame.disposalType === 3
				? context.getImageData( 0, 0, width, height )
				: null

		// gifuct-js returns a changed-area patch, not a complete image frame.
		// Drawing it onto the accumulated canvas reconstructs what the browser displays.
		patchCanvas.width = frameWidth
		patchCanvas.height = frameHeight
		patchContext.putImageData(
			new ImageData(
				new Uint8ClampedArray( frame.patch ),
				frameWidth,
				frameHeight,
			),
			0,
			0,
		)
		context.drawImage( patchCanvas, left, top )

		// Animated WebP needs a complete RGBA canvas for every encoded frame.
		const outputFrame = {
			data: new Uint8Array(
				context.getImageData( 0, 0, width, height ).data,
			),
			duration: frame.delay || 100,
		}

		// Prepare the canvas for the next GIF patch according to the disposal rule.
		if ( frame.disposalType === 2 ) {
			context.clearRect( left, top, frameWidth, frameHeight )
		} else if ( previousCanvas ) {
			context.putImageData( previousCanvas, 0, 0 )
		}

		return outputFrame
	} )
}

/**
 * Identify the animation chunks in a valid WebP RIFF container.
 *
 * @param {Uint8Array} data - WebP bytes.
 * @return {boolean} Whether the file is animated.
 */
function isAnimatedWebp( data ) {
	if (
		data.length < 12 ||
		String.fromCharCode( ...data.slice( 0, 4 ) ) !== 'RIFF' ||
		String.fromCharCode( ...data.slice( 8, 12 ) ) !== 'WEBP'
	) {
		return false
	}

	const view = new DataView( data.buffer, data.byteOffset, data.byteLength )
	for ( let offset = 12; offset + 8 <= data.length; ) {
		const chunkLength = view.getUint32( offset + 4, true )
		// ANIM is the WebP container chunk that enables animation metadata and frames.
		if ( String.fromCharCode( ...data.slice( offset, offset + 4 ) ) === 'ANIM' ) {
			return true
		}
		// RIFF chunks are padded to an even byte boundary.
		offset += 8 + chunkLength + ( chunkLength % 2 )
	}

	return false
}

/**
 * Decode an animated GIF or WebP into full-canvas RGBA frames.
 *
 * @param {File|Blob} file - Source image.
 * @return {Promise<null|{width: number, height: number, frames: Array<{data: Uint8Array, duration: number}>}>} Animation data.
 */
async function decodeAnimation( file ) {
	// The GIF parser and the WebP RIFF check both operate on the original bytes.
	const data = new Uint8Array( await file.arrayBuffer() )

	if ( file.type === 'image/gif' ) {
		// Load the GIF parser only for GIF uploads.
		const { parseGIF, decompressFrames } = await import(
			/* webpackChunkName: "animated-webp-codec" */ 'gifuct-js'
		)
		const gif = parseGIF( data.buffer )
		const frames = decompressFrames( gif, true )
		// A single GIF frame follows the regular canvas conversion path instead.
		if ( frames.length < 2 ) {
			return null
		}

		return {
			width: gif.lsd.width,
			height: gif.lsd.height,
			frames: composeGifFrames( frames, gif.lsd.width, gif.lsd.height ),
		}
	}

	// Only animated WebP needs frame-aware decoding. Still WebP remains on the canvas path.
	if ( file.type !== 'image/webp' || ! isAnimatedWebp( data ) ) {
		return null
	}

	const webpModule = await getWebpModule()
	// The codec reconstructs complete canvases and exposes the display duration per frame.
	const frames = webpModule.decodeAnimation( data, true )
	if ( ! frames || frames.length < 2 ) {
		throw new Error( 'Failed to decode animated WebP' )
	}

	return {
		width: frames[ 0 ].width,
		height: frames[ 0 ].height,
		frames: frames.map( frame => ( {
			data: new Uint8Array( frame.data ),
			duration: frame.duration || 100,
		} ) ),
	}
}

/**
 * Resize full-canvas animation frames when Cimo has a maximum dimension.
 *
 * @param {{width: number, height: number, frames: Array<{data: Uint8Array, duration: number}>}} animation    - Decoded frames.
 * @param {number}                                                                               maxDimension - Largest permitted output side.
 * @return {{width: number, height: number, frames: Array<{data: Uint8Array, duration: number}>}} Resized animation.
 */
function resizeAnimation( animation, maxDimension ) {
	const dimensions = getOutputDimensions(
		animation.width,
		animation.height,
		maxDimension,
	)
	if (
		dimensions.width === animation.width &&
		dimensions.height === animation.height
	) {
		return animation
	}

	// Resize complete decoded frames rather than GIF patches, preserving the displayed image.
	const sourceCanvas = document.createElement( 'canvas' )
	const outputCanvas = document.createElement( 'canvas' )
	sourceCanvas.width = animation.width
	sourceCanvas.height = animation.height
	outputCanvas.width = dimensions.width
	outputCanvas.height = dimensions.height
	const sourceContext = sourceCanvas.getContext( '2d' )
	const outputContext = outputCanvas.getContext( '2d' )
	if ( ! sourceContext || ! outputContext ) {
		throw new Error( 'Canvas is unavailable for animation resizing' )
	}

	return {
		...animation,
		...dimensions,
		frames: animation.frames.map( frame => {
			// Load the source RGBA pixels, resize them, then read back WebP-ready RGBA data.
			sourceContext.putImageData(
				new ImageData(
					new Uint8ClampedArray( frame.data ),
					animation.width,
					animation.height,
				),
				0,
				0,
			)
			outputContext.clearRect( 0, 0, dimensions.width, dimensions.height )
			outputContext.drawImage(
				sourceCanvas,
				0,
				0,
				dimensions.width,
				dimensions.height,
			)
			return {
				...frame,
				data: new Uint8Array(
					outputContext.getImageData(
						0,
						0,
						dimensions.width,
						dimensions.height,
					).data,
				),
			}
		} ),
	}
}

/**
 * Convert an animated GIF or WebP to animated WebP.
 * Returns null for a non-animated source so the normal image path stays fast.
 *
 * @param {File|Blob} file         - Source image.
 * @param {number}    quality      - WebP quality, as 0-1 or 0-100.
 * @param {number}    maxDimension - Largest permitted output side.
 * @return {Promise<Blob|null>} Encoded animated WebP, or null for a still image.
 */
export async function convertAnimatedImageToWebp( file, quality, maxDimension ) {
	const decodedAnimation = await decodeAnimation( file )
	// Let ImageConverter use its lighter single-image path when the source is not animated.
	if ( ! decodedAnimation ) {
		return null
	}

	// Apply Cimo's resize setting before encoding every frame.
	const animation = resizeAnimation( decodedAnimation, maxDimension )
	const webpModule = await getWebpModule()
	// Settings may reach this code as a 0-1 canvas value or a 0-100 WebP value.
	const normalizedQuality = Math.round(
		Math.min( 100, Math.max( 0, quality <= 1 ? quality * 100 : quality ) ),
	)
	const frames = new webpModule.VectorWebPAnimationFrame()
	try {
		animation.frames.forEach( frame => {
			// Keep timing and alpha-capable RGBA pixels with their per-frame quality setting.
			frames.push_back( {
				duration: frame.duration,
				data: frame.data,
				config: { lossless: 0, quality: normalizedQuality },
				has_config: true,
			} )
		} )
		// The encoder assembles the supplied full-size frames into one animated WebP container.
		const data = webpModule.encodeAnimation(
			animation.width,
			animation.height,
			true,
			frames,
		)
		if ( ! data ) {
			throw new Error( 'Failed to encode animated WebP' )
		}

		return new Blob( [ data ], { type: 'image/webp' } )
	} finally {
		// Emscripten vectors own native memory and must be explicitly released.
		frames.delete()
	}
}

/**
 * Load the WebP codec with the emitted WebAssembly asset URL.
 *
 * @return {Promise<Object>} Initialized Emscripten module.
 */
async function getWebpModule() {
	if ( ! webpModulePromise ) {
		// Cache the initialization so consecutive animated uploads share one codec.
		webpModulePromise = Promise.all( [
			import(
				/* webpackChunkName: "animated-webp-codec" */ 'wasm-webp/dist/cjs/webp-wasm.js'
			),
			import(
				/* webpackChunkName: "animated-webp-codec" */ 'wasm-webp/dist/cjs/webp-wasm.wasm'
			),
		] ).then( ( [ importedModule, wasmAsset ] ) => {
			const createModule = importedModule.default || importedModule
			const webpWasmUrl = wasmAsset.default
			return createModule( {
				locateFile: () => webpWasmUrl,
			} )
		} )
	}

	return webpModulePromise
}
