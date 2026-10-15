#!/usr/bin/env node
/**
 * Ready a Cimo release:
 * - FREE: npm run build (WordPress.org zip, not uploaded to Freemius)
 * - PAID: npm run build:premium, upload pending to Freemius, download processed zip
 * - Diff free vs WordPress.org, paid vs previous released paid
 *
 * Usage:
 *   npm run release:ready
 *   npm run release:ready -- --build-only
 *   npm run release:ready -- --check-only
 *   npm run release:ready -- --no-review
 *
 * Premium packaging needs Composer runtime (vendor/) for SVG sanitize.
 * Run `composer install --no-dev` before release if vendor/ is missing.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
} from 'node:fs'
import {
	basename,
	dirname,
	join,
	resolve,
} from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	createDeployment,
	deletePendingDeployment,
	deletePendingDeploymentsForVersion,
	downloadDeployment,
	getLatestDeployment,
	listAllDeployments,
	waitForDeploymentVersion,
} from './freemius.mjs'
import {
	applyFlavorSuffix,
	comparePluginTrees,
	pluginRootFromExtract,
} from './diff.mjs'

const ROOT = resolve( dirname( fileURLToPath( import.meta.url ) ), '../..' )
const RELEASES_DIR = join( ROOT, 'releases' )
const REPORT_DIR = join( ROOT, 'build', 'release-ready' )
const PREMIUM_DIR = join( ROOT, 'pro__premium_only' )
const WPORG_URL = 'https://downloads.wordpress.org/plugin/cimo-image-optimizer.zip'
const PLUGIN_HEADER = 'cimo.php'

const log = message => {
	console.log( `[release:ready] ✅ ${ message }` ) // eslint-disable-line no-console
}

const logBad = message => {
	console.log( `[release:ready] ❌ ${ message }` ) // eslint-disable-line no-console
}

const fail = message => {
	console.error( `[release:ready] ❌ ${ message }` ) // eslint-disable-line no-console
	process.exit( 1 )
}

const parseArgs = argv => ( {
	buildOnly: argv.includes( '--build-only' ),
	checkOnly: argv.includes( '--check-only' ),
	noReview: argv.includes( '--no-review' ),
} )

const loadDotEnv = () => {
	const envPath = join( ROOT, '.env' )
	if ( ! existsSync( envPath ) ) {
		return
	}
	for ( const raw of readFileSync( envPath, 'utf8' ).split( '\n' ) ) {
		const line = raw.trim()
		if ( ! line || line.startsWith( '#' ) ) {
			continue
		}
		const eq = line.indexOf( '=' )
		if ( eq === -1 ) {
			continue
		}
		const key = line.slice( 0, eq ).trim()
		let value = line.slice( eq + 1 ).trim()
		if ( ( value.startsWith( '"' ) && value.endsWith( '"' ) ) ||
			( value.startsWith( '\'' ) && value.endsWith( '\'' ) ) ) {
			value = value.slice( 1, -1 )
		}
		if ( process.env[ key ] === undefined ) {
			process.env[ key ] = value
		}
	}
}

const readPluginVersion = () => {
	const match = readFileSync( join( ROOT, PLUGIN_HEADER ), 'utf8' )
		.match( /^ \* Version:\s*([\d.]+)/m )
	if ( ! match ) {
		fail( `Could not read Version from ${ PLUGIN_HEADER }` )
	}
	return match[ 1 ]
}

const distZipPath = version => join( ROOT, 'dist', `cimo-${ version }.zip` )

const readCurrentChangelog = version => {
	const readme = readFileSync( join( ROOT, 'readme.txt' ), 'utf8' )
	const escaped = version.replace( /\./g, '\\.' )
	const match = readme.match( new RegExp( `^= ${ escaped } =\\s*\\n([\\s\\S]*?)(?=\\n= [\\d.]+ =|$)`, 'm' ) )
	if ( ! match ) {
		fail( `readme.txt has no changelog section "= ${ version } ="` )
	}
	return match[ 0 ].trim()
}

const compareVersions = ( a, b ) => {
	const pa = a.split( '.' ).map( n => parseInt( n, 10 ) || 0 )
	const pb = b.split( '.' ).map( n => parseInt( n, 10 ) || 0 )
	const len = Math.max( pa.length, pb.length )
	for ( let i = 0; i < len; i++ ) {
		const delta = ( pa[ i ] || 0 ) - ( pb[ i ] || 0 )
		if ( delta ) {
			return delta > 0 ? 1 : -1
		}
	}
	return 0
}

const run = ( command, args, cwd = ROOT ) => {
	const result = spawnSync( command, args, {
		cwd,
		stdio: 'inherit',
		shell: false,
	} )
	if ( result.error ) {
		fail( `Failed to start ${ command }: ${ result.error.message }` )
	}
	if ( result.status !== 0 ) {
		fail( `${ command } ${ args.join( ' ' ) } exited ${ result.status }` )
	}
}

const findTagByVersion = ( tags, version ) =>
	tags.find( tag => tag.version === version )

const isTransientFetchError = error => {
	const parts = [ error?.message, error?.cause?.message, error?.cause?.code ]
		.filter( Boolean )
		.join( ' ' )
	return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|UND_ERR|socket hung up|network/i.test( parts )
}

const withTransientRetry = async ( label, fn, attempts = 5 ) => {
	for ( let attempt = 1; attempt <= attempts; attempt++ ) {
		try {
			return await fn()
		} catch ( error ) {
			if ( ! isTransientFetchError( error ) || attempt === attempts ) {
				throw error
			}
			log( `${ label } failed (${ error.message }), retrying (${ attempt }/${ attempts })…` )
			await new Promise( resolve => setTimeout( resolve, 2000 * attempt ) )
		}
	}
}

const waitUntilPendingTagGone = async ( token, version, deletedIds ) => {
	const gone = new Set( deletedIds.map( id => String( id ) ) )
	const started = Date.now()
	const timeoutMs = 2 * 60 * 1000
	let attempt = 0
	while ( Date.now() - started < timeoutMs ) {
		attempt += 1
		let tag
		try {
			tag = await getLatestDeployment( token, 'pending' )
		} catch ( error ) {
			if ( ! isTransientFetchError( error ) ) {
				throw error
			}
			log( `Waiting for deleted tag to leave pending, lookup failed (${ error.message }) (${ attempt })…` )
			await new Promise( resolve => setTimeout( resolve, 3000 ) )
			continue
		}
		const stillThere = tag &&
			String( tag.version ) === String( version ) &&
			gone.has( String( tag.id ) )
		if ( ! stillThere ) {
			return
		}
		log( `Waiting for deleted tag ${ tag.id } to leave pending (${ attempt })…` )
		await new Promise( resolve => setTimeout( resolve, 3000 ) )
	}
	throw new Error(
		`Timed out waiting for deleted pending tag ${ [ ...gone ].join( ', ' ) } to disappear`
	)
}

const deleteKnownPendingTag = async ( token, version, tag ) => {
	await withTransientRetry(
		`Delete pending tag ${ tag.id }`,
		() => deletePendingDeployment( token, tag, version )
	)
	log( `Deleted pending Freemius tag ${ tag.id } (${ tag.version })` )
	await waitUntilPendingTagGone( token, version, [ tag.id ] )
	return [ tag ]
}

const removePendingSameVersion = async ( token, version, {
	reason,
	fallbackTag,
} = {} ) => {
	log( `Checking for a pending ${ version } tag (${ reason })…` )
	try {
		const deleted = await withTransientRetry(
			`Pending-tag lookup for ${ version }`,
			() => deletePendingDeploymentsForVersion( token, version )
		)
		if ( deleted.length ) {
			for ( const tag of deleted ) {
				log( `Deleted pending Freemius tag ${ tag.id } (${ tag.version })` )
			}
			await waitUntilPendingTagGone( token, version, deleted.map( tag => tag.id ) )
			return deleted
		}
	} catch ( error ) {
		if ( ! fallbackTag || ! isTransientFetchError( error ) ) {
			throw error
		}
		log(
			`Pending-tag lookup failed (${ error.message }). ` +
			`Deleting known pending tag ${ fallbackTag.id }…`
		)
		return deleteKnownPendingTag( token, version, fallbackTag )
	}

	if ( fallbackTag ) {
		log(
			`Latest pending did not list ${ version }. ` +
			`Deleting known pending tag ${ fallbackTag.id }…`
		)
		return deleteKnownPendingTag( token, version, fallbackTag )
	}

	log( `No pending Freemius tag for ${ version }` )
	return []
}

const uploadPendingZip = async ( token, zipPath ) => {
	try {
		await createDeployment( token, zipPath )
	} catch ( error ) {
		if ( ! isTransientFetchError( error ) ) {
			throw error
		}
		log(
			`Upload request ended without a response (${ error.message }). ` +
			`Waiting to see if the version appears on Freemius…`
		)
	}
}

const waitThenDownloadPaid = async ( token, version, deleted, destDir ) => {
	log( `Waiting for pending Freemius tag ${ version } before downloading paid…` )
	const tag = await waitForDeploymentVersion( token, version, {
		excludeIds: deleted.map( item => item.id ),
		onAttempt: ( { attempt, found, error } ) => {
			if ( found ) {
				return
			}
			if ( error ) {
				log( `Latest-pending attempt ${ attempt } failed (${ error.message }), retrying…` )
				return
			}
			log( `Latest-pending attempt ${ attempt }: ${ version } not ready yet, retrying…` )
		},
	} )
	log( `Downloading paid zip for tag ${ tag.id }…` )
	const download = await downloadDeployment( token, tag.id, true, destDir )
	const destPath = saveFlavoredZip( download, 'premium', destDir )
	return {
		destPath,
		tag,
	}
}

const newestTagVersion = tags =>
	tags.reduce( ( newest, tag ) => {
		if ( ! tag.version ) {
			return newest
		}
		if ( ! newest || compareVersions( tag.version, newest ) > 0 ) {
			return tag.version
		}
		return newest
	}, null )

const previousReleasedTag = ( tags, currentVersion ) => {
	const released = tags.filter( tag =>
		tag.release_mode === 'released' &&
		tag.version &&
		tag.version !== currentVersion
	)
	if ( ! released.length ) {
		return null
	}
	return released.reduce( ( best, tag ) =>
		compareVersions( tag.version, best.version ) > 0 ? tag : best
	)
}

const saveFlavoredZip = ( download, flavor, destDir ) => {
	const flavored = applyFlavorSuffix( download.filename, flavor )
	const destPath = join( destDir, flavored )
	if ( download.destPath !== destPath ) {
		renameSync( download.destPath, destPath )
	}
	return destPath
}

const requireDistZip = version => {
	const zipPath = distZipPath( version )
	if ( ! existsSync( zipPath ) ) {
		fail( `Missing ${ zipPath } after build` )
	}
	return zipPath
}

const archiveLocalZip = ( srcPath, version, flavor ) => {
	mkdirSync( RELEASES_DIR, { recursive: true } )
	const destPath = join(
		RELEASES_DIR,
		applyFlavorSuffix( basename( srcPath ), flavor )
	)
	copyFileSync( srcPath, destPath )
	return destPath
}

const extractZip = ( zipPath, destDir ) => {
	rmSync( destDir, { recursive: true, force: true } )
	mkdirSync( destDir, { recursive: true } )
	execFileSync( 'unzip', [ '-q', '-o', zipPath, '-d', destDir ] )
	return pluginRootFromExtract( destDir )
}

const downloadUrlToFile = async ( url, destPath ) => {
	const response = await fetch( url, { redirect: 'follow' } )
	if ( ! response.ok ) {
		fail( `Download failed (${ response.status }): ${ url }` )
	}
	const { writeFile, mkdir } = await import( 'node:fs/promises' )
	const { dirname: destDirname } = await import( 'node:path' )
	await mkdir( destDirname( destPath ), { recursive: true } )
	await writeFile( destPath, Buffer.from( await response.arrayBuffer() ) )
	return destPath
}

const findReleaseZip = ( flavor, version ) => {
	if ( ! existsSync( RELEASES_DIR ) ) {
		return null
	}
	const files = readdirSync( RELEASES_DIR ).filter( name => name.endsWith( '.zip' ) )
	const flavorRe = flavor === 'free' ? /-free\.zip$/i : /-premium\.zip$/i
	const flavored = files.filter( name => flavorRe.test( name ) )
	const versioned = flavored.filter( name => name.includes( version ) )
	const pool = versioned.length ? versioned : flavored
	if ( ! pool.length ) {
		return null
	}
	return join( RELEASES_DIR, pool.sort().reverse()[ 0 ] )
}

const findPreviousPremiumZip = currentVersion => {
	if ( ! existsSync( RELEASES_DIR ) ) {
		return null
	}
	const files = readdirSync( RELEASES_DIR )
	const baseline = files
		.filter( name => /-premium-baseline\.zip$/i.test( name ) )
		.sort()
		.reverse()[ 0 ]
	if ( baseline ) {
		return join( RELEASES_DIR, baseline )
	}
	const legacy = files
		.filter( name =>
			/-premium\.zip$/i.test( name ) &&
			! /-premium-baseline\.zip$/i.test( name ) &&
			! name.includes( currentVersion )
		)
	if ( ! legacy.length ) {
		return null
	}
	return join( RELEASES_DIR, legacy.sort().reverse()[ 0 ] )
}

const readZipPluginVersion = pluginRoot => {
	const headerFile = join( pluginRoot, PLUGIN_HEADER )
	if ( ! existsSync( headerFile ) ) {
		return null
	}
	const match = readFileSync( headerFile, 'utf8' ).match( /Version:\s*([\d.]+)/ )
	return match ? match[ 1 ] : null
}

const readStableTag = pluginRoot => {
	const readmePath = join( pluginRoot, 'readme.txt' )
	if ( ! existsSync( readmePath ) ) {
		return null
	}
	const match = readFileSync( readmePath, 'utf8' ).match( /^Stable tag:\s*([^\r\n]+)/m )
	return match ? match[ 1 ].trim() : null
}

const readCimoBuild = pluginRoot => {
	const headerPath = join( pluginRoot, PLUGIN_HEADER )
	if ( ! existsSync( headerPath ) ) {
		return null
	}
	const match = readFileSync( headerPath, 'utf8' ).match(
		/define\(\s*'CIMO_BUILD'\s*,\s*'([^']+)'\s*\)/
	)
	return match ? match[ 1 ] : null
}

const countCompiledSizeFlags = prefix => {
	const sizesPath = join( REPORT_DIR, `${ prefix }.sizes.json` )
	if ( ! existsSync( sizesPath ) ) {
		return null
	}
	const sizes = JSON.parse( readFileSync( sizesPath, 'utf8' ) )
	return sizes.filter( row => row.flag ).length
}

const printResultLine = ( passed, message ) => {
	if ( passed ) {
		log( message )
	} else {
		logBad( message )
	}
}

const printReleaseSummary = ( version, zips ) => {
	const freeRoot = join( REPORT_DIR, 'unpacked', 'free' )
	const paidRoot = join( REPORT_DIR, 'unpacked', 'paid-new' )
	const wporgRoot = join( REPORT_DIR, 'unpacked', 'wporg' )

	console.log( '' ) // eslint-disable-line no-console
	console.log( '[release:ready] ——— Results ———' ) // eslint-disable-line no-console

	printResultLine( true, `Release version ${ version } (cimo.php header)` )
	printResultLine( true, `Changelog section "= ${ version } =" present in readme.txt` )

	const repoStable = readStableTag( ROOT )
	printResultLine(
		repoStable === version,
		repoStable === version
			? `Repo readme Stable tag matches ${ version }`
			: `Repo readme Stable tag is ${ repoStable || 'missing' }, expected ${ version }`
	)

	printResultLine( existsSync( zips.freePath ), `Free archive: ${ zips.freePath }` )
	printResultLine( existsSync( zips.paidPath ), `Paid archive: ${ zips.paidPath }` )
	printResultLine(
		existsSync( zips.previousPaidPath ),
		`Previous paid baseline: ${ zips.previousPaidPath }`
	)

	const freeVersion = readZipPluginVersion( freeRoot )
	printResultLine(
		freeVersion === version,
		freeVersion === version
			? `Free zip plugin Version matches ${ version }`
			: `Free zip plugin Version is ${ freeVersion || 'missing' }, expected ${ version }`
	)
	const freeStable = readStableTag( freeRoot )
	printResultLine(
		freeStable === version,
		freeStable === version
			? `Free zip Stable tag matches ${ version }`
			: `Free zip Stable tag is ${ freeStable || 'missing' }, expected ${ version }`
	)
	printResultLine(
		readCimoBuild( freeRoot ) === 'free',
		'Free zip CIMO_BUILD is free'
	)
	printResultLine(
		! existsSync( join( freeRoot, 'pro__premium_only' ) ),
		'Free zip does not contain pro__premium_only/'
	)
	printResultLine(
		! existsSync( join( freeRoot, 'freemius' ) ),
		'Free zip does not contain freemius/'
	)

	const paidVersion = readZipPluginVersion( paidRoot )
	printResultLine(
		paidVersion === version,
		paidVersion === version
			? `Paid zip plugin Version matches ${ version }`
			: `Paid zip plugin Version is ${ paidVersion || 'missing' }, expected ${ version }`
	)
	const paidStable = readStableTag( paidRoot )
	printResultLine(
		paidStable === version,
		paidStable === version
			? `Paid zip Stable tag matches ${ version }`
			: `Paid zip Stable tag is ${ paidStable || 'missing' }, expected ${ version }`
	)
	printResultLine(
		readCimoBuild( paidRoot ) === 'premium',
		'Paid zip CIMO_BUILD is premium'
	)
	printResultLine(
		existsSync( join( paidRoot, 'pro__premium_only' ) ),
		'Paid zip includes pro__premium_only/'
	)

	const wporgVersion = readZipPluginVersion( wporgRoot )
	if ( wporgVersion === version ) {
		printResultLine( true, `WordPress.org baseline is already ${ version } (tiny free diff expected)` )
	} else {
		printResultLine(
			true,
			`WordPress.org baseline version ${ wporgVersion || 'unknown' } (diff vs ${ version } free build)`
		)
	}

	const freeFlags = countCompiledSizeFlags( 'free' )
	if ( freeFlags === null ) {
		printResultLine( false, 'Missing free.sizes.json' )
	} else {
		printResultLine(
			freeFlags === 0,
			freeFlags === 0
				? 'No compiled size flags on FREE'
				: `${ freeFlags } compiled size flag(s) on FREE (see free.sizes.json)`
		)
	}

	const paidFlags = countCompiledSizeFlags( 'paid' )
	if ( paidFlags === null ) {
		printResultLine( false, 'Missing paid.sizes.json' )
	} else {
		printResultLine(
			paidFlags === 0,
			paidFlags === 0
				? 'No compiled size flags on PAID'
				: `${ paidFlags } compiled size flag(s) on PAID (see paid.sizes.json)`
		)
	}

	printResultLine(
		existsSync( join( REPORT_DIR, 'free.source.diff' ) ),
		'Wrote free.source.diff'
	)
	printResultLine(
		existsSync( join( REPORT_DIR, 'paid.source.diff' ) ),
		'Wrote paid.source.diff'
	)

	console.log( '[release:ready] ——— End results ———' ) // eslint-disable-line no-console
	console.log( '' ) // eslint-disable-line no-console
}

const runReview = version => {
	const agent = spawnSync(
		'agent',
		[
			'-p',
			'--mode=ask',
			`/review-release Review the release-ready artifacts for Cimo ${ version }. ` +
			`Repo root is ${ ROOT }. ` +
			`Read only the "= ${ version } =" changelog section in readme.txt. ` +
			'Read build/release-ready/free.source.diff, free.sizes.json, free.tree.txt, ' +
			'paid.source.diff, paid.sizes.json, and paid.tree.txt. ' +
			`Confirm unzipped zip headers / Stable tag match ${ version }. ` +
			'Do not edit plugin files. Do not write a verdict file. Print the full review to the terminal. ' +
			'Prefix every checklist line and finding with ✅ (pass/okay) or ❌ (problem). ' +
			'Final verdict line must start with ✅ GREEN LIGHT or ❌ BLOCKED.',
		],
		{ cwd: ROOT, stdio: 'inherit' }
	)
	if ( agent.error && agent.error.code === 'ENOENT' ) {
		fail(
			'Cursor CLI `agent` was not found. Zips and diffs are ready. ' +
			'Run /review-release in Cursor to finish the review.'
		)
	}
	if ( agent.status !== 0 ) {
		fail( `agent review exited ${ agent.status }` )
	}
}

const assertPremiumVendor = () => {
	const autoload = join( ROOT, 'vendor', 'autoload.php' )
	if ( ! existsSync( autoload ) ) {
		logBad(
			'vendor/autoload.php is missing. Premium packaging needs Composer ' +
			'(enshrined/svg-sanitize). Run: composer install --no-dev'
		)
	}
}

const buildPhase = async ( token, version ) => {
	if ( ! existsSync( PREMIUM_DIR ) ) {
		fail( `Missing ${ PREMIUM_DIR }. Check out cimo-premium before building paid.` )
	}

	log( 'Listing Freemius deployments…' )
	const tags = await listAllDeployments( token )
	const newest = newestTagVersion( tags )
	if ( newest && compareVersions( version, newest ) < 0 ) {
		fail( `Refusing to upload ${ version }, Freemius already has newer ${ newest }` )
	}

	const existing = findTagByVersion( tags, version )
	if ( existing && ( existing.release_mode === 'released' || existing.release_mode === 'beta' ) ) {
		fail( `${ version } is already ${ existing.release_mode } on Freemius. This command only creates or retries pending tags.` )
	}

	const previous = previousReleasedTag( tags, version )
	if ( ! previous ) {
		fail( `No previously released Freemius tag found (other than ${ version })` )
	}
	log( `Previous released paid baseline: ${ previous.version } (tag ${ previous.id })` )

	mkdirSync( RELEASES_DIR, { recursive: true } )

	log( `Downloading previous paid zip ${ previous.version }…` )
	const previousDownload = await downloadDeployment( token, previous.id, true, RELEASES_DIR )
	const previousPaidPath = join( RELEASES_DIR, `cimo-${ previous.version }-premium-baseline.zip` )
	if ( previousDownload.destPath !== previousPaidPath ) {
		renameSync( previousDownload.destPath, previousPaidPath )
	}
	log( `Saved ${ previousPaidPath }` )

	log( 'Building free plugin (WordPress.org package, not uploaded to Freemius)…' )
	run( 'npm', [ 'run', 'build' ], ROOT )
	const freeBuilt = requireDistZip( version )
	const freePath = archiveLocalZip( freeBuilt, version, 'free' )
	log( `Saved ${ freePath }` )

	assertPremiumVendor()

	log( 'Building premium plugin…' )
	run( 'npm', [ 'run', 'build:premium' ], ROOT )
	const premiumLocal = requireDistZip( version )

	log( `Uploading premium build as ${ version } (pending)…` )
	let deletedPaid = []
	try {
		deletedPaid = await removePendingSameVersion( token, version, {
			reason: 'pending leftover for this version',
		} )
		await uploadPendingZip( token, premiumLocal )
	} catch ( error ) {
		fail(
			`${ error.message }\n` +
			'This command will not change release_mode.'
		)
	}
	const paidUpload = await waitThenDownloadPaid( token, version, deletedPaid, RELEASES_DIR )
	log( `Saved ${ paidUpload.destPath }` )

	return {
		freePath,
		paidPath: paidUpload.destPath,
		previousPaidPath,
	}
}

const resolveZips = ( version, built ) => {
	const freePath = built?.freePath || findReleaseZip( 'free', version )
	const paidPath = built?.paidPath || findReleaseZip( 'premium', version )
	const previousPaidPath = built?.previousPaidPath || findPreviousPremiumZip( version )
	if ( ! freePath || ! existsSync( freePath ) ) {
		fail( `Missing FREE zip in ${ RELEASES_DIR } for ${ version } (local WordPress.org build)` )
	}
	if ( ! paidPath || ! existsSync( paidPath ) ) {
		fail( `Missing PAID zip in ${ RELEASES_DIR } for ${ version }` )
	}
	if ( ! previousPaidPath || ! existsSync( previousPaidPath ) ) {
		fail( `Missing previous PAID zip in ${ RELEASES_DIR } (download from Freemius during build)` )
	}
	return {
		freePath,
		paidPath,
		previousPaidPath,
	}
}

const checkPhase = async ( version, zips ) => {
	rmSync( REPORT_DIR, { recursive: true, force: true } )
	mkdirSync( REPORT_DIR, { recursive: true } )

	const wporgZip = join( REPORT_DIR, 'wporg.zip' )
	log( `Downloading WordPress.org baseline ${ WPORG_URL }…` )
	await downloadUrlToFile( WPORG_URL, wporgZip )

	const wporgRoot = extractZip( wporgZip, join( REPORT_DIR, 'unpacked', 'wporg' ) )
	const freeRoot = extractZip( zips.freePath, join( REPORT_DIR, 'unpacked', 'free' ) )
	const paidPrevRoot = extractZip( zips.previousPaidPath, join( REPORT_DIR, 'unpacked', 'paid-prev' ) )
	const paidNewRoot = extractZip( zips.paidPath, join( REPORT_DIR, 'unpacked', 'paid-new' ) )

	const wporgVersion = readZipPluginVersion( wporgRoot )
	if ( wporgVersion === version ) {
		log( `WordPress.org zip is already ${ version }. Diff may be tiny. Continuing.` )
	} else if ( wporgVersion ) {
		log( `WordPress.org baseline version: ${ wporgVersion }` )
	}

	log( 'Diffing FREE local build against WordPress.org baseline…' )
	comparePluginTrees( wporgRoot, freeRoot, REPORT_DIR, 'free' )
	log( 'Diffing PAID zip against previous released paid zip…' )
	comparePluginTrees( paidPrevRoot, paidNewRoot, REPORT_DIR, 'paid' )
	log( `Wrote diffs under ${ REPORT_DIR }` )

	return zips
}

const main = async () => {
	const args = parseArgs( process.argv.slice( 2 ) )
	if ( args.buildOnly && args.checkOnly ) {
		fail( 'Use only one of --build-only or --check-only' )
	}

	loadDotEnv()
	const version = readPluginVersion()
	readCurrentChangelog( version )
	log( `Version ${ version }` )

	let built = null
	if ( ! args.checkOnly ) {
		const token = process.env.FREEMIUS_API_TOKEN
		if ( ! token ) {
			fail( 'Missing FREEMIUS_API_TOKEN in the environment or .env' )
		}
		built = await buildPhase( token, version )
	}

	if ( args.buildOnly ) {
		log( 'Stopped after builds and Freemius paid upload (--build-only).' )
		return
	}

	const zips = resolveZips( version, built )
	await checkPhase( version, zips )
	printReleaseSummary( version, zips )

	if ( args.noReview ) {
		log( 'Skipped agent review (--no-review).' )
		return
	}

	log( 'Starting /review-release…' )
	runReview( version )
	log( 'Done.' )
}

main().catch( error => {
	fail( error.stack || error.message )
} )
