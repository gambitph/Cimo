import {
	useState, useEffect, useCallback, Fragment,
} from '@wordpress/element'
import {
	Button, RangeControl, ToggleControl, TextControl,
	__experimentalToggleGroupControl as ToggleGroupControl, // eslint-disable-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption, // eslint-disable-line @wordpress/no-unsafe-wp-apis
} from '@wordpress/components'
import { applyFilters } from '@wordpress/hooks'
import apiFetch from '@wordpress/api-fetch'
import { __, sprintf } from '@wordpress/i18n'
import { buildPricingUrl } from '~cimo/shared/pricing-url'
import cimoLogo from './assets/logo-long.webp'

const buildType = applyFilters( 'cimo.admin.settings.buildType', 'free' )
const BulkOptimizationComponent = applyFilters( 'cimo.admin.settings.bulkOptimizationComponent', Fragment )

const AdminSettings = () => {
	const [ settings, setSettings ] = useState( {
		// General settings
		optimizeAllMedia: 0,
		disableWpScaling: 1,
		disableThumbnailGeneration: 0,
		thumbnailSizes: [], // Stores DISABLED thumbnail sizes

		// Image optimization settings
		webpQuality: 80,
		maxImageDimension: '',

		// LQIP settings
		lqipEnabled: 0,
		lqipPulseSpeed: '',
		lqipBrightness: '',
		lqipFadeDuration: '',

		// Video Optimization settings
		videoOptimizationEnabled: 1,
		videoQuality: 3,
		videoMaxResolution: '',

		// Audio Optimization settings
		audioOptimizationEnabled: 1,
		audioQuality: 128,

		// SVG Optimization settings
		svgUpload: 0,
		svgOptimizationEnabled: 1,

		// Stealth Mode settings
		stealthModeEnabled: 0,
	} )
	const [ imageSizes, setImageSizes ] = useState( [] )
	const [ isSaving, setIsSaving ] = useState( false )
	const [ saveMessage, setSaveMessage ] = useState( '' )
	const [ isLoading, setIsLoading ] = useState( true )
	const [ hasUnsavedChanges, setHasUnsavedChanges ] = useState( false )
	const [ isRatingDismissed, setIsRatingDismissed ] = useState( () => {
		if ( typeof window === 'undefined' ) {
			return false
		}
		return window.cimoAdmin?.ratingDismissed === '1'
	} )

	// Load settings and image sizes on component mount
	useEffect( () => {
		const loadData = async () => {
			// Load image sizes from localized data
			if ( window.cimoAdmin && window.cimoAdmin.imageSizes ) {
				setImageSizes( window.cimoAdmin.imageSizes )
			}
			// Load settings from REST API
			await loadSettings()
			setIsLoading( false )
		}
		loadData()
	}, [] )

	const loadSettings = async () => {
		try {
			const data = await apiFetch( {
				path: '/wp/v2/settings',
			} )

			const cimoOptions = data.cimo_options || {}
			const fetchedSettings = {
				// General Settings
				optimizeAllMedia: cimoOptions.optimize_all_media !== undefined ? cimoOptions.optimize_all_media : 0,
				disableWpScaling: cimoOptions.disable_wp_scaling !== undefined ? cimoOptions.disable_wp_scaling : 1,
				disableThumbnailGeneration: cimoOptions.disable_thumbnail_generation !== undefined ? cimoOptions.disable_thumbnail_generation : 0,
				thumbnailSizes: cimoOptions.thumbnail_sizes || [],

				// Image Optimization settings
				webpQuality: cimoOptions.webp_quality !== undefined ? cimoOptions.webp_quality : 80,
				maxImageDimension: cimoOptions.max_image_dimension || '',

				// LQIP settings
				lqipEnabled: cimoOptions.lqip_enabled !== undefined ? cimoOptions.lqip_enabled : 0,
				lqipPulseSpeed: cimoOptions.lqip_pulse_speed !== undefined ? cimoOptions.lqip_pulse_speed : '',
				lqipBrightness: cimoOptions.lqip_brightness !== undefined ? cimoOptions.lqip_brightness : '',
				lqipFadeDuration: cimoOptions.lqip_fade_duration !== undefined ? cimoOptions.lqip_fade_duration : '',

				// Video Optimization settings
				videoOptimizationEnabled: cimoOptions.video_optimization_enabled !== undefined ? cimoOptions.video_optimization_enabled : 1,
				videoQuality: cimoOptions.video_quality !== undefined ? cimoOptions.video_quality : 3,
				videoMaxResolution: cimoOptions.video_max_resolution || '',

				// Audio Optimization settings
				audioOptimizationEnabled: cimoOptions.audio_optimization_enabled !== undefined ? cimoOptions.audio_optimization_enabled : 1,
				audioQuality: cimoOptions.audio_quality !== undefined ? cimoOptions.audio_quality : 128,

				// SVG Optimization settings
				svgUpload: cimoOptions.svg_upload !== undefined ? cimoOptions.svg_upload : 0,
				svgOptimizationEnabled: cimoOptions.svg_optimization_enabled !== undefined ? cimoOptions.svg_optimization_enabled : 1,

				// Stealth Mode settings
				stealthModeEnabled: cimoOptions.stealth_mode_enabled !== undefined ? cimoOptions.stealth_mode_enabled : 0,
			}
			setSettings( fetchedSettings )
			setHasUnsavedChanges( false )
		} catch ( error ) {
			// Error loading settings
		}
	}

	const handleInputChange = useCallback( ( field, value ) => {
		setSettings( prev => ( {
			...prev,
			[ field ]: value,
		} ) )
		setHasUnsavedChanges( true )
	}, [] )

	const handleThumbnailSizeChange = ( sizeName, isChecked ) => {
		setSettings( prev => {
			// thumbnailSizes stores DISABLED sizes
			// Empty array means all sizes are enabled (default)
			let newSizes = [ ...prev.thumbnailSizes ]

			if ( isChecked ) {
			// Size is being enabled, remove from disabled list
				newSizes = newSizes.filter( size => size !== sizeName )
			} else if ( ! newSizes.includes( sizeName ) ) {
			// Size is being disabled, add to disabled list
				newSizes.push( sizeName )
			}

			return {
				...prev,
				thumbnailSizes: newSizes,
			}
		} )
	}

	const applyGeneralRecommendedSettings = () => {
		setSettings( settings => {
			return {
				...settings,
				optimizeAllMedia: 0,
				disableWpScaling: 1,
				disableThumbnailGeneration: 1,
				thumbnailSizes: [],
			}
		} )
	}

	const applyGeneralDefaultSettings = () => {
		setSettings( settings => {
			return {
				...settings,
				optimizeAllMedia: 0,
				disableWpScaling: 1,
				disableThumbnailGeneration: 0,
				thumbnailSizes: [],
			}
		} )
	}

	const applyImageRecommendedSettings = () => {
		setSettings( settings => {
			return {
				...settings,
				webpQuality: 80,
				maxImageDimension: 1920,
			}
		} )
	}

	const applyImageDefaultSettings = () => {
		setSettings( settings => {
			return {
				...settings,
				webpQuality: '',
				maxImageDimension: '',
			}
		} )
	}

	const applyLQIPDefaultSettings = () => {
		setSettings( settings => {
			return {
				...settings,
				// lqipEnabled: 0,
				lqipPulseSpeed: '',
				lqipBrightness: '',
				lqipFadeDuration: '',
			}
		} )
	}

	const applyVideoRecommendedSettings = () => {
		setSettings( settings => {
			return {
				...settings,
				videoOptimizationEnabled: 1,
				videoQuality: 3,
				videoMaxResolution: '1440',
			}
		} )
	}

	const applyVideoDefaultSettings = () => {
		setSettings( settings => {
			return {
				...settings,
				videoOptimizationEnabled: 1,
				videoQuality: '',
				videoMaxResolution: '',
			}
		} )
	}

	const applyAudioDefaultSettings = () => {
		setSettings( settings => {
			return {
				...settings,
				audioOptimizationEnabled: 1,
				audioQuality: '',
			}
		} )
	}

	const applySVGDefaultSettings = () => {
		setSettings( settings => {
			return {
				...settings,
				svgUpload: 0,
				svgOptimizationEnabled: 1,
			}
		} )
	}

	const applyStealthModeDefaultSettings = () => {
		setSettings( settings => {
			return {
				...settings,
				stealthModeEnabled: 0,
			}
		} )
	}

	const handleDismissRating = useCallback( async () => {
		setIsRatingDismissed( true )

		try {
			await apiFetch( {
				path: '/wp/v2/settings',
				method: 'POST',
				data: {
					// eslint-disable-next-line camelcase
					cimo_rating_dismissed: '1',
				},
			} )
		} catch ( error ) {
			setIsRatingDismissed( false )
		}
	}, [] )

	const handleSubmit = async e => {
		e.preventDefault()
		setIsSaving( true )
		setSaveMessage( '' )
		setHasUnsavedChanges( false )

		try {
			/* eslint-disable camelcase */
			await apiFetch( {
				path: '/wp/v2/settings',
				method: 'POST',
				data: {
					cimo_options: {
						// General settings
						optimize_all_media: settings.optimizeAllMedia,
						disable_wp_scaling: settings.disableWpScaling,
						disable_thumbnail_generation: settings.disableThumbnailGeneration,
						thumbnail_sizes: settings.thumbnailSizes,

						// Image Optimization settings
						webp_quality: parseInt( settings.webpQuality ) || 0,
						max_image_dimension: parseInt( settings.maxImageDimension ) || 0,

						// LQIP settings
						lqip_enabled: settings.lqipEnabled,
						lqip_pulse_speed: parseFloat( settings.lqipPulseSpeed ) || 0,
						lqip_brightness: parseFloat( settings.lqipBrightness ) || 0,
						lqip_fade_duration: parseFloat( settings.lqipFadeDuration ) || 0,

						// Video Optimization settings
						video_optimization_enabled: settings.videoOptimizationEnabled,
						video_quality: settings.videoQuality || 0,
						video_max_resolution: settings.videoMaxResolution || '',

						// Audio Optimization settings
						audio_optimization_enabled: settings.audioOptimizationEnabled,
						audio_quality: settings.audioQuality || 0,

						// SVG Optimization settings
						svg_upload: settings.svgUpload,
						svg_optimization_enabled: settings.svgOptimizationEnabled,

						// Stealth Mode settings
						stealth_mode_enabled: settings.stealthModeEnabled,
					},
				},
			} )
			/* eslint-enable camelcase */

			setSaveMessage( __( 'Settings saved successfully!', 'cimo-image-optimizer' ) )
		} catch ( error ) {
			setSaveMessage( __( 'Error saving settings.', 'cimo-image-optimizer' ) )
		} finally {
			setIsSaving( false )
			// Clear message after 3 seconds
			setTimeout( () => setSaveMessage( '' ), 3000 )
		}
	}

	if ( isLoading ) {
		return (
			<div className="cimo-admin-settings-wrap">
				<div className="cimo-loading">
					<p>{ __( 'Loading settings…', 'cimo-image-optimizer' ) }</p>
				</div>
			</div>
		)
	}

	return (
		<div className={ 'cimo-admin-settings-wrap' + ( window.cimoAdmin?.isPremium ? ' cimo-is-premium' : '' ) }>
			<div className="cimo-header">
				<img className="cimo-logo" src={ cimoLogo } alt={ __( 'Cimo Logo', 'cimo-image-optimizer' ) } height="35" />

				{ /* Statistics Section */ }
				<div className="cimo-stats-section" id="cimo-stats">
					<div className="cimo-stats-column cimo-stats-column-big">
						<h3>{ __( 'Total Storage Saved', 'cimo-image-optimizer' ) }</h3>
						<div className="cimo-stats-main">
							<span className="cimo-stat-value">{ window.cimoAdmin.stats.total_storage_saved }</span>
							<span className="cimo-stat-percentage">↓ { window.cimoAdmin.stats.percentage_saved }% { __( 'reduction', 'cimo-image-optimizer' ) }</span>
						</div>
						<div className="cimo-stats-details">{ __( 'Across all optimized media files', 'cimo-image-optimizer' ) }</div>
					</div>
					<div className="cimo-stats-column cimo-stats-column-small">
						<div className="cimo-stat-icon">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image w-5 h-5 text-primary" data-lov-id="src/pages/Index.tsx:66:22" data-lov-name="Image" data-component-path="src/pages/Index.tsx" data-component-line="66" data-component-file="Index.tsx" data-component-name="Image" data-component-content="%7B%22className%22%3A%22w-5%20h-5%20text-primary%22%7D"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
						</div>
						<span className="cimo-stat-value">{ window.cimoAdmin.stats.media_optimized }</span>
						<span className="cimo-stat-label">{ __( 'Media Files Optimized', 'cimo-image-optimizer' ) }</span>
					</div>
					<div className="cimo-stats-column cimo-stats-column-small">
						<div className="cimo-stat-icon">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hard-drive w-5 h-5 text-destructive" data-lov-id="src/pages/Index.tsx:80:22" data-lov-name="HardDrive" data-component-path="src/pages/Index.tsx" data-component-line="80" data-component-file="Index.tsx" data-component-name="HardDrive" data-component-content="%7B%22className%22%3A%22w-5%20h-5%20text-destructive%22%7D"><line x1="22" x2="2" y1="12" y2="12"></line><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" x2="6.01" y1="16" y2="16"></line><line x1="10" x2="10.01" y1="16" y2="16"></line></svg>
						</div>
						<span className="cimo-stat-value">{ window.cimoAdmin.stats.before }</span>
						<span className="cimo-stat-label">{ __( 'Original Size', 'cimo-image-optimizer' ) }</span>
					</div>
					<div className="cimo-stats-column cimo-stats-column-small">
						<div className="cimo-stat-icon">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap w-5 h-5 text-accent" data-lov-id="src/pages/Index.tsx:94:22" data-lov-name="Zap" data-component-path="src/pages/Index.tsx" data-component-line="94" data-component-file="Index.tsx" data-component-name="Zap" data-component-content="%7B%22className%22%3A%22w-5%20h-5%20text-accent%22%7D"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path></svg>
						</div>
						<span className="cimo-stat-value">{ window.cimoAdmin.stats.after }</span>
						<span className="cimo-stat-label">{ __( 'Optimized Size', 'cimo-image-optimizer' ) }</span>
					</div>
				</div>
			</div>

			{ ( () => {
				const savedStr = window.cimoAdmin?.stats?.total_storage_saved
				let showRating = false
				if ( typeof savedStr === 'string' ) {
					const match = savedStr.match( /^([\d.]+)\s*([a-zA-Z]+)/ )
					if ( match ) {
						const num = parseFloat( match[ 1 ] )
						const unit = match[ 2 ].toUpperCase()
						if ( unit === 'MB' && num > 5 ) {
							showRating = true
						}
					}
				}

				if ( showRating && ! isRatingDismissed ) {
					return (
						<div className="cimo-header cimo-rating-notice">
							<div className="cimo-rating-notice-content">
								<h3 className="cimo-rating-title">
									{ __( 'Loving the instant storage & server resource savings?', 'cimo-image-optimizer' ) }
								</h3>
								<p className="cimo-rating-description">
									{ sprintf(
										// translators: %s is replaced with the total storage saved (e.g. "1.5 GB")
										__( "You've saved over %s! If Cimo is helping your site, please consider leaving us a 5-star rating and help others discover Cimo!", 'cimo-image-optimizer' ),
										window.cimoAdmin.stats.total_storage_saved
									) }
								</p>
								<div className="cimo-rating-buttons">
									<Button
										variant="primary"
										href="https://wordpress.org/support/plugin/cimo-image-optimizer/reviews/#new-post"
										target="_blank"
										rel="noopener noreferrer"
										className="cimo-rating-rate-now"
										__next40pxDefaultSize
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
										{ __( 'Rate Now', 'cimo-image-optimizer' ) }
									</Button>
									<Button
										variant="secondary"
										className="cimo-rating-no-thanks"
										onClick={ handleDismissRating }
										__next40pxDefaultSize
									>
										{ __( "Don\'t show this again, I've already rated", 'cimo-image-optimizer' ) }
									</Button>
								</div>
							</div>
						</div>
					)
				}
				return null
			} )() }

			<form onSubmit={ handleSubmit } className="cimo-settings-form">
				<div className="cimo-settings-section-wrapper">
					<div className="cimo-settings-section cimo-settings-section-info">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
						{ buildType === 'free' && (
							<span>{ __( 'Your images are instantly optimized within your browser as you upload — only the optimized versions ever touch your site!', 'cimo-image-optimizer' ) }</span>
						) }
						{ buildType === 'premium' && (
							<span>{ __( 'Your images, videos and audio files are instantly optimized within your browser as you upload — only the optimized versions ever touch your site!', 'cimo-image-optimizer' ) }</span>
						) }
					</div>

					{ /* General Settings */ }

					<div className="cimo-settings-section cimo-settings-section-general">
						<div className="cimo-settings-header">
							<h2>
								<span aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image-icon lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
								</span>
								{ __( 'General Settings', 'cimo-image-optimizer' ) }
							</h2>
							<Button
								variant="secondary"
								onClick={ applyGeneralRecommendedSettings }
							>
								{ __( 'Recommended', 'cimo-image-optimizer' ) }
							</Button>
						</div>

						{ /* Optimize All Media Uploads*/ }
						<div className="cimo-setting-field">
							<ToggleControl
								__nextHasNoMarginBottom
								label={
									<span>
										{ __( 'Optimize All Media Uploads', 'cimo-image-optimizer' ) }
										{ buildType === 'free' && (
											<span className="cimo-premium-tag">
												{ __( 'Premium', 'cimo-image-optimizer' ) }
											</span>
										) }
									</span>
								}
								checked={ settings.optimizeAllMedia === 1 }
								disabled={ buildType === 'free' }
								onChange={ checked => handleInputChange( 'optimizeAllMedia', checked ? 1 : 0 ) }
								help={ __( 'Enable to optimize all files uploaded via any input type="file" on your website, including those in the admin pages, plugin forms and custom HTML upload forms in the frontend of your stie. When disabled, only uploads handled by Cimo\'s official integrations will be optimized.', 'cimo-image-optimizer' ) }
							/>
						</div>

						{ /* WordPress Auto-Scaling */ }
						<div className="cimo-setting-field">
							<ToggleControl
								__nextHasNoMarginBottom
								label={ __( 'WordPress Automatic Image Scaling', 'cimo-image-optimizer' ) }
								checked={ settings.disableWpScaling === 1 }
								onChange={ checked => handleInputChange( 'disableWpScaling', checked ? 1 : 0 ) }
								help={ __( 'WordPress automatically scales images larger than 2560px. Disable this option to allow uploads of any size.', 'cimo-image-optimizer' ) }
							/>
						</div>

						{ /* Thumbnail Generation */ }
						<div className="cimo-setting-field">
							<ToggleControl
								__nextHasNoMarginBottom
								label={ __( 'WordPress Thumbnail Generation', 'cimo-image-optimizer' ) }
								checked={ settings.disableThumbnailGeneration === 0 }
								onChange={ checked => handleInputChange( 'disableThumbnailGeneration', checked ? 0 : 1 ) }
								help={ __( 'By default, WordPress generates multiple image sizes (thumbnail, medium, large, etc.) when you upload images. Disable this option to save disk space.', 'cimo-image-optimizer' ) }
							/>

							{ settings.disableThumbnailGeneration === 0 && (
								<div className="cimo-image-sizes-list">
									<h4 className="cimo-image-sizes-heading">
										{ __( 'Individual Image Sizes', 'cimo-image-optimizer' ) }
									</h4>
									<p className="description">
										{ __( 'You can turn off generation for individual image sizes:', 'cimo-image-optimizer' ) }
									</p>
									{ imageSizes.map( size => {
										// thumbnailSizes stores DISABLED sizes, so invert the logic
										const isEnabled = ! settings.thumbnailSizes.includes( size.name )
										return (
											<ToggleControl
												key={ size.name }
												label={ size.name }
												// help={ `${ size.width } × ${ size.height } px` }
												checked={ isEnabled }
												onChange={ checked => handleThumbnailSizeChange( size.name, checked ) }
											/>
										)
									} ) }
									{ imageSizes.length === 0 && (
										<div className="notice notice-warning cimo-image-sizes-warning">
											<p>
												{ __( 'No image sizes detected. If you just re-enabled thumbnail generation, please save settings and refresh this page.', 'cimo-image-optimizer' ) }
											</p>
										</div>
									) }
								</div>
							) }
						</div>

						<Button
							variant="tertiary"
							className="cimo-reset-button"
							onClick={ applyGeneralDefaultSettings }
						>
							{ __( 'Reset to Default', 'cimo-image-optimizer' ) }
						</Button>
					</div>

					{ /* Image Optimization */ }

					<div className="cimo-settings-section">
						<div className="cimo-settings-header">
							<h2>
								<span aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image-icon lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
								</span>
								{ __( 'Image Optimization Settings', 'cimo-image-optimizer' ) }
							</h2>
							<Button
								variant="secondary"
								onClick={ applyImageRecommendedSettings }
							>
								{ __( 'Recommended', 'cimo-image-optimizer' ) }
							</Button>
						</div>

						<div className="cimo-setting-field">
							<RangeControl
								id="webpQuality"
								label={ __( 'WebP Image Quality', 'cimo-image-optimizer' ) }
								value={ settings.webpQuality || '' }
								onChange={ value => handleInputChange( 'webpQuality', value || '' ) }
								min="1"
								max="100"
								step="1"
								__next40pxDefaultSize
								allowReset
								initialPosition={ 80 }
								help={ __( 'Set the quality / compression level for generated .webp images. Default is 80%. Higher values mean better quality and larger file size; lower values reduce file size with more compression but lower quality.', 'cimo-image-optimizer' ) }
							/>
						</div>
						{ /* Maximum Image Dimension */ }
						<div className="cimo-setting-field">
							<TextControl
								label={ __( 'Maximum Image Dimension', 'cimo-image-optimizer' ) }
								type="number"
								value={ settings.maxImageDimension }
								onChange={ value => handleInputChange( 'maxImageDimension', value ) }
								help={ __( 'Maximum width or height in pixels for uploaded images. Images exceeding this dimension will be automatically resized while preserving aspect ratio. Leave empty to disable resizing. We recommend a value of 1920px.', 'cimo-image-optimizer' ) }
								__next40pxDefaultSize
							/>
						</div>

						<Button
							variant="tertiary"
							className="cimo-reset-button"
							onClick={ applyImageDefaultSettings }
						>
							{ __( 'Reset to Default', 'cimo-image-optimizer' ) }
						</Button>
					</div>

					{ /* Bulk Optimization */ }

					<div className="cimo-settings-section cimo-settings-bulk-optimization">
						<div className="cimo-settings-header">
							<h2 id="bulk-optimization">
								<span aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-images-icon lucide-images"><path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" /><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" /><circle cx="13" cy="7" r="1" fill="currentColor" /><rect x="8" y="2" width="14" height="14" rx="2" /></svg>
								</span>
								{ __( 'Bulk Optimization', 'cimo-image-optimizer' ) }
							</h2>
							{ buildType === 'free' && (
								<span
									className="cimo-premium-feature-label"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock-icon lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
									{ __( 'Premium', 'cimo-image-optimizer' ) }
								</span>
							) }
						</div>

						{ buildType === 'free' && (
							<PremiumPlaceholder
								label={ __( 'Bulk optimize existing media in your Media Library.', 'cimo-image-optimizer' ) }
								learnMoreUrl="https://docs.wpcimo.com/article/788-bulk-optimization"
								pricingUtmContent="bulk"
							/>
						) }
						{ buildType === 'premium' && <>
							<p>
								{ __( 'Bulk optimize existing media in your Media Library in one go.', 'cimo-image-optimizer' ) }
								&nbsp;
								<a href="https://docs.wpcimo.com/article/788-bulk-optimization" target="_blank" rel="noopener noreferrer">
									{ __( 'Learn more', 'cimo-image-optimizer' ) }
								</a>
							</p>
							<BulkOptimizationComponent />
						</> }
					</div>

					{ /* Low Quality Image Placeholder */ }

					<div className="cimo-settings-section" style={ { gridColumn: '1 / 2' } }>
						<div className="cimo-settings-header">
							<h2>
								<span aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image-icon lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
								</span>
								{ __( 'Low Quality Image Placeholder Settings', 'cimo-image-optimizer' ) }
							</h2>
							{ buildType === 'free' && (
								<span
									className="cimo-premium-feature-label"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock-icon lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
									{ __( 'Premium', 'cimo-image-optimizer' ) }
								</span>
							) }
						</div>

						{ buildType === 'free' && (
							<PremiumPlaceholder
								label={ __( 'Show a low-quality preview while the image loads, then fade in the final image.', 'cimo-image-optimizer' ) }
								learnMoreUrl="https://docs.wpcimo.com/article/777-low-quality-image-placeholder"
								pricingUtmContent="lqip"
							/>
						) }
						{ buildType === 'premium' && <>
							<div className="cimo-setting-field">
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __( 'Enable LQIP', 'cimo-image-optimizer' ) }
									checked={ settings.lqipEnabled === 1 }
									onChange={ checked => handleInputChange( 'lqipEnabled', checked ? 1 : 0 ) }
									help={ __( 'Turn this option on to enable LQIP for all images. LQIP is only supported by Native Image Blocks.', 'cimo-image-optimizer' ) }
								/>
							</div>
							{ settings.lqipEnabled === 1 && <>
								<div className="cimo-setting-field">
									<RangeControl
										id="lqipPulseSpeed"
										label={ __( 'Placeholder Pulse Speed (seconds)', 'cimo-image-optimizer' ) }
										value={ settings.lqipPulseSpeed || '' }
										onChange={ value => handleInputChange( 'lqipPulseSpeed', value || '' ) }
										min="0.1"
										max="5"
										step="0.1"
										__next40pxDefaultSize
										allowReset
										initialPosition={ 2.5 }
										help={ __( 'Set the speed of the pulse animation when the image is loading. Default is 2.5s.', 'cimo-image-optimizer' ) }
									/>
								</div>
								<div className="cimo-setting-field">
									<RangeControl
										id="lqipBrightness"
										label={ __( 'Placeholder Pulse Brightness', 'cimo-image-optimizer' ) }
										value={ settings.lqipBrightness || '' }
										onChange={ value => handleInputChange( 'lqipBrightness', value || '' ) }
										min="0.5"
										max="1.5"
										step="0.05"
										__next40pxDefaultSize
										allowReset
										initialPosition={ 1.3 }
										help={ __( 'Set the brightness of the pulse animation when the image is loading. Default is 1.3x brightness.', 'cimo-image-optimizer' ) }
									/>
								</div>
								<div className="cimo-setting-field">
									<RangeControl
										id="lqipFadeDuration"
										label={ __( 'Image Fade In Duration (seconds)', 'cimo-image-optimizer' ) }
										value={ settings.lqipFadeDuration || '' }
										onChange={ value => handleInputChange( 'lqipFadeDuration', value || '' ) }
										min="0.1"
										max="3"
										step="0.1"
										__next40pxDefaultSize
										allowReset
										initialPosition={ 0.5 }
										help={ __( 'Set the duration of the fade in animation when the image is loaded. Default is 0.5s.', 'cimo-image-optimizer' ) }
									/>
								</div>

								<Button
									variant="tertiary"
									className="cimo-reset-button"
									onClick={ applyLQIPDefaultSettings }
								>
									{ __( 'Reset to Default', 'cimo-image-optimizer' ) }
								</Button>
							</> }
						</> }
					</div>

					{ /* Video Optimization Settings */ }

					<div className="cimo-settings-section" style={ { gridColumn: '1 / 2' } }>
						<div className="cimo-settings-header">
							<h2>
								<span aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video-icon lucide-video"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
								</span>
								{ __( 'Video Optimization Settings', 'cimo-image-optimizer' ) }
							</h2>
							{ buildType === 'free' && (
								<span
									className="cimo-premium-feature-label"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock-icon lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
									{ __( 'Premium', 'cimo-image-optimizer' ) }
								</span>
							) }
							{ buildType === 'premium' && (
								<Button
									variant="secondary"
									onClick={ applyVideoRecommendedSettings }
									className="cimo-recommended-button"
									__next40pxDefaultSize
								>
									{ __( 'Recommended', 'cimo-image-optimizer' ) }
								</Button>
							) }
						</div>

						{ buildType === 'free' && (
							<PremiumPlaceholder
								label={ __( 'Upgrade to Premium to compress and optimize video files on upload', 'cimo-image-optimizer' ) }
								learnMoreUrl="https://docs.wpcimo.com/article/775-video-optimization"
								pricingUtmContent="video"
							/>
						) }
						{ buildType === 'premium' && <>
							<div className="cimo-setting-field">
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __( 'Enable Video Optimization', 'cimo-image-optimizer' ) }
									checked={ settings.videoOptimizationEnabled === 1 }
									onChange={ checked => handleInputChange( 'videoOptimizationEnabled', checked ? 1 : 0 ) }
									help={ __( 'Turn this option off to upload videos without optimizing them.', 'cimo-image-optimizer' ) }
								/>
							</div>

							{ settings.videoOptimizationEnabled === 1 && <>
								<div className="cimo-setting-field">
									<ToggleGroupControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Video Quality', 'cimo-image-optimizer' ) }
										value={ settings.videoQuality || 3 }
										onChange={ value => handleInputChange( 'videoQuality', value ) }
										isBlock
										help={ __( 'Set the quality / compression level for optimized .MP4 video uploads. Default is Medium (Balanced). Lower quality means a smaller file size and lower quality, higher quality means a higher quality but larger file size.', 'cimo-image-optimizer' ) }
									>
										<ToggleGroupControlOption
											value={ 1 }
											label={ __( 'Very Low Quality', 'cimo-image-optimizer' ) }
										/>
										<ToggleGroupControlOption
											value={ 2 }
											label={ __( 'Low Quality', 'cimo-image-optimizer' ) }
										/>
										<ToggleGroupControlOption
											value={ 3 }
											label={ __( 'Medium', 'cimo-image-optimizer' ) }
										/>
										<ToggleGroupControlOption
											value={ 4 }
											label={ __( 'High Quality', 'cimo-image-optimizer' ) }
										/>
										<ToggleGroupControlOption
											value={ 5 }
											label={ __( 'Very High Quality', 'cimo-image-optimizer' ) }
										/>
									</ToggleGroupControl>
								</div>

								<div className="cimo-setting-field">
									<ToggleGroupControl
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										label={ __( 'Video Maximum Resolution', 'cimo-image-optimizer' ) }
										value={ settings.videoMaxResolution || '' }
										onChange={ value => handleInputChange( 'videoMaxResolution', value ) }
										isBlock
										help={ __( 'Set the maximum resolution for optimized video uploads. If the video uploaded is bigger than this, the video will not be resized down to this maximum resolution. Default is the video will not be resized.', 'cimo-image-optimizer' ) }
									>
										<ToggleGroupControlOption
											value=""
											label={ __( 'Keep original', 'cimo-image-optimizer' ) }
										/>
										<ToggleGroupControlOption
											value="480"
											label="480p"
										/>
										<ToggleGroupControlOption
											value="720"
											label="720p"
										/>
										<ToggleGroupControlOption
											value="1080"
											label="1080p"
										/>
										<ToggleGroupControlOption
											value="1440"
											label="1440p (2K)"
										/>
										<ToggleGroupControlOption
											value="2160"
											label="2160p (4K)"
										/>
									</ToggleGroupControl>
								</div>
							</> }

							<Button
								variant="tertiary"
								className="cimo-reset-button"
								onClick={ applyVideoDefaultSettings }
							>
								{ __( 'Reset to Default', 'cimo-image-optimizer' ) }
							</Button>
						</> }
					</div>

					{ /* Audio Optimization Settings */ }

					<div className="cimo-settings-section" style={ { gridColumn: '1 / 2' } }>
						<div className="cimo-settings-header">
							<h2>
								<span aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-music-icon lucide-music"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
								</span>
								{ __( 'Audio Optimization Settings', 'cimo-image-optimizer' ) }
							</h2>
							{ buildType === 'free' && (
								<span
									className="cimo-premium-feature-label"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock-icon lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
									{ __( 'Premium', 'cimo-image-optimizer' ) }
								</span>
							) }
						</div>

						{ buildType === 'free' && (
							<PremiumPlaceholder
								label={ __( 'Upgrade to Premium to compress and optimize audio files on upload', 'cimo-image-optimizer' ) }
								learnMoreUrl="https://docs.wpcimo.com/article/776-audio-optimization"
								pricingUtmContent="audio"
							/>
						) }
						{ buildType === 'premium' && <>
							<div className="cimo-setting-field">
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __( 'Enable Audio Optimization', 'cimo-image-optimizer' ) }
									checked={ settings.audioOptimizationEnabled === 1 }
									onChange={ checked => handleInputChange( 'audioOptimizationEnabled', checked ? 1 : 0 ) }
									help={ __( 'Turn this option off to upload audio files without optimizing them.', 'cimo-image-optimizer' ) }
								/>
							</div>

							{ settings.audioOptimizationEnabled === 1 && <>
								<div className="cimo-setting-field">
									<RangeControl
										label={ __( 'Audio Quality (kbps)', 'cimo-image-optimizer' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
										value={ settings.audioQuality || 128 }
										onChange={ value => handleInputChange( 'audioQuality', value ) }
										min="32"
										max="320"
										step="32"
										help={ __( 'Set the quality / compression level for optimized .MP3 audio uploads. Default is 128kbps. Lower quality means a smaller file size and lower quality, higher quality means a higher quality but larger file size.', 'cimo-image-optimizer' ) }
									/>
								</div>
							</> }

							<Button
								variant="tertiary"
								className="cimo-reset-button"
								onClick={ applyAudioDefaultSettings }
							>
								{ __( 'Reset to Default', 'cimo-image-optimizer' ) }
							</Button>
						</> }
					</div>

					{ /* SVG Optimization Settings */ }
					<div className="cimo-settings-section" style={ { gridColumn: '1 / 2' } }>
						<div className="cimo-settings-header">
							<h2>
								<span aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-image-icon lucide-file-image"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><circle cx="10" cy="12" r="2" /><path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22" /></svg>
								</span>
								{ __( 'SVG Optimization Settings', 'cimo-image-optimizer' ) }
							</h2>
							{ buildType === 'free' && (
								<span
									className="cimo-premium-feature-label"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock-icon lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
									{ __( 'Premium', 'cimo-image-optimizer' ) }
								</span>
							) }
						</div>

						{ buildType === 'free' && (
							<PremiumPlaceholder
								label={ __( 'Upgrade to Premium to compress and optimize SVG files on upload', 'cimo-image-optimizer' ) }
								learnMoreUrl="https://docs.wpcimo.com/article/780-svg-support"
								pricingUtmContent="svg"
							/>
						) }
						{ buildType === 'premium' && <>
							<div className="cimo-setting-field">
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __( 'Enable SVG uploads', 'cimo-image-optimizer' ) }
									checked={ settings.svgUpload === 1 }
									onChange={ checked => handleInputChange( 'svgUpload', checked ? 1 : 0 ) }
									help={ __( 'Allow SVG files to be uploaded in the media library. WordPress has this option disabled by default', 'cimo-image-optimizer' ) }
								/>
							</div>

							{ settings.svgUpload === 1 && <>
								<div className="cimo-setting-field">
									<ToggleControl
										__nextHasNoMarginBottom
										label={ __( 'Enable SVG Optimization', 'cimo-image-optimizer' ) }
										checked={ settings.svgOptimizationEnabled === 1 }
										onChange={ checked => handleInputChange( 'svgOptimizationEnabled', checked ? 1 : 0 ) }
										help={ __( 'Turn this option off to upload SVG files without optimizing them.', 'cimo-image-optimizer' ) }
									/>
								</div>
							</> }

							<Button
								variant="tertiary"
								className="cimo-reset-button"
								onClick={ applySVGDefaultSettings }
							>
								{ __( 'Reset to Default', 'cimo-image-optimizer' ) }
							</Button>
						</> }
					</div>

					{ /* Stealth Mode Settings */ }

					<div className="cimo-settings-section" style={ { gridColumn: '1 / 2' } }>
						<div className="cimo-settings-header">
							<h2>
								<span aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hat-glasses-icon lucide-hat-glasses"><path d="M14 18a2 2 0 0 0-4 0" /><path d="m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11" /><path d="M2 11h20" /><circle cx="17" cy="18" r="3" /><circle cx="7" cy="18" r="3" /></svg>
								</span>
								{ __( 'Stealth Mode', 'cimo-image-optimizer' ) }
							</h2>
							{ buildType === 'free' && (
								<span
									className="cimo-premium-feature-label"
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock-icon lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
									{ __( 'Premium', 'cimo-image-optimizer' ) }
								</span>
							) }
						</div>

						{ buildType === 'free' && (
							<PremiumPlaceholder
								label={ __( 'Upgrade to Premium to enter stealth mode.', 'cimo-image-optimizer' ) }
								learnMoreUrl="https://docs.wpcimo.com/article/782-stealth-mode"
								pricingUtmContent="stealth"
							/>
						) }
						{ buildType === 'premium' && <>
							<div className="cimo-setting-field">
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __( 'Stealth Mode', 'cimo-image-optimizer' ) }
									checked={ settings.stealthModeEnabled === 1 }
									onChange={ checked => handleInputChange( 'stealthModeEnabled', checked ? 1 : 0 ) }
									help={
										<>
											{ __( 'When Stealth Mode is enabled, all Cimo branding and optimization stats will not be shown in the UI and dashboard. This settings page will not appear in the admin sidebar, you can access it by clicking the “Settings” link under Cimo in the plugins page. Stealth Mode will not affect how your media is optimized; everything continues to work as usual, just without any visual indicators of Cimo.', 'cimo-image-optimizer' ) }
											&nbsp;
											<a href="https://docs.wpcimo.com/article/782-stealth-mode" target="_blank" rel="noopener noreferrer">
												{ __( 'Learn more', 'cimo-image-optimizer' ) }
											</a>
										</>
									}
								/>
							</div>
							<Button
								variant="tertiary"
								className="cimo-reset-button"
								onClick={ applyStealthModeDefaultSettings }
							>
								{ __( 'Reset to Default', 'cimo-image-optimizer' ) }
							</Button>
						</> }
					</div>
				</div>

				{ /* Submit Button */ }
				<div className="cimo-setting-field cimo-submit-section">
					<div className="cimo-submit-buttons">
						<Button
							variant="primary"
							className="cimo-save-button"
							disabled={ isSaving }
							__next40pxDefaultSize
							onClick={ e => {
								e.preventDefault()
								if ( ! isSaving ) {
									document.querySelector( 'form' ).dispatchEvent( new Event( 'submit', { cancelable: true, bubbles: true } ) )
								}
							} }
						>
							{ isSaving ? __( 'Saving…', 'cimo-image-optimizer' ) : __( 'Save Changes', 'cimo-image-optimizer' ) }
						</Button>
						{ hasUnsavedChanges && (
							<span className="cimo-unsaved-note">
								{ __( 'You have unsaved changes', 'cimo-image-optimizer' ) }
							</span>
						) }
						{ saveMessage && (
							<p>{ saveMessage }</p>
						) }
					</div>
				</div>

			</form>

			{ buildType === 'free' && (
				<div className="cimo-settings-section cimo-settings-sidebar">
					<div className="cimo-sidebar-heading">
						<div className="cimo-sidebar-heading-icon">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crown-icon lucide-crown"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" /></svg>
						</div>
						<h2>{ __( 'Upgrade For Full Control', 'cimo-image-optimizer' ) }</h2>
					</div>
					<p className="cimo-premium-intro">
						{ __( 'Optimize existing images, control user uploads, and keep your server free from image processing.', 'cimo-image-optimizer' ) }
					</p>
					<h3 className="screen-reader-text" style={ {
						position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(1px, 1px, 1px, 1px)',
					} }>
						{ __( 'Main Features', 'cimo-image-optimizer' ) }
					</h3>
					<ul className="cimo-premium-features-list">
						<li>
							<span className="cimo-premium-icon">
								{ /* Images Icon */ }
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-images-icon lucide-images"><path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16" /><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" /><circle cx="13" cy="7" r="1" fill="currentColor" /><rect x="8" y="2" width="14" height="14" rx="2" /></svg>
							</span>
							<h4>
								{ __( 'Existing Images', 'cimo-image-optimizer' ) }
							</h4>
							<span>
								{ __( 'Optimize your entire media library with Bulk Optimization', 'cimo-image-optimizer' ) }
							</span>
						</li>
						<li>
							<span className="cimo-premium-icon">
								{ /* Users Icon */ }
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users-icon lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></svg>
							</span>
							<h4>
								{ __( 'User Uploads', 'cimo-image-optimizer' ) }
							</h4>
							<span>
								{ __( 'Prevent oversized uploads from users with Form Plugin integrations', 'cimo-image-optimizer' ) }
							</span>
						</li>
						<li>
							<span className="cimo-premium-icon">
								{ /* Video Icon */ }
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video h-3 w-3 text-purple-600" data-lov-id="src/components/WordPressAdmin.tsx:310:20" data-lov-name="Video" data-component-path="src/components/WordPressAdmin.tsx" data-component-line="310" data-component-file="WordPressAdmin.tsx" data-component-name="Video" data-component-content="%7B%22className%22%3A%22h-3%20w-3%20text-purple-600%22%7D"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>
							</span>
							<h4>
								{ __( 'More media', 'cimo-image-optimizer' ) }
							</h4>
							<span>
								{ __( 'Optimize video and audio uploads', 'cimo-image-optimizer' ) }
							</span>
						</li>
					</ul>
					<h3 className="cimo-premium-features-list-secondary-heading">{ __( 'Also includes:', 'cimo-image-optimizer' ) }</h3>
					<ul className="cimo-premium-features-list cimo-premium-features-list-secondary">
						<li>{ __( 'SVG & HEIC support', 'cimo-image-optimizer' ) }</li>
						<li>{ __( 'Low Quality Image Placeholder', 'cimo-image-optimizer' ) }</li>
						<li>{ __( 'Stealth mode', 'cimo-image-optimizer' ) }</li>
					</ul>

					<div className="cimo-premium-cta">
						<Button
							href={ buildPricingUrl( 'sidebar' ) }
							variant="primary"
							target="_blank"
							rel="noopener noreferrer"
						>
							{ __( 'Unlock full optimization', 'cimo-image-optimizer' ) }
						</Button>
						<div className="cimo-premium-guarantee">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 13.5l2.5 2.5L16 9" /></svg>
							{ __( '30-day money-back guarantee. No risk.', 'cimo-image-optimizer' ) }
						</div>
					</div>
				</div>
			) }
		</div>
	)
}

export default AdminSettings

const PremiumPlaceholder = props => {
	const pricingHref = buildPricingUrl( props.pricingUtmContent || 'placeholder' )
	return (
		<div className="cimo-settings-premium-placeholder">
			{ props.label }
			<div style={ {
				display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px',
			} }>
				<Button
					variant="secondary"
					className="cimo-premium-cta cimo-premium-cta-upgrade"
					href={ pricingHref }
					target="_blank"
					rel="noopener noreferrer"
				>
					{ __( 'Upgrade to Premium', 'cimo-image-optimizer' ) }
				</Button>
				{ props.learnMoreUrl && (
					<Button
						variant="tertiary"
						className="cimo-premium-cta cimo-premium-cta-learn-more"
						href={ props.learnMoreUrl }
						target="_blank"
						rel="noopener noreferrer"
						icon={ <>&nbsp;→&nbsp;</> }
						iconPosition="right"
					>
						{ __( 'Learn More', 'cimo-image-optimizer' ) }
					</Button>
				) }
			</div>
		</div>
	)
}
