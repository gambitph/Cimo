<?php
/**
 * Admin page settings
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'Cimo_Admin' ) ) {
	class Cimo_Admin {
		public function __construct() {
			// Our settings.
			add_action( 'admin_init', [ $this, 'register_settings' ] );
			add_action( 'rest_api_init', [ $this, 'register_settings' ] );

			if ( is_admin() ) {
				// Our admin page.
				add_action( 'admin_menu', [ $this, 'add_admin_menu' ] );
				add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_scripts' ] );
			}

			// Disable thumbnail generation
			add_filter( 'intermediate_image_sizes', [ $this, 'disable_thumbnail_generation' ] );

			// Handle WordPress automatic image scaling
			add_filter( 'big_image_size_threshold', [ $this, 'maybe_disable_wp_scaling' ] );
		}

		/**
		 * Add admin menu under Settings
		 */
		public function add_admin_menu() {
			add_options_page(
				__( 'Cimo Settings', 'cimo-image-optimizer' ),
				__( 'Cimo', 'cimo-image-optimizer' ),
				'manage_options',
				'cimo-settings',
				[ $this, 'admin_page_callback' ]
			);
		}

		/**
		 * Register settings for REST API access
		 */
		public function register_settings() {
			register_setting(
				'cimo_options',
				'cimo_options',
				[
					'type'              => 'object',
					'description'       => __( 'Cimo Image Optimizer Settings', 'cimo-image-optimizer' ),
					'sanitize_callback' => [ $this, 'sanitize_options' ],
					'show_in_rest'      => [
						'schema' => [
							'type' => 'object',
							'properties' => [
								'webp_quality' => [
									'type' => 'integer',
								],
								'max_image_dimension' => [
									'type' => 'integer',
								],
								'disable_wp_scaling' => [
									'type' => 'integer',
								],
								'disable_thumbnail_generation' => [
									'type' => 'integer',
								],
								'thumbnail_sizes' => [
									'type'  => 'array',
									'items' => [
										'type' => 'string',
									],
								],

								// LQIP settings
								'lqip_enabled' => [
									'type' => 'integer',
								],
								'lqip_pulse_speed' => [
									'type' => 'number',
									'format' => 'float',
								],
								'lqip_brightness' => [
									'type' => 'number',
									'format' => 'float',
								],
								'lqip_fade_duration' => [
									'type' => 'number',
									'format' => 'float',
								],

								// Video Optimization settings
								'video_optimization_enabled' => [
									'type' => 'integer',
								],
								'video_quality' => [
									'type' => 'integer',
								],
								'video_max_resolution' => [
									'type' => 'string',
								],

								// Audio Optimization settings
								'audio_optimization_enabled' => [
									'type' => 'integer',
								],
								'audio_quality' => [
									'type' => 'integer',
								],
							],
						],
					],
				]
			);

			register_setting(
				'cimo_rating',
				'cimo_rating_dismissed',
				[
					'type'              => 'string',
					'description'       => __( 'Tracks if the rating notice has been dismissed.', 'cimo-image-optimizer' ),
					'sanitize_callback' => [ $this, 'sanitize_rating_dismissed' ],
					'show_in_rest'      => [
						'schema' => [
							'type' => 'string',
							'enum' => [ '0', '1' ],
						],
					],
					'default'           => '0',
				]
			);
		}

		/**
		 * Enqueue admin scripts for the settings page
		 */
		public function enqueue_admin_scripts( $hook ) {
			// Only load on our admin page
			if ( 'settings_page_cimo-settings' !== $hook ) {
				return;
			}
			
			// Enqueue WordPress component styles
			wp_enqueue_style( 'wp-components' );

			// This should return the dependencies for both css and js, these will be merged with the default dependencies.
			$dependencies = apply_filters( 'cimo/admin/enqueue_admin_scripts', ['css' => [], 'js' => []] );

			// Get the build files
			$build_dir = plugin_dir_path( CIMO_FILE ) . 'build/admin/';
			$build_url = plugin_dir_url( CIMO_FILE ) . 'build/admin/';
			
			// Enqueue CSS
			$script_asset = include $build_dir . 'admin-page-styles.asset.php';
			wp_enqueue_style(
				'cimo-admin-page-styles',
				$build_url . 'admin-page-styles.css',
				array_merge( [ 'wp-components' ], $dependencies['css'] ),
				$script_asset['version']
			);
			
			// Enqueue JavaScript
			$script_asset = include $build_dir . 'admin-page.asset.php';
			wp_enqueue_script(
				'cimo-admin-page',
				$build_url . 'admin-page.js',
				array_merge( $script_asset['dependencies'], $dependencies['js'] ),
				$script_asset['version'],
				true
			);

			// Get statistics data
			$stats = Cimo_Stats::get_formatted_stats();

			// Get image sizes
			$image_sizes = $this->get_all_image_sizes();
			$formatted_sizes = [];
			foreach ( $image_sizes as $name => $data ) {
				$formatted_sizes[] = [
					'name' => $name,
					'width' => $data['width'],
					'height' => $data['height'],
				];
			}

			// Localize script with admin data
			wp_localize_script( 'cimo-admin-page', 'cimoAdmin', [
				'stats' => $stats,
				'imageSizes' => $formatted_sizes,
				'ratingDismissed' => '1' === get_option( 'cimo_rating_dismissed', '0' ) ? '1' : '0',
			] );
		}

		/**
		 * Admin page callback
		 */
		public function admin_page_callback() {
			// Check user capabilities
			if ( ! current_user_can( 'manage_options' ) ) {
				wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'cimo-image-optimizer' ) );
			}

			?>
			<div id="cimo-admin-settings"></div>
			<?php
		}



		/**
		 * Sanitize options
		 */
		public function sanitize_options( $options ) {
			// Load up the complete options so we don't lose any existing settings.
			$current = get_option( 'cimo_options', [] );
			$sanitized = is_array( $current ) ? $current : [];

			// Sanitize webp quality
			if ( isset( $options['webp_quality'] ) ) {
				$quality = absint( $options['webp_quality'] );
				// 0 means disabled/not set
				$sanitized['webp_quality'] = $quality > 0 ? max( 1, min( 100, $quality ) ) : 0;
			}

			// Sanitize max image dimension
			if ( isset( $options['max_image_dimension'] ) ) {
				$dimension = absint( $options['max_image_dimension'] );
				// 0 means disabled/not set
				$sanitized['max_image_dimension'] = $dimension;
			}

			// Sanitize disable_wp_scaling
			if ( isset( $options['disable_wp_scaling'] ) ) {
				$sanitized['disable_wp_scaling'] = $options['disable_wp_scaling'] ? 1 : 0;
			}

			// Sanitize disable_thumbnail_generation
			if ( isset( $options['disable_thumbnail_generation'] ) ) {
				$sanitized['disable_thumbnail_generation'] = $options['disable_thumbnail_generation'] ? 1 : 0;
			}

			// Sanitize thumbnail sizes
			if ( isset( $options['thumbnail_sizes'] ) && is_array( $options['thumbnail_sizes'] ) ) {
				$sanitized['thumbnail_sizes'] = array_map( 'sanitize_text_field', $options['thumbnail_sizes'] );
			}

			// Sanitize lqip_enabled
			if ( isset( $options['lqip_enabled'] ) ) {
				$sanitized['lqip_enabled'] = $options['lqip_enabled'] ? 1 : 0;
			}
			if ( isset( $options['lqip_pulse_speed'] ) ) {
				$sanitized['lqip_pulse_speed'] = floatval( $options['lqip_pulse_speed'] );
			}
			if ( isset( $options['lqip_brightness'] ) ) {
				$sanitized['lqip_brightness'] = floatval( $options['lqip_brightness'] );
			}
			if ( isset( $options['lqip_fade_duration'] ) ) {
				$sanitized['lqip_fade_duration'] = floatval( $options['lqip_fade_duration'] );
			}

			// Sanitize video quality
			if ( isset( $options['video_optimization_enabled'] ) ) {
				$sanitized['video_optimization_enabled'] = $options['video_optimization_enabled'] ? 1 : 0;
			}
			if ( isset( $options['video_quality'] ) ) {
				$sanitized['video_quality'] = intval( $options['video_quality'] );
			}
			if ( isset( $options['video_max_resolution'] ) ) {
				$sanitized['video_max_resolution'] = sanitize_text_field( $options['video_max_resolution'] );
			}

			// Sanitize audio quality
			if ( isset( $options['audio_optimization_enabled'] ) ) {
				$sanitized['audio_optimization_enabled'] = $options['audio_optimization_enabled'] ? 1 : 0;
			}
			if ( isset( $options['audio_quality'] ) ) {
				$sanitized['audio_quality'] = intval( $options['audio_quality'] );
			}

			return $sanitized;
		}

		/**
		 * Sanitize rating dismissed flag
		 */
		public function sanitize_rating_dismissed( $value ) {
			return '1' === (string) $value ? '1' : '0';
		}

		/**
		 * Get all registered image sizes
		 */
		private function get_all_image_sizes() {
			// Use WordPress core function to get all registered image subsizes
			$registered_sizes = wp_get_registered_image_subsizes();
			
			$sizes = [];

			foreach ( $registered_sizes as $size_name => $size_data ) {
				$sizes[ $size_name ] = [
					'width'  => $size_data['width'],
					'height' => $size_data['height'],
				];
			}

			return $sizes;
		}

		/**
		 * Disable WordPress automatic image scaling if setting is disabled
		 */
		public function maybe_disable_wp_scaling( $threshold ) {
			$settings = get_option( 'cimo_options', [] );

			// If disable_wp_scaling is NOT enabled (0 or not set), disable the threshold
			if ( isset( $settings['disable_wp_scaling'] ) && $settings['disable_wp_scaling'] === 0 ) {
				return false;
			}

			// Otherwise, keep default WordPress behavior.
			return $threshold;
		}

		/**
		 * Disable thumbnail generation
		 */
		public function disable_thumbnail_generation( $sizes ) {
			// If disable_thumbnail_generation if set, then disable all thumbnails.
			$settings = get_option( 'cimo_options', [] );
			if ( ! empty( $settings['disable_thumbnail_generation'] ) && $settings['disable_thumbnail_generation'] === 1 ) {
				return [];
			}

			// Else, disable individual sizes.
			if ( ! empty( $settings['thumbnail_sizes'] ) && is_array( $settings['thumbnail_sizes'] ) ) {
				// Filter out all sizes that are present in $settings['thumbnail_sizes']
				$sizes = array_values( array_diff( $sizes, $settings['thumbnail_sizes'] ) );
			}

			return $sizes;
		}
	}

	new Cimo_Admin();
}
