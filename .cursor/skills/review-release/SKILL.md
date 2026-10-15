---
name: review-release
description: >-
  Review Cimo release-ready zip diffs against the current changelog.
  Use when the user invokes /review-release, after npm run release:ready,
  or when judging the WordPress.org free zip and Freemius paid zip before a release.
disable-model-invocation: true
---

# Review release

Judge the artifacts from `npm run release:ready`.
Do not rebuild, re-upload, unzip, or re-diff.
Do not edit plugin files.
Do not write a verdict file.
Print the full review to the terminal.

## Inputs

1. Read only the `= {version} =` section in repo `readme.txt`.
   `{version}` is the `Version:` header in `cimo.php`.
   Ignore older changelog sections.
2. Read these files under `build/release-ready/`:
   - `free.source.diff`
   - `free.sizes.json`
   - `free.tree.txt`
   - `paid.source.diff`
   - `paid.sizes.json`
   - `paid.tree.txt`
3. Open each unpacked zip's `readme.txt` / plugin header only to confirm `Version` / `Stable tag` match `{version}`.
   Do not use older changelog sections from those files.

FREE baseline is the WordPress.org zip (unpacked under `unpacked/wporg`).
FREE candidate is the local free build (`unpacked/free`), not a Freemius free zip.
PAID baseline is the previous released Freemius paid zip (`unpacked/paid-prev`).
PAID candidate is the new Freemius-processed paid zip (`unpacked/paid-new`).

## How to judge

Read the current changelog section first.
Every source hunk should map to a changelog line, or be Freemius-processor noise (SDK path, contributor, license comments), or get flagged.

Compiled files (`build/**/*.js`, `build/**/*.css`, images, fonts, maps) are size-only in `*.sizes.json`.
Do not read compiled diffs.
Flag a compiled row when `flag` is true (absolute delta over 200KB or over 50%, or the file appeared or disappeared).

Lost files, unexpected libraries, new vendor-looking dirs, and new security surface are findings.
Security surface includes unescaped output, new REST or AJAX, a new remote URL, or a loosened capability check.

FREE zip must stay Directory-safe:
- no `pro__premium_only/`
- no `freemius/` or premium-only Freemius bootstrap in the free package
- `CIMO_BUILD` is `free` in packaged `cimo.php`
- no premium-only strings that should have been stripped

PAID zip should include premium tree and Freemius pieces the previous paid zip had, plus changelog-justified additions.
Expect `vendor/` (Composer runtime for SVG sanitize) in paid builds when that feature ships.

## Output

Print a verbose review to the terminal, in this order:

1. Version (one line, prefix with ✅ when the version matches packaged zips, else ❌)
2. Changelog used (the current section only)
3. FREE findings (one line per item; prefix each with ✅ or ❌)
4. PAID findings (one line per item; prefix each with ✅ or ❌)
5. Compiled size flags (one line per flagged row; ✅ if acceptable, ❌ if suspicious)
6. Final line must start with **`✅ GREEN LIGHT`** or **`❌ BLOCKED`**, then a one-line reason

Use ✅ for pass, okay, explained noise, or changelog-aligned change.
Use ❌ for anything that should block release or needs human follow-up.
Do not omit the emoji on checklist lines.
