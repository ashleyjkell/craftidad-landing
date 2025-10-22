const express = require('express');
const bcrypt = require('bcrypt');
const { readAuth } = require('../utils/storage');

const router = express.Router();

// Rate limiting for login endpoint
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Check if IP is rate limited
 * @param {string} ip - Client IP address
 * @returns {boolean} True if rate limited
 */
function isRateLimited(ip) {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;
  
  if (attempts.count >= MAX_ATTEMPTS) {
    const timeSinceFirstAttempt = Date.now() - attempts.firstAttempt;
    if (timeSinceFirstAttempt < LOCKOUT_DURATION) {
      return true;
    } else {
      // Reset after lockout duration
      loginAttempts.delete(ip);
      return false;
    }
  }
  return false;
}

/**
 * Record login attempt
 * @param {string} ip - Client IP address
 */
function recordLoginAttempt(ip) {
  const attempts = loginAttempts.get(ip);
  if (!attempts) {
    loginAttempts.set(ip, {
      count: 1,
      firstAttempt: Date.now()
    });
  } else {
    attempts.count++;
  }
}

/**
 * Reset login attempts for IP
 * @param {string} ip - Client IP address
 */
function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

/**
 * POST /api/login
 * Authenticate admin with username and password
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Check rate limiting
    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        error: 'Too many login attempts. Please try again later.',
        code: 'RATE_LIMITED'
      });
    }

    // Validate input
    if (!username || !password) {
      recordLoginAttempt(clientIp);
      return res.status(400).json({
        error: 'Username and password are required',
        code: 'INVALID_INPUT'
      });
    }

    // Read auth data
    const authData = await readAuth();

    // Check if credentials are configured
    if (!authData.username || !authData.passwordHash) {
      return res.status(500).json({
        error: 'Authentication not configured',
        code: 'AUTH_NOT_CONFIGURED'
      });
    }

    // Verify username
    if (username !== authData.username) {
      recordLoginAttempt(clientIp);
      return res.status(401).json({
        error: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, authData.passwordHash);
    
    if (!isPasswordValid) {
      recordLoginAttempt(clientIp);
      return res.status(401).json({
        error: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Successful authentication - reset attempts and create session
    resetLoginAttempts(clientIp);
    req.session.isAuthenticated = true;
    req.session.username = username;

    res.json({
      success: true,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'An error occurred during login',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * POST /api/logout
 * Destroy session and log out admin
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          error: 'An error occurred during logout',
          code: 'SERVER_ERROR'
        });
      }
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  } else {
    res.json({
      success: true,
      message: 'No active session'
    });
  }
});

/**
 * GET /api/auth/status
 * Check if user is authenticated (helper endpoint)
 */
router.get('/auth/status', (req, res) => {
  res.json({
    isAuthenticated: !!(req.session && req.session.isAuthenticated)
  });
});

module.exports = router;
