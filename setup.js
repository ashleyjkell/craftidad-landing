const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const readline = require('readline');

const DATA_DIR = path.join(__dirname, 'data');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Ensure data directory exists
function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('✓ Created data directory');
  }
}

// Create default links.json
function createDefaultLinks() {
  const linksPath = path.join(DATA_DIR, 'links.json');
  const defaultLinks = [
    {
      id: 'link-1',
      label: 'GitHub',
      url: 'https://github.com',
      imageUrl: '',
      order: 0,
      active: true
    },
    {
      id: 'link-2',
      label: 'Twitter',
      url: 'https://twitter.com',
      imageUrl: '',
      order: 1,
      active: true
    },
    {
      id: 'link-3',
      label: 'LinkedIn',
      url: 'https://linkedin.com',
      imageUrl: '',
      order: 2,
      active: true
    }
  ];

  fs.writeFileSync(linksPath, JSON.stringify(defaultLinks, null, 2));
  console.log('✓ Created links.json with sample data');
}

// Create default theme.json
function createDefaultTheme() {
  const themePath = path.join(DATA_DIR, 'theme.json');
  const defaultTheme = {
    backgroundColor: '#f0f0f0',
    backgroundImageUrl: '',
    textColor: '#333333',
    buttonColor: '#4a90e2',
    buttonTextColor: '#ffffff'
  };

  fs.writeFileSync(themePath, JSON.stringify(defaultTheme, null, 2));
  console.log('✓ Created theme.json with default settings');
}

// Create auth.json with admin credentials
async function createAdminCredentials() {
  const authPath = path.join(DATA_DIR, 'auth.json');
  
  console.log('\n--- Admin Account Setup ---');
  const username = await question('Enter admin username (default: admin): ');
  const password = await question('Enter admin password (default: admin123): ');

  const finalUsername = username.trim() || 'admin';
  const finalPassword = password.trim() || 'admin123';

  // Hash the password
  const passwordHash = await bcrypt.hash(finalPassword, 10);

  const authData = {
    username: finalUsername,
    passwordHash: passwordHash
  };

  fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));
  console.log('✓ Created auth.json with admin credentials');
  console.log(`  Username: ${finalUsername}`);
  console.log(`  Password: ${finalPassword}`);
}

// Main setup function
async function setup() {
  console.log('=== Link Sharing Page Setup ===\n');

  try {
    ensureDataDirectory();
    createDefaultLinks();
    createDefaultTheme();
    await createAdminCredentials();

    console.log('\n✓ Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run "npm start" to start the server');
    console.log('2. Visit http://localhost:3000 to view the landing page');
    console.log('3. Visit http://localhost:3000/login.html to access the admin panel');
    console.log('\nNote: Keep your admin credentials secure!');
  } catch (error) {
    console.error('\n✗ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
setup();
