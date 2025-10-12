import { createRoot } from '@wordpress/element'
import AdminSettings from './admin-settings'

// Only render on the Cimo admin page
const container = document.getElementById( 'cimo-admin-settings' )
if ( container ) {
	const root = createRoot( container )
	root.render( <AdminSettings /> )
}
