// Runtime configuration for the Ticketing System frontend.
// Adjust `apiUrl` when deploying to a static host so requests reach your API server.
// This file is loaded at runtime before the application bundle executes.
window.__APP_CONFIG__ = window.__APP_CONFIG__ || {}
window.__APP_CONFIG__.apiUrl = window.__APP_CONFIG__.apiUrl || ''
