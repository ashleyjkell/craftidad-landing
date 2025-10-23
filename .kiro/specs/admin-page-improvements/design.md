# Design Document

## Overview

This design document outlines the technical approach for implementing three key improvements to the admin page:
1. Real-time icon search with debouncing
2. Fixing icon selection persistence issues
3. Clean URL routing for all pages

## Architecture

### Current State Analysis

**Icon Search Flow:**
- User types in `#icon-search` input field
- User clicks `#icon-search-btn` button
- `searchIcons()` function is called
- Results are displayed in `#icon-search-results`
- User clicks an icon, `selectIcon()` is called
- Selected icon data is stored in hidden inputs: `#selected-icon-id` and `#selected-icon-url`

**Routing:**
- Currently uses static file serving via Express
- Pages accessed with `.html` extensions (e.g., `/admin.html`, `/login.html`)
- No clean URL routing implemented

### Proposed Changes

**1. Real-time Icon Search with Debouncing**
- Add `input` event listener to `#icon-search` field
- Implement debounce mechanism (300ms delay)
- Automatically trigger search after debounce period
- Show/hide results based on input state
- Maintain existing button functionality for manual search

**2. Icon Selection Fix**
- Review and fix the `selectIcon()` function to ensure proper data persistence
- Verify hidden input fields are correctly populated
- Ensure form submission includes icon data
- Add validation to prevent submission with incomplete icon data

**3. Clean URL Routing**
- Add Express route handlers for clean URLs
- Implement redirects from `.html` URLs to clean URLs
- Maintain backward compatibility

## Components and Interfaces

### 1. Debounced Icon Search Component

**Location:** `public/js/admin.js`

**New Variables:**
```javascript
let iconSearchTimeout = null;
const ICON_SEARCH_DEBOUNCE_MS = 300;
```

**Modified Functions:**
- `searchIcons()` - Make it work without requiring a button click
- Add new function: `handleIconSearchInput()` - Debounced search handler

**Event Listeners:**
```javascript
iconSearchInput.addEventListener('input', handleIconSearchInput);
```

**Behavior:**
- Clear previous timeout on each keystroke
- Start new timeout (300ms)
- Only search if input has at least 1 character
- Clear results if input is empty
- Show loading state during search

### 2. Icon Selection Fix Component

**Location:** `public/js/admin.js`

**Analysis of Current Issue:**
The current implementation appears correct, but we need to verify:
- Hidden inputs are properly updated in `selectIcon()`
- Form submission correctly reads these values
- Server-side validation accepts the icon data

**Potential Issues to Address:**
1. Icon data might be cleared when visual type changes
2. Form reset might not preserve icon selection during edit
3. Server validation might be rejecting icon data

**Fix Strategy:**
- Add console logging to track icon selection flow
- Ensure `selectedIcon` object is maintained throughout form lifecycle
- Verify hidden inputs persist until form submission
- Add defensive checks in form submission handler

### 3. Clean URL Routing Component

**Location:** `server/index.js`

**New Route Handlers:**
```javascript
// Clean URL routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Redirect .html URLs to clean URLs
app.get('/*.html', (req, res) => {
  const cleanPath = req.path.replace('.html', '');
  res.redirect(301, cleanPath);
});
```

**Route Order:**
1. API routes (`/api/*`)
2. Clean URL routes (`/admin`, `/login`, `/index`)
3. Redirect routes (`/*.html`)
4. Static file serving (fallback)
5. 404 handler

## Data Models

### Icon Search State

```javascript
{
  searchTimeout: Number | null,  // Timeout ID for debouncing
  isSearching: Boolean,           // Loading state
  lastQuery: String,              // Last search query
  selectedIcon: {                 // Currently selected icon
    id: String,
    url: String,
    term: String
  } | null
}
```

### Icon Data in Form

```javascript
{
  iconId: String,      // The Noun Project icon ID
  iconUrl: String,     // Preview URL for the icon
  visualType: 'icon'   // Must be 'icon' for icon data to be used
}
```

## Error Handling

### Icon Search Errors

1. **Empty Query:** Clear results, don't show error
2. **API Not Configured:** Show configuration message in results area
3. **Network Error:** Display user-friendly error message
4. **No Results:** Show "No icons found" message

### Icon Selection Errors

1. **Missing Icon Data:** Validate before form submission
2. **Invalid Icon URL:** Server-side validation will catch
3. **Icon Data Lost:** Preserve in hidden inputs and `selectedIcon` variable

