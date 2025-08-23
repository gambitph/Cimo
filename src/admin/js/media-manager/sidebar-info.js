import domReady from '@wordpress/dom-ready'

domReady( () => {
	wp.media.view.Attachment.Details = wp.media.view.Attachment.Details.extend( {
		customMessage: 'This file was converted by Cimo',

		template: function template( view ) {
	  const html = wp.media.template( 'attachment-details' )( view )
	  const dom = document.createElement( 'div' )
	  dom.innerHTML = html

			//   const customMetadata = view.model.get( 'cimo-data' ) || {}
			//   const attachmentId = view.model.get( 'id' )

	  const customMetadata = view.model.get( 'cimo-data' ) || {}
			//   console.log( view.model.get( 'filename' ) )
			// console.log( 'custom', customMetadata )

	  const details = dom.querySelector( '.attachment-info' )
	  if ( details ) {
				const customContent = document.createElement( 'div' )
				customContent.className = 'custom-attachment-info'
				customContent.innerHTML = '<p>' + customMetadata.toString() + '</p>'
				details.appendChild( customContent )
	  }

	  return dom.innerHTML
		},
	} )
} )

// We need to add some info on the converted image, maybe the file should be
// renamed with a UID. then we can use that UID to find the image and manually save the data
