import { __ } from '@wordpress/i18n'

class ProgressModal {
	constructor( converters = [], closeHandler = null ) {
		this.converters = Array.isArray( converters )
			? converters.filter( c => c?.showProgress === true )
			: []
		this.closeHandler = typeof closeHandler === 'function' ? closeHandler : null
		this.interval = null
		this.modal = null
		this.progressBars = []
		this._setupModal()
	}

	open() {
		if ( ! this.modal ) {
			return
		}
		if ( this.converters.length === 0 ) {
			return
		}
		this.modal.style.display = 'flex'
		this._startInterval()
	}

	_handleCloseClick() {
		// eslint-disable-next-line no-alert
		const confirmed = confirm(
			__( 'Closing this dialog will cancel the uploading process. Are you sure you want to continue?', 'cimo-image-optimizer' )
		)
		if ( confirmed ) {
			if ( this.closeHandler ) {
				this.closeHandler()
			}
			this.close()
		}
	}

	close() {
		if ( ! this.modal ) {
			return
		}
		if ( this.converters.length === 0 ) {
			return
		}
		setTimeout( () => {
			this.modal.style.display = 'none'
			this._stopInterval()
		}, 300 )
	}

	_setupModal() {
		// Create overlay
		this.modal = document.createElement( 'div' )
		this.modal.className = 'cimo-progress-modal'
		this.modal.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			background: rgba(0,0,0,0.35);
			display: none;
			justify-content: center;
			align-items: center;
			z-index: 9999999;
		`

		const wrapper = document.createElement( 'div' )
		wrapper.className = 'cimo-progress-wrapper'
		wrapper.style.cssText = `
			background: #fff;
			border-radius: 8px;
			padding: 2em 2em 1em 2em;
			max-width: 500px;
			box-shadow: 0 6px 32px rgba(0,0,0,0.24);
			position: relative;
			width: 90%;
		`

		const title = document.createElement( 'h3' )
		title.className = 'cimo-progress-title'
		title.innerText = __( 'Optimizing your files', 'cimo-image-optimizer' )
		title.style.cssText = `
			font-size: 1.6em !important;
			font-weight: 600 !important;
			margin: 0 0 0.5em !important;
		`
		wrapper.appendChild( title )

		const subtitle = document.createElement( 'div' )
		subtitle.className = 'cimo-progress-subtitle'
		subtitle.innerText = __( 'Preparing your files for upload…', 'cimo-image-optimizer' )
		subtitle.style.cssText = `
			margin-bottom: 2em;
		`
		wrapper.appendChild( subtitle )

		// Add a close button. Hide for now
		if ( this.closeHandler ) {
			const closeBtn = document.createElement( 'button' )
			closeBtn.className = 'cimo-progress-close'
			closeBtn.type = 'button'
			closeBtn.innerHTML = '&times;'
			closeBtn.style.cssText = `
				position: absolute;
				top: 0.7em;
				right: 1em;
				background: transparent;
				border: none;
				font-size: 2em;
				cursor: pointer;
				color: #888;
			`
			closeBtn.addEventListener( 'click', () => this._handleCloseClick() )
			wrapper.appendChild( closeBtn )
		}

		// Progress bar(s)
		this.progressBars = []
		this.progressList = document.createElement( 'div' )
		this.progressList.className = 'cimo-progress-list'
		wrapper.appendChild( this.progressList )

		this.modal.appendChild( wrapper )
		document.body.appendChild( this.modal )

		this._renderProgressBars()
	}

	_renderProgressBars() {
		this.progressList.innerHTML = ''
		this.progressBars = []

		this.converters.forEach( ( converter, i ) => {
			const barContainer = document.createElement( 'div' )
			barContainer.className = 'cimo-progress-bar-container'
			barContainer.style.cssText = `
				margin-bottom: 1em;
				padding: 16px 16px 16px 70px;
				border: 1px solid #e2e8f0;
				border-radius: 12px;
				position: relative;
			`

			// Affix the icon on the left (using video/audio as appropriate)
			const icon = document.createElement( 'span' )
			icon.className = 'cimo-stat-icon'
			icon.style.cssText = `
				background: #16a2491a;
        		color: #16a249;
				padding: 8px;
				border-radius: 8px;
				margin-bottom: 8px;
				display: flex;
				align-items: center;
				justify-content: center;
				position: absolute;
				left: 16px;
				top: 16px;
			`

			// Pick icon SVG for video, audio, or default(image)
			let iconSvg = ''
			if ( converter.file && converter.file.type && converter.file.type.startsWith( 'video/' ) ) {
				iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-video-icon lucide-video"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`
			} else if ( converter.file && converter.file.type && converter.file.type.startsWith( 'audio/' ) ) {
				iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-music-icon lucide-music"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`
			} else {
				// default: image icon
				iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-icon lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`
			}
			icon.innerHTML = iconSvg

			barContainer.appendChild( icon )

			const label = document.createElement( 'div' )
			label.className = 'cimo-progress-label'
			label.innerText = converter.file?.name || `File ${ i + 1 }`
			label.style.cssText = `
				margin-bottom: 0.2em;
				font-size: 1em;
				font-weight: 600;
				max-width: 80%;
				white-space: nowrap;
				text-overflow: ellipsis;
				overflow: hidden;
			`

			const sizeLabel = document.createElement( 'div' )
			sizeLabel.className = 'cimo-size-label'
			// Show the filesize in human readable format
			sizeLabel.innerText = converter.file && converter.file.size
				? ( ( converter.file.size / 1024 / 1024 ) >= 1
					? ( converter.file.size / 1024 / 1024 ).toFixed( 2 ) + ' MB'
					: ( converter.file.size / 1024 ).toFixed( 1 ) + ' KB' )
				: ''
			sizeLabel.style.cssText = `
				margin-bottom: 0.5em;
				font-size: 1em;
			`

			const progressStatusFlex = document.createElement( 'div' )
			progressStatusFlex.style.cssText = `
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 0.5em;
			`

			const statusLabel = document.createElement( 'div' )
			statusLabel.className = 'cimo-progress-status-label'
			statusLabel.innerText = __( 'Optimizing…', 'cimo-image-optimizer' )
			statusLabel.style.cssText = `
				font-size: 1em;
				color: #3b3b3b;
			`

			const percentageLabel = document.createElement( 'div' )
			percentageLabel.className = 'cimo-percentage-label'
			percentageLabel.innerText = `0%`
			percentageLabel.style.cssText = `
				font-size: 1em;
			`

			progressStatusFlex.appendChild( statusLabel )
			progressStatusFlex.appendChild( percentageLabel )

			const barBg = document.createElement( 'div' )
			barBg.className = 'cimo-progress-bar-bg'
			barBg.style.cssText = `
				background: #e8ecef;
				border-radius: 5px;
				height: 8px;
				width: 100%;
				overflow: hidden;
			`
			const bar = document.createElement( 'div' )
			bar.className = 'cimo-progress-bar'
			bar.style.cssText = `
				background: linear-gradient(90deg, #00d8f0 0%, #2bc566 100%);
				width: 0%;
				height: 100%;
				transition: width 0.5s linear;
				border-radius: 5px 0 0 5px;
			`

			bar.sizeLabelEl = sizeLabel
			bar.statusLabelEl = statusLabel
			bar.percentageLabelEl = percentageLabel

			barBg.appendChild( bar )
			barContainer.appendChild( label )
			barContainer.appendChild( sizeLabel )
			barContainer.appendChild( progressStatusFlex )
			barContainer.appendChild( barBg )
			this.progressList.appendChild( barContainer )
			this.progressBars.push( bar )
		} )
	}

	_startInterval() {
		if ( this.interval ) {
			return
		}
		this._updateProgress() // Do first update immediately
		this.interval = setInterval( () => this._updateProgress(), 500 )
	}

	_stopInterval() {
		if ( this.interval ) {
			clearInterval( this.interval )
			this.interval = null
		}
	}

	_updateProgress() {
		let allDone = true

		this.converters.forEach( ( converter, i ) => {
			let percent = converter.progress * 100

			if (
				typeof percent !== 'number' ||
				isNaN( percent ) ||
				percent < 0
			) {
				percent = 0
			}
			if ( percent >= 100 ) {
				percent = 100
				this.progressBars[ i ].statusLabelEl.innerText = __( 'Complete', 'cimo-image-optimizer' )
			}
			if ( percent < 100 ) {
				allDone = false
			}

			if ( this.progressBars[ i ] ) {
				this.progressBars[ i ].style.width = percent + '%'
				this.progressBars[ i ].percentageLabelEl.innerText = parseInt( percent ) + '%'
			}
		} )

		// Optional: auto-close when all converters are done (progress 100%)
		if ( allDone && this.modal.style.display === 'block' ) {
			setTimeout( () => this.close(), 750 )
		}
	}
}

export { ProgressModal }
