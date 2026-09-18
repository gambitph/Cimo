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
		fallback: {
			...defaultConfig.resolve?.fallback,
			fs: false,
			path: false,
		},
		alias: {
			...defaultConfig.resolve?.alias,
			'~cimo': require( 'path' ).resolve( __dirname, 'src' ),
		},
	},
	module: {
		...defaultConfig.module,
		rules: [
			...defaultConfig.module.rules,
			{
				test: /webp-wasm\.wasm$/,
				type: 'asset/resource',
				generator: {
					filename: 'chunks/[name]-[contenthash:8][ext]',
				},
			},
			{
				test: /node_modules[/\\]wasm-webp[/\\]dist[/\\]cjs[/\\].*\.js$/,
				type: 'javascript/auto',
			},
		],
	},
	output: {
		...defaultConfig.output,
		chunkFilename: 'chunks/[name]-[chunkhash:8].js',
	},
}
