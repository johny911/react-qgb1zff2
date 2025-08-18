// src/version.js

// Take the commit message from the Vercel environment (if available),
// otherwise fall back to "dev".
const commitMessage = process.env.REACT_APP_VERCEL_GIT_COMMIT_MESSAGE || 'dev'

// Exported label for display inside the app
export const BUILD_VERSION = `build ${commitMessage}`