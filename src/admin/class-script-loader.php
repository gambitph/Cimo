<?php
/**
 * Enqueue scripts for the admin area.
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'Cimo_Script_Loader' ) ) {
	class Cimo_Script_Loader {
		public function __construct() {
			// Enqueue for the block editor.
			add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_media_assets' ] );
			// Enqueue for Elementor.
			add_action( 'elementor/editor/before_enqueue_scripts', [ $this, 'enqueue_media_assets' ] );
			// Enqueue for the admin area in general.
			add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_media_assets' ] );
		}

		public function enqueue_media_assets() {
			// If cimo-editor is already enqueued, don't enqueue again.
			if ( wp_script_is( 'cimo-editor', 'enqueued' ) ) {
				return;
			}

			$build_dir = plugin_dir_path( CIMO_FILE ) . 'build/admin/';
			$build_url = plugin_dir_url( CIMO_FILE ) . 'build/admin/';

			// Enqueue the main admin JavaScript file
			$script_asset = include $build_dir . 'index.asset.php';
			wp_enqueue_script(
				'cimo-editor',
				$build_url . 'index.js',
				$script_asset['dependencies'],
				$script_asset['version'],
				true
			);

			// Enqueue the admin CSS file
			$style_asset = include $build_dir . 'admin.asset.php';
			wp_enqueue_style(
				'cimo-admin',
				$build_url . 'admin.css',
				$style_asset['dependencies'],
				$style_asset['version']
			);
		}
	}

	new Cimo_Script_Loader();
}
