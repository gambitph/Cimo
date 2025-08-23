/**
 * This script is in charge of keeping track of the metadata for the image
 * conversion, then whenever a new metadata comes in along with the filename,
 * after a short delay, we need to trigger a POST in order to save to the server
 * the metadata of the image conversion.
 */

/**
 * Saves metadata to the server via REST API with retry logic
 * @param {string} filename   - The filename of the attachment
 * @param {Object} metadata   - The metadata object to save
 * @param {number} delay      - Delay in milliseconds before first attempt (default: 1000)
 * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
 * @param {number} retryDelay - Delay between retries in milliseconds (default: 2000)
 */
export const saveMetadata = ( filename, metadata, delay = 1000, maxRetries = 20, retryDelay = 2000 ) => {
	// Track if we've already succeeded for this filename/metadata combination
	if ( getCachedMetadata( filename ) ) {
		// eslint-disable-next-line no-console
		console.log( 'Metadata already saved successfully for:', filename )
		return Promise.resolve()
	}

	// Mark as successful in cache, keep a local copy of the metadata
	setCachedMetadata( filename, metadata )

	return new Promise( ( resolve, reject ) => {
		setTimeout( () => {
			let attempts = 0

			const attemptSave = () => {
				attempts++
				// eslint-disable-next-line no-console
				console.log( `Attempting to save metadata for ${ filename } (attempt ${ attempts }/${ maxRetries })` )

				// Use normal fetch here because apiFetch is not available sometimes, like in Elementor.
				fetch( '/wp-json/cimo/v1/metadata', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						// If you need nonce for authentication, add it here:
						'X-WP-Nonce': window.wpApiSettings?.nonce,
					},
					body: JSON.stringify( {
						filename,
						metadata,
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
						console.log( 'Metadata saved successfully for:', filename, data )
						resolve( data )
					} )
					.catch( error => {
						// eslint-disable-next-line no-console
						console.error( `Failed to save metadata for ${ filename } (attempt ${ attempts }):`, error )

						if ( attempts < maxRetries ) {
							// eslint-disable-next-line no-console
							console.log( `Retrying in ${ retryDelay }ms...` )
							setTimeout( attemptSave, retryDelay )
						} else {
							// eslint-disable-next-line no-console
							console.error( `Failed to save metadata for ${ filename } after ${ maxRetries } attempts` )
							reject( new Error( `Failed to save metadata after ${ maxRetries } attempts: ${ error.message }` ) )
						}
					} )
			}

			attemptSave()
		}, delay )
	} )
}

export const setCachedMetadata = ( filename, metadata ) => {
	// Initialize cache if it doesn't exist
	if ( ! window.cimoMetadataCache ) {
		window.cimoMetadataCache = {}
	}

	window.cimoMetadataCache[ filename.replace( / /g, '-' ) ] = { ...metadata }
}

export const getCachedMetadata = filename => {
	return window.cimoMetadataCache?.[ filename.replace( / /g, '-' ) ] || // Replace spaces with dashes
		null
}
