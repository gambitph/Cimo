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

					/**
					 * This data comes from bulk optimizing media in the Media Library:
					 */

					if ( isset( $cimo_data['bulk_optimization'] ) ) {
						foreach ( $cimo_data['bulk_optimization'] as $size => $data ) {
							$updated_stats['media_optimized_num']++;
							$original_size_b = isset( $data['originalFilesize'] ) ? (int) $data['originalFilesize'] : 0;
							$converted_size_b = isset( $data['convertedFilesize'] ) ? (int) $data['convertedFilesize'] : 0;
							$updated_stats['total_original_size'] += $original_size_b / 1024;
							$updated_stats['total_optimized_size'] += $converted_size_b / 1024;
						}
					}

					/**
					 * This data comes from individually optimized images from the user uploading media:
					 */

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
				'media_optimized_num' => (int) ( $stats['media_optimized_num'] ?? 0 ),
				'total_original_size_kb' => $kb_before,
				'before' => self::format_bytes( $bytes_before ),
				'after' => self::format_bytes( $bytes_after ),
				'saved' => self::format_bytes( $bytes_saved ),
				'percentage_saved' => $percentage_saved,
				'compression_ratio' => $compression_ratio,
				'total_storage_saved' => self::format_bytes( $bytes_saved ),
				'bytes_saved' => $bytes_saved,
				'last_processed_post_id' => $stats['last_processed_post_id'] ?? 0,
			];
		}

		/**
		 * Bytes saved across all optimized media (from stored stats option).
		 * Avoids a full recompute — suitable for admin-wide notice checks.
		 *
		 * @return int
		 */
		public static function get_bytes_saved() {
			$stats = get_option( self::OPTION_KEY );
			if ( ! is_array( $stats ) ) {
				return 0;
			}
			$kb_before = (float) ( $stats['total_original_size'] ?? 0 );
			$kb_after  = (float) ( $stats['total_optimized_size'] ?? 0 );
			$kb_saved  = max( 0, $kb_before - $kb_after );
			return (int) round( $kb_saved * 1024 );
		}

		/**
		 * Format bytes into human readable format
		 */
		public static function format_bytes( $bytes, $decimals = 2 ) {
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

		/**
		 * Estimate additional bytes Premium bulk optimization could save.
		 * Same formula as the free settings upsell JS helper.
		 *
		 * Includes a 1.3x uplift: bulk also optimizes intermediate sizes
		 * (thumbnail, medium, large, etc.), which typically add ~30% disk
		 * on top of the full-size original.
		 *
		 * @param int $unoptimized_count Unoptimized media units from bulk progress.
		 * @return int Estimated savings in bytes.
		 */
		public static function estimate_additional_savings_bytes( $unoptimized_count ) {
			$stats = self::get_stats();
			$optimized = (int) ( $stats['media_optimized_num'] ?? 0 );
			$original_kb = (float) ( $stats['total_original_size'] ?? 0 );
			$optimized_kb = (float) ( $stats['total_optimized_size'] ?? 0 );
			$unoptimized = (int) $unoptimized_count;

			if ( $optimized <= 0 || $unoptimized <= 0 || $original_kb <= 0 ) {
				return 0;
			}

			$kb_saved = max( 0, $original_kb - $optimized_kb );
			$reduction = ( $kb_saved / $original_kb ) * 100;
			if ( $reduction <= 0 ) {
				return 0;
			}

			// Intermediate sizes typically add ~30% disk vs full size alone.
			$size_variants_factor = 1.3;

			$avg_original_kb = $original_kb / $optimized;
			$unoptimized_original_kb = $avg_original_kb * $unoptimized;
			$savings_kb = $unoptimized_original_kb * ( $reduction / 100 ) * $size_variants_factor;

			return (int) max( 0, round( $savings_kb * 1024 ) );
		}

		/**
		 * Human-readable additional savings estimate for free upsells, or empty string.
		 *
		 * @return string e.g. "12.4 MB" or "".
		 */
		public static function get_additional_savings_estimate_label() {
			if ( ! class_exists( 'Cimo_Bulk_Library' ) ) {
				return '';
			}
			$progress = Cimo_Bulk_Library::count_progress_stats();
			$bytes = self::estimate_additional_savings_bytes( $progress['unoptimized'] ?? 0 );
			if ( $bytes <= 0 ) {
				return '';
			}
			// Match JS formatSavingsBytes default of 1 decimal.
			return self::format_bytes( $bytes, 1 );
		}

		/**
		 * Update stats when an attachment is optimized on upload.
		 * Reads/writes the option only — does not run the metadata scan.
		 *
		 * @param int $attachment_id  The attachment ID.
		 * @param int $original_size  Original file size in bytes.
		 * @param int $optimized_size Optimized file size in bytes.
		 */
		public static function update_stats_upload_optimized( $attachment_id, $original_size, $optimized_size ) {
			$stats = get_option( self::OPTION_KEY );
			if ( ! is_array( $stats ) ) {
				$stats = [
					'last_processed_post_id' => 0,
					'media_optimized_num'    => 0,
					'total_original_size'    => 0,
					'total_optimized_size'   => 0,
				];
			}

			$stats['media_optimized_num'] = (int) ( $stats['media_optimized_num'] ?? 0 ) + 1;
			$stats['total_original_size'] = (float) ( $stats['total_original_size'] ?? 0 ) + ( (int) $original_size / 1024 );
			$stats['total_optimized_size'] = (float) ( $stats['total_optimized_size'] ?? 0 ) + ( (int) $optimized_size / 1024 );

			// Advance the cursor so a later incremental scan does not double-count this file.
			$attachment_id = (int) $attachment_id;
			if ( $attachment_id > (int) ( $stats['last_processed_post_id'] ?? 0 ) ) {
				$stats['last_processed_post_id'] = $attachment_id;
			}

			update_option( self::OPTION_KEY, $stats, false );
		}

		/**
		 * Update stats for when an attachment has been bulk optimized.
		 *
		 * @param int $attachment_id The attachment ID.
		 * @param int $original_size The original file size in bytes.
		 * @param int $optimized_size The optimized file size in bytes.
		 */
		public static function update_stats_bulk_optimized( $attachment_id, $original_size, $optimized_size ) {
			$stats = self::get_stats();
			$stats['media_optimized_num']++;
			$stats['total_original_size'] += $original_size / 1024;
			$stats['total_optimized_size'] += $optimized_size / 1024;
			update_option( self::OPTION_KEY, $stats, false );
		}

		/**
		 * Update stats for when an attachment has been restored from bulk optimization.
		 *
		 * @param int $attachment_id The attachment ID.
		 * @param int $optimized_size The optimized file size in bytes.
		 * @param int $restored_size The restored file size in bytes.
		 */
		public static function update_stats_bulk_restored( $attachment_id, $optimized_size, $restored_size ) {
			$stats = self::get_stats();
			$stats['media_optimized_num']--;
			$stats['total_original_size'] -= $optimized_size / 1024;
			$stats['total_optimized_size'] -= $restored_size / 1024;
			update_option( self::OPTION_KEY, $stats, false );
		}
	}
}
