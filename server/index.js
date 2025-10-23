const express = require('express');
const session = require('express-session');
const path = require('path');
const { migrateLinks } = require('./utils/storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with secure settings
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Import routes
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Mount routes
app.use('/api', publicRoutes);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);

// Run migrations before starting server
migrateLinks().then(() => {
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to run migrations:', error);
  // Start server anyway - migration errors shouldn't prevent startup
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
