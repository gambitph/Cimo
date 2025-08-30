/**
 * Escapes a string for safe insertion into HTML to prevent XSS.
 * Similar to lodash's _.escape.
 *
 * @param {string} str
 * @return {string} escaped string
 */
export function escape( str ) {
	// If the string is not a string, convert to a string (might be a number)
	return ( typeof str !== 'string' ? String( str ) : str )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#39;' )
		.replace( /`/g, '&#96;' )
}

/**
 * Watch for the editor-canvas iframe and attach event listeners to it.
 * This handles the dynamic nature of iframes in the block editor.
 *
 * @param {Function} attachCallback Function to call when iframe is ready
 * @param {string}   iframeName     Name of the iframe to watch
 * @return {MutationObserver}      The observer instance for cleanup
 */
export function watchForEditorIframe( attachCallback, iframeName = 'editor-canvas' ) {
	// Function to find and attach listeners to the editor iframe
	const attachToEditorIframe = () => {
		const editorIframe = document.querySelector( `iframe[name="${ iframeName }"]` )
		if ( editorIframe && editorIframe.contentDocument ) {
			// Function to safely attach listeners when body is available
			const tryAttachListeners = () => {
				if ( editorIframe.contentDocument.body ) {
					attachCallback( editorIframe.contentDocument )
				} else {
					// If body is not available yet, wait a bit and try again
					setTimeout( tryAttachListeners, 50 )
				}
			}

			// Wait for the iframe to be fully loaded
			if ( editorIframe.contentDocument.readyState === 'loading' ) {
				editorIframe.addEventListener( 'load', () => {
					tryAttachListeners()
				} )
			} else {
				tryAttachListeners()
			}
		}
	}

	// Initial check
	attachToEditorIframe()

	// Also retry periodically in case iframe is added after initial check
	let retryCount = 0
	const maxRetries = 10
	const retryInterval = setInterval( () => {
		if ( retryCount >= maxRetries ) {
			clearInterval( retryInterval )
			return
		}
		retryCount++
		attachToEditorIframe()
	}, 1000 )

	// Watch for iframe additions/removals using MutationObserver
	const observer = new MutationObserver( mutations => {
		mutations.forEach( mutation => {
			// Check for added nodes
			mutation.addedNodes.forEach( node => {
				if ( node.nodeType === Node.ELEMENT_NODE ) {
					// Check if the added node is the editor iframe
					if ( node.tagName === 'IFRAME' && node.name === iframeName ) {
						attachToEditorIframe()
					} else if ( node.querySelector ) {
						const iframe = node.querySelector( `iframe[name="${ iframeName }"]` )
						if ( iframe ) {
							attachToEditorIframe()
						}
					}
				}
			} )
		} )
	} )

	// Start observing
	observer.observe( document.body, {
		childList: true,
		subtree: true,
	} )

	return observer
}
