# How-it-works: Upload interception

> **Canonical should:** [Upload interception PRD](../../../docs/prd/upload-interception.md) · **Contract:** [CONTRACT.md](./CONTRACT.md)  
> This file maps current machinery. If it disagrees with the PRD/contract, the PRD/contract win.

**Entry:** `src/admin/js/index.js` imports `drop-zone.js`, `select-files.js`, `progress-modal.js`, `sidebar-info.js`.  
**Enqueue:** `Cimo_Script_Loader` → `build/admin/index.js` (`cimo-script`) on admin, block editor, and supported builders.

## Drop path

1. Capture-phase `drop` on `document` (and watched editor iframes).
2. Resolve whether the target matches `allowedLocations` (filterable) or Media Manager fallbacks (e.g. `.supports-drag-drop`).
3. Collect `File`s from `dataTransfer`.
4. Map each file through `getFileConverter`.
5. If `requiresFileConversion`, show progress (delay/indeterminate rules in progress-modal).
6. `Promise.all` optimize; support cancel.
7. `saveMetadata` for results that carry metadata.
8. Build a synthetic drop event with optimized files, set `__cimo_converted`, dispatch so native handlers upload.

## Select-files path

Same conversion/metadata pipeline, but:

- Listen for `change` on matching file inputs
- Rewrite `input.files` via `DataTransfer`
- Re-fire `change` with `__cimo_converted`

## Premium widening

`pro__premium_only` compatibility modules addFilter on allowedLocations (forms, optional `*`) and may adapt Dropzone.js `addedfile` flows.
Optimization toggle can set `disableOptimization` at runtime.

## Related inventory

Broader location TODOs and builder notes: [`src/admin/README.md`](../../README.md).
