const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { readLinks, writeLinks, generateUUID, readTheme, writeTheme } = require('../utils/storage');

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
    const { label, url, imageUrl } = req.body;

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

    // Validate imageUrl if provided
    if (imageUrl && imageUrl.trim() !== '' && !isValidURL(imageUrl)) {
      return res.status(400).json({
        error: 'Invalid image URL format',
        code: 'INVALID_IMAGE_URL'
      });
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
      imageUrl: imageUrl ? imageUrl.trim() : '',
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
    const { label, url, imageUrl, active } = req.body;

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

    // Validate imageUrl if provided
    if (imageUrl && imageUrl.trim() !== '' && !isValidURL(imageUrl)) {
      return res.status(400).json({
        error: 'Invalid image URL format',
        code: 'INVALID_IMAGE_URL'
      });
    }

    // Update link properties (only update provided fields)
    if (label !== undefined) {
      links[linkIndex].label = label.trim();
    }
    if (url !== undefined) {
      links[linkIndex].url = url.trim();
    }
    if (imageUrl !== undefined) {
      links[linkIndex].imageUrl = imageUrl.trim();
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

module.exports = router;
