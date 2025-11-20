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
			add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_cimo_assets' ] );
			// Enqueue for Elementor.
			add_action( 'elementor/editor/before_enqueue_scripts', [ $this, 'enqueue_cimo_assets' ] );
			// Enqueue for Beaver Builder main window (outside BB's iframe).
			if ( class_exists( 'FLBuilderModel' ) ) {
				add_action( 'wp_head', [ $this, 'maybe_enqueue_for_beaver_builder' ], 999 );
			}
			// Enqueue for Bricks Builder
			add_action( 'bricks_before_site_wrapper', [ $this, 'maybe_enqueue_for_bricks_builder' ] );
			// Enqueue for Oxygen Builder
			add_action( 'oxygen_enqueue_ui_scripts', [ $this, 'enqueue_cimo_assets' ] );
			// Enqueue for Divi
			add_action( 'et_fb_enqueue_assets', [ $this, 'enqueue_cimo_assets' ] );
			// Enqueue for the admin area in general.
			add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_cimo_assets' ] );
		}

		/**
		 * Enqueue scripts in the main window when Beaver Builder is active.
		 */
		public function maybe_enqueue_for_beaver_builder() {
			// Check if we're in the Beaver Builder editor context.
			if ( class_exists( 'FLBuilderModel' ) && FLBuilderModel::is_builder_active() ) {
				$this->enqueue_cimo_assets();
			}
		}

		/**
		 * Enqueue for Bricks Builder, but only when the builder is active.
		 */
		public function maybe_enqueue_for_bricks_builder() {
			if ( function_exists( 'bricks_is_builder' ) && bricks_is_builder() ) {
				$this->enqueue_cimo_assets();
			}
		}

		public function enqueue_cimo_assets() {
			// If cimo-script is already enqueued, don't enqueue again.
			if ( wp_script_is( 'cimo-script', 'enqueued' ) ) {
				return;
			}

			// This should return the dependencies for both css and js, these will be merged with the default dependencies.
			$dependencies = apply_filters( 'cimo/script_loader/enqueue_cimo_assets', ['css' => [], 'js' => []] );

			$build_dir = plugin_dir_path( CIMO_FILE ) . 'build/admin/';
			$build_url = plugin_dir_url( CIMO_FILE ) . 'build/admin/';

			// Enqueue the main admin JavaScript file
			$script_asset = include $build_dir . 'index.asset.php';
			wp_enqueue_script(
				'cimo-script',
				$build_url . 'index.js',
				array_merge(
					// Remove wp-dom-ready since it's not really a dependency, but wp-scripts includes it.
					array_values( array_diff( $script_asset['dependencies'], [ 'wp-dom-ready' ] ) ),
					$dependencies['js']
				),
				$script_asset['version'],
				true
			);

			// Get current settings
			$settings = get_option( 'cimo_options', [] );

			// Localize script with REST API URL, nonce, and settings
			wp_localize_script(
				'cimo-script',
				'cimoSettings',
				[
					'restUrl' => rest_url( 'cimo/v1/' ),
					'nonce'   => wp_create_nonce( 'wp_rest' ),
					'webpQuality' => ! empty( $settings['webp_quality'] ) ? (int) $settings['webp_quality'] : 80,
					'maxImageDimension' => ! empty( $settings['max_image_dimension'] ) ? (int) $settings['max_image_dimension'] : 0,
					'videoOptimizationEnabled' => isset( $settings['video_optimization_enabled'] ) ? (int) $settings['video_optimization_enabled'] : 1,
					'videoQuality' => ! empty( $settings['video_quality'] ) ? (int) $settings['video_quality'] : 3,
					'videoMaxResolution' => ! empty( $settings['video_max_resolution'] ) ? $settings['video_max_resolution'] : '',
					'audioOptimizationEnabled' => isset( $settings['audio_optimization_enabled'] ) ? (int) $settings['audio_optimization_enabled'] : 1,
					'audioQuality' => ! empty( $settings['audio_quality'] ) ? (int) $settings['audio_quality'] : 128,
				]
			);

			// Enqueue the main admin CSS file
			$style_asset = include $build_dir . 'index-styles.asset.php';
			wp_enqueue_style(
				'cimo-script-styles',
				$build_url . 'index-styles.css',
				array_merge( $style_asset['dependencies'], $dependencies['css'] ),
				$style_asset['version']
			);
		}
	}

	new Cimo_Script_Loader();
}
