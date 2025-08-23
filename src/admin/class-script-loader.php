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

			$asset_base = plugin_dir_url( CIMO_FILE ) . 'build/';
			$asset_path = plugin_dir_path( CIMO_FILE ) . 'build/admin/index.js';
			wp_enqueue_script(
				'cimo-editor',
				$asset_base . 'admin/index.js',
				[],
				filemtime( $asset_path ),
				true
			);
		}
	}

	new Cimo_Script_Loader();
}
