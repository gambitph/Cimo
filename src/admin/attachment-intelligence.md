# How-it-works: Attachment intelligence

> **Canonical should:** [Attachment intelligence PRD](../../docs/prd/attachment-intelligence.md) · **Contract:** [CONTRACT.md](./CONTRACT.md)

## Metadata path

See also [SAVING_ATTACHMENT_DATA.md](./SAVING_ATTACHMENT_DATA.md).

1. Converter returns `{ file, metadata }`.
2. Interception calls `saveMetadata` (`src/shared/metadata-saver.js`) → `POST cimo/v1/metadata`.
3. `Cimo_Metadata` stores transient queue keyed by filename.
4. On `add_attachment`, match basename (with `-N` uniquifiers) and merge into attachment metadata `cimo`.
5. `wp_prepare_attachment_for_js` exposes `attachment.cimo` to Media Library JS.
6. Sidebar may also show upload-notice-cache entries immediately after convert.

## Stats

`Cimo_Stats` stores option `cimo_stats_data` with incremental `last_processed_post_id` scan over attachments containing serialized `cimo`.
Upload optimize bumps via `update_stats_upload_optimized`.
Bulk optimize/restore bump via premium-called helpers.

## UI surfaces

- `class-meta-box.php` - Edit Media
- `sidebar-info.js` - Media modal details
- `class-admin-notices.php` - activation / rating / library upsell
