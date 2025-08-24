# WP Cimo

This repository contains the Cimo WordPress plugin, which automatically converts uploaded images to WebP format for improved performance.

## Requirements

- Node.js v18 or higher
- npm v9 or higher
- PHP 8.2+ (for AVIF support, PHP 8.3+ recommended)
- WordPress

## Scripts

- `npm start` – Development build with watch mode
- `npm run build` – Production build
- `npm run lint:js` – Lint JavaScript
- `npm run format` – Format code with Prettier

## Structure

- `src/admin/index.js` – Admin-side scripts
- `src/editor/index.js` – Editor-side scripts
- `src/frontend/index.js` – Frontend scripts
- `build/` – Compiled output

## License

This plugin is licensed under the GPL v2 or later.

## Notes

- AVIF support requires Imagick with AVIF enabled. Not all local PHP environments (e.g., Local by Flywheel with PHP 8.2) support AVIF. PHP 8.3+ is recommended for full compatibility.
