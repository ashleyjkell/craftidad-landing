const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Data file paths
const DATA_DIR = path.join(__dirname, '../../data');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');
const THEME_FILE = path.join(DATA_DIR, 'theme.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

/**
 * Generate a UUID v4
 * @returns {string} UUID string
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Read JSON file with error handling
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<any>} Parsed JSON data
 */
async function readJSONFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in file: ${filePath}`);
    }
    throw new Error(`Error reading file ${filePath}: ${error.message}`);
  }
}

/**
 * Write JSON file with error handling
 * @param {string} filePath - Path to JSON file
 * @param {any} data - Data to write
 * @returns {Promise<void>}
 */
async function writeJSONFile(filePath, data) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf8');
  } catch (error) {
    throw new Error(`Error writing file ${filePath}: ${error.message}`);
  }
}

/**
 * Read links from links.json
 * @returns {Promise<Array>} Array of link objects
 */
async function readLinks() {
  return await readJSONFile(LINKS_FILE);
}

/**
 * Write links to links.json
 * @param {Array} links - Array of link objects
 * @returns {Promise<void>}
 */
async function writeLinks(links) {
  return await writeJSONFile(LINKS_FILE, links);
}

/**
 * Read theme settings from theme.json
 * @returns {Promise<Object>} Theme settings object
 */
async function readTheme() {
  return await readJSONFile(THEME_FILE);
}

/**
 * Write theme settings to theme.json
 * @param {Object} theme - Theme settings object
 * @returns {Promise<void>}
 */
async function writeTheme(theme) {
  return await writeJSONFile(THEME_FILE, theme);
}

/**
 * Read authentication data from auth.json
 * @returns {Promise<Object>} Auth object with username and passwordHash
 */
async function readAuth() {
  return await readJSONFile(AUTH_FILE);
}

/**
 * Write authentication data to auth.json
 * @param {Object} auth - Auth object with username and passwordHash
 * @returns {Promise<void>}
 */
async function writeAuth(auth) {
  return await writeJSONFile(AUTH_FILE, auth);
}

/**
 * Read profile data from profile.json
 * @returns {Promise<Object>} Profile object with photoUrl and bio
 */
async function readProfile() {
  return await readJSONFile(PROFILE_FILE);
}

/**
 * Write profile data to profile.json
 * @param {Object} profile - Profile object with photoUrl and bio
 * @returns {Promise<void>}
 */
async function writeProfile(profile) {
  return await writeJSONFile(PROFILE_FILE, profile);
}

/**
 * Read configuration data from config.json
 * @returns {Promise<Object>} Config object with API keys
 */
async function readConfig() {
  return await readJSONFile(CONFIG_FILE);
}

/**
 * Write configuration data to config.json
 * @param {Object} config - Config object with API keys
 * @returns {Promise<void>}
 */
async function writeConfig(config) {
  return await writeJSONFile(CONFIG_FILE, config);
}

/**
 * Migrate existing links to include visualType field
 * This ensures backward compatibility with links created before the visualType field was added
 * @returns {Promise<void>}
 */
async function migrateLinks() {
  try {
    const links = await readLinks();
    let migrated = false;

    const updatedLinks = links.map(link => {
      // Check if link already has visualType field
      if (link.visualType) {
        return link;
      }

      // Migration needed
      migrated = true;

      // Set default visualType based on imageUrl presence
      if (link.imageUrl && link.imageUrl.trim() !== '') {
        return {
          ...link,
          visualType: 'image'
        };
      } else {
        return {
          ...link,
          visualType: 'none'
        };
      }
    });

    // Only write if migration was needed
    if (migrated) {
      await writeLinks(updatedLinks);
      console.log('Links migration completed: visualType field added to existing links');
    }
  } catch (error) {
    console.error('Error during links migration:', error.message);
    // Don't throw - allow server to start even if migration fails
  }
}

module.exports = {
  generateUUID,
  readJSONFile,
  writeJSONFile,
  readLinks,
  writeLinks,
  readTheme,
  writeTheme,
  readAuth,
  writeAuth,
  readProfile,
  writeProfile,
  readConfig,
  writeConfig,
  migrateLinks
};
