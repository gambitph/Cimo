# Cimo Developer Integration

Cimo can optimize media in the browser before your plugin or theme uploads it.

## Automatic Selector Interception

Use PHP selector filters when your markup uses normal file inputs or drop zones
and you want Cimo to intercept them automatically before your existing upload
handler runs.

Register selector filters before calling `cimo_enqueue_assets()`.
`cimo_enqueue_assets()` localizes the filtered selector lists while enqueueing,
so filters added afterward will not apply to the current page load.

```php
add_filter( 'cimo/select_files/allowed_locations', function ( $locations ) {
	$locations[] = '.my-plugin-uploader';
	return $locations;
} );

add_filter( 'cimo/drop_zone/allowed_locations', function ( $locations ) {
	$locations[] = '.my-plugin-dropzone';
	return $locations;
} );
```

For file inputs, register a selector for a wrapper around
`<input type="file">`.

```html
<div class="my-plugin-uploader">
	<input type="file" accept="image/*">
</div>
```

For drops, register a selector for the drop target.

## Enqueue Cimo

Admin screens and the block editor already enqueue Cimo. For frontend upload
forms or custom screens where Cimo is not already loaded, call
`cimo_enqueue_assets()` after registering any selector filters needed for that
page.

```php
add_action( 'wp_enqueue_scripts', function () {
	if ( is_page( 'my-upload-form' ) && function_exists( 'cimo_enqueue_assets' ) ) {
		cimo_enqueue_assets();
	}
} );
```

## Optimize Files Directly

Use `window.cimo.optimizeFiles()` when your code already controls the upload
process and can replace the selected files before uploading.

```js
async function handleFiles( files ) {
	const results = await window.cimo.optimizeFiles( files, { showProgress: true } )
	const filesToUpload = results.map( result => result.file )

	// Continue with your plugin/theme upload flow.
	uploadFiles( filesToUpload )
}
```

The API accepts a single `File`, a `FileList`, or an array of `File` objects.
It returns:

```js
[
	{
		file: File,
		metadata: Object || null,
	},
]
```

`showProgress` defaults to `true`. Set it to `false` if your UI already shows
upload or optimization progress.

If Cimo optimization is disabled or a file type is unsupported, the original
file is returned with `metadata: null`.

## Which Approach To Use

Use `window.cimo.optimizeFiles()` when you can explicitly await optimization
before calling your uploader.

Use PHP selector interception when your existing UI already reacts to file input
or drop events and you want Cimo to transparently replace files before that flow
continues.

## Free And Premium Behavior

The same JavaScript API is used in free and premium. If Cimo Premium is loaded,
premium converters are applied automatically through Cimo's normal converter
pipeline. There is no separate premium entry point.

Cimo optimization is pre-upload only. It does not optimize by attachment ID,
bulk replace existing files, or run server-side Imagick/GD compression.

On guest frontend uploads, files can still be optimized in the browser. Metadata
saving may be skipped when the visitor is not logged in or cannot access the
Cimo metadata endpoint.
