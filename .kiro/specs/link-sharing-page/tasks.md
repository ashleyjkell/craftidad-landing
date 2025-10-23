# Implementation Plan

- [x] 1. Set up project structure and dependencies





  - Create directory structure for server, public, and data folders
  - Initialize package.json with Express, express-session, bcrypt dependencies
  - Create initial JSON data files with default values
  - _Requirements: All requirements depend on proper project setup_
-

- [x] 2. Implement data storage utilities
  - Write functions to read and write JSON files (links.json, theme.json, auth.json, profile.json, config.json)
  - Implement error handling for file operations
  - Create helper functions for generating UUIDs for link IDs
  - _Requirements: 2.1, 2.2, 2.3, 4.4, 4.5, 6.3, 6.4, 7.2_

- [x] 3. Create Express server and middleware




  - Set up Express server with basic configuration
  - Configure express-session middleware with secure settings
  - Implement authentication middleware to protect admin routes
  - Set up static file serving for public directory
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Implement public API endpoints
  - Create GET /api/profile endpoint to return profile photo and bio
  - Create GET /api/links endpoint to return active links in order
  - Create GET /api/theme endpoint to return current theme settings
  - Add error handling for missing or corrupted data files
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

- [x] 5. Implement authentication endpoints




  - Create POST /api/login endpoint with bcrypt password verification
  - Create POST /api/logout endpoint to destroy session
  - Implement session validation logic
  - Add rate limiting to login endpoint
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
- [x] 6. Implement admin link management endpoints




- [ ] 6. Implement admin link management endpoints

  - Create GET /api/admin/links endpoint (protected)
  - Create POST /api/admin/links endpoint with URL validation
  - Create PUT /api/admin/links/:id endpoint for updating links
  - Create DELETE /api/admin/links/:id endpoint
  - Create PUT /api/admin/links/reorder endpoint for drag-and-drop ordering
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4_
-

- [x] 7. Implement admin theme management endpoints




  - Create GET /api/admin/theme endpoint (protected)
  - Create PUT /api/admin/theme endpoint with validation
  - Ensure theme changes are persisted to theme.json
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_


- [x] 8. Build landing page HTML and CSS




  - Create index.html with semantic structure for link display
  - Implement responsive CSS with mobile-first approach
  - Add support for background image and color styling
  - Style link items as capsules with optional images
  - Ensure proper contrast and accessibility
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 9. Build landing page JavaScript functionality





  - Fetch links from GET /api/links on page load
  - Fetch theme settings from GET /api/theme
  - Dynamically render link items with proper styling
  - Apply theme settings to page (colors, background image)
  - Handle click events to navigate to link URLs
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_


- [x] 10. Build login page




  - Create login.html with form for username and password
  - Implement CSS styling for login form
  - Write JavaScript to handle form submission to POST /api/login
  - Handle successful login by redirecting to admin panel
  - Display error messages for failed login attempts
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 11. Build admin panel HTML structure




  - Create admin.html with sections for link management and theme customization
  - Add logout button with proper styling
  - Create form structure for adding/editing links
  - Create controls for theme customization (color pickers, image URL inputs)
  - Add container for displaying existing links with edit/delete buttons
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.1, 4.1, 4.2, 4.3, 4.4, 5.5_
-

- [x] 12. Build admin panel CSS




  - Style admin panel with clean, usable interface
  - Create responsive layout for mobile and desktop
  - Style forms, buttons, and controls
  - Add visual feedback for drag-and-drop operations
  - _Requirements: 3.4_

- [x] 13. Implement admin panel link management JavaScript





  - Fetch existing links from GET /api/admin/links on page load
  - Implement add link functionality with POST /api/admin/links
  - Implement edit link functionality with PUT /api/admin/links/:id
  - Implement delete link functionality with DELETE /api/admin/links/:id
  - Add client-side URL validation before submission
  - Handle image URL input for link button images
  - Display success/error messages for operations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
-

