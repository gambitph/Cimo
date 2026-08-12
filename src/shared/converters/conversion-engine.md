# How-it-works: Conversion engine

> **Canonical should:** [Conversion engine PRD](../../../docs/prd/conversion-engine.md) · **Contract:** [CONTRACT.md](./CONTRACT.md)

## Router (`index.js`)

1. Validate file-like shape → else NullConverter.
2. Reconstruct `File` in current realm if needed.
3. If `image/*` and ImageConverter supports MIME → construct ImageConverter with format/quality/maxDimension/smart flags from `cimoSettings`.
4. Else `applyFilters( 'cimo.getFileConverter', null, file )` or NullConverter.

WebP support probed via canvas `toDataURL`.
Max dimension is min(user max, WP scaling threshold) when both set.

## ImageConverter

- `convert()`: canvas resize/compress; PNG path may use `browser-image-compression`; skip write if larger.
- `optimize()`: if smart flag, async filter `cimo.imageConverter.optimize`; else `convert()`; may stamp `smartOptimized`.
- Animated GIF scan avoids breaking animations.

## Premium registration (reference)

Premium `index-premium.js` addFilters for video/audio/svg, HEIC mime + prepare, and smart optimize.
Those modules live under `pro__premium_only/` and must keep the Converter result contract.
