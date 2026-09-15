# Saving attachment data (how-it-works)

> **Canonical should:** [Attachment intelligence PRD](../../docs/prd/attachment-intelligence.md) · **Contract:** [CONTRACT.md](./CONTRACT.md) · **Map:** [attachment-intelligence.md](./attachment-intelligence.md)  
> This note remains a short implementation reminder. It must not invent product law.

Saving the metadata during image conversion:

1. When the file is converted in the browser, send metadata with the filename to the server first.
   JS must wait until this finishes before uploading the converted image.
2. The server queues metadata/filename in a transient until new attachments arrive.
3. On `add_attachment`, look up the queue and save metadata.

Media Manager UI can show conversion info via JS immediately (upload notice cache / sidebar) without waiting on that round-trip alone.

Loading image metadata in the Media Manager:

1. Attachment metadata is loaded via `wp_prepare_attachment_for_js`.
2. The Media Manager displays it by extending `wp.media.view.Attachment.Details`.
