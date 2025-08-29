/**
 * Execute callback after the DOM is loaded.
 * A lightweight alternative to @wordpress/dom-ready.
 *
 * @param {Function} callback A function to execute after the DOM is ready.
 */
export function domReady( callback ) {
	if ( typeof document === 'undefined' ) {
		return
	}

	if ( document.readyState === 'complete' || document.readyState === 'interactive' ) {
		return void callback()
	}

	document.addEventListener( 'DOMContentLoaded', callback )
}
