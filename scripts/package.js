/* eslint-disable no-console */
const fs = require( 'fs' )
const path = require( 'path' )
const archiver = require( 'archiver' )

// Allow PR builds to add a version suffix.
let folderSuffix = ''
if ( process.argv.length === 3 ) {
	folderSuffix = process.argv[ process.argv.length - 1 ]
}

// Configuration
const PLUGIN_NAME = 'cimo'
const BUILD_DIR = 'build-plugin'
const DIST_DIR = 'dist'
const IS_PREMIUM_BUILD = process.env.BUILD_TYPE === 'premium'

// Get version from cimo.php plugin header
const cimoPhp = fs.readFileSync( 'cimo.php', 'utf8' )
const versionMatch = cimoPhp.match( /^\s*\*\s*Version:\s*([^\r\n]+)/m )
if ( ! versionMatch ) {
	throw new Error( 'Could not find Version in cimo.php' )
}
const PLUGIN_VERSION = versionMatch[ 1 ].trim()

// Files and directories to include in the package
const INCLUDED_FILES = [
	'cimo.php',
	'composer.json',
	'index.php',
	'readme.txt',
	...( IS_PREMIUM_BUILD ? [ 'freemius', 'pro__premium_only' ] : [] ),
]

// Create security index.php content
const INDEX_PHP_CONTENT = `<?php
	// Silence is golden.
	// Hide file structure from users on unprotected servers.

`

// Ensure directories exist
function ensureDir( dir ) {
	if ( ! fs.existsSync( dir ) ) {
		fs.mkdirSync( dir, { recursive: true } )
	}
}

// Copy file with directory creation
function copyFile( src, dest ) {
	const destDir = path.dirname( dest )
	ensureDir( destDir )
	fs.copyFileSync( src, dest )
}

// Check if directory has meaningful content (not just index.php files)
function hasMeaningfulContent( dirPath ) {
	const items = fs.readdirSync( dirPath )

	for ( const item of items ) {
		const itemPath = path.join( dirPath, item )
		const stat = fs.statSync( itemPath )

		if ( stat.isDirectory() ) {
			// Recursively check subdirectories
			if ( hasMeaningfulContent( itemPath ) ) {
				return true
			}
		} else if ( item !== 'index.php' ) {
			// Found a file that's not index.php
			return true
		}
	}

	return false
}

// Copy directory recursively, excluding empty directories with only index.php
function copyDir( src, dest ) {
	// Check if source directory has meaningful content
	if ( ! hasMeaningfulContent( src ) ) {
		return false
	}

	ensureDir( dest )
	const items = fs.readdirSync( src )
	let hasCopiedFiles = false

	for ( const item of items ) {
		const srcPath = path.join( src, item )
		const destPath = path.join( dest, item )
		const stat = fs.statSync( srcPath )

		if ( stat.isDirectory() ) {
			// Recursively copy subdirectory
			if ( copyDir( srcPath, destPath ) ) {
				hasCopiedFiles = true
			}
		} else {
			// Check if this file should be excluded
			const fileName = path.basename( srcPath )
			const fileExt = path.extname( srcPath )

			const isInNodeModules = srcPath.split( path.sep ).includes( 'node_modules' )

			// Exclude JavaScript, CSS, markdown, and other development files
			const shouldExclude =
				fileExt === '.js' ||
				fileExt === '.css' ||
				fileExt === '.map' ||
				fileExt === '.md' ||
				fileName === 'package.json' ||
				fileName === 'package-lock.json' ||
				fileName === 'webpack.config.js' ||
				fileName === 'index.js' ||
				fileName === 'index.css' ||
				isInNodeModules

			if ( ! shouldExclude ) {
				copyFile( srcPath, destPath )
				hasCopiedFiles = true
			}
		}
	}

	// If no meaningful files were copied, remove the directory
	if ( ! hasCopiedFiles ) {
		try {
			fs.rmdirSync( dest )
		} catch ( e ) {
			// Directory not empty, leave it
		}
		return false
	}

	return true
}

// Copy built files from build directory
function copyBuiltFiles( src, dest ) {
	if ( ! fs.existsSync( src ) ) {
		return
	}

	ensureDir( dest )
	const items = fs.readdirSync( src )

	for ( const item of items ) {
		const srcPath = path.join( src, item )
		const destPath = path.join( dest, item )
		const stat = fs.statSync( srcPath )

		if ( stat.isDirectory() ) {
			// Copy directory contents
			copyBuiltDir( srcPath, destPath )
		} else {
			// Copy single file
			copyFile( srcPath, destPath )
		}
	}
}

// Copy built directory contents
function copyBuiltDir( src, dest ) {
	ensureDir( dest )

	const items = fs.readdirSync( src )

	for ( const item of items ) {
		const srcPath = path.join( src, item )
		const destPath = path.join( dest, item )
		const stat = fs.statSync( srcPath )

		if ( stat.isDirectory() ) {
			copyBuiltDir( srcPath, destPath )
		} else {
			// Copy all built files (JS, CSS, PHP, etc.)
			copyFile( srcPath, destPath )
		}
	}
}