- [x] 14. Implement drag-and-drop reordering




  - Add drag-and-drop event listeners to link items
  - Implement visual feedback during drag operations
  - Send updated order to PUT /api/admin/links/reorder on drop
  - Update UI to reflect new order
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 15. Implement admin panel theme customization JavaScript




  - Fetch current theme from GET /api/admin/theme on page load
  - Populate theme controls with current values
  - Implement color picker change handlers
  - Implement background image URL input handler
  - Send theme updates to PUT /api/admin/theme
  - Display success/error messages for theme changes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_





- [x] 16. Implement logout functionality






  - Add click handler to logout button



  - Send POST request to /api/logout
  - Redirect to login page after successful logout
  - _Requirements: 5.5_




- [x] 17. Add authentication check and redirect logic






  - Implement check on admin.html page load to verify authentication
  - Redirect to login page if not authenticated


  - Implement redirect from login page to admin panel if already authenticated
  - _Requirements: 5.2, 5.3_

- [x] 18. Create initial setup script





  - Write script to create default admin credentials
  - Prompt for The Noun Project API key and secret during setup
  - Initialize data files with sample data
  - Document setup process in README.md
  - _Requirements: 5.1, 7.1, 7.2_

- [x] 19. Implement profile management endpoints





  - Create GET /api/admin/profile endpoint (protected)
  - Create PUT /api/admin/profile endpoint with validation
  - Validate profile photo URL points to valid image
  - Enforce 500 character limit on bio
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 20. Implement The Noun Project API integration










  - Install OAuth library for API authentication
  - Create GET /api/admin/icons/search endpoint (protected)
  - Implement proxy to The Noun Project API with authentication
  - Return icon results with preview URLs
  - Add error handling for API failures
  - _Requirements: 2.6, 7.3, 7.6_



- [x] 21. Implement configuration management endpoints







  - Create GET /api/admin/config endpoint (protected)
  - Create PUT /api/admin/config endpoint for updating API keys
  - Validate API key format before saving


  - Return configuration status (whether keys are set)
- [x] 22. Update landing page to display profile info





  - _Requirements: 7.2, 7.4, 7.5_

- [ ] 22. Update landing page to display profile info

  - Add profile info box HTML structure at top of page
  - Style profile photo as circular image
  - Style bio text with proper typography

  - Fetch profile data from GET /api/profile
  - Render profile photo and bio dynamically
  - Handle missing profile data gracefully
  - _Requirements: 1.1, 1.2, 1.3, 1.9_
-

- [x] 23. Update landing page to support icons





  - Modify link rendering to check visualType field
  - Display icon when visualType is 'icon'
  - Display image when visualType is 'image'
  - Apply proper styling for icons vs images
  - _Requirements: 1.7, 2.6_
-

- [x] 24. Add profile management to admin panel





  - Add profile section to admin.html



  - Create form fields for profile photo URL and bio
  - Add character counter for bio field (500 max)
  - Fetch current profile from GET /api/admin/profile
  - Implement save functionality with PUT /api/admin/profile
  - Display success/error messages
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7_



- [x] 25. Add icon selection to link management

  - Add visual type selector (image/icon/none) to link form
  - Create icon search interface with search input
  - Implement icon search using GET /api/admin/icons/search
  - Display icon results in a grid with preview images
  - Allow selecting an icon and storing its ID and URL
  - Show selected icon in link form
  - Toggle between image URL input and icon search based on visual type
  - _Requirements: 2.1, 2.2, 2.6, 2.7, 7.3_

- [x] 26. Add API configuration to admin panel






  - Create configuration section in admin panel
  - Add fields for The Noun Project API key and secret
  - Fetch current config status from GET /api/admin/config
  - Implement save functionality with PUT /api/admin/config
  - Display message when API keys are not configured
  - Disable icon features when keys are missing
  - _Requirements: 7.4, 7.5_

- [x] 27. Update link data model migration






  - Add migration logic to update existing links with visualType field
  - Set default visualType to 'image' for links with imageUrl
  - Set default visualType to 'none' for links without imageUrl
  - Ensure backward compatibility
  - _Requirements: 2.1, 2.2_

- [x] 28. Add final polish and error handling
  - Ensure all error states display user-friendly messages
  - Add loading states for async operations
  - Verify responsive design works on various screen sizes
  - Test all functionality end-to-end manually
  - _Requirements: 1.9, 1.10_
