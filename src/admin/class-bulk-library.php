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

		/**
		 * Count bulk progress the same way shared JS bulk-stats does (server-side).
		 * Video/audio browser canPlay checks are skipped; format allowlists still apply.
		 *
		 * @return array{optimized: int, unoptimized: int, skipped: int, total: int}
		 */
		public static function count_progress_stats() {
			$stats = [
				'optimized'   => 0,
				'unoptimized' => 0,
				'skipped'     => 0,
				'total'       => 0,
			];

			foreach ( self::get_all_attachments() as $attachment ) {
				$piece = self::tally_attachment( $attachment );
				$stats['optimized'] += $piece['optimized'];
				$stats['unoptimized'] += $piece['unoptimized'];
				$stats['skipped'] += $piece['skipped'];
			}

			$stats['total'] = $stats['optimized'] + $stats['unoptimized'];
			return $stats;
		}

		/**
		 * @param array $attachment Attachment from get_all_attachments().
		 * @return array{optimized: int, unoptimized: int, skipped: int}
		 */
		private static function tally_attachment( $attachment ) {
			$stats = [
				'optimized'   => 0,
				'unoptimized' => 0,
				'skipped'     => 0,
			];

			$mime_type = self::resolve_mime_type( $attachment );
			if ( ! self::supports_bulk_stats_mime_type( $mime_type ) ) {
				return $stats;
			}

			$is_image = is_string( $mime_type ) && strpos( $mime_type, 'image/' ) === 0;

			$bump = static function( $status ) use ( &$stats ) {
				if ( $status === 'skipped' ) {
					$stats['skipped']++;
				} elseif ( $status ) {
					$stats['optimized']++;
				} else {
					$stats['unoptimized']++;
				}
			};

			if ( ! empty( $attachment['file'] ) ) {
				$bump( self::get_attachment_size_status( 'full', $attachment ) );
			}

			if ( $is_image && ! empty( $attachment['sizes'] ) && is_array( $attachment['sizes'] ) ) {
				foreach ( $attachment['sizes'] as $size_key => $size ) {
					if ( ! empty( $size['file'] ) ) {
						$bump( self::get_attachment_size_status( $size_key, $attachment ) );
					}
				}
			}

			return $stats;
		}

		/**
		 * @param array $attachment
		 * @return string
		 */
		private static function resolve_mime_type( $attachment ) {
			if ( ! empty( $attachment['mimeType'] ) && is_string( $attachment['mimeType'] ) ) {
				return $attachment['mimeType'];
			}
			$file = isset( $attachment['file'] ) ? (string) $attachment['file'] : '';
			if ( $file === '' ) {
				return '';
			}
			$filetype = wp_check_filetype( $file );
			return ! empty( $filetype['type'] ) ? (string) $filetype['type'] : '';
		}

		/**
		 * Mirrors JS supportsBulkStatsMimeType (without browser canPlay).
		 *
		 * @param string $mime_type
		 * @return bool
		 */
		private static function supports_bulk_stats_mime_type( $mime_type ) {
			if ( ! is_string( $mime_type ) || $mime_type === '' ) {
				return false;
			}

			if ( strpos( $mime_type, 'image/' ) === 0 ) {
				return in_array( $mime_type, [
					'image/jpeg',
					'image/png',
					'image/webp',
					'image/jpg',
					'image/heic',
				], true );
			}

			if ( strpos( $mime_type, 'video/' ) === 0 ) {
				return in_array( $mime_type, [
					'video/mp4',
					'video/x-m4v',
					'video/webm',
					'video/ogg',
					'video/quicktime',
				], true );
			}

			if ( strpos( $mime_type, 'audio/' ) === 0 ) {
				return in_array( $mime_type, [
					'audio/mpeg',
					'audio/mp3',
					'audio/wav',
					'audio/x-wav',
					'audio/wave',
					'audio/ogg',
					'audio/opus',
					'audio/vorbis',
					'audio/aac',
					'audio/adts',
					'audio/flac',
					'audio/x-flac',
					'audio/mp4',
					'audio/x-m4a',
				], true );
			}

			return false;
		}

		/**
		 * Mirrors JS getAttachmentSizeStatus.
		 *
		 * @param string $size
		 * @param array  $attachment
		 * @return string|false
		 */
		private static function get_attachment_size_status( $size, $attachment ) {
			if ( empty( $attachment['cimo'] ) || ! is_array( $attachment['cimo'] ) ) {
				return false;
			}

			$cimo = $attachment['cimo'];
			if ( ! empty( $cimo['optimized_during_upload'] ) ) {
				return 'optimized-on-upload';
			}
			if ( empty( $cimo['bulk_optimization'] ) || ! is_array( $cimo['bulk_optimization'] ) ) {
				return 'optimized-on-upload';
			}

			$bulk = $cimo['bulk_optimization'];
			if ( empty( $bulk[ $size ] ) ) {
				return false;
			}

			$entry = $bulk[ $size ];
			$status = is_array( $entry ) ? ( $entry['status'] ?? null ) : $entry;
			if ( $status === 'skip' ) {
				return 'skipped';
			}
			if ( $status === 'bulk' ) {
				return 'bulk-optimized';
			}

			return false;
		}
	}

	new Cimo_Bulk_Library();
}
