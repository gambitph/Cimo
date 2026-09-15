/**
 * Presentational bulk progress stats ("X of Y optimized" + progress bar).
 * Shared by Premium Bulk Optimizer and free Bulk upsell.
 */
import { __, sprintf } from '@wordpress/i18n'
import { ProgressBar } from '@wordpress/components'

/**
 * @param {Object}   props
 * @param {boolean}  props.isLoading
 * @param {number}   props.optimized
 * @param {number}   props.unoptimized
 * @param {number}   [props.skipped=0]
 * @param {Function} [props.onSkippedClick]
 */
const BulkOptimizerStats = ( {
	isLoading,
	optimized = 0,
	unoptimized = 0,
	skipped = 0,
	onSkippedClick,
} ) => {
	const total = optimized + unoptimized
	// Don't display to 100% unless all images are optimized.
	const percent = total > 0 ? Math.floor( optimized / total * 1000 ) / 10 : 0

	return (
		<>
			<div className="cimo-bulk-optimizer-progress-bar-text">
				<span>
					{ sprintf(
						__( '%s of %s optimized', 'cimo-image-optimizer' ),
						isLoading ? '-' : optimized.toLocaleString(),
						isLoading ? '-' : total.toLocaleString()
					) }
				</span>
				<span>
					{ sprintf(
						__( '%s%%', 'cimo-image-optimizer' ),
						isLoading ? '-' : (
							percent % 1 === 0
								? percent.toLocaleString()
								: Number( percent.toFixed( 1 ) ).toLocaleString()
						)
					) }
				</span>
			</div>
			<ProgressBar
				className={ 'cimo-bulk-optimizer-progress-bar ' + ( isLoading ? 'is-loading' : '' ) }
				value={ isLoading ? 0 : percent }
			/>
			{ !! skipped && (
				<div
					role="button"
					tabIndex={ 0 }
					className="cimo-bulk-optimizer-skipped-label"
					onClick={ onSkippedClick }
					onKeyDown={ e => {
						if ( e.key === 'Enter' || e.key === ' ' ) {
							e.preventDefault()
							onSkippedClick?.()
						}
					} }
					title={ __( 'View skipped files', 'cimo-image-optimizer' ) }
				>
					<span className="cimo-bulk-optimizer-skipped-icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-skip-forward-icon lucide-skip-forward"><path d="M21 4v16" /><path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z" /></svg>
					</span>
					{ sprintf( __( '%d skipped', 'cimo-image-optimizer' ), skipped ) }
				</div>
			) }
		</>
	)
}

export { BulkOptimizerStats }
