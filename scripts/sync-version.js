const fs = require( 'fs' )

// Read version from cimo.php plugin header
const cimoPhp = fs.readFileSync( 'cimo.php', 'utf8' )
const versionMatch = cimoPhp.match( /^\s*\*\s*Version:\s*([^\r\n]+)/m )

if ( ! versionMatch ) {
	throw new Error( 'Could not find Version in cimo.php' )
}

const pluginVersion = versionMatch[ 1 ].trim()

// Read current package.json
const packageJson = JSON.parse( fs.readFileSync( 'package.json', 'utf8' ) )

// Check if version needs updating
if ( packageJson.version !== pluginVersion ) {
	// eslint-disable-next-line no-console
	console.log( `🔄 Updating package.json version from ${ packageJson.version } to ${ pluginVersion }` )

	// Update version
	packageJson.version = pluginVersion

	// Write back to package.json with proper formatting
	fs.writeFileSync( 'package.json', JSON.stringify( packageJson, null, '\t' ) + '\n' )

	// eslint-disable-next-line no-console
	console.log( '✅ package.json version updated successfully' )
} else {
	// eslint-disable-next-line no-console
	console.log( `✅ package.json version already matches plugin version: ${ pluginVersion }` )
}
