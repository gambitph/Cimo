/**
 * Escapes a string for safe insertion into HTML to prevent XSS.
 * Similar to lodash's _.escape.
 *
 * @param {string} str
 * @return {string} escaped string
 */
export function escape( str ) {
	// If the string is not a string, convert to a string (might be a number)
	return ( typeof str !== 'string' ? String( str ) : str )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#39;' )
		.replace( /`/g, '&#96;' )
}
