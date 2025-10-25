/**
 * This script is in charge of keeping track of the metadata for the image
 * conversion, then whenever a new metadata comes in along with the filename,
 * after a short delay, we need to trigger a POST in order to save to the server
 * the metadata of the image conversion.
 */

/**
 * Saves metadata to the server via REST API.
 * Each metadata object must include a 'filename' key.
 * @param {Array<Object>} _metadataArray - Array of metadata objects (each must have a filename key)
 */
export const saveMetadata = _metadataArray => {
	if ( ! Array.isArray( _metadataArray ) ) {
		return Promise.resolve()
	}

	// Filter out all the null values. If we have a null value that means it didn't have any metadata to save.
	const metadataArray = _metadataArray.filter( entry => entry !== null )

	if ( metadataArray.length === 0 ) {
		return Promise.resolve()
	}

	// Check if all metadata entries are already cached (by filename)
	const allCached = metadataArray.every( entry => getCachedMetadata( entry.filename ) )
	if ( allCached ) {
		// eslint-disable-next-line no-console
		// console.log( 'Metadata already saved successfully for all filenames:', metadataArray.map( m => m.filename ) )
		return Promise.resolve()
	}

	// Mark all as successful in cache, keep a local copy of the metadata
	metadataArray.forEach( entry => {
		if ( entry.filename ) {
			setCachedMetadata( entry.filename, entry )
		}
	} )

	return new Promise( ( resolve, reject ) => {
		// eslint-disable-next-line no-console
		// console.log(
		// 	`Attempting to save metadata for filenames: [${ metadataArray.map( m => m.filename ).join( ', ' ) }]`
		// )

		fetch( `${ window.cimoSettings?.restUrl || '/wp-json/cimo/v1/' }metadata`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'X-WP-Nonce': window.cimoSettings?.nonce || window.wpApiSettings?.nonce,
			},
			body: JSON.stringify( {
				metadata: metadataArray,
			} ),
			credentials: 'same-origin',
		} )
			.then( response => {
				if ( ! response.ok ) {
					return response.json().then( err => {
						throw new Error( err.message || response.statusText )
					} )
				}
				return response.json()
			} )
			.then( data => {
				// eslint-disable-next-line no-console
				// console.log(
				// 	'Metadata saved successfully for filenames:',
				// 	metadataArray.map( m => m.filename ),
				// 	data
				// )
				resolve( data )
			} )
			.catch( error => {
				// eslint-disable-next-line no-console
				console.error(
					`Failed to save metadata for filenames: [${ metadataArray.map( m => m.filename ).join( ', ' ) }]:`,
					error
				)
				reject(
					new Error(
						`Failed to save metadata: ${ error.message }`
					)
				)
			} )
	} )
}

export const setCachedMetadata = ( filename, metadata ) => {
	// Initialize cache if it doesn't exist
	if ( ! window.cimoMetadataCache ) {
		window.cimoMetadataCache = {}
	}

	window.cimoMetadataCache[ filename.replaceAll( /\s+/g, '-' ) ] = { ...metadata }
}

export const getCachedMetadata = filename => {
	return window.cimoMetadataCache?.[ filename?.replaceAll( /\s+/g, '-' ) ] || // Replace spaces with dashes
		null
}
