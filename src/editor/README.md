We latch on to WordPress events, replace the file with the converted file, then re-dispatch the event so WordPress can handle it properly as if the user uploaded the converted file.

media-manager-drop.js - For drag and dropping image uploading in the Media Manager

Support the following file upload locations:
- [x] Dropping files from the Media Manager
 - [x] TODO: multiple file uploads
- [ ] Clicking the "Select Files" in the media manager
 - [ ] TODO: multiple file uploads
- [ ] Clicking the "Upload" button from the Image Block
- [ ] Dropping files from the Media > Add Media File
 - [ ] TODO: multiple file uploads
- [ ] Clicking "Select Files" from the Media > Add Media File
 - [ ] TODO: multiple file uploads

Other TODOs:
- [ ] Window that pops up to notify the user we're still converting (will show up for large files)
- [ ] Settings
	- [ ] Which mime types to auto-convert

Bugs:
- [ ] There are random times when you open the Media Manager and we somehow do not override the drop function

Good to haves, premium?:
- [ ] Convert button in the Media Manager (browser will download the image, convert, then reupload in the same attachment ID)