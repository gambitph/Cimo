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
		this.modal.style.display = 'none'
		this._stopInterval()
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
			z-index: 999999;
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

		const title = document.createElement( 'div' )
		title.className = 'cimo-progress-title'
		title.innerText = __( 'Optimizing your files for upload…', 'cimo-image-optimizer' )
		title.style.cssText = `
			font-size: 1.2em;
			font-weight: 600;
			margin-bottom: 1.2em;
		`
		wrapper.appendChild( title )

		// Add a close button. Hide for now
		// const closeBtn = document.createElement( 'button' )
		// closeBtn.className = 'cimo-progress-close'
		// closeBtn.type = 'button'
		// closeBtn.innerHTML = '&times;'
		// closeBtn.style.cssText = `
		// 	position: absolute;
		// 	top: 0.7em;
		// 	right: 1em;
		// 	background: transparent;
		// 	border: none;
		// 	font-size: 2em;
		// 	cursor: pointer;
		// 	color: #888;
		// `
		// closeBtn.addEventListener( 'click', () => this._handleCloseClick() )
		// wrapper.appendChild( closeBtn )

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
			barContainer.style.cssText = 'margin-bottom: 1.5em;'

			const label = document.createElement( 'div' )
			label.className = 'cimo-progress-label'
			label.innerText = converter.file?.name || `File ${ i + 1 }`
			label.style.cssText = `
				margin-bottom: 0.2em;
				font-size: 1em;
			`

			const barBg = document.createElement( 'div' )
			barBg.className = 'cimo-progress-bar-bg'
			barBg.style.cssText = `
				background: #e8ecef;
				border-radius: 5px;
				height: 19px;
				width: 100%;
				overflow: hidden;
			`
			const bar = document.createElement( 'div' )
			bar.className = 'cimo-progress-bar'
			bar.style.cssText = `
				background: linear-gradient(90deg, #26c6da 0%, #0288d1 100%);
				width: 0%;
				height: 100%;
				transition: width 0.5s linear;
				border-radius: 5px 0 0 5px;
			`

			barBg.appendChild( bar )
			barContainer.appendChild( label )
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
			if ( percent > 100 ) {
				percent = 100
			}
			if ( percent < 100 ) {
				allDone = false
			}

			if ( this.progressBars[ i ] ) {
				this.progressBars[ i ].style.width = percent + '%'
			}
		} )

		// Optional: auto-close when all converters are done (progress 100%)
		if ( allDone && this.modal.style.display === 'block' ) {
			setTimeout( () => this.close(), 750 )
		}
	}
}

export { ProgressModal }
