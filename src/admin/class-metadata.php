<?php
/**
 * This class is in charge of saving the metadata for the media compression.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'Cimo_Metadata' ) ) {
	class Cimo_Metadata {
		public function __construct() {
			// Create a REST API endpoint to save the metadata.
			add_action( 'rest_api_init', [ $this, 'register_rest_route' ] );

			// Prepare the data for showing in the media manager.
			add_filter( 'wp_prepare_attachment_for_js', [ $this, 'prepare_attachment_for_js' ], 10, 3 );

			// For big files (sizes or filesize), our metadata might get overwritten because our saving goes first.
			// Preserve Cimo metadata when attachment metadata is updated.
			add_filter( 'wp_update_attachment_metadata', [ $this, 'preserve_cimo_metadata' ], 10, 2 );
		}

		public function register_rest_route() {
			register_rest_route( 'cimo/v1', '/metadata', [
				'methods' => 'POST',
				'callback' => [ $this, 'save_metadata' ],
				// Only allow people who can edit posts and have a valid nonce
				// The REST API core already handles X-WP-Nonce (and _wpnonce) for authentication
				// if the route uses 'permission_callback' and the user is logged in.
				// We only need to check user capabilities here.
				'permission_callback' => function( $request ) {
					return current_user_can( 'upload_files' ) && current_user_can( 'edit_posts' );
				},
				// The arguments are 1. The filename, 2. The metadata (and object)
				'args' => [
					'filename' => [
						'type' => 'string',
						'required' => true,
						// Validate this as a string
						'validate_callback' => function( $value, $request, $param ) {
							if ( ! is_string( $value ) ) {
								// translators: The %s is the parameter name.
								return new WP_Error( 'invalid_param', sprintf( esc_html__( '%s must be a string.', 'cimo-image-optimizer' ), $param ) );
							}
							return true;
						},
						'sanitize_callback' => function( $value, $request, $param ) {
							return sanitize_file_name( $value );
						},
					],
					'metadata' => [
						'type' => 'object',
						'required' => true,
						// Only allow the exact keys we currently use.
						'validate_callback' => function( $value, $request, $param ) {
							$allowed_keys = [
								'originalFormat',
								'originalFilesize',
								'convertedFormat',
								'convertedFilesize',
								'conversionTime',
								'compressionSavings',
							];
							if ( ! is_array( $value ) ) {
								// translators: The %s is the parameter name.
								return new WP_Error( 'invalid_param', sprintf( esc_html__( '%s must be an object.', 'cimo-image-optimizer' ), $param ) );
							}
							$keys = array_keys( $value );
							sort( $keys );
							$expected = $allowed_keys;
							sort( $expected );
							if ( $keys !== $expected ) {
								return new WP_Error(
									'invalid_param',
									sprintf(
										// translators: 1: parameter name, 2: allowed keys.
										esc_html__( '%1$s must contain only the following keys: %2$s', 'cimo-image-optimizer' ),
										$param,
										implode( ', ', $allowed_keys )
									)
								);
							}
							return true;
						},
						'sanitize_callback' => function( $value, $request, $param ) {
							$allowed_keys = [
								'originalFormat',
								'originalFilesize',
								'convertedFormat',
								'convertedFilesize',
								'conversionTime',
								'compressionSavings',
							];
							$sanitized = [];
							if ( is_array( $value ) ) {
								foreach ( $allowed_keys as $key ) {
									// Sanitize according to expected type
									if ( in_array( $key, [ 'originalFilesize', 'convertedFilesize' ], true ) ) {
										$sanitized[ $key ] = isset( $value[ $key ] ) ? intval( $value[ $key ] ) : 0;
									} elseif ( in_array( $key, [ 'conversionTime', 'compressionSavings' ], true ) ) {
										$sanitized[ $key ] = isset( $value[ $key ] ) ? floatval( $value[ $key ] ) : 0.0;
									} else {
										$sanitized[ $key ] = isset( $value[ $key ] ) ? sanitize_text_field( $value[ $key ] ) : '';
									}
								}
							}
							return $sanitized;
						},
					],
				],
			] );
		}

		/**
		 * Save the metadata for the media compression.
		 *
		 * @param WP_REST_Request $request The request object.
		 * @return WP_REST_Response The response object.
		 */
		public function save_metadata( $request ) {
			$data = $request->get_json_params();
			$filename = isset( $data['filename'] ) ? sanitize_file_name( $data['filename'] ) : '';
			$cimo_metadata = isset( $data['metadata'] ) && is_array( $data['metadata'] ) ? array_map( 'sanitize_text_field', $data['metadata'] ) : [];

			// Get the attachment ID from the filename.
			$attachment_id = $this->get_attachment_id_from_filename( $filename );

			// If the attachment ID is not found, return an error.
			if ( ! $attachment_id ) {
				return new WP_Error( 'attachment_not_found', 'Attachment not found', [ 'status' => 404 ] );
			}

			// Add the cimo metadata to the attachment metadata.
			$metadata = wp_get_attachment_metadata( $attachment_id );
			if ( ! $metadata ) {
				$metadata = [];
			}
			$metadata['cimo'] = $cimo_metadata;

			// Update the attachment metadata.
			update_post_meta( $attachment_id, '_wp_attachment_metadata', $metadata );
			
			// Return the attachment ID.
			return rest_ensure_response( [ 'attachment_id' => $attachment_id ] );
		}

		private function get_attachment_id_from_filename( $filename ) {
			// The filename is converted into a `post_name` entry in the wp_posts table by removing the extension, then running it in sanitize_title.
			$filename_no_ext = preg_replace( '/\.[^.]+$/', '', $filename );
			$post_name = sanitize_title( $filename_no_ext );
			$query = new WP_Query( [
				'post_type'   => 'attachment',
				'name'        => $post_name,
				'post_status' => 'inherit',
				'posts_per_page' => 1,
				'fields'      => 'ids',
			] );
			return ! empty( $query->posts ) ? (int) $query->posts[0] : 0;
		}

		/**
		 * Prepare the attachment for the media manager.
		 *
		 * @param array $response The response object.
		 * @param WP_Post $attachment The attachment object.
		 * @param array $meta The attachment metadata.
		 * @return array The response object.
		 */
		public function prepare_attachment_for_js( $response, $attachment, $meta ) {
			$attachment_id = $attachment->ID;
			$metadata = get_post_meta( $attachment_id, '_wp_attachment_metadata', true );
			if ( isset( $metadata['cimo'] ) ) {
				$response['cimo'] = $metadata['cimo'];
			}

			// Return the response.
			return $response;
		}

		/**
		 * Preserve Cimo metadata when attachment metadata is updated.
		 *
		 * @param array $metadata The attachment metadata.
		 * @param int $attachment_id The attachment ID.
		 * @return array The updated metadata.
		 */
		public function preserve_cimo_metadata( $metadata, $attachment_id ) {
			// Get the existing Cimo metadata from the attachment metadata.
			$existing_metadata = wp_get_attachment_metadata( $attachment_id );
			if ( $existing_metadata && isset( $existing_metadata['cimo'] ) ) {
				$metadata['cimo'] = $existing_metadata['cimo'];
			}

			return $metadata;
		}
	}

	new Cimo_Metadata();
}

