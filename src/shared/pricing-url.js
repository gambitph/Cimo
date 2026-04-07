const PRICING_BASE = 'https://wpcimo.com/pricing'

/**
 * Build pricing URL with UTM query parameters.
 *
 * @param {string} [utmContent] Feature surface id, e.g. `bulk`, `sidebar`.
 * @param {string} [utmMedium]  Defaults to `admin`; use `plugins-screen` for Plugins list.
 * @return {string} Full pricing URL including query string.
 */
export function buildPricingUrl( utmContent = '', utmMedium = 'admin' ) {
	const params = new URLSearchParams()
	params.set( 'utm_source', 'plugin' )
	params.set( 'utm_medium', utmMedium )
	params.set( 'utm_campaign', 'upgrade' )
	if ( utmContent ) {
		params.set( 'utm_content', utmContent )
	}
	return `${ PRICING_BASE }?${ params.toString() }`
}
