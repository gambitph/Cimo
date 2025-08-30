const fs = require( 'fs' )
const https = require( 'https' )

// Function to fetch available WordPress versions
async function getAvailableWordPressVersions() {
	return new Promise( resolve => {
		https.get( 'https://api.wordpress.org/core/version-check/1.7/', res => {
			let data = ''

			res.on( 'data', chunk => {
				data += chunk
			} )

			res.on( 'end', () => {
				try {
					const response = JSON.parse( data )
					if ( response.offers && response.offers.length > 0 ) {
						// Extract all available versions from the offers
						const versions = response.offers.map( offer => offer.version )
						resolve( versions )
					} else {
						resolve( [ '6.8.2', '6.8.1', '6.8.0', '6.7.2', '6.7.1', '6.7.0', '6.6.2', '6.6.1', '6.6.0' ] ) // Fallback versions
					}
				} catch ( error ) {
					resolve( [ '6.8.2', '6.8.1', '6.8.0', '6.7.2', '6.7.1', '6.7.0', '6.6.2', '6.6.1', '6.6.0' ] ) // Fallback versions
				}
			} )
		} ).on( 'error', () => {
			resolve( [ '6.8.2', '6.8.1', '6.8.0', '6.7.2', '6.7.1', '6.7.0', '6.6.2', '6.6.1', '6.6.0' ] ) // Fallback versions
		} )
	} )
}

// Function to calculate minimum required version (2 minor versions behind, but ensure it exists)
function calculateMinVersion( latestVersion, availableVersions ) {
	const parts = latestVersion.split( '.' )
	if ( parts.length >= 2 ) {
		const major = parseInt( parts[ 0 ] )
		const minor = parseInt( parts[ 1 ] )

		// Calculate target minor version (2 minor versions behind)
		const targetMinor = Math.max( 0, minor - 2 )
		const targetVersion = `${ major }.${ targetMinor }`

		// Check if the target version exists in available versions
		const exactMatch = availableVersions.find( version => version.startsWith( targetVersion ) )
		if ( exactMatch ) {
			return exactMatch
		}

		// If exact match not found, find the closest available version that's <= target
		const availableInMajor = availableVersions
			.filter( version => version.startsWith( `${ major }.` ) )
			.sort( ( a, b ) => {
				const aMinor = parseInt( a.split( '.' )[ 1 ] )
				const bMinor = parseInt( b.split( '.' )[ 1 ] )
				return bMinor - aMinor // Sort descending
			} )

		// Find the first version that's <= target minor
		for ( const version of availableInMajor ) {
			const versionMinor = parseInt( version.split( '.' )[ 1 ] )
			if ( versionMinor <= targetMinor ) {
				return version
			}
		}

		// If no suitable version found in the same major, return the oldest available version
		return availableVersions[ availableVersions.length - 1 ]
	}
	return latestVersion
}

