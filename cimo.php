<?php
/**
 * Plugin Name: Cimo - Image Optimizer
 * Plugin URI: https://wpcimo.com
 * Description: Unlimited free image compression and WebP conversion, done instantly as you upload them. No quotas, no external servers, no limits.
 * Author: Gambit Technologies, Inc
 * Author URI: http://gambit.ph
 * License: GPLv2 or later
 * Text Domain: cimo-image-optimizer
 * Version: 1.2.2
 * 
 * @fs_premium_only /freemius.php, /freemius/, /lib/freemius-php-sdk
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

defined( 'CIMO_FILE' ) || define( 'CIMO_FILE', __FILE__ );
defined( 'CIMO_BUILD' ) || define( 'CIMO_BUILD', 'free' );

require_once __DIR__ . '/src/admin/class-script-loader.php';
require_once __DIR__ . '/src/admin/class-meta-box.php';
require_once __DIR__ . '/src/admin/class-metadata.php';
require_once __DIR__ . '/src/admin/class-admin-notices.php';
require_once __DIR__ . '/src/admin/class-stats.php';
require_once __DIR__ . '/src/admin/class-admin.php';

/**
 * Plugin activation hook.
 */
function cimo_activate() {
	// Set the activation notice to be shown
	Cimo_Admin_Notices::set_activation_notice();
}
register_activation_hook( __FILE__, 'cimo_activate' );

if ( CIMO_BUILD === 'premium' ) {
	/**
	 * Premium initialize code.
	 */
	if ( file_exists( plugin_dir_path( __FILE__ ) . 'pro__premium_only/index.php' ) ) {
		require_once( plugin_dir_path( __FILE__ ) . 'pro__premium_only/index.php' );
	}
}