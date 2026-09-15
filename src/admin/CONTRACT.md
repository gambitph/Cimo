# Contract: Attachment intelligence (admin PHP + shared JS savers)

**Kind:** Subsystem must-guarantee (free tree)  
**Product should:** [Attachment intelligence PRD](../../docs/prd/attachment-intelligence.md)  
**How-it-works:** [SAVING_ATTACHMENT_DATA.md](./SAVING_ATTACHMENT_DATA.md) · [attachment-intelligence.md](./attachment-intelligence.md)

---

## Role

1. Accept browser metadata posts, queue by filename, attach onto `add_attachment`.
2. Expose `cimo` on attachment JS models via `wp_prepare_attachment_for_js`.
3. Preserve `cimo` across attachment metadata regeneration.
4. Own stats aggregates and update helpers for upload/bulk/restore events.
5. Render metabox; cooperate with JS sidebar (stealth filters).

## Public interface

| Seam | Guarantee |
| --- | --- |
| REST `POST /cimo/v1/metadata` | Queue allowlisted meta by filename; caps `upload_files` + `edit_posts` (as implemented) |
| JS `saveMetadata(metadataArray)` | Best-effort POST; resolve quietly on unauthorized |
| `add_attachment` handler | Match queue including WP uniquifier suffixes; write `metadata['cimo']` |
| `wp_prepare_attachment_for_js` | Include `cimo` when present |
| `wp_update_attachment_metadata` | Preserve `cimo` when WP regenerates |
| `Cimo_Stats::{get_stats,get_formatted_stats,update_stats_*}` | Single owner for aggregate counters |
| Filter `cimo/metabox/do_render` | Premium stealth may return false |
| Filter `cimo.mediaManager.sidebarInfo.doRender` | Premium stealth may return false (JS) |

## Invariants

- Upload path must queue metadata before synthetic re-dispatch (product law).
- Stats mutations for upload/bulk/restore go through `Cimo_Stats` helpers.
- Metabox/sidebar read `cimo` meta; they do not convert files.

## Out of interface

HTML markup for notices, exact estimate copy, and dismiss AJAX action names are implementation unless they break thresholds documented in the PRD.
