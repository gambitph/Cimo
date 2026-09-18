# PRD: Conversion engine

**Status:** Canonical product should  
**Related:** [Upload interception](./upload-interception.md) · [Free vs premium](./free-vs-premium.md) · [Contract](../../src/shared/converters/CONTRACT.md)

---

## Owns

Choosing a Converter for a `File`, the abstract Converter contract, free ImageConverter behaviour, and the filter seams Premium uses to register more converters and smart optimize.

## Promise

Callers ask `getFileConverter(file)` and receive a Converter instance.
They call `optimize()` / `convert()` / `cancel()` and read progress/status.
They do not know whether the implementation is image canvas, mediabunny video, SVGO, or NullConverter.

### Router rules

- Always return a Converter; never throw for unknown types
- Reconstruct cross-realm `File` objects when `instanceof File` fails (iframes)
- Images: ImageConverter when MIME supported; prefer WebP when the browser can encode it; otherwise keep source-friendly format
- When `skipWebpOptimization` is enabled, `image/webp` returns NullConverter so Cimo does not re-compress or resize it
- Non-images: `applyFilters( 'cimo.getFileConverter', null, file )` then NullConverter
- Settings read from `window.cimoSettings` at construction (quality, max dimension vs WP scaling threshold, smart flag)

### Result contract

Successful/failed conversion returns a shape compatible with upload interception:

- `file` - File/Blob to upload (original on skip/failure when required)
- optional `metadata` - keys aligned with REST allowlist
- optional `reason` / `error` / `notice`

Prefer the original file when output would be larger (unless forced), on unsupported format, or on hard failure.

### ImageConverter (free)

- MIME set filterable via `cimo.imageConverter.mimeTypes`
- Prepare hook: `cimo.convertImage.prepare` (Premium HEIC → PNG)
- Optimize hook: `cimo.imageConverter.optimize` (Premium Smart Optimization); else `convert()`
- Animated GIF detection: do not corrupt animations
- Progress: support determinate progress for UI when conversion is non-trivial

### Premium converters (via filters)

Video, audio, SVG, HEIC registration and behaviour are owned by premium PRDs/contracts.
They must obey the same Converter interface and result shape.

## Non-goals

- Not the drop-zone DOM matrix
- Not metadata persistence
- Not bulk per-size filesystem backup

## Acceptance checks

- [ ] `requiresFileConversion(converters)` is true iff any converter is not NullConverter
- [ ] Free build never requires premium converter modules
- [ ] Smart Optimization cannot run when free build forces `smartOptimization` off
- [ ] Filter seams are the only supported way to add format converters
