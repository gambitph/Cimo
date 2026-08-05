import { request as playwrightRequest } from '@playwright/test'
import { RequestUtils as BaseRequestUtils } from '@wordpress/e2e-test-utils-playwright'

class ExtendedRequestUtils extends BaseRequestUtils {
	static async setup( options: {
		baseURL?: string;
		user?: { username: string; password: string };
		storageStatePath?: string;
	} = {} ) {
		const {
			baseURL = process.env.WP_BASE_URL,
			user,
			storageStatePath,
		} = options

		let storageState
		if ( storageStatePath ) {
			const fs = await import( 'fs/promises' )
			const path = await import( 'path' )
			await fs.mkdir( path.dirname( storageStatePath ), { recursive: true } )
			try {
				storageState = JSON.parse( await fs.readFile( storageStatePath, 'utf-8' ) )
			} catch ( error ) {
				if ( ! ( error instanceof Error && 'code' in error && error.code === 'ENOENT' ) ) {
					throw error
				}
			}
		}

		const requestContext = await playwrightRequest.newContext( {
			baseURL,
			ignoreHTTPSErrors: true,
			storageState: storageState && {
				cookies: storageState.cookies,
				origins: [],
			},
		} )

		return new this( requestContext, {
			user,
			storageState,
			storageStatePath,
			baseURL,
		} )
	}

	getActivePlugins = async function() {
		const plugins: { [key: string]: any }[] = await this.rest( {
			path: '/wp/v2/plugins',
		} )
		// eslint-disable-next-line no-console
		console.info( 'plugins installed:', plugins.map( plugin => plugin.plugin ), '\n' )
		const activePlugins = plugins.filter( plugin => plugin.status === 'active' ).reduce( ( pluginsMap, plugin ) => {
			pluginsMap[ plugin.plugin ] = plugin.plugin
			return pluginsMap
		}, {} )

		return activePlugins
	}

	deactivatePlugin = async function( slug: string ) {
		try {
			await this.rest( {
				method: 'PUT',
				path: `/wp/v2/plugins/${ slug }`,
				data: { status: 'inactive' },
			} )
		} catch ( error ) {
			throw new Error( `Cannot deactivate ${ slug }: ${ error.message }` )
		}
	}

	activatePlugin = async function( slug: string ) {
		try {
			await this.rest( {
				method: 'PUT',
				path: `/wp/v2/plugins/${ slug }`,
				data: { status: 'active' },
			} )
		} catch ( error ) {
			throw new Error( `Cannot activate ${ slug }: ${ error.message }` )
		}
	}

	deletePost = async function( pid: string, postType: string = 'posts' ) {
		await this.rest( {
			method: 'DELETE',
			path: `/wp/v2/${ postType }/${ pid }`,
			params: {
				force: true,
			},
		} )
	}

	/**
	 * Highest media attachment ID currently in the library (0 if empty).
	 */
	getMaxMediaId = async function(): Promise<number> {
		const media = await this.listMedia()
		if ( ! media.length ) {
			return 0
		}
		return Math.max( ...media.map( ( item: { id: number } ) => item.id ) )
	}

	/**
	 * Newest media items created after `afterId`.
	 */
	getMediaCreatedAfter = async function( afterId: number ) {
		const media = await this.listMedia()
		return media
			.filter( ( item: { id: number } ) => item.id > afterId )
			.sort( ( a: { id: number }, b: { id: number } ) => b.id - a.id )
	}
}

export { ExtendedRequestUtils }
