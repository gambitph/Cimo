/**
 * Fetch /cimo/v1/bulk-progress for free admin upsell stats.
 */
import {
	createContext, useContext, useEffect, useMemo, useState,
} from '@wordpress/element'
import apiFetch from '@wordpress/api-fetch'

const emptyStats = {
	optimized: 0, unoptimized: 0, skipped: 0, total: 0,
}

const BulkProgressStatsContext = createContext( null )

/**
 * Normalize a bulk-progress REST payload into stats, or emptyStats on bad data.
 *
 * @param {*} data
 * @return {typeof emptyStats} Stats object.
 */
function normalizeBulkProgressStats( data ) {
	if ( ! data || typeof data !== 'object' ) {
		return emptyStats
	}
	return {
		optimized: Number( data.optimized ) || 0,
		unoptimized: Number( data.unoptimized ) || 0,
		skipped: Number( data.skipped ) || 0,
		total: Number( data.total ) || 0,
	}
}

/**
 * @param {boolean} enabled When false, skips the network request.
 * @return {{ isLoading: boolean, stats: typeof emptyStats }} Loading flag and bulk progress stats.
 */
export function useBulkProgressStats( enabled = true ) {
	const [ isLoading, setIsLoading ] = useState( !! enabled )
	const [ stats, setStats ] = useState( emptyStats )

	useEffect( () => {
		if ( ! enabled ) {
			setIsLoading( false )
			setStats( emptyStats )
			return undefined
		}

		let cancelled = false
		setIsLoading( true )

		apiFetch( { path: '/cimo/v1/bulk-progress' } )
			.then( data => {
				if ( ! cancelled ) {
					setStats( normalizeBulkProgressStats( data ) )
				}
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setStats( emptyStats )
				}
			} )
			.finally( () => {
				if ( ! cancelled ) {
					setIsLoading( false )
				}
			} )

		return () => {
			cancelled = true
		}
	}, [ enabled ] )

	return useMemo( () => ( {
		isLoading, stats,
	} ), [ isLoading, stats ] )
}

/**
 * Provides one shared bulk-progress fetch for free admin upsells.
 *
 * @param {Object}  props
 * @param {boolean} [props.enabled=true]
 * @param {*}       props.children
 */
export function BulkProgressStatsProvider( {
	enabled = true, children,
} ) {
	const value = useBulkProgressStats( enabled )
	return (
		<BulkProgressStatsContext.Provider value={ value }>
			{ children }
		</BulkProgressStatsContext.Provider>
	)
}

/**
 * @return {{ isLoading: boolean, stats: typeof emptyStats }} Shared context stats, or empty defaults outside the provider.
 */
export function useSharedBulkProgressStats() {
	const ctx = useContext( BulkProgressStatsContext )
	if ( ctx ) {
		return ctx
	}
	return {
		isLoading: false, stats: emptyStats,
	}
}
