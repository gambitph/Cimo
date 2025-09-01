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

			// Listen for new media attachments being created and add our metadata to them.
			add_action( 'add_attachment', [ $this, 'add_attachment_metadata' ], 10, 1 );
		}

		public function register_rest_route() {
			register_rest_route( 'cimo/v1', '/metadata', [
				'methods' => 'POST',
				'callback' => [ $this, 'save_metadata' ],
				// Only allow people who can edit posts and have a valid nonce
				'permission_callback' => function( $request ) {
					return current_user_can( 'upload_files' ) && current_user_can( 'edit_posts' );
				},
				// The arguments: only 'metadata', which is now an array of objects
				'args' => [
					'metadata' => [
						'type' => 'array',
						'required' => true,
						'validate_callback' => function( $value, $request, $param ) {
							$allowed_keys = [
								'filename',
								'originalFormat',
								'originalFilesize',
								'convertedFormat',
								'convertedFilesize',
								'conversionTime',
								'compressionSavings',
							];
							if ( ! is_array( $value ) ) {
								// translators: The %s is the parameter name.
								return new WP_Error( 'invalid_param', sprintf( esc_html__( '%s must be an array.', 'cimo-image-optimizer' ), $param ) );
							}
							foreach ( $value as $item ) {
								if ( ! is_array( $item ) ) {
									return new WP_Error( 'invalid_param', esc_html__( 'Each metadata entry must be an object.', 'cimo-image-optimizer' ) );
								}
								// filename is now required in each item
								if ( empty( $item['filename'] ) || ! is_string( $item['filename'] ) ) {
									return new WP_Error( 'invalid_param', esc_html__( 'Each metadata entry must have a valid filename.', 'cimo-image-optimizer' ) );
								}
								// Only allow the allowed keys, but not all are required
								foreach ( array_keys( $item ) as $key ) {
									if ( ! in_array( $key, $allowed_keys, true ) ) {
										return new WP_Error(
											'invalid_param',
											sprintf(
												// translators: 1: parameter name, 2: allowed keys.
												esc_html__( 'Invalid key "%1$s" in metadata entry. Allowed keys: %2$s', 'cimo-image-optimizer' ),
												$key,
												implode( ', ', $allowed_keys )
											)
										);
									}
								}
							}
							return true;
						},
						'sanitize_callback' => function( $value, $request, $param ) {
							$allowed_keys = [
								'filename',
								'originalFormat',
								'originalFilesize',
								'convertedFormat',
								'convertedFilesize',
								'conversionTime',
								'compressionSavings',
							];
							$sanitized = [];
							if ( is_array( $value ) ) {
								foreach ( $value as $item ) {
									$entry = [];
									foreach ( $allowed_keys as $key ) {
										if ( isset( $item[ $key ] ) ) {
											if ( $key === 'filename' ) {
												$entry[ $key ] = sanitize_file_name( $item[ $key ] );
											} elseif ( in_array( $key, [ 'originalFilesize', 'convertedFilesize' ], true ) ) {
												$entry[ $key ] = intval( $item[ $key ] );
											} elseif ( in_array( $key, [ 'conversionTime', 'compressionSavings' ], true ) ) {
												$entry[ $key ] = floatval( $item[ $key ] );
											} else {
												$entry[ $key ] = sanitize_text_field( $item[ $key ] );
											}
										}
									}
									$sanitized[] = $entry;
								}
							}
							return $sanitized;
						},
					],
				],
			] );
		}

		/**
		 * This method is called when the metadata is generated in the frontend,
		 * but the media attachment is not yet created. So we need to gather all
		 * these metadata first and then wait for the attachment to be created,
		 * then add the metadata to them.
		 *
		 * @param WP_REST_Request $request The request object.
		 * @return WP_REST_Response The response object.
		 */
		public function save_metadata( $request ) {
			$data = $request->get_json_params();

			// The new method: metadata is now an array of metadata (each containing filename, etc)
			$metadata_array = isset( $data['metadata'] ) && is_array( $data['metadata'] ) ? $data['metadata'] : [];

			// Sanitize each metadata entry
			$allowed_keys = [
				'filename',
				'originalFormat',
				'originalFilesize',
				'convertedFormat',
				'convertedFilesize',
				'conversionTime',
				'compressionSavings',
			];
			$sanitized_metadata = [];
			foreach ( $metadata_array as $item ) {
				$entry = [];
				foreach ( $allowed_keys as $key ) {
					if ( isset( $item[ $key ] ) ) {
						if ( $key === 'filename' ) {
							$entry[ $key ] = sanitize_file_name( $item[ $key ] );
						} elseif ( in_array( $key, [ 'originalFilesize', 'convertedFilesize' ], true ) ) {
							$entry[ $key ] = intval( $item[ $key ] );
						} elseif ( in_array( $key, [ 'conversionTime', 'compressionSavings' ], true ) ) {
							$entry[ $key ] = floatval( $item[ $key ] );
						} else {
							$entry[ $key ] = sanitize_text_field( $item[ $key ] );
						}
					}
				}
				if ( ! empty( $entry ) ) {
					$sanitized_metadata[] = $entry;
				}
			}

			// Save to a transient queue for metadata waiting for attachment creation
			$transient_key = 'cimo_metadata_queue';
			$queue = get_transient( $transient_key );
			if ( ! is_array( $queue ) ) {
				$queue = [];
			}

			// Append new metadata to the queue
			$queue = array_merge( $queue, $sanitized_metadata );

			// Save back to transient (let's keep for an hour)
			set_transient( $transient_key, $queue, HOUR_IN_SECONDS );

			// Return success and the number of items in the queue
			return rest_ensure_response( [
				'success' => true,
				'queued_count' => count( $queue ),
			] );
		}

		public function add_attachment_metadata( $attachment_id ) {
			// Get the metadata from the transient queue.
			$transient_key = 'cimo_metadata_queue';
			$queue = get_transient( $transient_key );
			if ( ! is_array( $queue ) ) {
				return;
			}

			// Check if the attachment is in our metadata queue by matching filename.
			$attachment = get_post( $attachment_id );
			if ( ! $attachment || 'attachment' !== $attachment->post_type ) {
				return;
			}

			$attachment_url = wp_get_attachment_url( $attachment_id );
			if ( ! $attachment_url ) {
				return;
			}

			$attachment_filename = wp_basename( $attachment_url );

			// Try to match the metadata entry in the queue, allowing for possible -1, -2, etc. suffixes in the filename.
			$matched_index = null;
			$matched_metadata = null;

			// Extract the base name and extension from the attachment filename.
			$attachment_pathinfo = pathinfo( $attachment_filename );
			$attachment_base = isset( $attachment_pathinfo['filename'] ) ? $attachment_pathinfo['filename'] : '';
			$attachment_ext  = isset( $attachment_pathinfo['extension'] ) ? $attachment_pathinfo['extension'] : '';

			foreach ( $queue as $index => $item ) {
				if ( ! isset( $item['filename'] ) ) {
					continue;
				}

				$item_pathinfo = pathinfo( $item['filename'] );
				$item_base = isset( $item_pathinfo['filename'] ) ? $item_pathinfo['filename'] : '';
				$item_ext  = isset( $item_pathinfo['extension'] ) ? $item_pathinfo['extension'] : '';

				// Only match if the extension is the same.
				if ( strtolower( $attachment_ext ) !== strtolower( $item_ext ) ) {
					continue;
				}

				// Check if the attachment base filename starts with the original base filename,
				// and is either an exact match or has a -number suffix (e.g., image-1.jpg).
				if (
					$attachment_base === $item_base ||
					preg_match( '/^' . preg_quote( $item_base, '/' ) . '-\d+$/', $attachment_base )
				) {
					$matched_index = $index;
					$matched_metadata = $item;
					break;
				}
			}

			if ( null === $matched_index ) {
				// No matching metadata for this attachment.
				return;
			}

			// Remove the matched metadata from the queue and update the transient.
			array_splice( $queue, $matched_index, 1 );
			set_transient( $transient_key, $queue, HOUR_IN_SECONDS );

			// Save the metadata under the "cimo" key in the attachment metadata, excluding the 'filename' key.
			$metadata = get_post_meta( $attachment_id, '_wp_attachment_metadata', true );
			if ( ! is_array( $metadata ) ) {
				$metadata = [];
			}
			// Remove 'filename' from the matched metadata before saving.
			$cimo_metadata = $matched_metadata;
			unset( $cimo_metadata['filename'] );
			$metadata['cimo'] = $cimo_metadata;

			// Update the attachment metadata.
			update_post_meta( $attachment_id, '_wp_attachment_metadata', $metadata );
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

