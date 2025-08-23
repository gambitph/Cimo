import domReady from '@wordpress/dom-ready'
import { getCachedMetadata } from '../../../shared/metadata-saver'

/**
 * Format bytes into human readable format (KB, MB, etc.)
 * @param {number} bytes    - The number of bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @return {string} Formatted filesize
 */
function formatFilesize( bytes, decimals = 2 ) {
	if ( bytes === 0 ) {
		return '0 Bytes'
	}

	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = [ 'Bytes', 'KB', 'MB', 'GB' ]

	const i = Math.floor( Math.log( bytes ) / Math.log( k ) )

	return parseFloat( ( bytes / Math.pow( k, i ) ).toFixed( dm ) ) + ' ' + sizes[ i ]
}

function convertMimetypeToFormat( mimetype ) {
	const format = mimetype.split( '/' )[ 1 ]
	if ( format === 'webp' ) {
		return 'WebP'
	}

	return format.charAt( 0 ).toUpperCase() + format.slice( 1 )
}

domReady( () => {
	wp.media.view.Attachment.Details = wp.media.view.Attachment.Details.extend( {
		template: function template( view ) {
			const html = wp.media.template( 'attachment-details' )( view )
			const dom = document.createElement( 'div' )
			dom.innerHTML = html

			// Get the metadata from the model or the cache
			let customMetadata = view.model.get( 'cimo' ) || null

			// If the attachment was just uploaded, the model data won't be available, fetch it from the cache
			if ( ! customMetadata || Object.keys( customMetadata ).length === 0 ) {
				customMetadata = getCachedMetadata( view.model.get( 'originalImageName' ) || view.model.get( 'filename' ) )
			}

			// TODO: Translate this
			const details = dom.querySelector( '.attachment-info' )
			if ( customMetadata && details ) {
				const customContent = document.createElement( 'div' )
				customContent.className = 'cimo-media-manager-metadata'

				const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 672 672" height="20" width="20"><path d="M132.5 132.5C182.4 82.5 253 56 336 56C419 56 489.6 82.5 539.5 132.5C589.4 182.5 616 253 616 336C616 419 589.5 489.6 539.5 539.5C489.5 589.4 419 616 336 616C253 616 182.4 589.5 132.5 539.5C82.6 489.5 56 419 56 336C56 253 82.5 182.4 132.5 132.5zM465.5 273.9C477.6 264.2 479.5 246.6 469.9 234.5C460.3 222.4 442.6 220.5 430.5 230.1C378 272.1 330.3 341.9 306.7 379.4C291.4 359.3 267.2 331.1 239.5 312.6C226.6 304 209.2 307.5 200.7 320.4C192.2 333.3 195.6 350.7 208.5 359.2C237.4 378.5 264.1 415.1 274.1 429.9C281.5 440.9 294 447.9 307.9 447.9C322.3 447.9 335.5 440.3 342.8 428C357.2 403.5 410 318.3 465.6 273.8z"/></svg>`
				let html = `<h3 class="cimo-media-manager-metadata-title">${ svg } Image Optimized by Cimo!</h3><ul>`

				/**
				 * Format optimization savings, display an arrow up or down and color it green or red.
				 */
				const optimizationSavings = customMetadata.compressionSavings
					? ( 100 - ( customMetadata.compressionSavings * 100 ) ).toFixed( 2 )
					: null
				const kbSaved = formatFilesize( customMetadata.originalFilesize - customMetadata.convertedFilesize )
				const optimizationSavingsClass = optimizationSavings > 0 ? 'cimo-optimization-savings-up' : 'cimo-optimization-savings-down'

				html += `<li class="cimo-compression-savings ${ optimizationSavingsClass }">Saved ${ optimizationSavings }% (${ kbSaved })</li>`

				/**
				 * Filesize
				 */
				const originalSize = formatFilesize( parseInt( customMetadata.originalFilesize ) || 0 )
				const convertedSize = formatFilesize( parseInt( customMetadata.convertedFilesize ) || 0 )
				html += `<li class="cimo-filesize">Original: <span class="cimo-original-filesize-value">${ originalSize }</span> → Optimized: <span class="cimo-converted-filesize">${ convertedSize }</span></li>`

				/**
				 * Original format
				 */
				html += `<li class="cimo-converted">Converted to <span class="cimo-value">${ convertMimetypeToFormat( customMetadata.convertedFormat ) }</span></li>`

				/**
				 * Conversion time
				 */
				// This is number string.
				const conversionTime = customMetadata.conversionTime
					? parseFloat( customMetadata.conversionTime ).toPrecision( 3 )
					: null

				html += `<li class="cimo-time">Done in <span class="cimo-value">${ ( conversionTime + 'ms' ) || 'N/A' } ⚡️</span></li>`

				customContent.innerHTML = html
				details.appendChild( customContent )
			}

			return dom.innerHTML
		},
	} )
} )
