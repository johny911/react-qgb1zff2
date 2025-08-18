// src/version.js

// Take the commit SHA from the Vercel environment (if available),
// otherwise fall back to "dev".
const commitSha = process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA || 'dev'

// First 6 characters → short SHA
const commitShort = commitSha.substring(0, 6)

// Exported label for display inside the app
export const BUILD_VERSION = `build ${commitShort}`