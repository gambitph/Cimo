# Contract: Settings UI shell

**Kind:** Subsystem must-guarantee (free tree)  
**Product should:** [Settings & freemium UX PRD](../../../docs/prd/settings-and-freemium-ux.md)

---

## Role

1. Mount the React settings app at `#cimo-admin-settings`.
2. Read/write `cimo_options` through WordPress Settings REST.
3. Expose freemium extension points so Premium unlocks controls without forking the page.

## Public interface

| Seam | Guarantee |
| --- | --- |
| Filter `cimo.admin.settings.buildType` | Default `'free'`; Premium → `'premium'` |
| Filter `cimo.admin.settings.bulkOptimizationComponent` | Default Fragment/upsell wrapper; Premium → `BulkOptimizer` |
| `window.cimoAdmin` | Admin-page localize (sizes, pricing helpers, flags) |
| Runtime mirror | Script loader localizes `window.cimoSettings` for converters/interception |

## Invariants

- Free `buildType` must not present premium capabilities as enabled free features.
- Bulk real UI is injected only via the bulkOptimizationComponent filter.
- Shared pricing/upsell URL helpers remain single-sourced.

## Out of interface

Individual field layout and section chrome inside `admin-settings.js` are implementation.
Deepening that file is encouraged via GitHub issues without changing these seams.
