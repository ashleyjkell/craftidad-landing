/**
 * Authentication middleware to protect admin routes
 * Checks if user has an active session
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    // User is authenticated, proceed to next middleware/route
    next();
  } else {
    // User is not authenticated, return 401 Unauthorized
    res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }
}

module.exports = { requireAuth };
