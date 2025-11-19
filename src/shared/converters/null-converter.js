/**
 * NullConverter: A fallback converter that returns the original file as-is.
 */

import { Converter } from './converter-abstract'

class NullConverter extends Converter {
	static get showProgress() {
		return false
	}

	async convert() {
		return { file: this.file, metadata: null }
	}
}

export { NullConverter }
