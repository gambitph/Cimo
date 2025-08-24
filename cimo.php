<?php
/**
 * Plugin Name: Cimo
 * Plugin URI: https://wpcimo.com/
 * Description: Convert images to WebP on upload.
 * Version: 1.0.0
 * Author: Gambit Technologies, Inc
 * Author URI: http://gambit.ph
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Text Domain: cimo
 * 
 * @fs_premium_only /freemius.php, /freemius/
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

defined( 'CIMO_FILE' ) || define( 'CIMO_FILE', __FILE__ );

require_once __DIR__ . '/src/admin/class-script-loader.php';
require_once __DIR__ . '/src/admin/class-meta-box.php';
require_once __DIR__ . '/src/admin/class-metadata.php';
