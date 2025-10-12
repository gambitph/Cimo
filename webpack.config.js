const defaultConfig = require( '@wordpress/scripts/config/webpack.config' )

module.exports = {
	...defaultConfig,
	entry: {
		'editor/index': './src/editor/index.js',
		'admin/index': './src/admin/js/index.js',
		'admin/admin-page': './src/admin/js/admin-page.js',
		'admin/admin': './src/admin/css/admin.css',
		'admin/admin-settings': './src/admin/css/admin-settings.css',
		'frontend/index': './src/frontend/index.js',
	},
	resolve: {
		...defaultConfig.resolve,
		alias: {
			...defaultConfig.resolve?.alias,
			'~cimo': require( 'path' ).resolve( __dirname, 'src' ),
		},
	},
}
