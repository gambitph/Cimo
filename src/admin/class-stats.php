<?php
/**
 * Statistics class for gathering Cimo media optimization data
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'Cimo_Stats' ) ) {
	class Cimo_Stats {
		const OPTION_KEY = 'cimo_stats_data';
		const CIMO_META_STRING = 's:4:"cimo";';

		/**
		 * Get all media optimization statistics
		 */
		public static function get_stats() {
			$existing = get_option( self::OPTION_KEY );

			if ( ! is_array( $existing ) ) {
				$existing = [
					'last_processed_post_id' => 0,
					'media_optimized_num' => 0,
					'total_original_size' => 0, // in KB
					'total_optimized_size' => 0, // in KB
				];
			}

			// Compute stats (from scratch or incrementally depending on input)
			$updated = self::compute_stats( $existing );
			if ( $updated !== $existing ) {
				update_option( self::OPTION_KEY, $updated, false );
			}
			return $updated;
		}

		/**
		 * Compute statistics.
		 * If $existing_stats provided with 'last_processed_post_id', only process newer media files
		 * and merge into existing totals; otherwise process all media files from scratch.
		 *
		 * Query optimizations:
		 * 1. Query only postmeta table (no JOIN needed)
		 * 2. Use meta_key index for fast lookups
		 * 3. Track by post_id instead of post_date (auto-incrementing)
		 * 4. Use serialized string search for exact Cimo metadata match
		 */
		private static function compute_stats( $existing_stats = null ) {
			global $wpdb;

			$from_scratch = ! is_array( $existing_stats ) || empty( $existing_stats['last_processed_post_id'] );
			$last_processed_post_id = $from_scratch ? 0 : $existing_stats['last_processed_post_id'];
		
			// Only new records since last processed post_id
			$new_results = $wpdb->get_results( $wpdb->prepare( "
				SELECT 
					post_id,
					meta_value
				FROM {$wpdb->postmeta}
				WHERE meta_key = '_wp_attachment_metadata'
				AND meta_value LIKE %s
				AND post_id > %d
				ORDER BY post_id DESC
			", '%' . self::CIMO_META_STRING . '%', $last_processed_post_id ) );

			// Initialize baseline
			$updated_stats = $from_scratch ? [
				'last_processed_post_id' => 0,
				'media_optimized_num' => 0,
				'total_original_size' => 0, // KB
				'total_optimized_size' => 0, // KB
			] : $existing_stats;

			$highest_post_id = $from_scratch ? 0 : (int) $existing_stats['last_processed_post_id'];

			if ( ! empty( $new_results ) ) {
				foreach ( $new_results as $result ) {
					$metadata = maybe_unserialize( $result->meta_value );
					
					if ( ! isset( $metadata['cimo'] ) ) {
						continue;
					}

					$cimo_data = $metadata['cimo'];
					$updated_stats['media_optimized_num']++;

					// Extract file sizes (bytes) and add to KB totals
					$original_size_b = isset( $cimo_data['originalFilesize'] ) ? (int) $cimo_data['originalFilesize'] : 0;
					$converted_size_b = isset( $cimo_data['convertedFilesize'] ) ? (int) $cimo_data['convertedFilesize'] : 0;

					$updated_stats['total_original_size'] += $original_size_b / 1024;
					$updated_stats['total_optimized_size'] += $converted_size_b / 1024;

					// Track the highest processed post_id
					if ( $result->post_id > $highest_post_id ) {
						$highest_post_id = $result->post_id;
					}
				}
			}

			// Update the last processed post_id
			$updated_stats['last_processed_post_id'] = $highest_post_id;
			// No derived fields stored; compute on demand

			return $updated_stats;
		}

		/**
		 * Get formatted statistics for display
		 */
		public static function get_formatted_stats() {
			$stats = self::get_stats();

			$kb_before = (float) ( $stats['total_original_size'] ?? 0 );
			$kb_after  = (float) ( $stats['total_optimized_size'] ?? 0 );
			$kb_saved  = max( 0, $kb_before - $kb_after );

			$bytes_before = (int) round( $kb_before * 1024 );
			$bytes_after  = (int) round( $kb_after * 1024 );
			$bytes_saved  = (int) round( $kb_saved * 1024 );

			$percentage_saved = $kb_before > 0 ? round( ( $kb_saved / $kb_before ) * 100, 1 ) : 0;
			$compression_ratio = $kb_before > 0 ? round( $kb_before / $kb_after, 1 ) : 0;

			return [
				'media_optimized' => number_format( (int) ( $stats['media_optimized_num'] ?? 0 ) ),
				'before' => self::format_bytes( $bytes_before ),
				'after' => self::format_bytes( $bytes_after ),
				'saved' => self::format_bytes( $bytes_saved ),
				'percentage_saved' => $percentage_saved,
				'compression_ratio' => $compression_ratio,
				'total_storage_saved' => self::format_bytes( $bytes_saved ),
				'last_processed_post_id' => $stats['last_processed_post_id'] ?? 0,
			];
		}

		/**
		 * Format bytes into human readable format
		 */
		private static function format_bytes( $bytes, $decimals = 2 ) {
			if ( ! is_numeric( $bytes ) || $bytes == 0 ) {
				return '0 Bytes';
			}

			$k = 1024;
			$dm = $decimals < 0 ? 0 : $decimals;
			$sizes = [ 'Bytes', 'KB', 'MB', 'GB', 'TB' ];

			$i = floor( log( $bytes ) / log( $k ) );
			$value = round( $bytes / pow( $k, $i ), $dm );

			return $value . ' ' . $sizes[ $i ];
		}
	}
}
