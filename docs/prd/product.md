# PRD: Product (Cimo)

**Status:** Canonical product should  
**Related:** [Free vs premium](./free-vs-premium.md) · [CONTEXT.md](../../CONTEXT.md) · [Architecture](../architecture.md)

---

## North star

Cimo optimizes media **in the browser before WordPress stores it**.
From WordPress’s point of view, the uploaded file was already optimized.
There are no quotas, no external image-processing servers, and no extra server CPU for the conversion itself.

Three pillars sit under that north star:

| Pillar | Meaning |
| --- | --- |
| **A. Instant upload optimize** | Intercept drops/file picks, convert in-browser, upload optimized bytes only |
| **B. Attachment intelligence** | Record savings meta, show it in Media Library / Edit Media, aggregate stats |
| **C. Library leverage (Premium)** | Rewrite existing library files/sizes, more formats, forms coverage, LQIP, stealth |

## Primary surface

- **Upload path:** vanilla JS under `src/admin/js/media-manager/` + shared converters under `src/shared/converters/`
- **Settings UI:** React via `@wordpress/element` under `src/admin/js/page/`
- **PHP role:** settings, enqueue, REST/AJAX, capability gates, metadata attach, stats - not server-side image conversion for the main product path

## Audience

- Site admins / editors who upload media (`upload_files` and related caps as implemented)
- Free users on WordPress.org; Premium users with an activated Freemius lite license

## Non-goals (product)

- Not a remote optimization CDN or quota SaaS
- Not server-side Imagick/GD as the primary convert path for uploads
- Not “slightly better WebP” as the Premium story - Premium is leverage (formats, bulk, forms, smart, LQIP, stealth, license/updates)
- Free Directory package must not ship `pro__premium_only/` or premium logic

## Browser constraints

- Modern Chromium / Firefox / Edge / Opera: WebP conversion on upload
- Safari: optimize may keep the original format when WebP encode is unavailable
- Processing happens on-device until the optimized file is uploaded to WordPress

## Success criteria

A user with Cimo installed can:

1. Upload an image through Media Library (or supported builders) and have the stored file be the optimized result, with original unoptimized bytes dropped.
2. See savings / format info on the attachment (sidebar and/or metabox) and aggregate stats in settings.
3. Configure quality, max dimension, and WordPress scaling/thumbnail behaviour without leaving wp-admin.
4. On Premium (licensed): unlock extra formats, smart optimize, bulk library rewrite, forms/optimize-all, LQIP, stealth, and receive premium updates via Freemius lite.

## Acceptance checks (product-level)

- [ ] Successful conversion means WordPress receives optimized bytes, not the pre-conversion original
- [ ] Failed / unsupported / NullConverter paths do not break native upload
- [ ] Free zip remains Plugin Check / Directory safe; Premium loads only from `pro__premium_only/` when `CIMO_BUILD === 'premium'`
- [ ] Metadata for successful upload optimize is queued before synthetic re-upload proceeds ([attachment-intelligence](./attachment-intelligence.md))
