#!/usr/bin/env node
/**
 * Download Elementor into e2e/fixtures/plugins/elementor.zip for the Elementor
 * Playwright suite. The zip is gitignored (*.zip); CI/local must fetch it once.
 */
const fs = require( 'fs' )
const path = require( 'path' )
const https = require( 'https' )

const OUT_DIR = path.join( __dirname, '../e2e/fixtures/plugins' )
const OUT_FILE = path.join( OUT_DIR, 'elementor.zip' )
const URL =
	'https://downloads.wordpress.org/plugin/elementor.latest-stable.zip'

fs.mkdirSync( OUT_DIR, { recursive: true } )

if ( fs.existsSync( OUT_FILE ) && fs.statSync( OUT_FILE ).size > 1_000_000 ) {
	console.log( `Already present: ${ OUT_FILE }` )
	process.exit( 0 )
}

console.log( `Fetching ${ URL }` )
const file = fs.createWriteStream( OUT_FILE )

https
	.get( URL, ( response ) => {
		if (
			response.statusCode >= 300 &&
			response.statusCode < 400 &&
			response.headers.location
		) {
			https.get( response.headers.location, ( redirected ) => {
				redirected.pipe( file )
			} ).on( 'error', fail )
			return
		}
		if ( response.statusCode !== 200 ) {
			fail(
				new Error( `Unexpected status ${ response.statusCode } fetching Elementor` )
			)
			return
		}
		response.pipe( file )
	} )
	.on( 'error', fail )

file.on( 'finish', () => {
	file.close()
	console.log( `Saved ${ OUT_FILE } (${ fs.statSync( OUT_FILE ).size } bytes)` )
} )

function fail( error ) {
	try {
		fs.unlinkSync( OUT_FILE )
	} catch ( e ) {
		// ignore
	}
	console.error( error )
	process.exit( 1 )
}
