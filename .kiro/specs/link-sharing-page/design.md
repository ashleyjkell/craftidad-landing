# Design Document

## Overview

The link-sharing page system consists of two main applications: a public landing page and an admin control panel. The system uses a simple tech stack with a focus on ease of deployment and maintenance. The architecture follows a client-server model with a lightweight backend for data persistence and authentication.

## Architecture

### Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla or lightweight framework like Alpine.js)
- **Backend**: Node.js with Express
- **Database**: JSON file storage (simple and portable)
- **Authentication**: Session-based with bcrypt for password hashing
- **Hosting**: Can be deployed on any Node.js hosting platform

### System Components

```
┌─────────────────┐
│  Landing Page   │ (Public)
│   (Frontend)    │
└────────┬────────┘
         │
         │ GET /api/links
         │ GET /api/theme
         │
┌────────▼────────┐
│                 │
│   Express API   │
│                 │
└────────┬────────┘
         │
         │ Read/Write
         │
┌────────▼────────┐
│   JSON Files    │
│  - links.json   │
│  - theme.json   │
│  - auth.json    │
└─────────────────┘

┌─────────────────┐
│  Admin Panel    │ (Protected)
│   (Frontend)    │
└────────┬────────┘
         │
         │ POST /api/login
         │ POST /api/logout
         │ GET/POST/PUT/DELETE /api/admin/links
         │ GET/PUT /api/admin/theme
         │
         └──────────► Express API
```

## Components and Interfaces

### 1. Landing Page (Public Frontend)

**Purpose**: Display the customizable link collection to visitors

**Key Features**:
- Profile info box at the top with photo and bio
- Responsive layout with centered content
- Background image or color support
- Link items displayed as styled capsules
- Each link can have an optional icon (from The Noun Project) or image
- Click tracking (optional future enhancement)

**API Endpoints Used**:
- `GET /api/profile` - Fetch profile photo and bio
- `GET /api/links` - Fetch all active links in order
- `GET /api/theme` - Fetch current theme settings

### 2. Admin Panel (Protected Frontend)

**Purpose**: Provide authenticated interface for managing links and theme

**Key Features**:
- Login page with session management
- Profile management (photo and bio)
- Link management interface (CRUD operations)
- Icon search and selection from The Noun Project API
- Choice between custom image or icon for each link
- Drag-and-drop reordering
- Theme customization controls
- Image upload/URL input for backgrounds and link buttons
- Live preview option

**API Endpoints Used**:
- `POST /api/login` - Authenticate admin
- `POST /api/logout` - End session
- `GET /api/admin/profile` - Fetch profile data
- `PUT /api/admin/profile` - Update profile photo and bio
- `GET /api/admin/links` - Fetch all links for editing
- `POST /api/admin/links` - Create new link
- `PUT /api/admin/links/:id` - Update existing link
- `DELETE /api/admin/links/:id` - Delete link
- `PUT /api/admin/links/reorder` - Update link order
- `GET /api/admin/theme` - Fetch theme settings
- `PUT /api/admin/theme` - Update theme settings
- `GET /api/admin/icons/search?query=` - Search The Noun Project for icons
- `GET /api/admin/config` - Fetch API configuration status
- `PUT /api/admin/config` - Update API keys

### 3. Express API Server

**Purpose**: Handle HTTP requests, authentication, and data persistence

**Middleware**:
- `express.json()` - Parse JSON request bodies
- `express-session` - Session management
- Custom auth middleware - Protect admin routes

**Route Groups**:
- Public routes (`/api/links`, `/api/theme`)
- Auth routes (`/api/login`, `/api/logout`)
- Protected admin routes (`/api/admin/*`)

### 4. Data Storage

**Purpose**: Persist application data in simple JSON files

**Files**:
- `data/links.json` - Array of link objects
- `data/theme.json` - Theme configuration object
- `data/auth.json` - Hashed admin credentials
- `data/profile.json` - Profile photo and bio
- `data/config.json` - API keys and configuration

## Data Models

### Link Item

