import { domReady } from '~cimo/shared/dom-ready'
import { getCachedMetadata } from '~cimo/shared/metadata-saver'
import { buildPricingUrl } from '~cimo/shared/pricing-url'
import { escape } from '~cimo/shared/util'
import { __, sprintf } from '@wordpress/i18n'
import { applyFilters } from '@wordpress/hooks'

/**
 * Format bytes into human readable format (KB, MB, etc.)
 * @param {number}  bytes      - The number of bytes
 * @param {number}  decimals   - Number of decimal places (default: 2)
 * @param {boolean} invertSign - Invert the sign of the filesize (default: true)
 * @return {string} Formatted filesize
 */
function formatFilesize( bytes, decimals = 2, invertSign = false ) {
	if ( bytes === 0 ) {
		return '0 Bytes'
	}

	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = [ 'Bytes', 'KB', 'MB', 'GB' ]

	const absBytes = Math.abs( bytes )
	const i = Math.floor( Math.log( absBytes ) / Math.log( k ) )
	const value = parseFloat( ( absBytes / Math.pow( k, i ) ).toFixed( dm ) )
	let sign = bytes < 0 ? '-' : ''
	if ( invertSign ) {
		sign = sign === '-' ? '' : '-'
	}

	return sign + value + ' ' + sizes[ i ]
}

function convertMimetypeToFormat( mimetype ) {
	if ( ! mimetype ) {
		return ''
	}

	const parts = mimetype.split( '/' )
	const format = parts[ 1 ] || parts[ 0 ] || ''
	if ( format === 'webp' ) {
		return 'WebP'
	}

	return format.charAt( 0 ).toUpperCase() + format.slice( 1 )
}

function getMediaTypeLabel( mimetype ) {
	if ( ! mimetype ) {
		return 'Media'
	}

	const [ category = 'media' ] = mimetype.split( '/' )
	switch ( category.toLowerCase() ) {
		case 'image':
			return 'Image'
		case 'video':
			return 'Video'
		case 'audio':
			return 'Audio'
		default:
			return 'Media'
	}
}

