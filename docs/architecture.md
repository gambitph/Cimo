# Architecture

High-level map of Cimo for engineers and agents.

**Canonical product should:** [`docs/prd/README.md`](./prd/README.md)  
**Premium should:** [`pro__premium_only/docs/prd/README.md`](../pro__premium_only/docs/prd/README.md)  
**Glossary:** [`CONTEXT.md`](../CONTEXT.md) · **ADRs:** [`docs/adr/`](./adr/)  
**Subsystem contracts:** colocated `CONTRACT.md`  
**How-it-works:** colocated maps (implementation only - must not invent product law)

---

## Product surface

Cimo is a **browser-first media optimizer** for WordPress:

- Primary runtime: capture-phase upload interception → Converter → optimized `File` → native WP upload
- Settings: React admin page writing `cimo_options`
- PHP: enqueue, REST, metadata attach, stats, caps - not the primary encode engine

Free = instant image WebP on upload.
Premium = same spine + formats, smart optimize, bulk rewrite, forms, LQIP, stealth, Freemius lite.

---

## System diagram

```text
 User drop / file input
         │
         ▼
 ┌───────────────────────────┐
 │ Upload interception       │  drop-zone / select-files (capture)
 │ media-manager             │
 └─────────────┬─────────────┘
               │ getFileConverter(file)
               ▼
 ┌───────────────────────────┐     applyFilters (premium)
 │ Conversion engine         │◄──── video/audio/svg/heic/smart
 │ shared/converters         │
 └─────────────┬─────────────┘
               │ { file, metadata }
               ▼
 ┌───────────────────────────┐
 │ saveMetadata REST         │  queue by filename
 └─────────────┬─────────────┘
               │ synthetic event + __cimo_converted
               ▼
 ┌───────────────────────────┐
 │ WordPress / builder upload│
 └─────────────┬─────────────┘
               │ add_attachment match
               ▼
 ┌───────────────────────────┐
 │ cimo meta + stats         │──► sidebar / metabox / settings
 └───────────────────────────┘

 Premium bulk (separate surface):
 settings BulkOptimizer → convert sizes in browser → upload/restore REST → backups + stats
```

---

## Bootstrap

1. `cimo.php` defines `CIMO_BUILD` (`free` | `premium`) and loads free PHP classes.
2. If premium and `pro__premium_only/index.php` exists, require it.
3. Premium always initializes Freemius lite; feature classes load when plan is `premium` or `agency`.

Build scripts flip `CIMO_BUILD` and webpack entries (`admin/index`, `admin/admin-page`; premium adds `*-premium` and LQIP).

---

## Major subsystems

| Subsystem | Code | Contract / PRD |
| --- | --- | --- |
| Upload interception | `src/admin/js/media-manager/` | [CONTRACT](../src/admin/js/media-manager/CONTRACT.md) · [PRD](./prd/upload-interception.md) |
| Conversion engine | `src/shared/converters/` | [CONTRACT](../src/shared/converters/CONTRACT.md) · [PRD](./prd/conversion-engine.md) |
| Attachment intelligence | `src/admin/class-metadata.php`, `class-stats.php`, `class-meta-box.php`, sidebar-info | [CONTRACT](../src/admin/CONTRACT.md) · [PRD](./prd/attachment-intelligence.md) |
| Bulk (shared) | `src/admin/class-bulk-library.php`, bulk-optimizer upsell | [PRD](./prd/bulk-library.md) |
| Bulk (premium) | `pro__premium_only/.../class-bulk-optimization.php`, bulk-optimizer UI | [Premium PRD](../pro__premium_only/docs/prd/bulk-library-premium.md) |
| Settings shell | `src/admin/js/page/` | [CONTRACT](../src/admin/js/page/CONTRACT.md) · [PRD](./prd/settings-and-freemium-ux.md) |
| Freemius lite | `pro__premium_only/freemius.php`, FSLite | [Premium PRD](../pro__premium_only/docs/prd/licensing-and-updates.md) |

---

## Freemium seams (summary)

Premium extends free through filters/actions rather than forking the spine.
See [free-vs-premium](./prd/free-vs-premium.md) for the matrix and the conversion/upload/settings PRDs for named hooks.

---

## Doc precedence

When code, how-it-works, and PRD/contract disagree: **PRD/contract win**.
Open a GitHub issue for deepen/refactor opportunities that improve locality without changing product promises.