```json
{
  "id": "string (UUID)",
  "label": "string",
  "url": "string (validated URL)",
  "visualType": "string (enum: 'image' | 'icon' | 'none')",
  "imageUrl": "string (optional, used when visualType is 'image')",
  "iconId": "string (optional, The Noun Project icon ID)",
  "iconUrl": "string (optional, cached icon URL)",
  "order": "number",
  "active": "boolean"
}
```

### Theme Settings

```json
{
  "backgroundColor": "string (hex color)",
  "backgroundImageUrl": "string (optional)",
  "textColor": "string (hex color)",
  "buttonColor": "string (hex color)",
  "buttonTextColor": "string (hex color)"
}
```

### Profile

```json
{
  "photoUrl": "string (optional)",
  "bio": "string (max 500 characters)"
}
```

### Configuration

```json
{
  "nounProjectApiKey": "string (optional)",
  "nounProjectApiSecret": "string (optional)"
}
```

### Authentication

```json
{
  "username": "string",
  "passwordHash": "string (bcrypt hash)"
}
```

## Error Handling

### Client-Side
- Display user-friendly error messages for failed operations
- Validate form inputs before submission
- Handle network errors gracefully with retry options

### Server-Side
- Return appropriate HTTP status codes
- Provide descriptive error messages in JSON format
- Log errors for debugging
- Handle file system errors (missing files, permissions)

### Error Response Format

```json
{
  "error": "string (error message)",
  "code": "string (error code)"
}
```

## Testing Strategy

Given the requirement to keep testing minimal, focus on:

1. **Manual Testing**:
   - Test all CRUD operations through the admin panel
   - Verify drag-and-drop reordering works correctly
   - Test theme changes reflect on landing page
   - Verify authentication flow (login/logout)
   - Test responsive design on mobile and desktop

2. **Basic Validation**:
   - URL format validation
   - Required field validation
   - Image URL accessibility checks

3. **Future Testing** (if needed):
   - Integration tests for API endpoints
   - E2E tests for critical user flows

## The Noun Project API Integration

### Authentication
The Noun Project API uses OAuth 1.0 authentication. For simplicity, we'll use the API key and secret for server-side requests.

### Icon Search Flow
1. Admin enters search term in the admin panel
2. Frontend sends request to backend proxy endpoint
3. Backend makes authenticated request to The Noun Project API
4. Backend returns icon results with preview URLs
5. Admin selects an icon
6. Icon ID and URL are stored with the link

### API Endpoints Used
- `GET /v2/icon?query={term}&limit=20` - Search for icons
- Icons are returned with preview URLs that can be cached

### Caching Strategy
- Store icon URLs with links to avoid repeated API calls
- Icons are served directly from The Noun Project CDN on the landing page

## Security Considerations

- Password hashing with bcrypt (minimum 10 rounds)
- Session-based authentication with secure cookies
- CSRF protection for state-changing operations
- Input validation and sanitization
- Rate limiting on login endpoint
- HTTPS enforcement in production
- API keys stored securely in config.json (not exposed to frontend)
- The Noun Project API requests proxied through backend

## Deployment

### Development
```bash
npm install
npm run dev
```

### Production
- Set environment variables (PORT, SESSION_SECRET)
- Ensure data directory has proper permissions
- Use process manager (PM2) for Node.js process
- Configure reverse proxy (nginx) for HTTPS
- Set up automatic backups for JSON data files

## File Structure

```
link-sharing-page/
├── server/
│   ├── index.js           # Express server entry point
│   ├── routes/
│   │   ├── public.js      # Public API routes
│   │   ├── auth.js        # Authentication routes
│   │   └── admin.js       # Protected admin routes
│   ├── middleware/
│   │   └── auth.js        # Authentication middleware
│   └── utils/
│       └── storage.js     # JSON file operations
├── public/
│   ├── index.html         # Landing page
│   ├── admin.html         # Admin panel
│   ├── login.html         # Login page
│   ├── css/
│   │   ├── landing.css
│   │   └── admin.css
│   └── js/
│       ├── landing.js
│       └── admin.js
├── data/
│   ├── links.json
│   ├── theme.json
│   ├── auth.json
│   ├── profile.json
│   └── config.json
├── package.json
└── README.md
```