function injectCimoMetadata( {
	model,
	container,
} ) {
	if ( ! model || ! container ) {
		return
	}

	// Prevent duplicate inserts
	if ( container.querySelector( '.cimo-media-manager-metadata' ) ) {
		return
	}

	let customMetadata = model.get( 'cimo' ) || null

	if ( ! customMetadata || Object.keys( customMetadata ).length === 0 ) {
		customMetadata = getCachedMetadata(
			model.get( 'originalImageName' ) || model.get( 'filename' )
		)
	}

	if ( ! customMetadata ) {
		return
	}

	// If the image is not optimized, and there is no bulk optimization, return
	if ( typeof customMetadata.compressionSavings === 'undefined' && typeof customMetadata.bulk_optimization === 'undefined' ) {
		return
	}
	if ( typeof customMetadata.compressionSavings === 'undefined' && Array.isArray( customMetadata.bulk_optimization ) && customMetadata.bulk_optimization.length === 0 ) {
		return
	}

	let originalFilesize = parseInt( customMetadata.originalFilesize || 0 )
	let convertedFilesize = parseInt( customMetadata.convertedFilesize || 0 )

	const isBulkOptimized = customMetadata.bulk_optimization &&
		typeof customMetadata.bulk_optimization === 'object' &&
		! Array.isArray( customMetadata.bulk_optimization ) &&
		Object.keys( customMetadata.bulk_optimization ).length > 0

	// Bulk optimization keys are the sizes, so we need to sum the original filesizes of the bulk optimization
	if ( isBulkOptimized ) {
		for ( const size in customMetadata.bulk_optimization ) {
			originalFilesize += parseInt( customMetadata.bulk_optimization[ size ].originalFilesize || 0 )
			convertedFilesize += parseInt( customMetadata.bulk_optimization[ size ].convertedFilesize || 0 )
		}
	}

	const customContent = document.createElement( 'div' )
	customContent.className = 'cimo-media-manager-metadata'

	const convertedFormatRaw = customMetadata.convertedFormat || model.get( 'mime' ) || ''
	const mediaTypeLabel = getMediaTypeLabel( convertedFormatRaw )

	let html = `
		<div class="cimo-media-manager-metadata-title-container">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 672 672" height="20" width="20">
				<path d="M132.5 132.5C182.4 82.5 253 56 336 56C419 56 489.6 82.5 539.5 132.5C589.4 182.5 616 253 616 336C616 419 589.5 489.6 539.5 539.5C489.5 589.4 419 616 336 616C253 616 182.4 589.5 132.5 539.5C82.6 489.5 56 419 56 336C56 253 82.5 182.4 132.5 132.5z"/>
			</svg>
			<h3 class="cimo-media-manager-metadata-title">
				${ escape( sprintf( __( '%s Optimized by Cimo', 'cimo-image-optimizer' ), mediaTypeLabel ) ) }
			</h3>
		</div>
		<ul>
	`

	const optimizationSavings = customMetadata.compressionSavings
		? ( 100 - ( customMetadata.compressionSavings * 100 ) ).toFixed( 2 )
		: ( 100 * ( originalFilesize - convertedFilesize ) / originalFilesize ).toFixed( 2 )

	const kbSaved = formatFilesize(
		originalFilesize - convertedFilesize,
		1,
		true
	)

	const optimizationSavingsClass =
		optimizationSavings > 0
			? 'cimo-optimization-savings-up'
			: 'cimo-optimization-savings-down'

	const arrow = convertedFilesize < originalFilesize ? '↓' : ( convertedFilesize > originalFilesize ? '↑' : '' )

	const canManageOptions =
		typeof window !== 'undefined' && Boolean( window.cimoSettings?.canManageOptions )

	const settingsUrl =
		canManageOptions &&
		typeof window !== 'undefined' &&
		window.cimoSettings?.settingsUrl
			? String( window.cimoSettings.settingsUrl )
			: ''

	const statsHintSvg = '<svg xmlns="http://www.w3.org/2000/svg" draggable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-no-axes-column-icon lucide-chart-no-axes-column"><path d="M5 21v-6"/><path d="M12 21V3"/><path d="M19 21V9"/></svg>'

	const statsHintHtml = settingsUrl
		? `<a class="cimo-media-stats-hint" href="${ escape( settingsUrl ) }" title="${ escape( __( 'View site-wide stats in Cimo settings', 'cimo-image-optimizer' ) ) }" aria-label="${ escape( __( 'View site-wide stats in Cimo settings', 'cimo-image-optimizer' ) ) }" target="_blank" rel="noopener noreferrer">${ statsHintSvg }</a>`
		: ''

	html += `
		<li class="cimo-compression-savings ${ escape( optimizationSavingsClass ) }">
			<span class="cimo-compression-savings-headline">
				Saved ${ escape( optimizationSavings ) }%${ statsHintHtml }
			</span>
			<span class="cimo-compression-savings-bytes">(${ escape( kbSaved ) })</span>
		</li>
	`

	html += `
		<li class="cimo-filesize-original">
			Original: <span class="cimo-value">${ escape( formatFilesize( originalFilesize ) ) }</span>
		</li>
		<li class="cimo-filesize-optimized">
			Optimized: <span class="cimo-value">${ escape( arrow ) } ${ escape( formatFilesize( convertedFilesize ) ) }</span>
		</li>
	`

	if ( isBulkOptimized ) {
		html += `
			<li class="cimo-bulk-optimization-number">
				🏞️ <span class="cimo-value">${ escape( Object.keys( customMetadata.bulk_optimization ).length.toString() ) }</span> thumbnail(s) processed
			</li>
			<li class="cimo-bulk-optimization-number">
				⚡️ Bulk optimized
			</li>
		`
	}

	if ( ! isBulkOptimized ) {
		const formatLabel = convertMimetypeToFormat( customMetadata.convertedFormat )
		const convertedFormatSpan = `<span class="cimo-value">${ escape( formatLabel ) }</span>`
		const convertedLineText = customMetadata.smartOptimized
			? sprintf(
				/* translators: %s: image format name (e.g. WebP) */
				__( 'Smart optimized to %s', 'cimo-image-optimizer' ),
				convertedFormatSpan
			)
			: sprintf(
				/* translators: %s: image format name (e.g. WebP) */
				__( 'Converted to %s', 'cimo-image-optimizer' ),
				convertedFormatSpan
			)

		html += `
			<li class="cimo-converted">
				🏞️ ${ convertedLineText }
			</li>
		`

		let conversionTimeDisplay = 'N/A'
		if ( customMetadata.conversionTime ) {
			const timeMs = parseFloat( customMetadata.conversionTime )
			conversionTimeDisplay =
				timeMs < 1000
					? `${ timeMs.toFixed( 0 ) } ms`
					: timeMs < 60000
						? `${ ( timeMs / 1000 ).toFixed( 1 ) } sec`
						: `${ ( timeMs / 60000 ).toFixed( 1 ) } min`
		}

		html += `
			<li class="cimo-time">
				⚡️ Done in <span class="cimo-value">${ escape( conversionTimeDisplay ) }</span>
			</li>
		`
	}

	html += '</ul>'

	const showPremiumHint = typeof window !== 'undefined' &&
		window.cimoSettings &&
		canManageOptions &&
		! window.cimoSettings.isPremium &&
		! isBulkOptimized

	if ( showPremiumHint ) {
		const premiumUrl = buildPricingUrl( 'attachment-modal' )
		html += `<p class="cimo-media-premium-hint"><a href="${ escape( premiumUrl ) }" target="_blank" rel="noopener noreferrer">${ escape( __( 'Apply this to your entire library →', 'cimo-image-optimizer' ) ) }</a></p>`
	}

	customContent.innerHTML = html
	container.appendChild( customContent )
}

domReady( () => {
	if ( ! applyFilters( 'cimo.mediaManager.sidebarInfo.doRender', true ) ) {
		return
	}

	// Only proceed if wp.media is available (media library is loaded)
	if (
		typeof wp === 'undefined' ||
		! wp.media ||
		! wp.media.view ||
		! wp.media.view.Attachment ||
		! wp.media.view.Attachment.Details
	) {
		return
	}

	// Editor media library modal (Attachment.Details)
	wp.media.view.Attachment.Details =
		wp.media.view.Attachment.Details.extend( {
			template( view ) {
				const html = wp.media.template( 'attachment-details' )( view )
				const dom = document.createElement( 'div' )
				dom.innerHTML = html

				const container = dom.querySelector( '.attachment-info' )

				injectCimoMetadata( {
					model: view.model,
					container,
				} )

				return dom.innerHTML
			},
		} )

	// Admin Media in Grid View (Attachment.Details.TwoColumn)
	if ( wp.media.view.Attachment.Details.TwoColumn ) {
		const TwoColumn = wp.media.view.Attachment.Details.TwoColumn

		wp.media.view.Attachment.Details.TwoColumn =
			TwoColumn.extend( {
				render() {
					TwoColumn.prototype.render.apply( this, arguments )

					const container = this.el.querySelector(
						'.attachment-info > .details'
					)

					injectCimoMetadata( {
						model: this.model,
						container,
					} )

					return this
				},
			} )
	}
} )
