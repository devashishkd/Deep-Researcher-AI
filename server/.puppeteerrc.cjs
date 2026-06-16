const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to a local directory
  // This prevents Render's global caching issues with corrupted browser folders.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
