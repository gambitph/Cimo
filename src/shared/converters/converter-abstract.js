import { __ } from '@wordpress/i18n'

/**
 * Abstract Converter class for file conversion/optimization.
 * Extend this class to implement custom converters (e.g., image, video).
 */
class Converter {
	/**
	 * @param {File|Blob} file         - The file to be converted.
	 * @param {Object}    [options={}] - Optional conversion options.
	 */
	constructor( file, options = {} ) {
		this.file = file
		this.options = options
		this._progress = 0
		this._status = __( 'Ready', 'cimo-image-optimizer' )
		this._errorMessage = null
	}

	/**
	 * Get the list of MIME types accepted by the converter.
	 * Subclasses must override.
	 */
	static get mimeTypes() {
		throw new Error( 'mimeTypes getter must be implemented by subclass' )
	}

	/**
	 * Check if the converter supports a given MIME type.
	 * Can be used without instantiating a Converter.
	 * @param {string} mimeType
	 * @return {boolean} - True if the converter supports the MIME type, false otherwise.
	 */
	static supportsMimeType( mimeType ) {
		if ( ! mimeType || typeof mimeType !== 'string' ) {
			return false
		}
		const types = this.mimeTypes
		if ( Array.isArray( types ) ) {
			return types.includes( mimeType )
		}
		return false
	}

	/**
	 * Get the current status of the converter.
	 * @return {string} The current status of the converter.
	 */
	get status() {
		return this._status
	}

	/**
	 * Get the current error message of the converter.
	 * @return {string} The current error message of the converter.
	 */
	get errorMessage() {
		return this._errorMessage
	}

	/**
	 * Current progress value for this converter. Consumers can read this to
	 * render progress indicators.
	 *
	 * @return {number} Value between 0 and 1 inclusive.
	 */
	get progress() {
		return this._progress
	}

	/**
	 * Whether to show a progress indicator for this converter.
	 *
	 * @return {boolean} - True if a progress indicator should be shown, false otherwise.
	 */
	static get showProgress() {
		return true
	}

	/**
	 * Instance alias for the showProgress flag so consumers don't need to reach
	 * into the constructor directly.
	 *
	 * @return {boolean} True if this instance should show progress, false otherwise.
	 */
	get showProgress() {
		return this.constructor.showProgress
	}

	/**
	 * Perform conversion/optimization.
	 * Subclasses must implement this method.
	 * @return {Promise<{file: File|Blob, metadata?: Object}>} Promise resolving with the converted file and optional metadata.
	 */
	async convert() {
		throw new Error( 'convert() must be implemented by subclass' )
	}

	/**
	 * Perform smart optimization.
	 * If a subclass has not implemented this method, perform regular conversion.
	 * @return {Promise<{file: File|Blob, metadata?: Object}>} Promise resolving with the converted file and optional metadata.
	 */
	async optimize() {
		return await this.convert()
	}

	/**
	 * Cancel the current conversion.
	 * Subclasses should override this to implement actual cancellation logic.
	 */
	cancel() {
	}
}

export { Converter }
