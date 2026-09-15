# Contract: Conversion engine

**Kind:** Subsystem must-guarantee (free tree)  
**Product should:** [Conversion engine PRD](../../../docs/prd/conversion-engine.md)  
**How-it-works:** [conversion-engine.md](./conversion-engine.md)

---

## Role

1. `getFileConverter(file)` is the only supported router entry for choosing a Converter.
2. All converters implement the abstract `Converter` contract (`convert`, `optimize`, `cancel`, progress/status).
3. Premium adds converters and image hooks only through documented `@wordpress/hooks` filters.

## Public interface

| Symbol / seam | Guarantee |
| --- | --- |
| `getFileConverter(file)` | Always returns a Converter; NullConverter for unknown/invalid |
| `requiresFileConversion(converters)` | True iff any entry is not NullConverter |
| `Converter` abstract | `progress` ∈ [0,1], `status`, `errorMessage`, `convert()`, `optimize()`, `cancel()` |
| Result object | At least `{ file }`; optional `metadata`, `reason`, `error`, `notice` |
| Filter `cimo.getFileConverter` | `(converter\|null, file)`; Premium returns Video/Audio/SVG converters |
| Filter `cimo.imageConverter.mimeTypes` | MIME list for ImageConverter |
| Filter `cimo.convertImage.prepare` | Async prepare before image convert (HEIC) |
| Filter `cimo.imageConverter.optimize` | Async smart optimize path |

## Invariants

- Cross-realm File reconstruction when `instanceof File` fails but shape is file-like.
- Prefer original file when output grows (unless forced), on unsupported encode, or on failure.
- Read runtime options from `window.cimoSettings` at construction time.
- Free ImageConverter must not import premium modules.

## Out of interface

Canvas math, mediabunny graphs, SVGO option bags, and resemblejs search loops are implementation behind the Converter/filter seams.
