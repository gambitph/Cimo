const defaultConfig = require( '@wordpress/scripts/config/webpack.config' )
const path = require( 'path' )

module.exports = {
	...defaultConfig,
	entry: {
		'editor/index': path.resolve( __dirname, './src/editor/index.js' ),
		'admin/index': path.resolve( __dirname, './src/admin/js/index.js' ),
		'admin/admin-page': path.resolve( __dirname, './src/admin/js/admin-page.js' ),
		'admin/admin': path.resolve( __dirname, './src/admin/css/admin.css' ),
		'admin/admin-settings': path.resolve( __dirname, './src/admin/css/admin-settings.css' ),
		'frontend/index': path.resolve( __dirname, './src/frontend/index.js' ),
	},
	resolve: {
		...defaultConfig.resolve,
		alias: {
			...defaultConfig.resolve?.alias,
			'~cimo': require( 'path' ).resolve( __dirname, 'src' ),
		},
	},
}
