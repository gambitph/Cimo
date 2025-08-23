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
			add_action( 'add_meta_boxes', [ $this, 'add_meta_box' ] );

			// Move the Cimo Data meta box before "Attachment Attributes" and after "Save"
			add_action( 'do_meta_boxes', [ $this, 'move_meta_box' ], 20, 3 );
		}

		public function add_meta_box() {
			add_meta_box(
				'cimo_data_meta_box',
				__( 'Cimo Optimization', 'cimo' ),
				function( $post ) {
					$metadata = get_post_meta( $post->ID, '_wp_attachment_metadata', true );
					if ( isset( $metadata['cimo-data'] ) ) {
						$cimo_data = esc_html( $metadata['cimo-data'] );
						echo '<p><strong>Cimo Data:</strong> ' . $cimo_data . '</p>';
					} else {
						echo '<p>No Cimo Data found for this attachment.</p>';
					}
				},
				'attachment',
				'side',
				'core' // Priority doesn't control order, so we use 'add_meta_box' context below
			);
		}

		public function move_meta_box( $post_type, $context, $post ) {
			if ( $post_type === 'attachment' && $context === 'side' ) {
				global $wp_meta_boxes;
				// Remove our meta box so we can re-insert it in the right place
				if ( isset( $wp_meta_boxes['attachment']['side']['core']['cimo_data_meta_box'] ) ) {
					$cimo_box = $wp_meta_boxes['attachment']['side']['core']['cimo_data_meta_box'];
					unset( $wp_meta_boxes['attachment']['side']['core']['cimo_data_meta_box'] );
		
					// Find the right position: after 'submitdiv' (Save)
					$new_boxes = [];
					foreach ( $wp_meta_boxes['attachment']['side']['core'] as $id => $box ) {
						$new_boxes[ $id ] = $box;
						if ( $id === 'submitdiv' ) {
							$new_boxes['cimo_data_meta_box'] = $cimo_box;
						}
					}
					// If 'submitdiv' not found, just append at the start
					if ( ! isset( $new_boxes['cimo_data_meta_box'] ) ) {
						$new_boxes = array_merge( [ 'cimo_data_meta_box' => $cimo_box ], $new_boxes );
					}
					$wp_meta_boxes['attachment']['side']['core'] = $new_boxes;
				}
			}
		}
	}

	new Cimo_Meta_Box();
}