// Add security index.php files to directories
function addSecurityFiles( dir ) {
	if ( ! fs.existsSync( dir ) ) {
		return
	}

	const items = fs.readdirSync( dir )

	for ( const item of items ) {
		const itemPath = path.join( dir, item )
		const stat = fs.statSync( itemPath )

		if ( stat.isDirectory() ) {
			// Add index.php to this directory
			const indexPath = path.join( itemPath, 'index.php' )
			if ( ! fs.existsSync( indexPath ) ) {
				fs.writeFileSync( indexPath, INDEX_PHP_CONTENT )
			}

			// Recursively add to subdirectories
			addSecurityFiles( itemPath )
		}
	}
}

function updatePluginHeaderVersion( buildDir, suffix ) {
	if ( ! suffix ) {
		return
	}

	const pluginFileName = 'cimo.php'
	const pluginFilePath = path.join( buildDir, pluginFileName )

	if ( ! fs.existsSync( pluginFilePath ) ) {
		return
	}

	let content = fs.readFileSync( pluginFilePath, 'utf8' )
	// Append folder suffix to version in plugin header
	content = content.replace(
		/^(\s*\*\s*Version:\s*)([^\r\n]+)/m,
		( match, prefix, version ) => {
			// Only append if suffix is not already present
			if ( ! version.includes( suffix ) ) {
				return prefix + version + '-' + suffix
			}
			return match
		}
	)
	fs.writeFileSync( pluginFilePath, content )
	console.log( `📝 Updated version in ${ pluginFileName } to include suffix: ${ suffix }` )
}

// Main packaging function
async function packagePlugin() {
	// eslint-disable-next-line no-console
	console.log( '🚀 Starting plugin packaging...' )
	// eslint-disable-next-line no-console
	console.log( `📦 Build type: ${ IS_PREMIUM_BUILD ? 'Premium' : 'Free' }` )

	// Clean and create build directory
	if ( fs.existsSync( BUILD_DIR ) ) {
		fs.rmSync( BUILD_DIR, { recursive: true } )
	}
	ensureDir( BUILD_DIR )

	// Copy main plugin files
	// eslint-disable-next-line no-console
	console.log( '📁 Copying main plugin files...' )
	for ( const file of INCLUDED_FILES ) {
		if ( fs.existsSync( file ) ) {
			const stat = fs.statSync( file )
			if ( stat.isDirectory() ) {
				copyDir( file, path.join( BUILD_DIR, file ) )
			} else {
				copyFile( file, path.join( BUILD_DIR, file ) )
			}
		}
	}

	// Copy source directories (excluding JS/CSS)
	// eslint-disable-next-line no-console
	console.log( '📁 Copying source directories...' )
	copyDir( 'src', path.join( BUILD_DIR, 'src' ) )

	// Copy built files from build directory
	// eslint-disable-next-line no-console
	console.log( '📁 Copying built files...' )
	copyBuiltFiles( 'build', path.join( BUILD_DIR, 'build' ) )

	// Add security index.php files
	// eslint-disable-next-line no-console
	console.log( '🔒 Adding security index.php files...' )
	addSecurityFiles( BUILD_DIR )

	console.log( '📝 Updating plugin header version...' )
	updatePluginHeaderVersion( BUILD_DIR, folderSuffix )

	// Create zip file
	// eslint-disable-next-line no-console
	console.log( '📦 Creating zip package...' )
	ensureDir( DIST_DIR )

	const zipPath = path.join( DIST_DIR, `${ PLUGIN_NAME }-${ PLUGIN_VERSION }.zip` )
	const output = fs.createWriteStream( zipPath )
	const archive = archiver( 'zip', { zlib: { level: 9 } } )

	output.on( 'close', () => {
		const size = ( archive.pointer() / 1024 / 1024 ).toFixed( 2 )
		// eslint-disable-next-line no-console
		console.log( '✅ Plugin packaged successfully!' )
		// eslint-disable-next-line no-console
		console.log( `📦 Package: ${ zipPath }` )
		// eslint-disable-next-line no-console
		console.log( `📊 Size: ${ size } MB` )

		// Clean up build directory
		fs.rmSync( BUILD_DIR, { recursive: true } )
		// eslint-disable-next-line no-console
		console.log( '🧹 Build directory cleaned up' )
	} )

	archive.on( 'error', err => {
		throw err
	} )

	archive.pipe( output )
	archive.directory( BUILD_DIR, PLUGIN_NAME + ( folderSuffix ? `-${ folderSuffix }` : '' ) )
	await archive.finalize()
}

// Run the packaging
packagePlugin().catch( err => {
	// eslint-disable-next-line no-console
	console.error( err )
} )