### Routing Errors

1. **404 Not Found:** Let Express default handler manage
2. **Redirect Loops:** Ensure `.html` redirect doesn't create loops
3. **Static File Conflicts:** Order routes correctly

## Testing Strategy

### Manual Testing Checklist

**Icon Search:**
- [ ] Type in search field, verify results appear after 300ms
- [ ] Type quickly, verify only one search is triggered
- [ ] Clear input, verify results disappear
- [ ] Search with 1 character, verify search triggers
- [ ] Click search button, verify it still works
- [ ] Test with API not configured, verify error message

**Icon Selection:**
- [ ] Select an icon, verify preview appears
- [ ] Submit form, verify icon saves to link
- [ ] Edit link with icon, verify icon loads correctly
- [ ] Change visual type away from icon, verify icon data clears
- [ ] Change back to icon, verify can select new icon
- [ ] Submit without selecting icon, verify validation error

**Clean URLs:**
- [ ] Navigate to `/admin`, verify admin page loads
- [ ] Navigate to `/login`, verify login page loads
- [ ] Navigate to `/index`, verify index page loads
- [ ] Navigate to `/admin.html`, verify redirects to `/admin`
- [ ] Navigate to `/login.html`, verify redirects to `/login`
- [ ] Verify all internal links work with clean URLs
- [ ] Test backward compatibility with bookmarked `.html` URLs

### Integration Testing

1. **Full Link Creation Flow:**
   - Create new link with icon search
   - Verify icon appears in link list
   - Verify icon displays on public page

2. **Edit Flow:**
   - Edit existing link with icon
   - Change icon
   - Verify new icon saves correctly

3. **Navigation Flow:**
   - Test all page transitions with clean URLs
   - Verify authentication redirects work
   - Verify logout redirects work

## Implementation Notes

### Debouncing Implementation

Use a simple timeout-based debounce:
```javascript
function handleIconSearchInput() {
  // Clear existing timeout
  if (iconSearchTimeout) {
    clearTimeout(iconSearchTimeout);
  }
  
  const query = iconSearchInput.value.trim();
  
  // Clear results if empty
  if (!query) {
    clearIconSearchResults();
    return;
  }
  
  // Set new timeout
  iconSearchTimeout = setTimeout(() => {
    searchIcons();
  }, ICON_SEARCH_DEBOUNCE_MS);
}
```

### Icon Selection Debugging

Add logging to track the flow:
```javascript
console.log('Icon selected:', { id, url, term });
console.log('Hidden inputs updated:', {
  iconId: document.getElementById('selected-icon-id').value,
  iconUrl: document.getElementById('selected-icon-url').value
});
```

### Route Ordering

Critical order in `server/index.js`:
1. Session middleware
2. Body parsers
3. API routes (most specific)
4. Clean URL routes
5. HTML redirect routes
6. Static file serving (least specific)

### Backward Compatibility

The redirect approach ensures:
- Old bookmarks with `.html` work
- Search engine indexed URLs redirect properly
- Internal links can be updated gradually
- No breaking changes for existing users

## Performance Considerations

### Debouncing Benefits

- Reduces API calls by ~70-90% during typing
- Improves server load
- Better user experience (no flickering results)
- Network bandwidth savings

### Caching Strategy

Consider adding:
- Client-side cache for icon search results (future enhancement)
- Cache-Control headers for static assets
- Session-based icon search history (future enhancement)

## Security Considerations

### Input Validation

- Sanitize search queries before API calls
- Validate icon URLs are from trusted sources
- Prevent XSS in icon term display (already using `escapeHtml()`)

### Route Security

- Ensure authentication middleware applies to `/admin` route
- Verify redirects don't expose sensitive information
- Maintain HTTPS enforcement in production

## Migration Path

### Phase 1: Icon Search Improvements
1. Add debouncing to icon search
2. Test thoroughly
3. Deploy

### Phase 2: Icon Selection Fix
1. Identify root cause of selection issue
2. Implement fix
3. Test edit and create flows
4. Deploy

### Phase 3: Clean URL Routing
1. Add clean URL routes
2. Add redirect routes
3. Update internal links in HTML files
4. Test all navigation flows
5. Deploy

### Rollback Plan

Each phase is independent and can be rolled back:
- Phase 1: Remove event listener, revert to button-only search
- Phase 2: Revert icon selection changes
- Phase 3: Remove route handlers, restore static-only serving
