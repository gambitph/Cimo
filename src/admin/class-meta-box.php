<?php
/**
 * Meta box information to show the information about the conversion.
 */

 // Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'Cimo_Meta_Box' ) ) {
	class Cimo_Meta_Box {
		public function __construct() {
			// Add a meta box to display Cimo Data in the Edit Media screen
			if ( is_admin() ) {
				add_action( 'add_meta_boxes', [ $this, 'add_meta_box' ] );
			}

			// Move the Cimo Data meta box before "Attachment Attributes" and after "Save"
			// add_action( 'do_meta_boxes', [ $this, 'move_meta_box' ], 20, 3 );
		}

		public function add_meta_box() {
			if ( ! apply_filters( 'cimo/metabox/do_render', true ) ) {
				return;
			}

			add_meta_box(
				'cimo-data-meta-box',
				__( 'Cimo Optimization', 'cimo-image-optimizer' ),
				function( $post ) {
					$metadata = get_post_meta( $post->ID, '_wp_attachment_metadata', true );
					if ( isset( $metadata['cimo'] ) ) {
						// Recreate the sidebar HTML from js/media-manager/sidebar-info.js here

						// Helper to format bytes as human readable
						function cimo_format_filesize( $bytes, $decimals = 2, $invertSign = false ) {
							if ( ! is_numeric( $bytes ) || $bytes == 0 ) {
								return '0 Bytes';
							}
							$k = 1024;
							$dm = $decimals < 0 ? 0 : $decimals;
							$sizes = [ 'Bytes', 'KB', 'MB', 'GB' ];

							$abs_bytes = abs( $bytes );
							$i = floor( log( $abs_bytes ) / log( $k ) );
							$value = round( $abs_bytes / pow( $k, $i ), $dm );

							$sign = $bytes < 0 ? '-' : '';
							if ( $invertSign ) {
								$sign = $sign === '-' ? '' : '-';
							}

							return $sign . $value . ' ' . $sizes[ $i ];
						}

						// Helper to convert mimetype to format
						function cimo_convert_mimetype_to_format( $mimetype ) {
							if ( ! is_string( $mimetype ) || strpos( $mimetype, '/' ) === false ) {
								return esc_html( $mimetype );
							}
							$parts = explode( '/', $mimetype );
							$format = $parts[1];
							if ( strtolower( $format ) === 'webp' ) {
								return 'WebP';
							}
							return ucfirst( $format );
						}

						// Helper to get media type label from mimetype.
						function cimo_get_media_type_label( $mimetype ) {
							if ( ! is_string( $mimetype ) || strpos( $mimetype, '/' ) === false ) {
								return esc_html__( 'Media', 'cimo-image-optimizer' );
							}
							$parts = explode( '/', $mimetype );
							$category = strtolower( $parts[0] );

							switch ( $category ) {
								case 'image':
									return esc_html__( 'Image', 'cimo-image-optimizer' );
								case 'video':
									return esc_html__( 'Video', 'cimo-image-optimizer' );
								case 'audio':
									return esc_html__( 'Audio', 'cimo-image-optimizer' );
								default:
									return esc_html__( 'Media', 'cimo-image-optimizer' );
							}
						}

						$cimo = $metadata['cimo'];

						// Calculate optimization savings
						$compression_savings = isset( $cimo['compressionSavings'] ) ? floatval( $cimo['compressionSavings'] ) : null;
						$optimization_savings = $compression_savings !== null ? number_format( 100 - ( $compression_savings * 100 ), 2 ) : null;
						$original_filesize = isset( $cimo['originalFilesize'] ) ? floatval( $cimo['originalFilesize'] ) : 0;
						$converted_filesize = isset( $cimo['convertedFilesize'] ) ? floatval( $cimo['convertedFilesize'] ) : 0;

						$is_bulk_optimized = isset( $cimo['bulk_optimization'] ) &&
							is_array( $cimo['bulk_optimization'] ) &&
							! empty( $cimo['bulk_optimization'] );

						// For bulk optimization, we need to recalculate the optimization savings percentage
						// based on the original and converted file sizes for all the thumbnails
						if ( $is_bulk_optimized ) {
							$bulk_optimization_count = count( $cimo['bulk_optimization'] );
							$bulk_optimization_sizes = array_keys( $cimo['bulk_optimization'] );

							// Gather all original and converted file sizes for bulk_optimization
							$bulk_original_filesize = 0;
							$bulk_converted_filesize = 0;
							if ( $is_bulk_optimized ) {
								foreach ( $cimo['bulk_optimization'] as $size_key => $bulk_data ) {
									$orig = isset( $bulk_data['originalFilesize'] ) ? floatval( $bulk_data['originalFilesize'] ) : 0;
									$conv = isset( $bulk_data['convertedFilesize'] ) ? floatval( $bulk_data['convertedFilesize'] ) : 0;
									$bulk_original_filesize += $orig;
									$bulk_converted_filesize += $conv;
								}
							}

							$original_filesize = $bulk_original_filesize;
							$converted_filesize = $bulk_converted_filesize;

							$optimization_savings = number_format( 100 * ( $original_filesize - $converted_filesize ) / $original_filesize, 2 );
						}

						$kb_saved = cimo_format_filesize( $original_filesize - $converted_filesize, 1, true );
						$optimization_savings_class = ( $optimization_savings > 0 ) ? 'cimo-optimization-savings-up' : 'cimo-optimization-savings-down';

						$original_size = cimo_format_filesize( $original_filesize );
						$converted_size = cimo_format_filesize( $converted_filesize );

						$converted_format_raw = isset( $cimo['convertedFormat'] ) ? $cimo['convertedFormat'] : ( isset( $post->post_mime_type ) ? $post->post_mime_type : '' );
						$converted_format = $converted_format_raw ? cimo_convert_mimetype_to_format( $converted_format_raw ) : '';
						$media_type_label = cimo_get_media_type_label( $converted_format_raw );
						$converttime = isset( $cimo['conversionTime'] ) ? floatval( $cimo['conversionTime'] ) : null;
						if ( $converttime !== null ) {
							if ( $converttime < 1000 ) {
								$converttime_str = number_format( $converttime, 0 ) . ' ms';
							} elseif ( $converttime < 60000 ) {
								$converttime_str = number_format( $converttime / 1000, 1 ) . ' sec';
							} else {
								$converttime_str = number_format( $converttime / 60000, 1 ) . ' min';
							}
						} else {
							$converttime_str = 'N/A';
						}

						// echo '<div class="cimo-media-manager-metadata">';
						echo '<div class="cimo-media-manager-metadata-title-container">';
						echo '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 672 672" height="20" width="20"><path d="M132.5 132.5C182.4 82.5 253 56 336 56C419 56 489.6 82.5 539.5 132.5C589.4 182.5 616 253 616 336C616 419 589.5 489.6 539.5 539.5C489.5 589.4 419 616 336 616C253 616 182.4 589.5 132.5 539.5C82.6 489.5 56 419 56 336C56 253 82.5 182.4 132.5 132.5zM465.5 273.9C477.6 264.2 479.5 246.6 469.9 234.5C460.3 222.4 442.6 220.5 430.5 230.1C378 272.1 330.3 341.9 306.7 379.4C291.4 359.3 267.2 331.1 239.5 312.6C226.6 304 209.2 307.5 200.7 320.4C192.2 333.3 195.6 350.7 208.5 359.2C237.4 378.5 264.1 415.1 274.1 429.9C281.5 440.9 294 447.9 307.9 447.9C322.3 447.9 335.5 440.3 342.8 428C357.2 403.5 410 318.3 465.6 273.8z"/></svg>';
						echo '<h3 class="cimo-media-manager-metadata-title">' . sprintf( esc_html__( '%s Optimized by Cimo', 'cimo-image-optimizer' ), esc_html( $media_type_label ) ) . '</h3>';
						echo '</div>';
						echo '<ul>';

						// Optimization savings
						echo '<li class="cimo-compression-savings ' . esc_attr( $optimization_savings_class ) . '">';
						echo sprintf(
							/* translators: %s: percentage saved */
							esc_html__( 'Saved %s%%', 'cimo-image-optimizer' ),
							esc_html( $optimization_savings )
						);
						echo ' <span class="cimo-compression-savings-bytes">(' . esc_html( $kb_saved ) . ')</span>';
						echo '</li>';

						// Filesize original
						echo '<li class="cimo-filesize-original">';
						echo sprintf(
							/* translators: %s: original file size */
							esc_html__( 'Original: %s', 'cimo-image-optimizer' ),
							'<span class="cimo-value">' . esc_html( $original_size ) . '</span>'
						);
						echo '</li>';

						// Filesize optimized
						echo '<li class="cimo-filesize-optimized">';
						$arrow = $converted_filesize < $original_filesize ? '↓' : ( $converted_filesize > $original_filesize ? '↑' : '' );
						echo sprintf(
							/* translators: %s: optimized file size */
							esc_html__( 'Optimized: %s', 'cimo-image-optimizer' ),
							'<span class="cimo-value">' . esc_html( $arrow ) . ' ' . esc_html( $converted_size ) . '</span>'
						);
						echo '</li>';

						if ( ! $is_bulk_optimized ) {

							// Converted format
							echo '<li class="cimo-converted">';
							echo '🏞️ ' . sprintf(
								/* translators: %s: converted format */
								esc_html__( 'Converted to %s', 'cimo-image-optimizer' ),
								'<span class="cimo-value">' . esc_html( $converted_format ) . '</span>'
							);
							echo '</li>';

							// Conversion time
							echo '<li class="cimo-time">';
							echo '⚡️ ' . sprintf(
								/* translators: %s: conversion time */
								esc_html__( 'Done in %s', 'cimo-image-optimizer' ),
								'<span class="cimo-value">' . esc_html( $converttime_str ) . '</span>'
							);
							echo '</li>';

						} else {

							// Bulk optimization number
							echo '<li class="cimo-bulk-optimization-number">';
							echo '🏞️ ' . sprintf(
								/* translators: %s: bulk optimization count */
								esc_html__( '%s thumbnail(s) processed', 'cimo-image-optimizer' ),
								'<span class="cimo-value">' . esc_html( $bulk_optimization_count ) . '</span>'
							);
							echo '</li>';

							// Bulk optimization note
							echo '<li class="cimo-bulk-optimization-note">';
							echo '⚡️ ' . esc_html__( 'Bulk optimized', 'cimo-image-optimizer' );
							echo '</li>';
						}

						echo '</ul>';
						if ( CIMO_BUILD === 'free' && ! $is_bulk_optimized ) {
							echo '<p class="cimo-media-premium-hint">';
							echo '<a href="' . esc_url( Cimo_Admin::pricing_url( 'attachment-meta', 'admin' ) ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Apply this to your entire library →', 'cimo-image-optimizer' ) . '</a>';
							echo '</p>';
						}
						// echo '</div>';
					} else {
						echo '<p>' . esc_html__( 'Cimo did not optimize this attachment.', 'cimo-image-optimizer' ) . '</p>';
					}
				},
				'attachment',
				'side',
				'core' // Priority doesn't control order, so we use 'add_meta_box' context below
			);
		}

		// public function move_meta_box( $post_type, $context, $post ) {
		// 	if ( $post_type === 'attachment' && $context === 'side' ) {
		// 		global $wp_meta_boxes;
		// 		// Remove our meta box so we can re-insert it in the right place
		// 		if ( isset( $wp_meta_boxes['attachment']['side']['core']['cimo-data-meta-box'] ) ) {
		// 			$cimo_box = $wp_meta_boxes['attachment']['side']['core']['cimo-data-meta-box'];
		// 			unset( $wp_meta_boxes['attachment']['side']['core']['cimo-data-meta-box'] );
		
		// 			// Find the right position: after 'submitdiv' (Save)
		// 			$new_boxes = [];
		// 			foreach ( $wp_meta_boxes['attachment']['side']['core'] as $id => $box ) {
		// 				$new_boxes[ $id ] = $box;
		// 				if ( $id === 'submitdiv' ) {
		// 					$new_boxes['cimo-data-meta-box'] = $cimo_box;
		// 				}
		// 			}
		// 			// If 'submitdiv' not found, just append at the start
		// 			if ( ! isset( $new_boxes['cimo-data-meta-box'] ) ) {
		// 				$new_boxes = array_merge( [ 'cimo-data-meta-box' => $cimo_box ], $new_boxes );
		// 			}
		// 			$wp_meta_boxes['attachment']['side']['core'] = $new_boxes;
		// 		}
		// 	}
		// }
	}

	new Cimo_Meta_Box();
}
