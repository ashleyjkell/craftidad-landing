# Link Sharing Page

A customizable link-sharing landing page with admin panel for managing links and theme settings.

## Setup

### Initial Setup

1. Install dependencies:
```bash
npm install
```

2. Run the setup script to initialize data files and create admin credentials:
```bash
npm run setup
```

The setup script will:
- Create the `data/` directory if it doesn't exist
- Generate `links.json` with sample links (GitHub, Twitter, LinkedIn)
- Generate `theme.json` with default theme settings
- Prompt you to create admin credentials (default: username=admin, password=admin123)

3. Start the server:
```bash
npm start
```

The server will run on http://localhost:3000 by default.

### Development

For development with auto-reload (if nodemon is installed):
```bash
npm run dev
```

### Accessing the Application

- **Landing Page**: http://localhost:3000
- **Admin Login**: http://localhost:3000/login.html
- **Admin Panel**: http://localhost:3000/admin.html (requires authentication)

### Default Credentials

If you used the default values during setup:
- Username: `admin`
- Password: `admin123`

**Important**: Change these credentials in production by running the setup script again or manually updating the `data/auth.json` file with a bcrypt-hashed password.

## Project Structure

- `server/` - Backend Express server
  - `routes/` - API route handlers
  - `middleware/` - Authentication middleware
  - `utils/` - Utility functions (storage operations)
- `public/` - Frontend HTML, CSS, and JavaScript
  - `index.html` - Public landing page
  - `login.html` - Admin login page
  - `admin.html` - Admin control panel
  - `css/` - Stylesheets
  - `js/` - Client-side JavaScript
- `data/` - JSON data files for persistence
  - `links.json` - Link collection data
  - `theme.json` - Theme customization settings
  - `auth.json` - Admin credentials (bcrypt hashed)

## Features

### Public Landing Page
- Responsive design that works on mobile, tablet, and desktop
- Customizable theme with colors and background images
- Loading states for better user experience
- Error handling with user-friendly messages
- Accessibility features (ARIA labels, keyboard navigation, high contrast support)
- Reduced motion support for users with motion sensitivity

### Admin Panel
- Secure session-based authentication
- Link management (add, edit, delete)
- Drag-and-drop link reordering with visual feedback
- Theme customization with live color pickers
- Loading states for all async operations
- Comprehensive error handling with timeout protection
- Automatic session validation and redirect
- User-friendly error messages

### Error Handling & Polish
- Network timeout protection (10-second timeout on requests)
- Graceful error recovery with user-friendly messages
- Loading indicators for all async operations
- Form validation with clear error messages
- Automatic redirect to login on authentication failure
- Session persistence across page refreshes
- Responsive design tested on various screen sizes

## Configuration

### Environment Variables

You can configure the application using environment variables:

- `PORT` - Server port (default: 3000)
- `SESSION_SECRET` - Secret key for session encryption (default: auto-generated, but should be set in production)

Example:
```bash
PORT=8080 SESSION_SECRET=your-secret-key npm start
```

### Data Backup

The `data/` directory contains all your links, theme settings, and credentials. Make sure to:
- Back up this directory regularly
- Keep `auth.json` secure and never commit it to version control
- Add `data/` to your `.gitignore` file in production

## Security Notes

- Always change default credentials in production
- Use HTTPS in production environments
- Set a strong `SESSION_SECRET` environment variable
- Regularly back up your data files
- Rate limiting is implemented on the login endpoint (5 attempts per 15 minutes)
- All user inputs are validated and sanitized
- XSS protection through HTML escaping
- Session cookies are HTTP-only and secure in production

## Browser Support

The application is tested and works on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Responsive Design

The application is fully responsive with breakpoints at:
- Mobile: < 480px
- Tablet: 480px - 768px
- Desktop: > 768px

All features work seamlessly across all screen sizes.

## Accessibility

The application follows WCAG 2.1 guidelines:
- Semantic HTML structure
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode support
- Reduced motion support for animations
- Proper focus management
- Color contrast ratios meet AA standards

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Try setting a different port: `PORT=8080 npm start`

### Can't log in
- Verify credentials in `data/auth.json`
- Check browser console for errors
- Clear browser cookies and try again

### Links not loading
- Check server is running
- Verify `data/links.json` exists and is valid JSON
- Check browser console for network errors

### Theme not applying
- Verify `data/theme.json` exists and is valid JSON
- Check browser console for errors
- Try refreshing the page with Ctrl+F5 (hard refresh)