// Main sync function
async function syncVersions() {
	try {
		// Read version from cimo.php plugin header
		const cimoPhp = fs.readFileSync( 'cimo.php', 'utf8' )
		const versionMatch = cimoPhp.match( /^\s*\*\s*Version:\s*([^\r\n]+)/m )

		if ( ! versionMatch ) {
			throw new Error( 'Could not find Version in cimo.php' )
		}

		const pluginVersion = versionMatch[ 1 ].trim()

		// Read current package.json
		const packageJson = JSON.parse( fs.readFileSync( 'package.json', 'utf8' ) )

		// Check if package.json version needs updating
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

		// Fetch latest WordPress version
		// eslint-disable-next-line no-console
		console.log( '🌐 Fetching available WordPress versions...' )
		const availableVersions = await getAvailableWordPressVersions()
		const latestWordPressVersion = availableVersions[ 0 ] // First version is the latest
		const minWordPressVersion = calculateMinVersion( latestWordPressVersion, availableVersions )

		// eslint-disable-next-line no-console
		console.log( `📊 Latest WordPress version: ${ latestWordPressVersion }` )
		// eslint-disable-next-line no-console
		console.log( `📊 Available versions: ${ availableVersions.slice( 0, 5 ).join( ', ' ) }...` )
		// eslint-disable-next-line no-console
		console.log( `📊 Minimum required version: ${ minWordPressVersion }` )

		// Read current readme.txt
		const readmeTxt = fs.readFileSync( 'readme.txt', 'utf8' )

		// Check if readme.txt stable tag needs updating
		const stableTagMatch = readmeTxt.match( /^Stable tag:\s*([^\r\n]+)/m )
		if ( stableTagMatch ) {
			const currentStableTag = stableTagMatch[ 1 ].trim()

			if ( currentStableTag !== pluginVersion ) {
				// eslint-disable-next-line no-console
				console.log( `🔄 Updating readme.txt stable tag from ${ currentStableTag } to ${ pluginVersion }` )

				// Update stable tag
				const updatedReadme = readmeTxt.replace(
					/^Stable tag:\s*[^\r\n]+/m,
					`Stable tag: ${ pluginVersion }`
				)

				// Write back to readme.txt
				fs.writeFileSync( 'readme.txt', updatedReadme )

				// eslint-disable-next-line no-console
				console.log( '✅ readme.txt stable tag updated successfully' )
			} else {
				// eslint-disable-next-line no-console
				console.log( `✅ readme.txt stable tag already matches plugin version: ${ pluginVersion }` )
			}
		} else {
			// eslint-disable-next-line no-console
			console.log( '⚠️  Could not find "Stable tag:" in readme.txt' )
		}

		// Check if readme.txt tested up to version needs updating
		const testedUpToMatch = readmeTxt.match( /^Tested up to:\s*([^\r\n]+)/m )
		if ( testedUpToMatch ) {
			const currentTestedUpTo = testedUpToMatch[ 1 ].trim()

			if ( currentTestedUpTo !== latestWordPressVersion ) {
				// eslint-disable-next-line no-console
				console.log( `🔄 Updating readme.txt tested up to from ${ currentTestedUpTo } to ${ latestWordPressVersion }` )

				// Update tested up to
				const updatedReadme = readmeTxt.replace(
					/^Tested up to:\s*[^\r\n]+/m,
					`Tested up to: ${ latestWordPressVersion }`
				)

				// Write back to readme.txt
				fs.writeFileSync( 'readme.txt', updatedReadme )

				// eslint-disable-next-line no-console
				console.log( '✅ readme.txt tested up to updated successfully' )
			} else {
				// eslint-disable-next-line no-console
				console.log( `✅ readme.txt tested up to already matches latest WordPress version: ${ latestWordPressVersion }` )
			}
		} else {
			// eslint-disable-next-line no-console
			console.log( '⚠️  Could not find "Tested up to:" in readme.txt' )
		}

		// Check if readme.txt requires at least version needs updating
		const requiresAtLeastMatch = readmeTxt.match( /^Requires at least:\s*([^\r\n]+)/m )
		if ( requiresAtLeastMatch ) {
			const currentRequiresAtLeast = requiresAtLeastMatch[ 1 ].trim()

			if ( currentRequiresAtLeast !== minWordPressVersion ) {
				// eslint-disable-next-line no-console
				console.log( `🔄 Updating readme.txt requires at least from ${ currentRequiresAtLeast } to ${ minWordPressVersion }` )

				// Update requires at least
				const updatedReadme = readmeTxt.replace(
					/^Requires at least:\s*[^\r\n]+/m,
					`Requires at least: ${ minWordPressVersion }`
				)

				// Write back to readme.txt
				fs.writeFileSync( 'readme.txt', updatedReadme )

				// eslint-disable-next-line no-console
				console.log( '✅ readme.txt requires at least updated successfully' )
			} else {
				// eslint-disable-next-line no-console
				console.log( `✅ readme.txt requires at least already matches calculated minimum version: ${ minWordPressVersion }` )
			}
		} else {
			// eslint-disable-next-line no-console
			console.log( '⚠️  Could not find "Requires at least:" in readme.txt' )
		}
	} catch ( error ) {
		// eslint-disable-next-line no-console
		console.error( '❌ Error syncing versions:', error.message )
		process.exit( 1 )
	}
}

// Run the sync function
syncVersions()
