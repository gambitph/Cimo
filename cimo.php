<?php
/**
 * Plugin Name: Cimo
 * Plugin URI: https://example.com/
 * Description: Convert images to WebP on upload.
 * Version: 0.1.0
 * Author: Your Name
 * Author URI: https://example.com/
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Text Domain: cimo
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

defined( 'CIMO_FILE' ) || define( 'CIMO_FILE', __FILE__ );

// Include the meta box file.
require_once __DIR__ . '/src/admin/class-script-loader.php';
require_once __DIR__ . '/src/admin/class-meta-box.php';

// /**
//  * Update attachment attributes to add 'cimo-data' key
//  * 
//  * @param array $metadata Attachment metadata
//  * @param int   $attachment_id Attachment ID
//  * @return array Modified metadata
//  */
// function cimo_update_attachment_attributes( $metadata, $attachment_id ) {
// 	// Add cimo-data to the metadata
// 	$metadata['cimo-data'] = 'testing';
	
// 	// Update the attachment meta in the database
// 	update_post_meta( $attachment_id, '_wp_attachment_metadata', $metadata );
	
// 	return $metadata;
// }

// // Hook to update attachment metadata when it's updated
// add_filter( 'wp_update_attachment_metadata', 'cimo_update_attachment_attributes', 10, 2 );

// // Also hook to add cimo-data when attachment is first created
// add_action( 'add_attachment', function( $attachment_id ) {
// 	}
// } );
// $metadata = wp_get_attachment_metadata( 3128 );
// if ($metadata ) {
// 	$metadata['cimo-data' ] = 'testing';
// 	update_post_meta( 3128, '_wp_attachment_metadata', $metadata );
// }

/**
 * Gets the attachment ID from a "Cimo guid" - this is a string that occurs as
 * the first characters of a post_title followed by a "-" and is generated as
 * the filename of an image when we convert it.
 */
function get_attachment_id_from_guid( $file_name ) {
	// Use a database call to search through all the posts table
	global $wpdb;
	$attachment_id = $wpdb->get_var( $wpdb->prepare( "SELECT ID FROM $wpdb->posts WHERE post_title = %s LIMIT 1", $file_name ) );
	if ( $attachment_id ) {
		return $attachment_id;
	}
	return null;
}

// Add our data to be displayed in the Media Manager
add_filter( 'wp_prepare_attachment_for_js', function( $response, $attachment, $meta ) {
	$attachment_id = $attachment->ID;
	$metadata = get_post_meta($attachment_id, '_wp_attachment_metadata', true);
	$response['cimo-data'] = $metadata['cimo-data'];
	return $response;
}, 10, 3 );
