const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Data file paths
const DATA_DIR = path.join(__dirname, '../../data');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');
const THEME_FILE = path.join(DATA_DIR, 'theme.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

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

module.exports = {
  generateUUID,
  readJSONFile,
  writeJSONFile,
  readLinks,
  writeLinks,
  readTheme,
  writeTheme,
  readAuth,
  writeAuth
};
