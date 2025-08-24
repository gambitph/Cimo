We latch on to WordPress events, replace the file with the converted file, then re-dispatch the event so WordPress can handle it properly as if the user uploaded the converted file.

media-manager-drop.js - For drag and dropping image uploading in the Media Manager

Support the following file upload locations:
- [x] Dropping files from the Media Manager
 - [x] TODO: multiple file uploads
- [x] Clicking the "Select Files" in the media manager
 - [x] TODO: multiple file uploads
- [x] Clicking the "Upload" button from the Image Block
- [x] Dropping files from the Media > Add Media File
 - [x] TODO: multiple file uploads
- [x] Clicking "Select Files" from the Media > Add Media File
 - [x] TODO: multiple file uploads

Other TODOs:
- [x] Show information on the media showing that Cimo optimized it and show the following details: original format, original size, new format, new size, % decrease in filesize, optimized in X secs
- [x] Filter only locations where auto-conversion is allowed (hard code this for now)
- [x] Safari is not supported, throw a console error
- [ ] Settings
	- [ ] Show/hide compression stats
	- Image options
		- [ ] Which mime types to auto-convert
		- [ ] Convert to WebP or AVIF
		- [ ] Image quality
		- [ ] Image max dimensions when uploading

Bugs:
- [x] There are random times when you open the Media Manager and we somehow do not override the drop function
- [x] Opening the media manager, then selecing a file to uplaod doesn't show the compression stats
- [ ] Dropping directly on an image block doesn't work (maybe because it's in an iframe?)
- [ ] Comporession info doesn't appear if you open the media in the Admin > Media while in grid view (shows in next open anyway, low prio)

Good to haves, premium?:
- [ ] Convert button in the Media Manager (browser will download the image, convert, then reupload in the same attachment ID)