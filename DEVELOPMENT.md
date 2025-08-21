We can use this method to trigger the Media Manager to upload a file
```
	// Get the mediaUpload function from block editor settings
	const { getSettings } = select( 'core/block-editor' )
	const { mediaUpload } = getSettings()

	// Call it with your files
	mediaUpload( {
		allowedTypes: [ 'image' ],
		filesList: [ optimizedFile ],
		onFileChange: ( [ media ] ) => {
			// Handle the uploaded media
			console.log( 'Media uploaded:', media )

			// Refresh the Media Manager
			refreshMediaManagerAndSelectFirst()
		},
		onError: message => {
			console.error( 'Upload error:', message )
		},
		multiple: false,
	} )


function refreshMediaManager() {
	if ( window.wp && window.wp.media ) {
		const mediaFrame = window.wp.media.frame

		if ( mediaFrame && mediaFrame.content && mediaFrame.content.get() ) {
			const frameContent = mediaFrame.content.get()

			if ( frameContent.collection ) {
				const collection = frameContent.collection

				// Clean all attachments in memory
				collection
					.toArray()
					.forEach( model => model.trigger( 'destroy', model ) )

				// Reset the "has more" flag
				if ( collection.mirroring ) {
					collection.mirroring._hasMore = true
				}

				// Request fresh items
				collection.more()
			}
		}
	}
}

function refreshMediaManagerAndSelectFirst( mediaId ) {
	if ( window.wp && window.wp.media ) {
		const mediaFrame = window.wp.media.frame

		if ( mediaFrame && mediaFrame.content && mediaFrame.content.get() ) {
			const frameContent = mediaFrame.content.get()

			if ( frameContent.collection ) {
				const collection = frameContent.collection

				// Clean all attachments in memory
				collection
					.toArray()
					.forEach( model => model.trigger( 'destroy', model ) )

				// Reset the "has more" flag
				if ( collection.mirroring ) {
					collection.mirroring._hasMore = true
				}

				// Request fresh items and then select the first one
				collection.more().done( function() {
					// Get the first image from the refreshed collection
					const firstImage = collection.first()

					if ( firstImage ) {
						// Get the selection state
						const selection = mediaFrame.state().get( 'selection' )

						// Clear any existing selection
						selection.reset()

						// Add the first image to selection
						selection.add( firstImage )

						// If you want to select the newly uploaded image specifically
						if ( mediaId ) {
							const uploadedImage = collection.find( { id: mediaId } )
							if ( uploadedImage ) {
								selection.reset()
								selection.add( uploadedImage )
							}
						}
					}
				} )
			}
		}
	}
}

```