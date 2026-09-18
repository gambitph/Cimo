# Cimo Developer Integration

Cimo optimizes files in the browser **before** your plugin or theme uploads them.
It does not replace your upload endpoint or your upload JavaScript.

## How integration works

1. **Enqueue Cimo** on pages where uploads happen (required on the frontend).
2. **Tell Cimo where or when to optimize**, using one of the methods below.

Most integrations need Step 1 plus **one** method from Step 2.
You can combine file-picker interception (A) and drag-and-drop interception (B) if your UI supports both.

## Step 1: Enqueue Cimo (required on frontend)

Cimo already loads in wp-admin and the block editor.
You do not need to enqueue it there.

On frontend pages or other custom screens, you must load Cimo yourself.
Call `cimo_enqueue_assets()` on the pages where users upload files.
Always check that the function exists first, in case Cimo is not active.

Register any PHP selector filters **before** you call `cimo_enqueue_assets()` on that page.
Cimo reads those filters while it loads its scripts.
Filters added afterward will not apply until the next page load.

**PHP**

```php
add_action( 'wp_enqueue_scripts', function () {
	if ( is_page( 'my-upload-form' ) && function_exists( 'cimo_enqueue_assets' ) ) {
		cimo_enqueue_assets();
	}
} );
```

## Step 2: Choose how Cimo optimizes files

| Your upload UI | What to add after enqueue |
|----------------|---------------------------|
| User clicks and picks files (`<input type="file">`) | Method A |
| User drags files into a drop zone | Method B |
| Your plugin already has JavaScript that uploads via Fetch, XHR, or AJAX | Method C |
| Both a file picker and drag-and-drop | Method A + Method B |

### Method A: File picker forms (automatic)

Use this when your form has a normal file input.
Your existing upload code can stay as it is.

1. Wrap the file input in an element with a CSS class you control.
2. Tell Cimo about that class with the `cimo/select_files/allowed_locations` filter.

**PHP**

```php
add_filter( 'cimo/select_files/allowed_locations', function ( $locations ) {
	$locations[] = '.my-plugin-uploader';
	return $locations;
} );
```

**HTML**

```html
<div class="my-plugin-uploader">
	<input type="file" name="photo" accept="image/*">
</div>
```

The class must be on a wrapper around the file input (or on the input itself).
Cimo intercepts the `change` event, optimizes the file in the browser, puts the optimized file back on the input, then re-triggers `change` so your existing upload code still runs.
You do not need to write any Cimo JavaScript for this method.

### Method B: Drag-and-drop zones (automatic)

Use this when users can drop files onto an area on the page, not only pick them from a file dialog.

Tell Cimo about the drop target with the `cimo/drop_zone/allowed_locations` filter.

**PHP**

```php
add_filter( 'cimo/drop_zone/allowed_locations', function ( $locations ) {
	$locations[] = '.my-plugin-dropzone';
	return $locations;
} );
```

**HTML**

```html
<div class="my-plugin-dropzone">
	<p>Drop images here</p>
</div>
```

If the same UI also has a file input, add Method A as well.
The two filters handle different events: file picking vs dropping.

### Method C: Call the JavaScript API directly (manual)

Use this when your plugin already controls the upload in JavaScript and you can wait for Cimo before sending the files.

Call `window.cimo.optimizeFiles()` first.
Then upload the files it returns.

**JavaScript**

```js
async function onFilesSelected( files ) {
	const results = await window.cimo.optimizeFiles( files, { showProgress: true } )
	const filesToUpload = results.map( ( { file } ) => file )

	// Continue with your plugin or theme upload flow.
	await uploadFiles( filesToUpload )
}
```

The API accepts a single `File`, a `FileList`, or an array of `File` objects.
It returns:

**JavaScript**

```js
[
	{
		file: File,
		metadata: Object || null,
	},
]
```

`showProgress` defaults to `true`.
Set it to `false` if your UI already shows upload or optimization progress.

If Cimo optimization is disabled or a file type is unsupported, the original file is returned with `metadata: null`.

## Complete minimal example

This is a frontend form with a file picker only.
It uses Step 1 plus Method A.
No other Cimo code is required.

**PHP**

```php
add_filter( 'cimo/select_files/allowed_locations', function ( $locations ) {
	$locations[] = '.my-plugin-uploader';
	return $locations;
} );

add_action( 'wp_enqueue_scripts', function () {
	if ( is_page( 'submit-photo' ) && function_exists( 'cimo_enqueue_assets' ) ) {
		cimo_enqueue_assets();
	}
} );
```

**HTML**

```html
<form action="/your-endpoint" method="post" enctype="multipart/form-data">
	<div class="my-plugin-uploader">
		<input type="file" name="photo" accept="image/*" required>
	</div>
	<button type="submit">Upload</button>
</form>
```

## Notes

The same JavaScript API is used in free and premium.
If Cimo Premium is loaded, premium converters are applied automatically.
There is no separate premium entry point.

Cimo optimization is pre-upload only.
It does not optimize by attachment ID, bulk replace existing files, or run server-side Imagick/GD compression.

On guest frontend uploads, files can still be optimized in the browser.
Stats and metadata in wp-admin may not appear when the visitor is not logged in or cannot access the Cimo metadata endpoint.
