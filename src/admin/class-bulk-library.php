<?php
/**
 * Shared bulk Media Library helpers (free + premium).
 *
 * Provides the attachment list used for bulk progress stats ("X of Y optimized").
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'Cimo_Bulk_Library' ) ) {
	class Cimo_Bulk_Library {
		public function __construct() {
			add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
		}

		/**
		 * Register REST routes shared by free and premium.
		 */
		public function register_rest_routes() {
			register_rest_route( 'cimo/v1', '/attachments', [
				'methods'             => 'GET',
				'callback'            => [ $this, 'rest_get_all_attachments' ],
				'permission_callback' => function() {
					return current_user_can( 'upload_files' ) && current_user_can( 'edit_posts' ) && current_user_can( 'edit_others_posts' );
				},
			] );
		}

		/**
		 * REST: all bulk-optimizable attachments.
		 *
		 * @return WP_REST_Response
		 */
		public function rest_get_all_attachments() {
			return rest_ensure_response( self::get_all_attachments() );
		}

		/**
		 * Get all image, video, and audio attachments with metadata.
		 * Same dataset Premium Bulk Optimization uses for progress stats.
		 *
		 * @return array<int, array{id: int, date: string|null, file: string, filesize: int|null, sizes: array|null, cimo: array|null, mimeType: string}>
		 */
		public static function get_all_attachments() {
			global $wpdb;

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$attachments = $wpdb->get_results(
				$wpdb->prepare(
					"
					SELECT p.ID, p.post_date, p.post_mime_type, pm.meta_value AS attached_file
					FROM {$wpdb->posts} p
					INNER JOIN {$wpdb->postmeta} pm
						ON p.ID = pm.post_id
						AND pm.meta_key = '_wp_attached_file'
					WHERE p.post_type = %s
					AND p.post_status = %s
					AND (
						p.post_mime_type LIKE %s
						OR p.post_mime_type LIKE %s
						OR p.post_mime_type LIKE %s
					)
					",
					'attachment',
					'inherit',
					'image/%',
					'video/%',
					'audio/%'
				),
				ARRAY_A
			);

			if ( empty( $attachments ) ) {
				return [];
			}

			$candidates = [];
			foreach ( $attachments as $row ) {
				$id = (int) $row['ID'];
				$mime_type = isset( $row['post_mime_type'] ) ? (string) $row['post_mime_type'] : '';
				$attached_file = isset( $row['attached_file'] ) ? maybe_unserialize( $row['attached_file'] ) : null;
				if ( ! is_string( $attached_file ) || $attached_file === '' ) {
					continue;
				}
				if ( strpos( $mime_type, 'image/' ) === 0 && stripos( $attached_file, '.gif' ) === strlen( $attached_file ) - 4 ) {
					continue;
				}
				$candidates[] = [
					'id'            => $id,
					'date'          => isset( $row['post_date'] ) ? $row['post_date'] : null,
					'mime_type'     => $mime_type,
					'attached_file' => $attached_file,
				];
			}

			$ids = array_values( array_unique( array_map( 'intval', wp_list_pluck( $candidates, 'id' ) ) ) );
			if ( $ids ) {
				update_meta_cache( 'post', $ids );
			}

			$filtered_attachments = [];
			foreach ( $candidates as $candidate ) {
				$meta_raw = wp_get_attachment_metadata( $candidate['id'] );
				if ( ! is_array( $meta_raw ) ) {
					$meta_raw = [];
				}
				$filtered_attachments[] = [
					'id'       => $candidate['id'],
					'date'     => $candidate['date'],
					'file'     => $candidate['attached_file'],
					'filesize' => isset( $meta_raw['filesize'] ) ? $meta_raw['filesize'] : null,
					'sizes'    => isset( $meta_raw['sizes'] ) ? $meta_raw['sizes'] : null,
					'cimo'     => isset( $meta_raw['cimo'] ) ? $meta_raw['cimo'] : null,
					'mimeType' => $candidate['mime_type'],
				];
			}

			return $filtered_attachments;
		}
	}

	new Cimo_Bulk_Library();
}
