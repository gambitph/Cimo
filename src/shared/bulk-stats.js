/**
 * Bulk progress counting helpers (shared free + premium).
 * Used to compute "X of Y optimized" for the Bulk Optimization UI.
 *
 * Mime inclusion mirrors Premium BulkCollection.supportsAttachmentMimeType.
 */

import mime from 'mime/lite'
import { ImageConverter } from './converters/image-converter'

/** Bulk-optimizable video MIME types (Premium VideoConverter SUPPORTED_OUTPUT_FORMATS). */
const BULK_VIDEO_MIME_TYPES = new Set( [
	'video/mp4',
	'video/x-m4v',
	'video/webm',
	'video/ogg',
	'video/quicktime',
] )

/** Bulk-optimizable audio MIME types (Premium AudioConverter SUPPORTED_OUTPUT_FORMATS). */
const BULK_AUDIO_MIME_TYPES = new Set( [
	'audio/mpeg',
	'audio/mp3',
	'audio/wav',
	'audio/x-wav',
	'audio/wave',
	'audio/ogg',
	'audio/opus',
	'audio/vorbis',
	'audio/aac',
	'audio/adts',
	'audio/flac',
	'audio/x-flac',
	'audio/mp4',
	'audio/x-m4a',
] )

/**
 * @param {'audio'|'video'} tagName
 * @param {string}          mimeType
 * @return {boolean} Whether the browser reports it can play this MIME type.
 */
function canBrowserPlayMediaType( tagName, mimeType ) {
	if ( ! mimeType || typeof document === 'undefined' ) {
		return false
	}
	const element = document.createElement( tagName )
	return typeof element.canPlayType === 'function' && element.canPlayType( mimeType ) !== ''
}

/**
 * @param {string} file Path or URL.
 * @return {string|null} Lowercase extension, or null if none.
 */
export function getFileExtension( file ) {
	if ( ! file || typeof file !== 'string' || ! file.includes( '.' ) ) {
		return null
	}
	const ext = file.split( '.' ).pop() || null
	return ext ? ext.toLowerCase() : null
}

/**
 * Resolve attachment MIME type the same way Premium BulkCollection does.
 *
 * @param {Object} attachment
 * @return {string} Resolved MIME type, or empty string when unknown.
 */
export function resolveAttachmentMimeType( attachment ) {
	const ext = attachment?.file ? getFileExtension( attachment.file ) : null
	return attachment?.mimeType || ( ext ? mime.getType( ext ) : '' ) || ''
}

/**
 * Whether an attachment MIME type is included in bulk progress stats.
 * Matches Premium BulkCollection.supportsAttachmentMimeType (incl. HEIC + browser play checks).
 *
 * @param {string} mimeType
 * @return {boolean} True when the MIME type counts toward bulk progress stats.
 */
export function supportsBulkStatsMimeType( mimeType ) {
	if ( ! mimeType || typeof mimeType !== 'string' ) {
		return false
	}

	if ( mimeType.startsWith( 'image/' ) ) {
		// Premium adds image/heic via filter; free stats include it explicitly for parity.
		return ImageConverter.supportsMimeType( mimeType ) || mimeType === 'image/heic'
	}

	if ( mimeType.startsWith( 'video/' ) ) {
		return BULK_VIDEO_MIME_TYPES.has( mimeType ) && canBrowserPlayMediaType( 'video', mimeType )
	}

	if ( mimeType.startsWith( 'audio/' ) ) {
		return BULK_AUDIO_MIME_TYPES.has( mimeType ) && canBrowserPlayMediaType( 'audio', mimeType )
	}

	return false
}

/**
 * Status for one attachment size — same rules as Premium BulkCollection.
 *
 * @param {string} size       Size key ('full', 'thumbnail', …).
 * @param {Object} attachment Attachment from /cimo/v1/attachments.
 * @return {string|false} Status label, or false when still unoptimized.
 */
export function getAttachmentSizeStatus( size, attachment ) {
	if ( ! attachment?.cimo ) {
		return false
	}

	if ( attachment.cimo.optimized_during_upload ) {
		return 'optimized-on-upload'
	}
	if ( ! attachment.cimo.bulk_optimization ) {
		return 'optimized-on-upload'
	}

	const bulk = attachment.cimo.bulk_optimization
	if ( bulk[ size ] ) {
		const entry = bulk[ size ]
		const status = typeof entry === 'object' ? entry.status : entry
		if ( status === 'skip' ) {
			return 'skipped'
		}
		if ( status === 'bulk' ) {
			return 'bulk-optimized'
		}
	}

	return false
}

/**
 * Tally one attachment (full + image size variants with a file).
 *
 * @param {Object}   attachment
 * @param {Function} [supportsMimeType] (mimeType) => boolean — defaults to supportsBulkStatsMimeType
 * @return {{ optimized: number, unoptimized: number, skipped: number }} Counts for this attachment.
 */
export function tallyAttachment( attachment, supportsMimeType = supportsBulkStatsMimeType ) {
	const stats = {
		optimized: 0, unoptimized: 0, skipped: 0,
	}

	const mimeType = resolveAttachmentMimeType( attachment )
	if ( typeof supportsMimeType === 'function' && ! supportsMimeType( mimeType ) ) {
		return stats
	}

	const isImage = typeof mimeType === 'string' && mimeType.startsWith( 'image/' )

	const bump = status => {
		if ( status === 'skipped' ) {
			stats.skipped++
		} else if ( status ) {
			stats.optimized++
		} else {
			stats.unoptimized++
		}
	}

	if ( attachment?.file ) {
		bump( getAttachmentSizeStatus( 'full', attachment ) )
	}

	if ( isImage && attachment?.sizes && typeof attachment.sizes === 'object' ) {
		for ( const sizeKey of Object.keys( attachment.sizes ) ) {
			if ( attachment.sizes[ sizeKey ]?.file ) {
				bump( getAttachmentSizeStatus( sizeKey, attachment ) )
			}
		}
	}

	return stats
}

/**
 * Count bulk progress. total = optimized + unoptimized (skipped excluded).
 *
 * @param {Object[]} attachments
 * @param {Function} [supportsMimeType]
 * @return {{ optimized: number, unoptimized: number, skipped: number, total: number }} Aggregated bulk progress stats.
 */
export function countBulkProgressStats( attachments, supportsMimeType = supportsBulkStatsMimeType ) {
	const stats = {
		optimized: 0, unoptimized: 0, skipped: 0, total: 0,
	}

	for ( const attachment of attachments || [] ) {
		const piece = tallyAttachment( attachment, supportsMimeType )
		stats.optimized += piece.optimized
		stats.unoptimized += piece.unoptimized
		stats.skipped += piece.skipped
	}

	stats.total = stats.optimized + stats.unoptimized
	return stats
}
