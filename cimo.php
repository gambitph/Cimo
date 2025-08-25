<?php
/**
 * Plugin Name: Cimo - Free Image Optimizer & WebP Converter
 * Plugin URI: https://wpcimo.com/
 * Description: Unlimited free image compression and WebP conversion, done instantly as you upload them. No quotas, no external servers, no limits.
 * Author: Gambit Technologies, Inc
 * Author URI: http://gambit.ph
 * Text Domain: cimo
 * Version: 1.0.0
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
