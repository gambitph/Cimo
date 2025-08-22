<?php
/**
 * Plugin Name: Cimo
 * Plugin URI: https://example.com/
 * Description: Convert images to WebP on upload (scaffold only).
 * Version: 0.1.0
 * Author: Your Name
 * Author URI: https://example.com/
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Text Domain: cimo
 */

if ( ! defined( 'ABSPATH' ) ) {
\texit;
}

// Scaffold only. No runtime code yet.

add_action( 'enqueue_block_editor_assets', function () {
	$asset_base = plugin_dir_url( __FILE__ ) . 'build/';
	$asset_path = plugin_dir_path( __FILE__ ) . 'build/editor/index.js';
	if ( file_exists( $asset_path ) ) {
		wp_enqueue_script(
			'cimo-editor',
			$asset_base . 'editor/index.js',
			[ 'wp-element', 'wp-hooks', 'wp-dom-ready', 'wp-media-utils' ],
			filemtime( $asset_path ),
			true
		);
	}
} );

// Load editor script for Elementor
add_action( 'elementor/editor/before_enqueue_scripts', function () {
	$asset_base = plugin_dir_url( __FILE__ ) . 'build/';
	$asset_path = plugin_dir_path( __FILE__ ) . 'build/editor/index.js';
	if ( file_exists( $asset_path ) ) {
		wp_enqueue_script(
			'cimo-elementor-editor',
			$asset_base . 'editor/index.js',
			[ 'elementor-editor' ],
			filemtime( $asset_path ),
			true
		);
	}
} );