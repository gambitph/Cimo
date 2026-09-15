# PRD: Upload interception

**Status:** Canonical product should  
**Related:** [Conversion engine](./conversion-engine.md) · [Attachment intelligence](./attachment-intelligence.md) · [Contract](../../src/admin/js/media-manager/CONTRACT.md)

---

## Owns

How Cimo catches Media Library / editor / builder uploads, runs conversion, and replaces the inbound files with optimized ones before WordPress stores them.

## Promise

When a user drops or selects convertible files in an allowed location, Cimo:

1. Intercepts in the **capture** phase (beats native upload handlers)
2. Resolves a Converter via `getFileConverter`
3. Runs `optimize()` (cancellable; progress UI when required)
4. Queues metadata via `saveMetadata` **before** continuing
5. Re-dispatches a synthetic drop/change carrying optimized `File`s marked `__cimo_converted`
6. Lets the original WordPress / builder upload path consume the optimized files

Unconvertible files (NullConverter) pass through without blocking the native path.

## Locations

Free allowlists cover Media Manager and major editor/builder surfaces (see how-it-works / `allowedLocations` defaults).
Premium may widen via filters (`cimo.dropZone.allowedLocations`, `cimo.selectFiles.allowedLocations`), including form selectors and optional `*` for optimize-all.

## Failure & edge behaviour

- Re-entrancy: events already marked `__cimo_converted` must not be processed again
- Mixed batches: process convertible files; passthrough others; do not hard-bail the whole batch solely because Safari lacks WebP
- Cancel: user cancel calls `converter.cancel()` and must not leave the UI wedged
- `window.cimoSettings.disableOptimization`: skip interception
- Frontend anonymous contexts: follow metadata saver rules (may skip REST save)

## Non-goals

- Does not own format encode algorithms (conversion engine)
- Does not own bulk rewrite of existing library files (bulk PRDs)
- Does not replace WordPress media permissions

## Acceptance checks

- [ ] Capture-phase listeners are required for drop and file-input paths
- [ ] Metadata REST completes before synthetic re-dispatch on successful convert
- [ ] Synthetic events set `__cimo_converted`
- [ ] NullConverter batches do not show unnecessary progress chrome
- [ ] Premium location widening uses filters, not forks of free listeners
