# Build and Packaging

This document explains how to build and package the Cimo plugin for production use.

## Prerequisites

- Node.js 18 or higher
- npm

## Available Scripts

### Development

```bash
# Start development mode with hot reloading
npm run start

# Build for development AND create production package
npm run build

# Lint JavaScript and CSS
npm run lint
npm run lint:js
npm run lint:css

# Format code
npm run format
```

### Production Packaging

```bash
# Create production-ready plugin package (automatically runs after build)
npm run build

# Or run packaging separately
npm run package
```

The `build` script now automatically:

1. Runs the build process to compile JavaScript and CSS
2. Creates a production package with only necessary files
3. Excludes source JavaScript, CSS, and development files
4. Includes compiled/built JavaScript and CSS files
5. Adds security `index.php` files to all directories
6. Creates a zip file in the `dist/` directory
7. Cleans up temporary build files

## Package Contents

The final package includes:

- **Main plugin files**: `cimo.php`, `composer.json`
- **Built assets**: Compiled JavaScript, CSS, and asset files from the build process
- **PHP source code**: All PHP classes and functionality
- **Security files**: `index.php` files in every directory to prevent directory browsing

## Excluded Files

The following files are excluded from the production package:

- Source JavaScript files (`.js`) from `src/` directory
- Source CSS files (`.css`) from `src/` directory
- Source maps (`.map`)
- Markdown files (`.md`)
- Development configuration files
- Node.js dependencies
- Source build artifacts

## Output

The package script creates:

- **Location**: `dist/cimo-{version}.zip`
- **Format**: Standard WordPress plugin zip file
- **Size**: Optimized for production use (typically 0.01-0.02 MB)

## Security Features

Every directory in the package includes an `index.php` file with the content:

```php
<?php
	// Silence is golden.
	// Hide file structure from users on unprotected servers.
```

This prevents users from browsing directory contents on servers without proper protection.

## Build Process

The packaging process:

1. **Build**: Runs `npm run build` to compile JavaScript and CSS
2. **Copy**: Copies main plugin files and PHP source code
3. **Include Built Files**: Copies the compiled assets from the `build/` directory
4. **Security**: Adds `index.php` files to all directories
5. **Package**: Creates a zip file with the final structure
6. **Cleanup**: Removes temporary `build-plugin/` directory

## Usage

1. Run `npm run package` to create the production package
2. Upload the generated zip file to your WordPress site
3. Activate the plugin through the WordPress admin

## Troubleshooting

If you encounter issues:

1. Ensure all dependencies are installed: `npm install`
2. Check that the build process completes successfully
3. Verify the `dist/` directory contains the zip file
4. Check the console output for any error messages
5. Clean up any leftover build directories: `rm -rf build build-plugin dist`
