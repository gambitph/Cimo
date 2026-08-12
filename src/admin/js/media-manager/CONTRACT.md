# Contract: Upload interception (media-manager)

**Kind:** Subsystem must-guarantee (free tree)  
**Product should:** [Upload interception PRD](../../../docs/prd/upload-interception.md)  
**How-it-works:** [README.md](../../README.md) (locations inventory) · [upload-interception.md](./upload-interception.md)

---

## Role

1. Own capture-phase `drop` and file-input `change` interception for allowed locations.
2. Call `getFileConverter` / `optimize` / `cancel`; never reimplement format encoding here.
3. Call `saveMetadata` and wait for success path before synthetic re-dispatch when conversion produced uploadable output.
4. Re-dispatch synthetic events with optimized files and `__cimo_converted` set.

## Public interface

| Export / seam | Guarantee |
| --- | --- |
| `drop-zone.js` side effect | Document (+ iframe) capture `drop` listener |
| `select-files.js` side effect | Document (+ iframe) capture `change` on file inputs |
| Filters `cimo.dropZone.allowedLocations` / `cimo.selectFiles.allowedLocations` | Arrays of location descriptors; Premium may widen |
| Guard `window.cimoSettings.disableOptimization` | When set, skip work |
| Marker `__cimo_converted` | Present on synthetic events; listeners must ignore |

## Invariants

- Capture phase (`true`) is required.
- Do not process events already marked `__cimo_converted`.
- NullConverter-only batches must not force conversion progress UX.
- Progress modal may show when `requiresFileConversion` is true.
- Do not fork Premium form/Dropzone behaviour inside free listeners; use filters + premium compatibility modules.

## Out of interface

DOM selector churn inside location helpers, progress modal markup, and builder-specific quirks are implementation details unless they break the invariants above.
