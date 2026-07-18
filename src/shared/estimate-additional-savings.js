/**
 * Estimate how much more storage Premium bulk optimization could save.
 *
 * Formula:
 *   avgOriginal = totalOriginalSize / mediaOptimizedCount
 *   unoptimizedOriginal = avgOriginal * unoptimizedCount
 *   savings = unoptimizedOriginal * (percentageSaved / 100) * SIZE_VARIANTS_FACTOR
 *
 * SIZE_VARIANTS_FACTOR (1.3): bulk also optimizes intermediate sizes
 * (thumbnail, medium, large, etc.), which typically add ~30% disk on top
 * of the full-size original. Applied as a simple uplift rather than
 * weighting each size by real filesize.
 */

/** Intermediate sizes typically add ~30% disk vs full size alone. */
const SIZE_VARIANTS_FACTOR = 1.3

/**
 * @param {Object} params
 * @param {number} params.percentageSaved     e.g. 42.5 for 42.5% reduction
 * @param {number} params.totalOriginalSizeKb Original size of optimized media (KB)
 * @param {number} params.mediaOptimizedNum   Count of optimized media units
 * @param {number} params.unoptimizedCount    Unoptimized units from bulk progress
 * @return {number} Estimated additional savings in bytes
 */
export function estimateAdditionalSavingsBytes( {
	percentageSaved,
	totalOriginalSizeKb,
	mediaOptimizedNum,
	unoptimizedCount,
} ) {
	const optimized = Number( mediaOptimizedNum ) || 0
	const unoptimized = Number( unoptimizedCount ) || 0
	const originalKb = Number( totalOriginalSizeKb ) || 0
	const reduction = Number( percentageSaved ) || 0

	if ( optimized <= 0 || unoptimized <= 0 || originalKb <= 0 || reduction <= 0 ) {
		return 0
	}

	const avgOriginalKb = originalKb / optimized
	const unoptimizedOriginalKb = avgOriginalKb * unoptimized
	const savingsKb = unoptimizedOriginalKb * ( reduction / 100 ) * SIZE_VARIANTS_FACTOR

	return Math.max( 0, Math.round( savingsKb * 1024 ) )
}

/**
 * Format bytes for the savings upsell (matches PHP Cimo_Stats::format_bytes).
 *
 * @param {number} bytes
 * @param {number} [decimals=1]
 * @return {string} Formatted bytes string
 */
export function formatSavingsBytes( bytes, decimals = 1 ) {
	const n = Number( bytes )
	if ( ! Number.isFinite( n ) || n <= 0 ) {
		return '0 Bytes'
	}

	const k = 1024
	const sizes = [ 'Bytes', 'KB', 'MB', 'GB', 'TB' ]
	const i = Math.min( sizes.length - 1, Math.floor( Math.log( n ) / Math.log( k ) ) )
	const value = n / Math.pow( k, i )
	const rounded = Number( value.toFixed( decimals ) )

	return `${ rounded } ${ sizes[ i ] }`
}
