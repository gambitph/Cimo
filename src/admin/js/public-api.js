import { optimizeFiles } from './optimize-files'

window.cimo = window.cimo || {}

// Stable public API for plugins/themes that need pre-upload optimization.
// Returns { file, metadata } results.
window.cimo.optimizeFiles = optimizeFiles
