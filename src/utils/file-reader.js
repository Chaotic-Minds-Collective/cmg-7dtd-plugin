const path = require('path');
const fs = require('fs').promises;

/**
 * Safely reads a file within the designated base directory, preventing path traversal.
 * @param {string} baseDir - Allowed root directory (e.g., './data')
 * @param {string} userPath - User-supplied or config file path
 * @returns {Promise<string>} - File contents
 */
async function safeReadServerFile(baseDir, userPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, userPath);

  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error('Security Error: Path traversal attempt detected.');
  }

  return await fs.readFile(resolvedTarget, 'utf8');
}

module.exports = { safeReadServerFile };
