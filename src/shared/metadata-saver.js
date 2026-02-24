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
	const isFrontend = window.cimoSettings && window.cimoSettings.isFrontend

	if ( isFrontend ) {
		return Promise.resolve()
	}

	if ( ! Array.isArray( _metadataArray ) ) {
		return Promise.resolve()
	}

	// Filter out all the null values. If we have a null value that means it didn't have any metadata to save.
	const metadataArray = _metadataArray.filter( entry => entry !== null )

	if ( metadataArray.length === 0 ) {
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
						const newError = new Error( err.message || response.statusText )
						newError.status = response.status
						newError.code = err.code

						throw newError
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
				const isUnauthorized = error.status === 401 ||
					error.status === 403 ||
					error.code === 'rest_cannot_create' ||
					error.code === 'rest_forbidden'

				if ( isUnauthorized ) {
					// eslint-disable-next-line no-console
					console.warn(
						`Skipping metadata save — user not authorized.`
					)
					resolve()
					return
				}

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
