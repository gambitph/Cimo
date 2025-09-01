Saving the metadata during image conversion
1. First when our image is converted within the browser, already send the metadata along with the filename to the server (the JS should wait until this is finished before proceeding to uploading the converted image - this is essential)
2. The server will queue the metadata/filename in a transient, waiting for new attachments to be added
3. When a new attachment is added via a php hook, the queue should be looked up and the metadata should be saved.
(we have no problem with the media manager UI showing the conversion info since we just do that via JS anyway)

Loading the image metadata from in the Media Manager:
1. the attachment metadata is loaded via `wp_prepare_attachment_for_js`
2. the metadata is displayed from the media manager via hooking in `wp.media.view.Attachment.Details.extend`
