/**
 * Free Bulk Optimization upsell — shows real progress stats, non-working controls.
 */
import { useEffect, useState } from '@wordpress/element'
import { __ } from '@wordpress/i18n'
import { Button } from '@wordpress/components'
import apiFetch from '@wordpress/api-fetch'
import { countBulkProgressStats } from '~cimo/shared/bulk-stats'
import { buildPricingUrl } from '~cimo/shared/pricing-url'
import { BulkOptimizerStats } from './bulk-optimizer-stats'

const BulkOptimizationUpsell = () => {
	const [ isLoading, setIsLoading ] = useState( true )
	const [ stats, setStats ] = useState( {
		optimized: 0, unoptimized: 0, skipped: 0,
	} )
	const pricingHref = buildPricingUrl( 'bulk' )

	useEffect( () => {
		apiFetch( { path: '/cimo/v1/attachments' } )
			.then( data => {
				setStats( countBulkProgressStats( data ) )
			} )
			.catch( () => {
				setStats( {
					optimized: 0, unoptimized: 0, skipped: 0,
				} )
			} )
			.finally( () => setIsLoading( false ) )
	}, [] )

	return (
		<div className="cimo-bulk-optimizer-progress-bar-container cimo-bulk-optimizer-upsell">
			<BulkOptimizerStats
				isLoading={ isLoading }
				optimized={ stats.optimized }
				unoptimized={ stats.unoptimized }
				skipped={ stats.skipped }
			/>
			<div className="cimo-bulk-optimizer-button-container">
				<Button
					variant="primary"
					className="cimo-button cimo-bulk-optimize-button"
					href={ pricingHref }
					target="_blank"
					rel="noopener noreferrer"
					__next40pxDefaultSize
					icon={
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play-icon lucide-play"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" /></svg>
					}
				>
					{ __( 'Bulk Optimize with Premium', 'cimo-image-optimizer' ) }
				</Button>
				<Button
					variant="secondary"
					className="cimo-button cimo-bulk-optimize-button-view-images"
					__next40pxDefaultSize
					disabled
					icon={
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-icon lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
					}
				>
					{ __( 'View Files', 'cimo-image-optimizer' ) }
				</Button>
			</div>
		</div>
	)
}

export { BulkOptimizationUpsell }
