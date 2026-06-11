
/**
 * This script is in charge of keeping track of temporary upload notices for
 * media conversion results, then matching those notices back to the Media
 * Library attachment after WordPress finishes uploading and renaming the file.
 * The cache is kept in memory only, so refreshing the page clears all notices.
 */

/**
 * Create the cache key used to match an upload notice to a Media Library item.
 *
 * @param {string} filename - baseFile or WordPress-generated filename.
 * @return {string|undefined} Sanitized cache key.
 */
const getCacheKey = filename => filename
	// Match WordPress filename sanitization to ensure consistent cache keys.
	?.replace( /[^a-zA-Z0-9._-]+/g, '-' )
	// Collapse repeated dashes created by the previous replacement.
	.replace( /-+/g, '-' )
	// Remove leading/trailing dashes around the filename.
	.replace( /^-|-$/g, '' )
	.toLowerCase()

/**
 * Remove the numeric suffix WordPress adds when a filename already exists.
 *
 * @param {string} filename - WordPress-generated filename.
 * @return {string|undefined} Filename without the final WordPress suffix.
 */
const stripFilenameSuffix = filename => {
	// Convert `video-3.mov` back to `video.mov` for one-time self-correction.
	return filename?.replace( /-\d+(\.[^.]+)$/, '$1' )
}

/**
 * Find a temporary upload notice for a Media Library attachment.
 *
 * @param {string} filename - Filename from the media model.
 * @return {Object|null} Matching upload notice, if any.
 */
export const getCachedUploadNotice = filename => {
	const cache = window.cimoUploadNoticeCache || {}

	// Get the filename which may have a suffix, and try to find a notice for it first.
	const cacheKey = getCacheKey( filename )
	if ( cache[ cacheKey ] ) {
		return cache[ cacheKey ]
	}

	// Extract the base filename without the suffix and check if there's a notice for it.
	// If no cache with the base filename exists, then there's no notice for this upload at all.
	const baseFileKey = getCacheKey( stripFilenameSuffix( filename ) )
	const baseFileNotice = cache[ baseFileKey ]
	if ( ! baseFileNotice ) {
		return null
	}

	// Copy the notice to WordPress's final filename key.
	// Also remove remainingMatches from the cache since it's only needed for the base filename to track when to remove itself.
	cache[ cacheKey ] = {
		...baseFileNotice,
	}
	delete cache[ cacheKey ].remainingMatches

	// Keep the baseFile key only while more suffixed filenames still need it.
	if ( baseFileNotice.remainingMatches > 1 ) {
		baseFileNotice.remainingMatches--
	} else {
		// Remove the base fallback so older similar media cannot keep matching it.
		delete cache[ baseFileKey ]
	}

	return cache[ cacheKey ]
}

/**
 * Cache a temporary upload notice message under a sanitized filename key.
 *
 * @param {string} filename - Browser File.name from the failed upload.
 * @param {string} message  - Notice message to display in the media manager.
 */
export const setCachedUploadNotice = ( filename, message ) => {
	// Keep notices in memory only; refreshing the page clears them.
	if ( ! window.cimoUploadNoticeCache ) {
		window.cimoUploadNoticeCache = {}
	}

	// Generate the cache key based on the filename, matching WordPress's sanitization.
	// This will always generate the basename, and is not guaranteed to match the final WordPress filename,
	// which may have a suffix added (`-1` or `-2`.).
	const baseFileKey = getCacheKey( filename )
	const cachedNotice = window.cimoUploadNoticeCache[ baseFileKey ]

	window.cimoUploadNoticeCache[ baseFileKey ] = {
		message,
		// Count duplicate uploads with the same browser filename so
		// each suffixed item can self-correct once.
		remainingMatches: ( cachedNotice?.remainingMatches || 0 ) + 1,
	}
}

/**
 * Create and cache an upload notice from a converter result.
 *
 * @param {Object} result - Converter result.
 * @return {string|null} Cached notice message when the result includes one.
 */
export const cacheConverterNotice = result => {
	const file = result?.file
	if ( ! file?.name ) {
		return null
	}

	// The converter result decides whether a sidebar notice should be shown.
	if ( ! result?.notice ) {
		return null
	}

	// Store only the display message; matching metadata is added by the cache layer.
	setCachedUploadNotice( file.name, result.notice )
	return result.notice
}
