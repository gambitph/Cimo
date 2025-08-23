1. during file conversion, prefix a special GUID to the image filename so we can identify it
2. after the image is saved by WP, do a rest post to save the attachment metadata based off the GUID that contains all the conversion information
3. the attachment metadata is loaded via `wp_prepare_attachment_for_js`
4. the metadata is displayed from the media manager via hooking in `wp.media.view.Attachment.Details.extend`

TODO: display metadata about the image from the Media Library from the admin