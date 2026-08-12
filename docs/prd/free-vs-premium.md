# PRD: Free vs Premium

**Status:** Canonical packaging should  
**Related:** [Product](./product.md) · [Settings & freemium UX](./settings-and-freemium-ux.md) · Premium [Licensing](../../pro__premium_only/docs/prd/licensing-and-updates.md)

---

## Rule

**Free** is superb instant image optimize on upload (growth + Directory).
**Premium** is leverage on the same spine - more formats, smart optimize, bulk library rewrite, forms coverage, LQIP, stealth, license/updates - not “slightly better WebP.”

| | Line |
| --- | --- |
| **Free** | Unlimited instant image → WebP as you upload, in the browser. |
| **Premium** | The same engine, covering your whole library and more media types, under your license. |

## Cut line

| Tier | In scope |
| --- | --- |
| **Free** | Image upload interception → WebP, quality/max dimension, disable WP scaling/thumbnails, stats, sidebar/metabox, bulk **upsell** + shared attachment list/progress REST, free admin notices |
| **Premium** | Video / audio / SVG / HEIC, Smart Optimization, full bulk rewrite + backup/restore, optimize-all / forms, optimization toggle, LQIP, stealth, Freemius lite license + premium updates |

Free plugin code must stay Directory-safe.
Premium logic lives exclusively under `pro__premium_only/` (`CIMO_BUILD === 'premium'`).

## Capability matrix

| Capability | Free | Premium (licensed plan) |
| --- | --- | --- |
| JPG/PNG/WebP → WebP on upload | Yes | Yes |
| WebP quality / max dimension | Yes | Yes |
| Disable WP scaling / thumbnails | Yes | Yes |
| Stats dashboard | Yes | Yes |
| Media sidebar / Edit Media metabox | Yes | Yes (unless Stealth) |
| Smart Optimization | UI upsell; runtime forced off | Yes |
| Bulk optimize library | Upsell + shared list/progress | Full mutate UI + REST |
| Optimize-all / form uploads | Disabled UI | Yes |
| Optimization toggle UI | Disabled UI | Yes |
| Video / audio / SVG / HEIC | Upsell placeholders | Converters via filters |
| LQIP | Upsell | Yes if enabled |
| Stealth mode | Upsell | Yes |
| License / premium updates | N/A (WP.org) | Freemius lite |

## Soft-gate moments

Upsell after free success - never by crippling the wow demo:

| After free user… | Upsell |
| --- | --- |
| Sees large upload savings in sidebar/stats | Bulk optimize the rest of the library |
| Hits video/audio/SVG/HEIC in settings | Premium converters |
| Wants perceptual quality search | Smart Optimization |
| Uploads via forms / front-end builders needing catch-all | Optimize-all media |
| Wants branding hidden | Stealth |

## Anti-patterns

- Do not put premium feature logic in the free tree
- Do not advertise a premium format or setting as free unless free truly exposes it (or clearly marks Premium)
- Do not ship `pro__premium_only/` in the free zip

## Acceptance checks

- [ ] `CIMO_BUILD === 'free'` never loads premium feature classes
- [ ] Free UI uses upsell/disabled patterns for premium-only controls
- [ ] Premium features require Freemius lite plan `premium` or `agency` as implemented
- [ ] Filter seams remain the extension points ([conversion-engine](./conversion-engine.md), [upload-interception](./upload-interception.md), [settings-and-freemium-ux](./settings-and-freemium-ux.md))
