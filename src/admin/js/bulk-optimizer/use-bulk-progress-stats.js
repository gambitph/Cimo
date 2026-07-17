/**
 * Fetch /cimo/v1/attachments and count bulk progress stats (free + shared).
 */
import {
	createContext, useContext, useEffect, useMemo, useState,
} from '@wordpress/element'
import apiFetch from '@wordpress/api-fetch'
import { countBulkProgressStats } from '~cimo/shared/bulk-stats'

const emptyStats = {
	optimized: 0, unoptimized: 0, skipped: 0, total: 0,
}

const BulkProgressStatsContext = createContext( null )

/**
 * @param {boolean} enabled When false, skips the network request.
 * @return {{ isLoading: boolean, stats: typeof emptyStats }}
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

		apiFetch( { path: '/cimo/v1/attachments' } )
			.then( data => {
				if ( ! cancelled ) {
					setStats( countBulkProgressStats( data ) )
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
 * Provides one shared attachments fetch for free admin upsells.
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
 * @return {{ isLoading: boolean, stats: typeof emptyStats }}
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
