<?php
/**
 * Plugin Name: Cimo
 * Plugin URI: https://wpcimo.com/
 * Description: Convert images to WebP on upload.
 * Version: 0.1.0
 * Author: Benjamin Intal
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

require_once __DIR__ . '/src/admin/class-script-loader.php';
require_once __DIR__ . '/src/admin/class-meta-box.php';
require_once __DIR__ . '/src/admin/class-metadata.php';
