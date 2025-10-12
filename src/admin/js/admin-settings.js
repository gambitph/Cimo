import { useState, useEffect } from '@wordpress/element'
import {
	Button, RangeControl, ToggleControl, TextControl,
} from '@wordpress/components'
import apiFetch from '@wordpress/api-fetch'
import { __ } from '@wordpress/i18n'
import cimoLogo from './assets/logo-long.webp'

const AdminSettings = () => {
	const [ settings, setSettings ] = useState( {
		webpQuality: 80,
		maxImageDimension: '',
		disableWpScaling: 1,
		disableThumbnailGeneration: 0,
		thumbnailSizes: [], // Stores DISABLED thumbnail sizes
	} )
	const [ imageSizes, setImageSizes ] = useState( [] )
	const [ isSaving, setIsSaving ] = useState( false )
	const [ saveMessage, setSaveMessage ] = useState( '' )
	const [ isLoading, setIsLoading ] = useState( true )

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
			setSettings( {
				webpQuality: cimoOptions.webp_quality !== undefined ? cimoOptions.webp_quality : 80,
				maxImageDimension: cimoOptions.max_image_dimension || '',
				disableWpScaling: cimoOptions.disable_wp_scaling !== undefined ? cimoOptions.disable_wp_scaling : 1,
				disableThumbnailGeneration: cimoOptions.disable_thumbnail_generation !== undefined ? cimoOptions.disable_thumbnail_generation : 0,
				thumbnailSizes: cimoOptions.thumbnail_sizes || [],
			} )
		} catch ( error ) {
			// Error loading settings
		}
	}

	const handleInputChange = ( field, value ) => {
		setSettings( prev => ( {
			...prev,
			[ field ]: value,
		} ) )
	}

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

	const applyRecommendedSettings = () => {
		setSettings( {
			webpQuality: 80,
			maxImageDimension: 1920,
			disableWpScaling: 1,
			disableThumbnailGeneration: 1,
			thumbnailSizes: [],
		} )
	}

	const applyDefaultSettings = () => {
		setSettings( {
			webpQuality: '',
			maxImageDimension: '',
			disableWpScaling: 1,
			disableThumbnailGeneration: 0,
			thumbnailSizes: [],
		} )
	}

	const handleSubmit = async e => {
		e.preventDefault()
		setIsSaving( true )
		setSaveMessage( '' )

		try {
			/* eslint-disable camelcase */
			await apiFetch( {
				path: '/wp/v2/settings',
				method: 'POST',
				data: {
					cimo_options: {
						webp_quality: parseInt( settings.webpQuality ) || 0,
						max_image_dimension: parseInt( settings.maxImageDimension ) || 0,
						disable_wp_scaling: settings.disableWpScaling,
						disable_thumbnail_generation: settings.disableThumbnailGeneration,
						thumbnail_sizes: settings.thumbnailSizes,
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
		<div className="cimo-admin-settings-wrap">
			<div className="cimo-header">
				<img className="cimo-logo" src={ cimoLogo } alt={ __( 'Cimo Logo', 'cimo-image-optimizer' ) } height="35" />

				{ /* Statistics Section */ }
				<div className="cimo-stats-section">
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

			<div className="cimo-settings-section-wrapper">
				<div className="cimo-settings-section">
					<div className="cimo-settings-header">
						<h2>
							<span aria-hidden="true">
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings w-5 h-5 text-primary" data-lov-id="src/components/SettingsSection.tsx:19:8" data-lov-name="Settings" data-component-path="src/components/SettingsSection.tsx" data-component-line="19" data-component-file="SettingsSection.tsx" data-component-name="Settings" data-component-content="%7B%22className%22%3A%22w-5%20h-5%20text-primary%22%7D"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
							</span>
							{ __( 'Image Optimization Settings', 'cimo-image-optimizer' ) }
						</h2>
						<Button
							variant="secondary"
							onClick={ applyRecommendedSettings }
						>
							{ __( 'Recommended', 'cimo-image-optimizer' ) }
						</Button>
					</div>

					<form onSubmit={ handleSubmit }>
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
								<Button
									variant="tertiary"
									className="cimo-reset-button"
									onClick={ applyDefaultSettings }
								>
									{ __( 'Reset to Default', 'cimo-image-optimizer' ) }
								</Button>
							</div>
						</div>

						{ saveMessage && (
							<div className={ `notice notice-${ saveMessage.includes( 'success' ) ? 'success' : 'error' } is-dismissible` }>
								<p>{ saveMessage }</p>
							</div>
						) }
					</form>
				</div>

				<div className="cimo-settings-section cimo-settings-sidebar">
					<div className="cimo-sidebar-heading">
						<div className="cimo-sidebar-heading-icon">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crown-icon lucide-crown"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" /></svg>
						</div>
						<h2>{ __( 'Upgrade to Premium', 'cimo-image-optimizer' ) }</h2>
					</div>
					<p className="cimo-premium-intro">
						{ __( 'Optimize more things and get premium support for a faster, happier site.', 'cimo-image-optimizer' ) }
					</p>
					<ul className="cimo-premium-features-list">
						<li>
							<span className="cimo-premium-icon">
								{ /* Video Icon */ }
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video h-3 w-3 text-purple-600" data-lov-id="src/components/WordPressAdmin.tsx:310:20" data-lov-name="Video" data-component-path="src/components/WordPressAdmin.tsx" data-component-line="310" data-component-file="WordPressAdmin.tsx" data-component-name="Video" data-component-content="%7B%22className%22%3A%22h-3%20w-3%20text-purple-600%22%7D"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>
							</span>
							<span>
								{ __( 'Optimize videos on upload', 'cimo-image-optimizer' ) }
							</span>
						</li>
						<li>
							<span className="cimo-premium-icon">
								{ /* Audio Icon */ }
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-music h-3 w-3 text-purple-600" data-lov-id="src/components/WordPressAdmin.tsx:316:20" data-lov-name="Music" data-component-path="src/components/WordPressAdmin.tsx" data-component-line="316" data-component-file="WordPressAdmin.tsx" data-component-name="Music" data-component-content="%7B%22className%22%3A%22h-3%20w-3%20text-purple-600%22%7D"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
							</span>
							<span>
								{ __( 'Optimize audio on upload', 'cimo-image-optimizer' ) }
							</span>
						</li>
						<li>
							<span className="cimo-premium-icon">
								{ /* Lightning Icon */ }
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap h-3 w-3 text-purple-600" data-lov-id="src/components/WordPressAdmin.tsx:328:20" data-lov-name="Zap" data-component-path="src/components/WordPressAdmin.tsx" data-component-line="328" data-component-file="WordPressAdmin.tsx" data-component-name="Zap" data-component-content="%7B%22className%22%3A%22h-3%20w-3%20text-purple-600%22%7D"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path></svg>
							</span>
							<span>
								{ __( 'Next-gen .avif image format', 'cimo-image-optimizer' ) }
							</span>
						</li>
						<li>
							<span className="cimo-premium-icon">
								{ /* Unlimited Icon */ }
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-icon customizable lucide-infinity-icon lucide-infinity lucide-icon customizable"><path d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8"></path></svg>
							</span>
							<span>
								{ __( 'Still without limits', 'cimo-image-optimizer' ) }
							</span>
						</li>
						<li>
							<span className="cimo-premium-icon">
								{ /* White label Icon */ }
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag-icon lucide-tag"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>
							</span>
							<span>
								{ __( 'White label', 'cimo-image-optimizer' ) }
							</span>
						</li>
					</ul>

					<div className="cimo-premium-cta">
						<Button
							href="https://wpcimo.com/pricing"
							variant="primary"
							target="_blank"
							rel="noopener noreferrer"
						>
							{ __( 'Upgrade Now', 'cimo-image-optimizer' ) }
						</Button>
						<div className="cimo-premium-guarantee">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a249" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 13.5l2.5 2.5L16 9" /></svg>
							{ __( '30-day money back guarantee', 'cimo-image-optimizer' ) }
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default AdminSettings
