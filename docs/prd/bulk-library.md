# PRD: Bulk library (shared)

**Status:** Canonical product should (shared spine)  
**Related:** [Free vs premium](./free-vs-premium.md) · Premium [Bulk library](../../pro__premium_only/docs/prd/bulk-library-premium.md) · [Attachment intelligence](./attachment-intelligence.md)

---

## Owns

The **shared** bulk surface: listing Media Library candidates, progress counts, free upsell UI injection, and the rule that bulk is a second product surface (not the upload interceptor).

## Promise

### Free

- Settings shows a bulk optimization section
- Default component is an upsell (`BulkOptimizationUpsell`) unless Premium replaces it via `cimo.admin.settings.bulkOptimizationComponent`
- Shared REST provides attachment listing and progress aggregates:
  - `GET /cimo/v1/attachments`
  - `GET /cimo/v1/bulk-progress`
- Caps require appropriate edit/upload capabilities (as implemented)

### Premium

Full client-side rewrite, per-size upload/skip/restore, backups, and stats mutations are specified in [bulk-library-premium](../../pro__premium_only/docs/prd/bulk-library-premium.md).

## Product rules

- Bulk optimizes **existing** attachments; it does not replace upload interception
- Processing remains browser-side; PHP stores results and backups, it does not re-encode pixels as the primary engine
- Free and Premium share the same attachment dataset/progress endpoints so upsell progress and real work stay aligned
- Stats must update on optimize and restore through `Cimo_Stats` helpers

## Acceptance checks

- [ ] Free never mutates attachment files through bulk routes
- [ ] Premium swaps the settings component through the filter seam only
- [ ] Progress counts remain meaningful on free (upsell) and premium (active) builds
