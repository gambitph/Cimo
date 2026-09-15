<?php
/**
 * Plugin Name: Cimo E2E Developer API
 * Description: Registers public integrator selectors and enqueues Cimo on marked e2e pages.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter(
	'cimo/select_files/allowed_locations',
	static function ( $locations ) {
		$locations[] = '.cimo-e2e-dev-uploader';
		return $locations;
	}
);

add_filter(
	'cimo/drop_zone/allowed_locations',
	static function ( $locations ) {
		$locations[] = '.cimo-e2e-dev-dropzone';
		return $locations;
	}
);

add_action(
	'wp_enqueue_scripts',
	static function () {
		if ( ! function_exists( 'cimo_enqueue_assets' ) ) {
			return;
		}

		if ( ! is_singular( 'page' ) ) {
			return;
		}

		$post = get_queried_object();
		if ( ! $post instanceof WP_Post ) {
			return;
		}

		if ( false === strpos( $post->post_title, 'Cimo Dev API E2E' ) ) {
			return;
		}

		cimo_enqueue_assets();
	}
);
