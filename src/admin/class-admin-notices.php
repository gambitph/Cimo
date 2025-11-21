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
				add_action( 'admin_init', [ $this, 'dismiss_activation_notice' ] );
				add_action( 'wp_ajax_cimo_dismiss_activation_ajax', [ $this, 'ajax_dismiss_activation_notice' ] );
			}
		}

		/**
		 * Show the activation notice if it should be displayed.
		 */
		public function show_activation_notice() {
			// Only show on admin pages
			if ( ! is_admin() ) {
				return;
			}

			// Check if we should show the activation notice
			$show_notice = get_transient( 'cimo_show_activation_notice' );
			if ( ! $show_notice ) {
				return;
			}

			// Get the current user ID for the dismiss nonce
			$user_id = get_current_user_id();
			$dismiss_url = wp_nonce_url(
				add_query_arg( 'cimo_dismiss_activation', '1', admin_url() ),
				'cimo_dismiss_activation_' . $user_id,
				'cimo_nonce'
			);

			?>
			<div class="notice notice-success is-dismissible cimo-activation-notice" data-nonce="<?php echo esc_attr( wp_create_nonce( 'cimo_dismiss_activation_ajax' ) ); ?>">
				<p>
					<strong><?php esc_html_e( 'Cimo Image Optimizer activated.', 'cimo-image-optimizer' ); ?></strong>
					<?php esc_html_e( 'Your images are instantly optimized within your browser as you upload — only the optimized versions ever touch your site!', 'cimo-image-optimizer' ); ?>
				</p>
				<p>
					<a href="<?php echo esc_url( $dismiss_url ); ?>" class="button button-secondary">
						<?php esc_html_e( 'Dismiss', 'cimo-image-optimizer' ); ?>
					</a>
				</p>
			</div>
			<script>
			document.addEventListener("DOMContentLoaded", function() {
				var isDismissing = false;
				
				document.addEventListener("click", function(event) {
					if (event.target.classList.contains("notice-dismiss") && 
						event.target.closest(".cimo-activation-notice") &&
						!isDismissing) {
						
						isDismissing = true;
						var notice = event.target.closest(".cimo-activation-notice");
						var nonce = notice.getAttribute("data-nonce");
						
						fetch(ajaxurl, {
							method: "POST",
							headers: {
								"Content-Type": "application/x-www-form-urlencoded",
							},
							body: "action=cimo_dismiss_activation_ajax&nonce=" + encodeURIComponent(nonce)
						})
						.then(function(response) {
							if (!response.ok) {
								throw new Error("Network response was not ok");
							}
						})
						.catch(function(error) {
							console.error("Error dismissing notice:", error);
							isDismissing = false; // Reset flag on error
						});
					}
				});
			});
			</script>
			<?php
		}

		/**
		 * Handle dismissing the activation notice.
		 */
		public function dismiss_activation_notice() {
			// Check if user wants to dismiss the notice
			if ( ! isset( $_GET['cimo_dismiss_activation'] ) || sanitize_text_field( wp_unslash( $_GET['cimo_dismiss_activation'] ) ) !== '1' ) {
				return;
			}

			// Verify nonce
			$user_id = get_current_user_id();
			$nonce   = isset( $_GET['cimo_nonce'] ) ? sanitize_text_field( wp_unslash( $_GET['cimo_nonce'] ) ) : '';
			if ( ! $nonce || ! wp_verify_nonce( $nonce, 'cimo_dismiss_activation_' . $user_id ) ) {
				wp_die( esc_html__( 'Security check failed.', 'cimo-image-optimizer' ) );
			}

			// Delete the transient
			delete_transient( 'cimo_show_activation_notice' );

			// Redirect back to remove query parameters
			wp_safe_redirect( remove_query_arg( [ 'cimo_dismiss_activation', 'cimo_nonce' ] ) );
			exit;
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

			wp_die( 'success' );
		}

		/**
		 * Set the activation notice to be shown.
		 * This should be called from the activation hook.
		 */
		public static function set_activation_notice() {
			set_transient( 'cimo_show_activation_notice', true, 60 * 60 * 24 ); // 24 hours
		}
	}

	new Cimo_Admin_Notices();
} 