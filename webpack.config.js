const defaultConfig = require( '@wordpress/scripts/config/webpack.config' )
const path = require( 'path' )

module.exports = {
	...defaultConfig,
	entry: {
		// Main Cimo script.
		'admin/index': path.resolve( __dirname, './src/admin/js/index.js' ),
		'admin/index-styles': path.resolve( __dirname, './src/admin/css/index.css' ),

		// Admin settings page script.
		'admin/admin-page': path.resolve( __dirname, './src/admin/js/page/index.js' ),
		'admin/admin-page-styles': path.resolve( __dirname, './src/admin/css/admin-page.css' ),

		// TODO: Not currently used. Remove
		// 'editor/index': path.resolve( __dirname, './src/editor/index.js' ),

		// TODO: Not currently used. Remove
		// 'frontend/index': path.resolve( __dirname, './src/frontend/index.js' ),
	},
	resolve: {
		...defaultConfig.resolve,
		alias: {
			...defaultConfig.resolve?.alias,
			'~cimo': require( 'path' ).resolve( __dirname, 'src' ),
		},
	},
}
