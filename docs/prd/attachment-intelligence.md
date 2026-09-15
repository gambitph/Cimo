# PRD: Attachment intelligence

**Status:** Canonical product should  
**Related:** [Upload interception](./upload-interception.md) · [Bulk library](./bulk-library.md) · [Contract](../../src/admin/CONTRACT.md)

---

## Owns

Recording per-attachment Cimo outcomes and surfacing them: metadata queue, Media Library sidebar info, Edit Media metabox, stats aggregates, and free admin notices that depend on savings.

## Metadata queue

After browser conversion and **before** synthetic upload:

1. JS `saveMetadata` POSTs to `cimo/v1/metadata` (caps as implemented)
2. PHP queues by filename in a transient
3. `add_attachment` matches (including WP `-1`/`-2` uniquifiers) and writes `metadata['cimo']`
4. Attachment JS prepare exposes `cimo` for UI
5. Regenerating attachment metadata must preserve existing `cimo` when WordPress rewrites sizes

Allowed metadata keys are server-allowlisted.
Unauthorized REST should fail quietly for callers that expect best-effort save.

## Media Library sidebar & metabox

- Sidebar (`sidebar-info.js`) shows savings / format / bulk state for the selected attachment
- Edit Media metabox (`class-meta-box.php`) shows the same intelligence server-side
- Just-uploaded state may use upload notice cache before meta round-trip
- Stealth (Premium) may suppress render via `cimo.mediaManager.sidebarInfo.doRender` and `cimo/metabox/do_render`

## Stats

`Cimo_Stats` owns aggregate bytes saved, counts, incremental library scan cursor, and helpers for upload vs bulk optimize/restore updates.
Settings UI and notices consume formatted stats and additional-savings estimates (Premium upsell math).

Rating / library premium notices may gate on savings thresholds (e.g. ≥ 5 MB) and dismiss/snooze behaviour.

## Admin notices (folded)

Free activation notice, rating notice, and Media Library premium upsell notice live here as product behaviour.
Premium license notices are owned by the licensing PRD.

## Non-goals

- Not performing conversion
- Not bulk filesystem backup/restore (premium bulk)

## Acceptance checks

- [ ] Upload optimize path queues metadata before re-dispatch
- [ ] `cimo` meta survives WP attachment metadata regeneration
- [ ] Stats update helpers stay consistent with upload and bulk events
- [ ] Stealth filters can hide sidebar/metabox without disabling optimization
