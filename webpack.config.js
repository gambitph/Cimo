const defaultConfig = require( '@wordpress/scripts/config/webpack.config' )

module.exports = {
	...defaultConfig,
	entry: {
		'editor/index': './src/editor/index.js',
		'admin/index': './src/admin/js/index.js',
		'frontend/index': './src/frontend/index.js',
	},
}
