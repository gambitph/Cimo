/**
 * Free-only upsell under Total Storage Saved: estimated extra MB Premium could save.
 */
import { __, sprintf } from '@wordpress/i18n'
import { buildPricingUrl } from '~cimo/shared/pricing-url'
import {
	estimateAdditionalSavingsBytes,
	formatSavingsBytes,
} from '~cimo/shared/estimate-additional-savings'
import { useSharedBulkProgressStats } from '~cimo/admin/js/bulk-optimizer/use-bulk-progress-stats'

const PremiumSavingsEstimate = () => {
	const { isLoading, stats } = useSharedBulkProgressStats()
	const siteStats = window.cimoAdmin?.stats || {}

	const savingsBytes = estimateAdditionalSavingsBytes( {
		percentageSaved: siteStats.percentage_saved,
		totalOriginalSizeKb: siteStats.total_original_size_kb,
		mediaOptimizedNum: siteStats.media_optimized_num,
		unoptimizedCount: stats.unoptimized,
	} )

	if ( isLoading || savingsBytes <= 0 ) {
		return null
	}

	const savingsLabel = formatSavingsBytes( savingsBytes )
	const href = buildPricingUrl( 'stats-savings' )

	return (
		<a
			className="cimo-premium-savings-estimate"
			href={ href }
			target="_blank"
			rel="noopener noreferrer"
		>
			{
				sprintf(
					/* translators: %s is a human-readable size, e.g. "12.4 MB" */
					__( 'Cimo Premium can save %s more →', 'cimo-image-optimizer' ),
					savingsLabel
				)
			}
		</a>
	)
}

export { PremiumSavingsEstimate }
