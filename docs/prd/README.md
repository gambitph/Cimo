# Cimo PRD index (canonical, free tree)

This folder is the home for **free-tree and shared-spine** product “should” PRDs.
Premium-owned product should lives under [`pro__premium_only/docs/prd/`](../../pro__premium_only/docs/prd/README.md).

**Doc kinds**

| Kind | Location | Wins when |
| --- | --- | --- |
| **Product PRD (free/shared)** | `docs/prd/*.md` (this folder) | Code disagrees with intended product behaviour |
| **Product PRD (premium-owned)** | `pro__premium_only/docs/prd/*.md` | Premium-only behaviour disagrees with intended product |
| **Subsystem contract** | Colocated `CONTRACT.md` | Code violates a must-guarantee interface |
| **How-it-works** | Colocated `*.md` | Explaining current machinery (must not invent product law) |
| **Glossary** | Root [`CONTEXT.md`](../../CONTEXT.md) | Naming / ubiquitous language |
| **ADRs** | [`docs/adr/`](../adr/) | Hard-to-reverse trade-offs |
| **Architecture map** | [`docs/architecture.md`](../architecture.md) | Finding the right subsystem |

**Rule:** New narrative product docs outside this list are forbidden.
Absorb into a PRD/contract, or do not write them.

When fixing bugs: find the PRD/contract violation first, then change code.
Do not “fix” by weakening the PRD without an explicit product decision.

Changing a deep-module interface requires PRD/contract update + tests in the same change.

---

## Product PRDs (free / shared)

| Slug | Doc | Owns |
| --- | --- | --- |
| product | [product.md](./product.md) | North star, browser-side optimize, audience, success |
| free-vs-premium | [free-vs-premium.md](./free-vs-premium.md) | Packaging cut, upsell, matrix |
| upload-interception | [upload-interception.md](./upload-interception.md) | Drop/select capture, locations, synthetic re-dispatch |
| conversion-engine | [conversion-engine.md](./conversion-engine.md) | Router, Converter contract, image path, filter seams |
| attachment-intelligence | [attachment-intelligence.md](./attachment-intelligence.md) | Metadata queue, sidebar, metabox, stats, notices |
| bulk-library | [bulk-library.md](./bulk-library.md) | Shared list/progress; free upsell; points to premium mutate |
| settings-and-freemium-ux | [settings-and-freemium-ux.md](./settings-and-freemium-ux.md) | Options schema, settings UI, upsells, stealth surface |

## Premium-owned PRDs (pointers)

| Slug | Doc |
| --- | --- |
| licensing-and-updates | [`pro__premium_only/docs/prd/licensing-and-updates.md`](../../pro__premium_only/docs/prd/licensing-and-updates.md) |
| bulk-library-premium | [`pro__premium_only/docs/prd/bulk-library-premium.md`](../../pro__premium_only/docs/prd/bulk-library-premium.md) |
| lqip | [`pro__premium_only/docs/prd/lqip.md`](../../pro__premium_only/docs/prd/lqip.md) |

## Free subsystem contracts

| Area | Doc |
| --- | --- |
| Upload interception | [`src/admin/js/media-manager/CONTRACT.md`](../../src/admin/js/media-manager/CONTRACT.md) |
| Conversion engine | [`src/shared/converters/CONTRACT.md`](../../src/shared/converters/CONTRACT.md) |
| Attachment intelligence (PHP) | [`src/admin/CONTRACT.md`](../../src/admin/CONTRACT.md) |
| Settings UI shell | [`src/admin/js/page/CONTRACT.md`](../../src/admin/js/page/CONTRACT.md) |

## Write / fix order

1. `CONTEXT.md` + this index + product + free-vs-premium
2. Upload interception + conversion engine (+ contracts)
3. Attachment intelligence + bulk-library (+ contracts)
4. Settings-and-freemium-ux
5. Premium PRDs/contracts under `pro__premium_only/`
6. Align how-it-works; open GitHub issues for deepen/refactor opportunities

## Open deepen issues (not product law)

Refactors that improve locality without changing PRD promises:

- [#71](https://github.com/gambitph/Cimo/issues/71) - single-source sidebar/metabox formatting
- [#72](https://github.com/gambitph/Cimo/issues/72) - deepen settings UI behind contract
- [#73](https://github.com/gambitph/Cimo/issues/73) - single-source freemium option enforcement
