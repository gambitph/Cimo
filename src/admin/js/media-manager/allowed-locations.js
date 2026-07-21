import { applyFilters } from '@wordpress/hooks'

const normalizeLocations = locations => {
	if ( ! Array.isArray( locations ) ) {
		return []
	}

	return locations.filter( location => typeof location === 'string' && location.length > 0 )
}

/**
 * Get current select file selectors from PHP settings and internal JS filters.
 *
 * @return {Array<string>} Selectors where file input changes should be intercepted.
 */
export const getSelectFilesAllowedLocations = () => {
	const locations = normalizeLocations( window.cimoSettings?.selectFilesAllowedLocations )

	return normalizeLocations( applyFilters( 'cimo.selectFiles.allowedLocations', locations ) )
}

/**
 * Get current drop zone selectors from PHP settings and internal JS filters.
 *
 * @return {Array<string>} Selectors where file drops should be intercepted.
 */
export const getDropZoneAllowedLocations = () => {
	const locations = normalizeLocations( window.cimoSettings?.dropZoneAllowedLocations )

	return normalizeLocations( applyFilters( 'cimo.dropZone.allowedLocations', locations ) )
}

/**
 * Find the closest ancestor matching one of Cimo's allowed upload locations.
 *
 * @param {Element}       element   Element where the upload event started.
 * @param {Array<string>} locations CSS selectors to test.
 * @return {Element|null} Matching element, if one exists.
 */
export const closestAllowedLocation = ( element, locations ) => {
	for ( const location of locations ) {
		try {
			// Invalid selectors should not break uploads; ignore them and keep checking.
			const matchedElement = element.closest( location )

			if ( matchedElement ) {
				return matchedElement
			}
		} catch ( error ) {
			// eslint-disable-next-line no-console
			console.warn( `[Cimo] Ignoring invalid selector: ${ location }`, error )
		}
	}

	return null
}
