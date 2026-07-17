<?php
/**
 * Admin notices for the Cimo plugin.
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'Cimo_Admin_Notices' ) ) {
	class Cimo_Admin_Notices {
		public function __construct() {
			if ( CIMO_BUILD === 'free' ) {
				add_action( 'admin_notices', [ $this, 'show_activation_notice' ] );
				add_action( 'admin_notices', [ $this, 'show_library_premium_notice' ], 15 );
				add_action( 'wp_ajax_cimo_dismiss_activation_ajax', [ $this, 'ajax_dismiss_activation_notice' ] );
				add_action( 'wp_ajax_cimo_dismiss_library_premium_notice', [ $this, 'ajax_dismiss_library_premium_notice' ] );
			}
		}

		/**
		 * Show the activation notice if it should be displayed.
		 */
		public function show_activation_notice() {
			if ( ! is_admin() || ! current_user_can( 'manage_options' ) ) {
				return;
			}

			// Check if we should show the activation notice
			$show_notice = get_transient( 'cimo_show_activation_notice' );
			if ( ! $show_notice ) {
				return;
			}

			?>
			<div class="notice notice-success is-dismissible cimo-activation-notice" data-nonce="<?php echo esc_attr( wp_create_nonce( 'cimo_dismiss_activation_ajax' ) ); ?>">
				<p>
					<strong><?php esc_html_e( 'Cimo Image Optimizer activated.', 'cimo-image-optimizer' ); ?></strong>
					<?php esc_html_e( 'Your images are instantly optimized within your browser as you upload — only the optimized versions ever touch your site!', 'cimo-image-optimizer' ); ?>
				</p>
				<p class="cimo-activation-notice-secondary">
					<?php
						// Translators: The %s is replaced by the Cimo Premium link.
						printf(
							esc_html__( 'Extend to your entire media library and user uploads with %s', 'cimo-image-optimizer' ),
							'<a href="' . esc_url( Cimo_Admin::pricing_url( 'activation-notice', 'admin' ) ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Cimo Premium →', 'cimo-image-optimizer' ) . '</a>'
						);
					?>
				</p>
				<p>
					<button type="button" class="button button-secondary cimo-activation-dismiss">
						<?php esc_html_e( 'Dismiss', 'cimo-image-optimizer' ); ?>
					</button>
				</p>
			</div>
			<script>
			(function() {
				document.addEventListener('DOMContentLoaded', function() {
					var isDismissing = false;
					document.addEventListener('click', function(event) {
						var notice = event.target.closest('.cimo-activation-notice');
						if (!notice || isDismissing) {
							return;
						}
						var isCoreDismiss = event.target.classList.contains('notice-dismiss');
						var isButtonDismiss = event.target.classList.contains('cimo-activation-dismiss');
						if (!isCoreDismiss && !isButtonDismiss) {
							return;
						}
						isDismissing = true;
						var nonce = notice.getAttribute('data-nonce');
						fetch(ajaxurl, {
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: 'action=cimo_dismiss_activation_ajax&nonce=' + encodeURIComponent(nonce)
						}).then(function(response) {
							if (!response.ok) {
								throw new Error('Network response was not ok');
							}
							if (isButtonDismiss) {
								notice.remove();
							}
						}).catch(function(error) {
							console.error('Error dismissing notice:', error);
							isDismissing = false;
						});
					});
				});
			})();
			</script>
			<?php
		}

		/**
		 * AJAX handler for dismissing the activation notice.
		 */
		public function ajax_dismiss_activation_notice() {
			// Verify nonce
			$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
			if ( ! $nonce || ! wp_verify_nonce( $nonce, 'cimo_dismiss_activation_ajax' ) ) {
				wp_die( esc_html__( 'Security check failed.', 'cimo-image-optimizer' ) );
			}

			// Verify user capabilities
			if ( ! current_user_can( 'manage_options' ) ) {
				wp_die( esc_html__( 'Insufficient permissions.', 'cimo-image-optimizer' ) );
			}

			// Check if transient still exists (prevent double deletion)
			if ( ! get_transient( 'cimo_show_activation_notice' ) ) {
				wp_die( 'Notice already dismissed' );
			}

			// Delete the transient
			delete_transient( 'cimo_show_activation_notice' );

			wp_send_json_success();
		}

		/**
		 * Set the activation notice to be shown.
		 * This should be called from the activation hook.
		 */
		public static function set_activation_notice() {
			set_transient( 'cimo_show_activation_notice', true, 60 * 60 * 24 ); // 24 hours
		}

		/**
		 * Media Library / Edit Media: remind admins that Premium covers existing library, forms, and more.
		 */
		public function show_library_premium_notice() {
			if ( ! is_admin() || ! current_user_can( 'manage_options' ) ) {
				return;
			}

			if ( ! apply_filters( 'cimo/admin_notices/show_library_premium', true ) ) {
				return;
			}

			if ( get_option( 'cimo_dismiss_library_premium_notice', '' ) === '1' ) {
				return;
			}

			$screen = get_current_screen();
			if ( ! $screen || ! in_array( $screen->id, [ 'upload', 'attachment' ], true ) ) {
				return;
			}

			$nonce = wp_create_nonce( 'cimo_dismiss_library_premium_notice_ajax' );
			$pricing = Cimo_Admin::pricing_url( 'library-admin-notice', 'admin' );
			$savings_label = Cimo_Stats::get_additional_savings_estimate_label();
			?>
			<div class="notice notice-info is-dismissible cimo-library-premium-notice" data-nonce="<?php echo esc_attr( $nonce ); ?>">
				<p>
					<strong><?php esc_html_e( 'Your Media Library still has unoptimized images', 'cimo-image-optimizer' ); ?></strong>
				</p>
				<p>
					<?php
					if ( $savings_label !== '' ) {
						printf(
							/* translators: %s is a human-readable size, e.g. "12.4 MB" */
							esc_html__( 'You\'re optimizing images on upload. Upgrade to Cimo premium to bulk optimize your entire media library and save %s more.', 'cimo-image-optimizer' ),
							'<strong>' . esc_html( $savings_label ) . '</strong>'
						);
					} else {
						esc_html_e( 'You\'re optimizing images on upload. Upgrade to Cimo premium to bulk optimize your entire media library.', 'cimo-image-optimizer' );
					}
					?>
				</p>
				<p style="margin-top: 16px;">
					<a href="<?php echo esc_url( $pricing ); ?>" class="button button-primary" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Optimize entire library →', 'cimo-image-optimizer' ); ?></a>
				</p>
			</div>
			<script>
			(function() {
				document.addEventListener('DOMContentLoaded', function() {
					document.addEventListener('click', function(event) {
						var notice = event.target.closest('.cimo-library-premium-notice');
						if (!notice) {
							return;
						}
						if (event.target.classList.contains('notice-dismiss')) {
							var n = notice.getAttribute('data-nonce');
							fetch(ajaxurl, {
								method: 'POST',
								headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
								body: 'action=cimo_dismiss_library_premium_notice&nonce=' + encodeURIComponent(n)
							}).then(function() {
								// Let core hide the notice; dismiss flag saved site-wide.
							});
						}
					});
				});
			})();
			</script>
			<?php
		}

		/**
		 * Permanent dismiss for library Premium notice.
		 */
		public function ajax_dismiss_library_premium_notice() {
			$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
			if ( ! $nonce || ! wp_verify_nonce( $nonce, 'cimo_dismiss_library_premium_notice_ajax' ) ) {
				wp_die( esc_html__( 'Security check failed.', 'cimo-image-optimizer' ) );
			}
			if ( ! current_user_can( 'manage_options' ) ) {
				wp_die( esc_html__( 'Insufficient permissions.', 'cimo-image-optimizer' ) );
			}

			if ( get_option( 'cimo_dismiss_library_premium_notice', '' ) === '1' ) {
				wp_die( 'Notice already dismissed' );
			}

			update_option( 'cimo_dismiss_library_premium_notice', '1', false );
			wp_send_json_success();
		}
	}

	new Cimo_Admin_Notices();
} 