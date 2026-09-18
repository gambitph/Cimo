# PRD: Settings & freemium UX

**Status:** Canonical product should  
**Related:** [Free vs premium](./free-vs-premium.md) · [Contract](../../src/admin/js/page/CONTRACT.md) · Premium [LQIP](../../pro__premium_only/docs/prd/lqip.md)

---

## Owns

The settings page shell, `cimo_options` schema surfacing, free vs premium control states, upsell copy/links, and how Premium unlocks the same UI (`buildType`, component filters) without forking the page.

## Promise

- Mount React settings into `#cimo-admin-settings`
- Persist via WordPress Settings REST (`cimo_options`)
- Localize `window.cimoAdmin` for admin-page needs; runtime mirrors critical flags on `window.cimoSettings` via script loader
- Free `buildType` (filter default `'free'`): premium controls shown as disabled/upsell, not as silently working free features
- Premium sets `cimo.admin.settings.buildType` → `'premium'` and swaps bulk component / enables controls
- Stealth may hide the settings submenu while keeping the page reachable (e.g. plugin action link) as implemented

## Free-functional settings

- Disable WP big-image scaling
- Thumbnail generation / per-size toggles
- WebP quality
- Skip WebP optimization, including Cimo resizing
- Max image dimension
- Stats dashboard consumption

## Premium-gated UI (registered options may exist; runtime/UI gated)

- Smart Optimization
- Bulk optimizer (real component)
- Optimize-all / forms-related flags
- Optimization toggle + persistence flags
- Video / audio / SVG
- LQIP
- Stealth

Ship or silence: do not present premium capabilities as free.

## LQIP

Product should for LQIP behaviour lives in the premium LQIP PRD.
Free settings only show upsell/placeholder for LQIP.

## Acceptance checks

- [ ] Free build forces smart optimization off in localized runtime settings
- [ ] Premium unlock uses filters, not a separate free settings app
- [ ] Pricing/upsell URLs use shared helpers (single source)
- [ ] Stealth does not require deleting the settings page registration entirely if deep-link access remains
