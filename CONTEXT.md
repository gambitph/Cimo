# Cimo

Cimo is a WordPress media optimizer that converts and compresses files **in the browser before WordPress receives them**.
The free product is instant image → WebP on upload.
Premium deepens the same spine with more formats, smart optimize, bulk library rewrite, forms coverage, LQIP, stealth, and license/updates via a lite Freemius layer.

## Language

### Product

**Cimo**:
The WordPress plugin product (this codebase).
_Avoid_: CMO, WP Cimo (except marketing URLs), Image Optimizer (as the product name)

**Upload interception**:
Capture-phase listeners that catch drops and file-input changes, run conversion, then re-dispatch a synthetic event with the optimized `File` so WordPress uploads the optimized bytes.
_Avoid_: upload hook (PHP sense), interceptor middleware, middleware chain

**Converter**:
A class implementing the shared convert/optimize contract for one media kind (image, video, audio, SVG, or null passthrough).
_Avoid_: optimizer (as the class name), encoder alone, transcoder alone

**NullConverter**:
Passthrough converter that performs no work and signals “do not intercept / no progress UI.”
_Avoid_: skip converter, no-op handler (prefer the type name)

**Conversion engine**:
The router (`getFileConverter`) plus abstract `Converter` contract and registered format converters.
_Avoid_: conversion service, media pipeline (too vague)

**Smart Optimization**:
Premium image path that searches quality (resemblejs) instead of a fixed WebP quality setting.
_Avoid_: auto quality, perceptual optimize (as the setting name)

**Bulk library optimization**:
Premium client-side rewrite of existing Media Library attachments (original + intermediate sizes) with backup/restore.
Distinct from on-upload interception.
_Avoid_: bulk upload, mass optimize (alone), library scan (the list API is only the dataset)

**Attachment intelligence**:
The cluster that records and surfaces per-attachment Cimo meta: metadata queue, Media Library sidebar, Edit Media metabox, and stats.
_Avoid_: media info box (alone), analytics (too broad)

**Stealth mode**:
Premium setting that hides Cimo branding/UI (metabox, sidebar chrome, settings menu surfacing) while optimization continues.
_Avoid_: hide mode, white-label (unless documenting marketing copy)

**LQIP**:
Premium low-quality image placeholder frontend enhancement.
_Avoid_: blur-up (as the product name), lazy placeholder alone

**Optimize-all media**:
Premium widening of interception locations (including form file inputs and optional `*` catch-all).
_Avoid_: global optimize, catch-all uploads (as the setting name)

### Runtime

**cimoSettings**:
Localized runtime settings object on `window` used by converters and interception (quality, dimensions, flags, `isPremium`, disable toggle).
_Avoid_: cimoAdmin (that is the settings-page localize), options blob

**cimo meta**:
Per-attachment metadata under the `cimo` key (upload savings, bulk entries, flags such as `smartOptimized`).
_Avoid_: attachment options, cimo_options (site settings)

**Metadata queue**:
Server transient keyed by filename that bridges browser `saveMetadata` REST posts to `add_attachment` matching.
_Avoid_: meta cache (sidebar upload-notice cache is separate), pending attachments list

**Upload notice cache**:
Client-side cache of just-converted notice/meta for Media Library UI before attachment meta round-trips.
_Avoid_: metadata queue (server)

**Freemius lite / FSLite**:
Premium-only custom license activation and update stack that talks to Freemius APIs without shipping the full Freemius WordPress SDK UI/bloat.
_Avoid_: Freemius SDK (the full product), FS (ambiguous)

**CIMO_BUILD**:
PHP constant (`free` | `premium`) flipped by build scripts; gates loading `pro__premium_only/`.
_Avoid_: BUILD_TYPE alone (packaging sibling), isPremium (runtime localize derived from build/plan)

### Packaging

**Free**:
Directory-safe plugin tree: on-upload image WebP, settings for quality/dimensions/thumbnails, stats, sidebar/metabox, bulk upsell + shared list/progress REST.
_Avoid_: lite, basic tier (as the technical name)

**Premium**:
Code under `pro__premium_only/` loaded when `CIMO_BUILD === 'premium'`, gated by Freemius lite plan (`premium` | `agency`).
_Avoid_: pro features sprinkled in the free tree
