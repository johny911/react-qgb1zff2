// src/buildInfo.js
export const BUILD_INFO = {
    message: process.env.VERCEL_GIT_COMMIT_MESSAGE || 'local build',
    sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    branch: process.env.VERCEL_GIT_COMMIT_REF || '',
    time: new Date().toISOString(),
  };