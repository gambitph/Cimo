=== Cimo - Image Optimizer: Compress Images to WebP ===
Contributors: bfintal, gambitph
Tags: image optimization, compress images, optimize images, convert webp, webp
Requires at least: 7.0.7
Tested up to: 7.1.3
Requires PHP: 8.0
Stable tag: 1.5.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

No account, no quota, and no server load. A fast in-browser image optimizer to compress images to WebP as you upload.

== Description ==

**No account, no quota, and no server load.**

Cimo is a fast image optimizer.
It compresses images in your browser as you upload them, and it converts JPEG, PNG, and GIF files to WebP when the browser can encode WebP.
WordPress stores that prepared file.
A successful conversion does not also upload the heavier original.
The conversion itself does not run on the server.
WordPress can still create thumbnail sizes afterward, and you can turn that off.
There is no image-processing account, and there is no monthly quota on this upload path.

[Learn more about Cimo](https://wpcimo.com/?utm_source=plugin-directory&utm_medium=plugin-page&utm_campaign=readme-txt).

= What you can control =

* WebP quality from 1 to 100. Uploads use 80 when you leave this unset.
* A maximum width or height, with the aspect ratio kept.
* Skip images that are already WebP, so Cimo does not compress or resize them again.
* Turn WordPress automatic scaling of images larger than 2560px on or off.
* Turn off every thumbnail size, or turn off individual sizes.
* If the compressed file would be larger than the original, Cimo keeps the original.
* When the browser can encode WebP, animated GIFs are converted to animated WebP, and animated WebP files can be optimized again.
* Settings shows the storage saved, the size reduction, how many files were optimized, and the original versus optimized size.
* The Media Library sidebar and the Edit Media screen show the same savings for each optimized file.

The Image Optimization **Recommended** button sets WebP quality to 80 and the maximum dimension to 1920 pixels.
The General **Recommended** button turns off WordPress thumbnail generation.
You can change either result after you apply it.

= How to use =

Upload images the way you already do, from the Media Library, the block editor, or a supported builder.
Cimo compresses the image in the browser, then WordPress saves the result.
Open the attachment and you will see the format, the original size, the optimized size, and the time it took.

= Where uploads are optimized =

Cimo intercepts uploads in these places:

* The Media Library, Media > Add Media File, and the grid uploader
* The block editor, including Image blocks and the featured image box
* The Elementor, Beaver Builder, Bricks, and Oxygen editors. Cimo loads there so uploads that use the WordPress media modal are intercepted.
* The Divi visual builder. Dragging a file onto the Divi canvas is not a drop target Cimo watches.
* WooCommerce product text that uses the classic editor uploader

Screens that upload through the WordPress media modal in wp-admin use that same interception.
Automatic optimization of arbitrary front-end file inputs is part of Cimo Premium.
A plugin or theme can opt its own upload UI in. See For developers below.

= For developers =

On a front-end screen, load Cimo with `cimo_enqueue_assets()`.
Then register a file input with the `cimo/select_files/allowed_locations` filter, or a drop zone with the `cimo/drop_zone/allowed_locations` filter.
You can also call `window.cimo.optimizeFiles()` from your own JavaScript.
Your existing upload code can stay as it is.

See the [developer integration guide](https://docs.wpcimo.com/article/798-developer-integration?utm_source=plugin-directory&utm_medium=plugin-page&utm_campaign=readme-txt).

= Cimo Premium =

The free plugin compresses images as you upload them.
[Cimo Premium](https://wpcimo.com/pricing/?utm_source=plugin-directory&utm_medium=plugin-page&utm_campaign=readme-txt) adds tools around that same browser-side path:

* Bulk optimization for media that is already in the Media Library
* Smart Optimization, which picks compression settings per image
* Video and audio optimization on upload
* SVG and HEIC on upload
* Front-end and form uploads
* Low quality image placeholders for native image blocks
* Stealth mode, which hides Cimo's interface while optimization keeps running

Video and audio optimization also runs in the browser before those files are stored.

== Installation ==

1. Upload the `cimo` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the Plugins menu in WordPress.
3. Upload an image. Cimo compresses it in the browser before WordPress stores it.
4. Optional: open Settings > Cimo to set WebP quality, the maximum dimension, scaling, and thumbnails.

== Frequently Asked Questions ==

= Why does Cimo convert images to WebP? =

WebP is the file Cimo stores when your browser can encode it.
A JPEG, PNG, or still GIF is compressed and saved as WebP, so the Media Library holds the file your pages will serve.
Animated GIFs are converted to animated WebP, so they stay animated.
You set the quality from 1 to 100.
The settings screen records the bytes saved on your own uploads, which is the number to trust for your images.

= How does in-browser optimization work? =

When you pick or drop an image, Cimo compresses it in the browser before the upload request is sent.
Still images are drawn to a canvas and encoded there.
Animated GIF and animated WebP files are decoded and encoded again so the animation is kept.
Your server receives the finished file and stores it the way WordPress always stores uploads.
The conversion does not run in PHP.

= Does Cimo work on shared hosting? =

Yes.
The person uploading does the conversion in their browser, so the host does not need ImageMagick or GD for this path.
The server only has to meet the WordPress and PHP versions at the top of this readme and accept a normal media upload.
Cimo does not add a remote image queue or a PHP image worker for new uploads.

= Are my images private? =

The browser compresses the image on the device that selected it.
Cimo then uploads the optimized file to your WordPress site, and only there.
It does not send the image to an external optimization service, and the free upload path does not ask you to open an account with one.

= How does this compare with a cloud image optimizer? =

A cloud optimizer sends the file to a remote service, then saves the file that service returns.
That service usually requires an account and a quota.
Cimo compresses the image in the browser and uploads the result to your own site, so this upload path has no image account and no image quota.
A cloud service can still be a fit when you want their CDN, or when you want them to process files on their servers.
Cimo Premium can optimize files that are already in the Media Library, and that work stays in the browser too.

= Which formats can Cimo compress? =

The free plugin accepts JPEG, PNG, GIF, and WebP uploads.
When the browser can encode WebP, JPEG, PNG, and GIF are saved as WebP.
When it cannot, JPEG and PNG are still compressed and keep their original format.
A GIF in that case is uploaded unchanged.
Turn on Skip WebP Optimization to leave existing WebP files unchanged.
Video, audio, SVG, and HEIC are part of Cimo Premium.

= What happens in Safari? =

Cimo asks the browser whether it can encode WebP.
Current Chrome, Firefox, Edge, and Opera can, and those uploads are saved as WebP.
Some Safari versions cannot.
On those versions, JPEG and PNG are still compressed in their original format, and a GIF is uploaded unchanged.

= Does Cimo optimize images already in the Media Library? =

The free plugin compresses images as you upload them.
It does not rewrite files that are already in the Media Library.
Cimo Premium adds bulk optimization for existing media, still in the browser rather than on an external image service.

= Will this slow down uploads? =

The browser converts the image first, then uploads the result.
A very large image can take a moment, and Cimo shows that it is optimizing.
The file that transfers is the compressed one, and PHP on the server does not do that conversion.

= What if the WebP file is larger than the original? =

Cimo keeps the original and does not replace it with a larger file.

= Where are the settings? =

In wp-admin, open Settings > Cimo.
You can set WebP quality, the maximum dimension, WordPress scaling, thumbnail sizes, and whether existing WebP files are skipped.

= What does Recommended change? =

The Image Optimization Recommended button sets WebP quality to 80 and the maximum dimension to 1920 pixels.
The General Recommended button turns off WordPress thumbnail generation.
You can change either result afterward.

= Can I see how much storage I have saved? =

Yes.
Settings > Cimo shows the storage saved, the reduction, the number of optimized files, and the original versus optimized size.
Each optimized attachment also shows its savings in the Media Library and on the Edit Media screen.

= Does the free plugin optimize video and audio? =

No.
Cimo Premium optimizes video and audio on upload.
It also adds SVG and HEIC, Smart Optimization, bulk optimization, low quality image placeholders, and Stealth mode.

= Can my plugin or theme send files through Cimo? =

Yes.
Call `cimo_enqueue_assets()` on that screen, then register your file input or drop zone, or call `window.cimo.optimizeFiles()` from your JavaScript.
See the [developer integration guide](https://docs.wpcimo.com/article/798-developer-integration?utm_source=plugin-directory&utm_medium=faq&utm_campaign=readme-txt).

== Screenshots ==

1. Uploading an image in the Media Library. Cimo compresses it in the browser and stores a WebP file.
2. Image optimization settings: WebP quality, maximum dimension, Skip WebP Optimization, and the Recommended button.
3. The settings summary: storage saved, files optimized, and original versus optimized size.
4. Attachment details in the Media Library, with savings, original size, optimized size, and the format it was converted to.
5. An Image block upload in the block editor, compressed in the browser before the file is saved.
6. WordPress automatic scaling and thumbnail generation, including individual image sizes.

== Upgrade Notice ==

== Changelog ==

= 1.5.0 =

* New: Developer API so other plugins can optimize files before upload #67
* New: Option to skip optimizing WebP images on upload #77
* New: Convert GIFs to animated WebP and optimize animated WebP #78

= 1.4.2 =

* New: Free settings page shows real bulk optimization progress #66
* New: Media Library notice when video optimization is skipped (premium) #48 #49
* Fixed: Improved error message for bulk optimization on non-HTTPS sites #54
* Fixed: Smart Optimization for HEIC images (premium) #60
* Fixed: SVG sanitizer loading issue (premium) #55

= 1.4.1 =

* Fixed: PHP error notice because of invalid big_image_size_threshold usage

= 1.4.0 =

* New: Smart Optimization (premium) - get even smaller image file sizes when uploading images #35
* New: Video & audio can now be optimized in Bulk Optimization #37
* New: Toggle optimization option - toggle Cimo's optimizer on/off when needed #36
* Fixed: When uploading a video using a webkit-based browser, the progress bar would get stuck to ready #47
* Fixed: When Wordpress Automatic Image Scaling is ON, the file size in metadata does not match with the final #43

= 1.3.1 =

* Fixed: Optimization metadata may not be attached if uploading images with the same filename #40
* Fixed: Added view all stats link
* Fixed: Added upgrade links

= 1.3.0 =

* New: Bulk optimization without server processing (premium)
* New: Frontend file uploads can now be optimized (premium)
* New: Integrations to popular WordPress Form plugins (premium)
* New: Added stealth mode (premium)
* New: Added settings link in plugins page entry
* New: Added support for dropping images in WooCommerce descriptions
* Fixed: Cimo settings page improvements
* Fixed: Improvements on stats metabox styling

= 1.2.3 =

* New: Added SVG Optimization (premium)
* New: Added HEIC image format support (premium)
* Fixed: Dropping files stopped working in some instances #32

= 1.2.2 =

* Fixed: Uploading an image via Media > Add Media File doesn't show stats #4
* Fixed: Dragging multiple images in quick succession sometimes doesn't optimize the image #3
* Fixed: LQIP doesn't work correctly when the image has a srcset attribute #11
* Fixed: Closing the upload button on the block toolbar stops uploading of media #9
* Fixed: Uploading images with the same name in the same session doesn't add the metadata correctly #8

= 1.2.1 =

* New: If the resulting optimized image is bigger than the original image, the image is now skipped and the original image is kept.
* Fixed: Fixed license activation issue

= 1.2.0 =

* New: Video Optimization (premium)
* New: Audio Optimization (premium)
* New: Low Quality Image Placeholders (premium)
* New: Added rating notice at the right time
* Fixed: Now intercepts media uploads when performed inside the block editor iframe

= 1.1.2 =

* Fixed: When uploading images, the original image is also uplaoded.

= 1.1.1 =

* Fixed: When uploading images using Safari, images will just upload as they normally would.

= 1.1.0 =

* New: Statistics dashboard showing total storage saved, compression ratio, and media optimized
* New: Admin settings page under Settings > Cimo
* New: WebP quality control slider (1-100%) for custom compression levels
* New: Maximum image dimension setting to automatically resize large uploads
* New: WordPress automatic scaling control (disable the 2560px scaling threshold)
* New: Granular thumbnail generation control - disable all or select specific thumbnail sizes
* New: "Recommended" preset for one-click optimal settings

= 1.0.5 =

* Fixed: Metadata saving fails if WP is installed in a subdirectory

= 1.0.4 =

* New: Added partial support for Divi

= 1.0.3 =

* Fixed: File prefixes are no longer used during the optimization process. The original file names are now retained.

= 1.0.2 =

* Fixed: Dragging images on a blank editor or on top of other blocks now converts images
* Fixed: Dragging images into the block editor now converts images
* Fixed: Clicking on the Upload button on an image block directly now converts images
* Fixed: Uploading images from Media > Library and in grid view now converts images
* Fixed: Minor console JS error in some admin pages
* Change: Added admin notice to let user know what to expect

= 1.0.1 =

* Fixed: Minor string translation tweaks

= 1.0.0 =
Initial release of Cimo - bringing free, unlimited image optimization and compression to WordPress.

* Initial release
* Client-side image optimization
* WebP conversion support
* Unlimited compression
* Privacy-first approach
