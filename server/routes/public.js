const express = require('express');
const router = express.Router();
const { readLinks, readTheme, readProfile } = require('../utils/storage');

/**
 * GET /api/links
 * Returns all active links in order
 */
router.get('/links', async (req, res) => {
  try {
    const links = await readLinks();
    
    // Filter active links and sort by order
    const activeLinks = links
      .filter(link => link.active)
      .sort((a, b) => a.order - b.order);
    
    res.json(activeLinks);
  } catch (error) {
    console.error('Error fetching links:', error);
    
    // Handle specific error cases
    if (error.message.includes('File not found')) {
      return res.status(500).json({ 
        error: 'Links data file not found',
        code: 'FILE_NOT_FOUND'
      });
    }
    
    if (error.message.includes('Invalid JSON')) {
      return res.status(500).json({ 
        error: 'Links data file is corrupted',
        code: 'INVALID_JSON'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch links',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * GET /api/theme
 * Returns current theme settings
 */
router.get('/theme', async (req, res) => {
  try {
    const theme = await readTheme();
    res.json(theme);
  } catch (error) {
    console.error('Error fetching theme:', error);
    
    // Handle specific error cases
    if (error.message.includes('File not found')) {
      return res.status(500).json({ 
        error: 'Theme data file not found',
        code: 'FILE_NOT_FOUND'
      });
    }
    
    if (error.message.includes('Invalid JSON')) {
      return res.status(500).json({ 
        error: 'Theme data file is corrupted',
        code: 'INVALID_JSON'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch theme',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * GET /api/profile
 * Returns profile photo and bio
 */
router.get('/profile', async (req, res) => {
  try {
    const profile = await readProfile();
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    
    // Handle specific error cases
    if (error.message.includes('File not found')) {
      return res.status(500).json({ 
        error: 'Profile data file not found',
        code: 'FILE_NOT_FOUND'
      });
    }
    
    if (error.message.includes('Invalid JSON')) {
      return res.status(500).json({ 
        error: 'Profile data file is corrupted',
        code: 'INVALID_JSON'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
