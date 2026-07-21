import { optimizeFiles } from './optimize-files'

window.cimo = window.cimo || {}

// Stable public API for plugins/themes that need pre-upload optimization.
// Cimo returns optimized File objects.
window.cimo.optimizeFiles = optimizeFiles
