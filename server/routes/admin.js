const express = require('express');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto-js');
const { requireAuth } = require('../middleware/auth');
const { readLinks, writeLinks, generateUUID, readTheme, writeTheme, readProfile, writeProfile, readConfig, writeConfig } = require('../utils/storage');

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(requireAuth);

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidURL(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Validate hex color format
 * @param {string} color - Color to validate
 * @returns {boolean} True if valid hex color
 */
function isValidHexColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * GET /api/admin/links
 * Fetch all links for editing (including inactive ones)
 */
router.get('/links', async (req, res) => {
  try {
    const links = await readLinks();
    res.json(links);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({
      error: 'Failed to fetch links',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * POST /api/admin/links
 * Create a new link with URL validation
 */
router.post('/links', async (req, res) => {
  try {
    const { label, url, visualType, imageUrl, iconId, iconUrl } = req.body;

    // Validate required fields
    if (!label || !url) {
      return res.status(400).json({
        error: 'Label and URL are required',
        code: 'INVALID_INPUT'
      });
    }

    // Validate URL format
    if (!isValidURL(url)) {
      return res.status(400).json({
        error: 'Invalid URL format. URL must start with http:// or https://',
        code: 'INVALID_URL'
      });
    }

    // Validate visual type
    const validVisualTypes = ['none', 'image', 'icon'];
    const linkVisualType = visualType || 'none';
    if (!validVisualTypes.includes(linkVisualType)) {
      return res.status(400).json({
        error: 'Invalid visual type. Must be none, image, or icon',
        code: 'INVALID_VISUAL_TYPE'
      });
    }

    // Validate imageUrl if visual type is image
    if (linkVisualType === 'image') {
      if (!imageUrl || imageUrl.trim() === '') {
        return res.status(400).json({
          error: 'Image URL is required when visual type is image',
          code: 'MISSING_IMAGE_URL'
        });
      }
      if (!isValidURL(imageUrl)) {
        return res.status(400).json({
          error: 'Invalid image URL format',
          code: 'INVALID_IMAGE_URL'
        });
      }
    }

    // Validate icon data if visual type is icon
    if (linkVisualType === 'icon') {
      if (!iconId || !iconUrl) {
        return res.status(400).json({
          error: 'Icon ID and URL are required when visual type is icon',
          code: 'MISSING_ICON_DATA'
        });
      }
      if (!isValidURL(iconUrl)) {
        return res.status(400).json({
          error: 'Invalid icon URL format',
          code: 'INVALID_ICON_URL'
        });
      }
    }

    // Read existing links
    const links = await readLinks();

    // Calculate next order value (highest order + 1)
    const maxOrder = links.length > 0 
      ? Math.max(...links.map(link => link.order))
      : -1;

    // Create new link object
    const newLink = {
      id: generateUUID(),
      label: label.trim(),
      url: url.trim(),
      visualType: linkVisualType,
      imageUrl: linkVisualType === 'image' ? imageUrl.trim() : '',
      iconId: linkVisualType === 'icon' ? iconId.trim() : '',
      iconUrl: linkVisualType === 'icon' ? iconUrl.trim() : '',
      order: maxOrder + 1,
      active: true
    };

    // Add to links array
    links.push(newLink);

    // Save to file
    await writeLinks(links);

    res.status(201).json(newLink);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({
      error: 'Failed to create link',
      code: 'CREATE_ERROR'
    });
  }
});

/**
 * PUT /api/admin/links/reorder
 * Update the order of links for drag-and-drop functionality
 * Expects body: { linkIds: [id1, id2, id3, ...] } in desired order
 * NOTE: This route must come before /links/:id to avoid route conflicts
 */
router.put('/links/reorder', async (req, res) => {
  try {
    const { linkIds } = req.body;

    // Validate input
    if (!Array.isArray(linkIds)) {
      return res.status(400).json({
        error: 'linkIds must be an array',
        code: 'INVALID_INPUT'
      });
    }

    // Read existing links
    const links = await readLinks();

    // Create a map of link IDs to link objects
    const linkMap = new Map(links.map(link => [link.id, link]));

    // Validate that all provided IDs exist
    for (const id of linkIds) {
      if (!linkMap.has(id)) {
        return res.status(400).json({
          error: `Link with ID ${id} not found`,
          code: 'INVALID_LINK_ID'
        });
      }
    }

    // Update order values based on position in linkIds array
    linkIds.forEach((id, index) => {
      const link = linkMap.get(id);
      link.order = index;
    });

    // Handle any links not in the linkIds array (keep their relative order at the end)
    const unorderedLinks = links.filter(link => !linkIds.includes(link.id));
    const maxOrder = linkIds.length;
    unorderedLinks.forEach((link, index) => {
      link.order = maxOrder + index;
    });

    // Save to file
    await writeLinks(links);

    res.json({
      success: true,
      message: 'Links reordered successfully',
      links
    });
  } catch (error) {
    console.error('Error reordering links:', error);
    res.status(500).json({
      error: 'Failed to reorder links',
      code: 'REORDER_ERROR'
    });
  }
});

/**
 * PUT /api/admin/links/:id
 * Update an existing link
 */
router.put('/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { label, url, visualType, imageUrl, iconId, iconUrl, active } = req.body;

    // Read existing links
    const links = await readLinks();

    // Find link by ID
    const linkIndex = links.findIndex(link => link.id === id);

    if (linkIndex === -1) {
      return res.status(404).json({
        error: 'Link not found',
        code: 'NOT_FOUND'
      });
    }

    // Validate URL if provided
    if (url && !isValidURL(url)) {
      return res.status(400).json({
        error: 'Invalid URL format. URL must start with http:// or https://',
        code: 'INVALID_URL'
      });
    }

    // Validate visual type if provided
    if (visualType !== undefined) {
      const validVisualTypes = ['none', 'image', 'icon'];
      if (!validVisualTypes.includes(visualType)) {
        return res.status(400).json({
          error: 'Invalid visual type. Must be none, image, or icon',
          code: 'INVALID_VISUAL_TYPE'
        });
      }

      // Validate based on visual type
      if (visualType === 'image') {
        if (!imageUrl || imageUrl.trim() === '') {
          return res.status(400).json({
            error: 'Image URL is required when visual type is image',
            code: 'MISSING_IMAGE_URL'
          });
        }
        if (!isValidURL(imageUrl)) {
          return res.status(400).json({
            error: 'Invalid image URL format',
            code: 'INVALID_IMAGE_URL'
          });
        }
      } else if (visualType === 'icon') {
        if (!iconId || !iconUrl) {
          return res.status(400).json({
            error: 'Icon ID and URL are required when visual type is icon',
            code: 'MISSING_ICON_DATA'
          });
        }
        if (!isValidURL(iconUrl)) {
          return res.status(400).json({
            error: 'Invalid icon URL format',
            code: 'INVALID_ICON_URL'
          });
        }
      }
    }

    // Update link properties (only update provided fields)
    if (label !== undefined) {
      links[linkIndex].label = label.trim();
    }
    if (url !== undefined) {
      links[linkIndex].url = url.trim();
    }
    if (visualType !== undefined) {
      links[linkIndex].visualType = visualType;
      
      // Clear fields based on visual type
      if (visualType === 'none') {
        links[linkIndex].imageUrl = '';
        links[linkIndex].iconId = '';
        links[linkIndex].iconUrl = '';
      } else if (visualType === 'image') {
        links[linkIndex].imageUrl = imageUrl ? imageUrl.trim() : '';
        links[linkIndex].iconId = '';
        links[linkIndex].iconUrl = '';
      } else if (visualType === 'icon') {
        links[linkIndex].imageUrl = '';
        links[linkIndex].iconId = iconId ? iconId.trim() : '';
        links[linkIndex].iconUrl = iconUrl ? iconUrl.trim() : '';
      }
    }
    if (active !== undefined) {
      links[linkIndex].active = active;
    }

    // Save to file
    await writeLinks(links);

    res.json(links[linkIndex]);
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({
      error: 'Failed to update link',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /api/admin/links/:id
 * Delete a link
 */
router.delete('/links/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Read existing links
    const links = await readLinks();

    // Find link by ID
    const linkIndex = links.findIndex(link => link.id === id);

    if (linkIndex === -1) {
      return res.status(404).json({
        error: 'Link not found',
        code: 'NOT_FOUND'
      });
    }

    // Remove link from array
    const deletedLink = links.splice(linkIndex, 1)[0];

    // Save to file
    await writeLinks(links);

    res.json({
      success: true,
      message: 'Link deleted successfully',
      deletedLink
    });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({
      error: 'Failed to delete link',
      code: 'DELETE_ERROR'
    });
  }
});

/**
 * GET /api/admin/theme
 * Fetch current theme settings
 */
router.get('/theme', async (req, res) => {
  try {
    const theme = await readTheme();
    res.json(theme);
  } catch (error) {
    console.error('Error fetching theme:', error);
    res.status(500).json({
      error: 'Failed to fetch theme settings',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * PUT /api/admin/theme
 * Update theme settings with validation
 */
router.put('/theme', async (req, res) => {
  try {
    const { backgroundColor, backgroundImageUrl, textColor, buttonColor, buttonTextColor } = req.body;

    // Read current theme
    const theme = await readTheme();

    // Validate and update backgroundColor
    if (backgroundColor !== undefined) {
      if (!isValidHexColor(backgroundColor)) {
        return res.status(400).json({
          error: 'Invalid backgroundColor format. Must be a hex color (e.g., #ffffff)',
          code: 'INVALID_COLOR'
        });
      }
      theme.backgroundColor = backgroundColor;
    }

    // Validate and update backgroundImageUrl
    if (backgroundImageUrl !== undefined) {
      // Allow empty string to clear the background image
      if (backgroundImageUrl.trim() !== '' && !isValidURL(backgroundImageUrl)) {
        return res.status(400).json({
          error: 'Invalid backgroundImageUrl format. Must be a valid URL',
          code: 'INVALID_URL'
        });
      }
      theme.backgroundImageUrl = backgroundImageUrl.trim();
    }

    // Validate and update textColor
    if (textColor !== undefined) {
      if (!isValidHexColor(textColor)) {
        return res.status(400).json({
          error: 'Invalid textColor format. Must be a hex color (e.g., #000000)',
          code: 'INVALID_COLOR'
        });
      }
      theme.textColor = textColor;
    }

    // Validate and update buttonColor
    if (buttonColor !== undefined) {
      if (!isValidHexColor(buttonColor)) {
        return res.status(400).json({
          error: 'Invalid buttonColor format. Must be a hex color (e.g., #007bff)',
          code: 'INVALID_COLOR'
        });
      }
      theme.buttonColor = buttonColor;
    }

    // Validate and update buttonTextColor
    if (buttonTextColor !== undefined) {
      if (!isValidHexColor(buttonTextColor)) {
        return res.status(400).json({
          error: 'Invalid buttonTextColor format. Must be a hex color (e.g., #ffffff)',
          code: 'INVALID_COLOR'
        });
      }
      theme.buttonTextColor = buttonTextColor;
    }

    // Save updated theme to file
    await writeTheme(theme);

    res.json({
      success: true,
      message: 'Theme updated successfully',
      theme
    });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({
      error: 'Failed to update theme settings',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * Validate image URL by checking if it points to a valid image
 * @param {string} url - URL to validate
 * @returns {Promise<boolean>} True if valid image URL
 */
async function isValidImageURL(url) {
  if (!url || url.trim() === '') {
    return true; // Empty URL is valid (optional field)
  }

  // First check if it's a valid URL format
  if (!isValidURL(url)) {
    return false;
  }

  // Check if URL has a common image extension
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const urlLower = url.toLowerCase();
  const hasImageExtension = imageExtensions.some(ext => urlLower.includes(ext));

  // For now, we'll accept URLs with image extensions or common image hosting domains
  const imageHostingDomains = ['imgur.com', 'cloudinary.com', 'unsplash.com', 'pexels.com', 'pixabay.com', 'i.imgur.com'];
  const hasImageHosting = imageHostingDomains.some(domain => urlLower.includes(domain));

  return hasImageExtension || hasImageHosting;
}

/**
 * GET /api/admin/profile
 * Fetch current profile data
 */
router.get('/profile', async (req, res) => {
  try {
    const profile = await readProfile();
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      error: 'Failed to fetch profile data',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * PUT /api/admin/profile
 * Update profile data with validation
 */
router.put('/profile', async (req, res) => {
  try {
    const { photoUrl, bio } = req.body;

    // Read current profile
    const profile = await readProfile();

    // Validate and update photoUrl
    if (photoUrl !== undefined) {
      const trimmedPhotoUrl = photoUrl.trim();
      
      // Validate that photoUrl points to a valid image
      const isValid = await isValidImageURL(trimmedPhotoUrl);
      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid profile photo URL. Must be a valid image URL',
          code: 'INVALID_IMAGE_URL'
        });
      }
      
      profile.photoUrl = trimmedPhotoUrl;
    }

    // Validate and update bio
    if (bio !== undefined) {
      const trimmedBio = bio.trim();
      
      // Enforce 500 character limit
      if (trimmedBio.length > 500) {
        return res.status(400).json({
          error: 'Bio must not exceed 500 characters',
          code: 'BIO_TOO_LONG'
        });
      }
      
      profile.bio = trimmedBio;
    }

    // Save updated profile to file
    await writeProfile(profile);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      error: 'Failed to update profile data',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * GET /api/admin/config
 * Fetch configuration status (whether API keys are set)
 */
router.get('/config', async (req, res) => {
  try {
    const config = await readConfig();
    
    // Return status without exposing actual keys
    res.json({
      nounProjectConfigured: !!(config.nounProjectApiKey && config.nounProjectApiSecret)
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      error: 'Failed to fetch configuration',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * PUT /api/admin/config
 * Update API keys configuration
 */
router.put('/config', async (req, res) => {
  try {
    const { nounProjectApiKey, nounProjectApiSecret } = req.body;

    // Read current config
    const config = await readConfig();

    // Validate and update API keys
    if (nounProjectApiKey !== undefined) {
      const trimmedKey = nounProjectApiKey.trim();
      
      // Basic validation - API key should not be empty if provided
      if (trimmedKey === '') {
        return res.status(400).json({
          error: 'API key cannot be empty',
          code: 'INVALID_API_KEY'
        });
      }
      
      config.nounProjectApiKey = trimmedKey;
    }

    if (nounProjectApiSecret !== undefined) {
      const trimmedSecret = nounProjectApiSecret.trim();
      
      // Basic validation - API secret should not be empty if provided
      if (trimmedSecret === '') {
        return res.status(400).json({
          error: 'API secret cannot be empty',
          code: 'INVALID_API_SECRET'
        });
      }
      
      config.nounProjectApiSecret = trimmedSecret;
    }

    // Save updated config to file
    await writeConfig(config);

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      nounProjectConfigured: !!(config.nounProjectApiKey && config.nounProjectApiSecret)
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      error: 'Failed to update configuration',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * GET /api/admin/icons/search
 * Search The Noun Project API for icons
 * Query parameter: query (search term)
 */
router.get('/icons/search', async (req, res) => {
  try {
    const { query } = req.query;

    // Validate query parameter
    if (!query || query.trim() === '') {
      return res.status(400).json({
        error: 'Search query is required',
        code: 'MISSING_QUERY'
      });
    }

    // Read API configuration
    const config = await readConfig();

    // Check if API keys are configured
    if (!config.nounProjectApiKey || !config.nounProjectApiSecret) {
      return res.status(503).json({
        error: 'The Noun Project API is not configured. Please add your API key and secret in the configuration section.',
        code: 'API_NOT_CONFIGURED'
      });
    }

    // Initialize OAuth 1.0a
    const oauth = OAuth({
      consumer: {
        key: config.nounProjectApiKey,
        secret: config.nounProjectApiSecret
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.HmacSHA1(base_string, key).toString(crypto.enc.Base64);
      }
    });

    // Prepare request data
    const requestData = {
      url: 'http://api.thenounproject.com/v2/icon',
      method: 'GET',
      data: {
        query: query.trim(),
        limit_to_public_domain: 1,
        limit: 20
      }
    };

    // Generate OAuth headers
    const authHeader = oauth.toHeader(oauth.authorize(requestData));

    // Build query string
    const queryString = new URLSearchParams(requestData.data).toString();
    const apiUrl = `${requestData.url}?${queryString}`;

    // Make request to The Noun Project API
    const fetch = require('node-fetch');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        ...authHeader,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('The Noun Project API error:', response.status, errorText);
      
      return res.status(response.status).json({
        error: 'Failed to fetch icons from The Noun Project API',
        code: 'API_ERROR',
        details: errorText
      });
    }

    const data = await response.json();

    // Transform the response to include preview URLs
    const icons = data.icons ? data.icons.map(icon => ({
      id: icon.id,
      term: icon.term,
      previewUrl: icon.preview_url || icon.preview_url_84,
      thumbnailUrl: icon.thumbnail_url,
      attribution: icon.attribution || `Icon by ${icon.uploader?.name || 'The Noun Project'}`,
      tags: icon.tags || []
    })) : [];

    res.json({
      success: true,
      query: query.trim(),
      icons
    });
  } catch (error) {
    console.error('Error searching icons:', error);
    res.status(500).json({
      error: 'Failed to search icons',
      code: 'SEARCH_ERROR',
      details: error.message
    });
  }
});

module.exports = router;
