// ============================================
// Utility Functions
// ============================================

/**
 * Enhanced fetch with timeout and better error handling
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default 10000)
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw new Error('Network error. Please check your connection and try again.');
    }
}

// ============================================
// Link Management Functionality
// ============================================

let currentEditingLinkId = null;

/**
 * Validate URL format on client side
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
 * Display a message to the user
 * @param {string} elementId - ID of the message element
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success' or 'error')
 */
function showMessage(elementId, message, type = 'success') {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

/**
 * Show loading state for links list
 */
function showLinksLoading() {
    const linksListEl = document.getElementById('links-list');
    linksListEl.innerHTML = '<p class="loading-state">Loading links...</p>';
}

/**
 * Fetch and display all links
 */
async function loadLinks() {
    showLinksLoading();
    
    try {
        const response = await fetchWithTimeout('/api/admin/links');

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Failed to fetch links');
        }

        const links = await response.json();
        displayLinks(links);
    } catch (error) {
        console.error('Error loading links:', error);
        const linksListEl = document.getElementById('links-list');
        linksListEl.innerHTML = '<p class="error-state">Failed to load links. Please refresh the page.</p>';
        showMessage('links-message', error.message || 'Failed to load links. Please refresh the page.', 'error');
    }
}

/**
 * Display links in the list
 * @param {Array} links - Array of link objects
 */
function displayLinks(links) {
    const linksListEl = document.getElementById('links-list');

    if (links.length === 0) {
        linksListEl.innerHTML = '<p class="no-links">No links yet. Add your first link above!</p>';
        return;
    }

    // Sort links by order
    const sortedLinks = [...links].sort((a, b) => a.order - b.order);

    linksListEl.innerHTML = sortedLinks.map(link => {
        const visualType = link.visualType || (link.imageUrl ? 'image' : 'none');
        let visualInfo = '';
        
        if (visualType === 'image' && link.imageUrl) {
            visualInfo = `<div class="link-image-url">Image: ${escapeHtml(link.imageUrl)}</div>`;
        } else if (visualType === 'icon' && link.iconUrl) {
            visualInfo = `<div class="link-image-url">Icon: ${escapeHtml(link.iconUrl)}</div>`;
        }

        return `
        <div class="link-item" data-id="${link.id}" draggable="true">
          <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
          <div class="link-info">
            <div class="link-label">${escapeHtml(link.label)}</div>
            <div class="link-url">${escapeHtml(link.url)}</div>
            ${visualInfo}
            <div class="link-status ${link.active ? 'active' : 'inactive'}">
              ${link.active ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div class="link-actions">
            <button class="btn btn-small btn-edit" onclick="editLink('${link.id}')">Edit</button>
            <button class="btn btn-small btn-delete" onclick="deleteLink('${link.id}')">Delete</button>
          </div>
        </div>
        `;
    }).join('');

    // Initialize drag-and-drop after rendering
    initializeDragAndDrop();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Set loading state for submit button
 * @param {boolean} loading - Whether button is in loading state
 */
function setLinkFormLoading(loading) {
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const formInputs = document.querySelectorAll('#link-form input');
    
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        cancelBtn.disabled = true;
        formInputs.forEach(input => input.disabled = true);
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = document.getElementById('link-id').value ? 'Update Link' : 'Add Link';
        cancelBtn.disabled = false;
        formInputs.forEach(input => input.disabled = false);
    }
}

/**
 * Handle link form submission (add or edit)
 */
async function handleLinkFormSubmit(event) {
    event.preventDefault();

    const linkId = document.getElementById('link-id').value;
    const label = document.getElementById('link-label').value.trim();
    const url = document.getElementById('link-url').value.trim();
    const visualType = document.getElementById('visual-type').value;
    const imageUrl = document.getElementById('link-image').value.trim();
    const iconId = document.getElementById('selected-icon-id').value.trim();
    const iconUrl = document.getElementById('selected-icon-url').value.trim();

    console.log('Form submission - Raw values:', {
        visualType,
        iconId,
        iconUrl,
        selectedIcon,
        hiddenInputValues: {
            iconIdElement: document.getElementById('selected-icon-id').value,
            iconUrlElement: document.getElementById('selected-icon-url').value
        }
    });

    // Client-side URL validation
    if (!isValidURL(url)) {
        showMessage('link-form-message', 'Please enter a valid URL starting with http:// or https://', 'error');
        return;
    }

    // Validate based on visual type
    if (visualType === 'image') {
        if (!imageUrl) {
            showMessage('link-form-message', 'Please enter an image URL or select a different visual type', 'error');
            return;
        }
        if (!isValidURL(imageUrl)) {
            showMessage('link-form-message', 'Please enter a valid image URL starting with http:// or https://', 'error');
            return;
        }
    } else if (visualType === 'icon') {
        if (!iconId || !iconUrl) {
            showMessage('link-form-message', 'Please select an icon or choose a different visual type', 'error');
            return;
        }
        // Additional validation: verify selectedIcon object matches hidden inputs
        if (selectedIcon && (selectedIcon.id !== iconId || selectedIcon.url !== iconUrl)) {
            console.warn('Icon data mismatch detected, using hidden input values');
        }
    }

    const linkData = {
        label,
        url,
        visualType,
        imageUrl: visualType === 'image' ? imageUrl : '',
        iconId: visualType === 'icon' ? iconId : '',
        iconUrl: visualType === 'icon' ? iconUrl : ''
    };

    console.log('Submitting link data:', linkData);

    setLinkFormLoading(true);

    try {
        let response;

        if (linkId) {
            // Edit existing link
            response = await fetchWithTimeout(`/api/admin/links/${linkId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(linkData)
            });
        } else {
            // Add new link
            response = await fetchWithTimeout('/api/admin/links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(linkData)
            });
        }

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save link');
        }

        const savedLink = await response.json();
        console.log('Link saved successfully:', savedLink);

        // Show success message
        showMessage('link-form-message', linkId ? 'Link updated successfully!' : 'Link added successfully!', 'success');

        // Reset form
        resetLinkForm();

        // Reload links
        await loadLinks();

    } catch (error) {
        console.error('Error saving link:', error);
        showMessage('link-form-message', error.message || 'An error occurred. Please try again.', 'error');
    } finally {
        setLinkFormLoading(false);
    }
}

/**
 * Edit a link
 * @param {string} linkId - ID of the link to edit
 */
async function editLink(linkId) {
    try {
        const response = await fetchWithTimeout('/api/admin/links');

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Failed to fetch links');
        }

        const links = await response.json();
        const link = links.find(l => l.id === linkId);

        if (!link) {
            showMessage('links-message', 'Link not found', 'error');
            return;
        }

        console.log('Editing link:', link);

        // Populate form with link data
        document.getElementById('link-id').value = link.id;
        document.getElementById('link-label').value = link.label;
        document.getElementById('link-url').value = link.url;

        // Handle visual type
        const visualType = link.visualType || (link.imageUrl ? 'image' : 'none');
        
        // First, restore icon data if it exists (before calling handleVisualTypeChange)
        if (link.iconId && link.iconUrl) {
            selectedIcon = {
                id: link.iconId,
                url: link.iconUrl,
                term: link.label
            };
            document.getElementById('selected-icon-id').value = link.iconId;
            document.getElementById('selected-icon-url').value = link.iconUrl;
            console.log('Restored icon selection:', selectedIcon);
        }

        // Now handle visual type change
        handleVisualTypeChange(visualType);

        // Verify icon data persisted after visual type change
        if (link.iconId && link.iconUrl) {
            console.log('After handleVisualTypeChange - Hidden inputs:', {
                iconId: document.getElementById('selected-icon-id').value,
                iconUrl: document.getElementById('selected-icon-url').value
            });
            
            // Re-set the values if they were cleared
            if (!document.getElementById('selected-icon-id').value) {
                console.warn('Icon ID was cleared, restoring...');
                document.getElementById('selected-icon-id').value = link.iconId;
            }
            if (!document.getElementById('selected-icon-url').value) {
                console.warn('Icon URL was cleared, restoring...');
                document.getElementById('selected-icon-url').value = link.iconUrl;
            }
        }

        if (visualType === 'image') {
            document.getElementById('link-image').value = link.imageUrl || '';
        } else if (visualType === 'icon' && link.iconId && link.iconUrl) {
            // Show preview (data is already set above)
            const previewContainer = document.getElementById('selected-icon-preview');
            previewContainer.innerHTML = `
                <img src="${escapeHtml(link.iconUrl)}" alt="${escapeHtml(link.label)}">
                <div class="icon-info">
                    <div class="icon-name">Selected: ${escapeHtml(link.label)}</div>
                    <div class="icon-attribution">From The Noun Project</div>
                </div>
                <button type="button" onclick="clearIconSelection()">Clear</button>
            `;
            previewContainer.classList.add('show');
        }

        // Update form UI
        document.getElementById('form-title').textContent = 'Edit Link';
        document.getElementById('submit-btn').textContent = 'Update Link';
        document.getElementById('cancel-btn').style.display = 'inline-block';

        // Scroll to form
        document.querySelector('.link-form-container').scrollIntoView({ behavior: 'smooth' });

        currentEditingLinkId = linkId;

    } catch (error) {
        console.error('Error loading link for editing:', error);
        showMessage('links-message', error.message || 'Failed to load link for editing', 'error');
    }
}

/**
 * Delete a link
 * @param {string} linkId - ID of the link to delete
 */
async function deleteLink(linkId) {
    if (!confirm('Are you sure you want to delete this link?')) {
        return;
    }

    try {
        const response = await fetchWithTimeout(`/api/admin/links/${linkId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete link');
        }

        showMessage('links-message', 'Link deleted successfully!', 'success');

        // Reload links
        await loadLinks();

    } catch (error) {
        console.error('Error deleting link:', error);
        showMessage('links-message', error.message || 'An error occurred. Please try again.', 'error');
    }
}

/**
 * Reset the link form to add mode
 */
function resetLinkForm() {
    document.getElementById('link-form').reset();
    document.getElementById('link-id').value = '';
    document.getElementById('form-title').textContent = 'Add New Link';
    document.getElementById('submit-btn').textContent = 'Add Link';
    document.getElementById('cancel-btn').style.display = 'none';
    currentEditingLinkId = null;

    // Clear icon selection completely on reset
    clearIconSelection();
    
    // Reset visual type to 'none'
    handleVisualTypeChange('none');
}

/**
 * Handle cancel button click
 */
function handleCancelEdit() {
    resetLinkForm();
}

// ============================================
// Icon Selection Functionality
// ============================================

let selectedIcon = null;
let iconSearchTimeout = null;
const ICON_SEARCH_DEBOUNCE_MS = 300;

/**
 * Handle visual type button clicks
 */
function handleVisualTypeChange(type) {
    // Check if trying to select icon type when API is not configured
    if (type === 'icon' && !isApiConfigured) {
        showMessage('link-form-message', 'Icon search is not available. Please configure The Noun Project API in the API Configuration section below.', 'error');
        return;
    }

    // Update active button
    document.querySelectorAll('.visual-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-type="${type}"]`).classList.add('active');

    // Update hidden input
    document.getElementById('visual-type').value = type;

    // Show/hide appropriate input groups
    const imageUrlGroup = document.getElementById('image-url-group');
    const iconSearchGroup = document.getElementById('icon-search-group');

    if (type === 'image') {
        imageUrlGroup.style.display = 'block';
        iconSearchGroup.style.display = 'none';
        // Don't clear icon selection - preserve it in case user switches back
    } else if (type === 'icon') {
        imageUrlGroup.style.display = 'none';
        iconSearchGroup.style.display = 'block';
        document.getElementById('link-image').value = '';
        // Icon selection is preserved if it exists
    } else {
        imageUrlGroup.style.display = 'none';
        iconSearchGroup.style.display = 'none';
        document.getElementById('link-image').value = '';
        // Don't clear icon selection - preserve it in case user switches back
    }
}

/**
 * Clear icon selection
 */
function clearIconSelection() {
    selectedIcon = null;
    document.getElementById('selected-icon-id').value = '';
    document.getElementById('selected-icon-url').value = '';
    document.getElementById('selected-icon-preview').classList.remove('show');
    document.getElementById('icon-search-results').innerHTML = '';
    document.getElementById('icon-search').value = '';
}

/**
 * Handle icon search input with debouncing
 */
function handleIconSearchInput() {
    // Clear existing timeout
    if (iconSearchTimeout) {
        clearTimeout(iconSearchTimeout);
    }
    
    const searchInput = document.getElementById('icon-search');
    const query = searchInput.value.trim();
    
    // Clear results if empty
    if (!query) {
        const resultsContainer = document.getElementById('icon-search-results');
        resultsContainer.innerHTML = '';
        return;
    }
    
    // Only search if at least 1 character
    if (query.length < 1) {
        return;
    }
    
    // Set new timeout
    iconSearchTimeout = setTimeout(() => {
        searchIcons();
    }, ICON_SEARCH_DEBOUNCE_MS);
}

/**
 * Search for icons using The Noun Project API
 */
async function searchIcons() {
    const searchInput = document.getElementById('icon-search');
    const query = searchInput.value.trim();

    if (!query) {
        return;
    }

    // Check if API is configured
    if (!isApiConfigured) {
        const resultsContainer = document.getElementById('icon-search-results');
        resultsContainer.innerHTML = '<div class="icon-search-error">The Noun Project API is not configured. Please configure your API credentials in the API Configuration section below to enable icon search.</div>';
        return;
    }

    const resultsContainer = document.getElementById('icon-search-results');
    resultsContainer.innerHTML = '<div class="icon-search-loading">Searching for icons...</div>';

    try {
        const response = await fetchWithTimeout(`/api/admin/icons/search?query=${encodeURIComponent(query)}`);

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to search icons');
        }

        const data = await response.json();
        displayIconResults(data.icons);

    } catch (error) {
        console.error('Error searching icons:', error);
        resultsContainer.innerHTML = `<div class="icon-search-error">${error.message}</div>`;
    }
}

/**
 * Display icon search results
 * @param {Array} icons - Array of icon objects
 */
function displayIconResults(icons) {
    const resultsContainer = document.getElementById('icon-search-results');

    if (!icons || icons.length === 0) {
        resultsContainer.innerHTML = '<div class="icon-search-empty">No icons found. Try a different search term.</div>';
        return;
    }

    resultsContainer.innerHTML = icons
        .filter(icon => {
            // Filter out icons without preview URLs
            if (!icon.previewUrl) {
                console.warn('Skipping icon without preview URL:', icon);
                return false;
            }
            return true;
        })
        .map(icon => {
            // Log icon data for debugging
            console.log('Rendering icon:', { id: icon.id, term: icon.term, previewUrl: icon.previewUrl });
            
            // For data attributes, we need to escape quotes but not convert to HTML entities
            const safeIconUrl = (icon.previewUrl || '').replace(/"/g, '&quot;');
            const safeIconTerm = (icon.term || '').replace(/"/g, '&quot;');
            
            return `
                <div class="icon-result-item" data-icon-id="${icon.id}" data-icon-url="${safeIconUrl}" data-icon-term="${safeIconTerm}">
                    <img src="${escapeHtml(icon.thumbnailUrl || icon.previewUrl)}" alt="${escapeHtml(icon.term)}">
                    <div class="icon-term">${escapeHtml(icon.term)}</div>
                </div>
            `;
        }).join('');

    // Add click handlers to icon items
    document.querySelectorAll('.icon-result-item').forEach(item => {
        item.addEventListener('click', () => selectIcon(item));
    });
}

/**
 * Select an icon from search results
 * @param {HTMLElement} iconElement - The clicked icon element
 */
function selectIcon(iconElement) {
    const iconId = iconElement.dataset.iconId;
    const iconUrl = iconElement.dataset.iconUrl;
    const iconTerm = iconElement.dataset.iconTerm;

    console.log('selectIcon called with:', { iconId, iconUrl, iconTerm });

    // Validate that we have the required data
    if (!iconId || !iconUrl) {
        console.error('Invalid icon data:', { iconId, iconUrl, iconTerm });
        showMessage('link-form-message', 'Error: Icon data is incomplete. Please try selecting a different icon.', 'error');
        return;
    }

    // Update selected icon
    selectedIcon = {
        id: iconId,
        url: iconUrl,
        term: iconTerm
    };

    // Update hidden inputs
    document.getElementById('selected-icon-id').value = iconId;
    document.getElementById('selected-icon-url').value = iconUrl;

    console.log('Icon selected:', selectedIcon);
    console.log('Hidden inputs updated:', {
        iconId: document.getElementById('selected-icon-id').value,
        iconUrl: document.getElementById('selected-icon-url').value
    });

    // Update visual selection
    document.querySelectorAll('.icon-result-item').forEach(item => {
        item.classList.remove('selected');
    });
    iconElement.classList.add('selected');

    // Show preview
    const previewContainer = document.getElementById('selected-icon-preview');
    previewContainer.innerHTML = `
        <img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(iconTerm)}">
        <div class="icon-info">
            <div class="icon-name">Selected: ${escapeHtml(iconTerm)}</div>
            <div class="icon-attribution">From The Noun Project</div>
        </div>
        <button type="button" onclick="clearIconSelection()">Clear</button>
    `;
    previewContainer.classList.add('show');
}

// ============================================
// Drag and Drop Functionality
// ============================================

let draggedElement = null;
let draggedOverElement = null;

/**
 * Initialize drag-and-drop event listeners for all link items
 */
function initializeDragAndDrop() {
    const linkItems = document.querySelectorAll('.link-item');

    linkItems.forEach(item => {
        // Drag start event
        item.addEventListener('dragstart', handleDragStart);

        // Drag over event
        item.addEventListener('dragover', handleDragOver);

        // Drag enter event
        item.addEventListener('dragenter', handleDragEnter);

        // Drag leave event
        item.addEventListener('dragleave', handleDragLeave);

        // Drop event
        item.addEventListener('drop', handleDrop);

        // Drag end event
        item.addEventListener('dragend', handleDragEnd);
    });
}

/**
 * Handle drag start event
 * @param {DragEvent} e - Drag event
 */
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');

    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

/**
 * Handle drag over event
 * @param {DragEvent} e - Drag event
 */
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';
    return false;
}

/**
 * Handle drag enter event
 * @param {DragEvent} e - Drag event
 */
function handleDragEnter(e) {
    if (this !== draggedElement) {
        this.classList.add('drag-over');
        draggedOverElement = this;
    }
}

/**
 * Handle drag leave event
 * @param {DragEvent} e - Drag event
 */
function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

/**
 * Handle drop event
 * @param {DragEvent} e - Drag event
 */
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    // Don't do anything if dropping on itself
    if (draggedElement !== this) {
        // Get the parent container
        const linksListEl = document.getElementById('links-list');
        const allItems = Array.from(linksListEl.querySelectorAll('.link-item'));

        // Get indices
        const draggedIndex = allItems.indexOf(draggedElement);
        const targetIndex = allItems.indexOf(this);

        // Reorder in DOM
        if (draggedIndex < targetIndex) {
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedElement, this);
        }

        // Send updated order to server
        saveNewOrder();
    }

    return false;
}

/**
 * Handle drag end event
 * @param {DragEvent} e - Drag event
 */
function handleDragEnd(e) {
    // Remove all drag-related classes
    const linkItems = document.querySelectorAll('.link-item');
    linkItems.forEach(item => {
        item.classList.remove('dragging');
        item.classList.remove('drag-over');
    });

    draggedElement = null;
    draggedOverElement = null;
}

/**
 * Save the new order of links to the server
 */
async function saveNewOrder() {
    try {
        // Get current order from DOM
        const linksListEl = document.getElementById('links-list');
        const linkItems = linksListEl.querySelectorAll('.link-item');

        // Extract link IDs in current order
        const linkIds = Array.from(linkItems).map(item => item.dataset.id);

        // Send to server
        const response = await fetchWithTimeout('/api/admin/links/reorder', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ linkIds })
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to reorder links');
        }

        await response.json();

        // Show success message
        showMessage('links-message', 'Links reordered successfully!', 'success');

    } catch (error) {
        console.error('Error reordering links:', error);
        showMessage('links-message', error.message || 'An error occurred. Please try again.', 'error');

        // Reload links to restore original order on error
        await loadLinks();
    }
}

// ============================================
// Theme Customization Functionality
// ============================================

/**
 * Validate hex color format
 * @param {string} color - Color to validate
 * @returns {boolean} True if valid hex color
 */
function isValidHexColor(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Sync color picker with text input
 * @param {string} colorPickerId - ID of color picker input
 * @param {string} textInputId - ID of text input
 */
function syncColorInputs(colorPickerId, textInputId) {
    const colorPicker = document.getElementById(colorPickerId);
    const textInput = document.getElementById(textInputId);

    // Update text input when color picker changes
    colorPicker.addEventListener('input', () => {
        textInput.value = colorPicker.value;
    });

    // Update color picker when text input changes (with validation)
    textInput.addEventListener('input', () => {
        const value = textInput.value.trim();
        if (isValidHexColor(value)) {
            colorPicker.value = value;
        }
    });

    // Sync on blur to handle partial input
    textInput.addEventListener('blur', () => {
        const value = textInput.value.trim();
        if (isValidHexColor(value)) {
            colorPicker.value = value;
        } else {
            // Reset to color picker value if invalid
            textInput.value = colorPicker.value;
        }
    });
}

/**
 * Load current theme settings from server
 */
async function loadTheme() {
    try {
        const response = await fetchWithTimeout('/api/admin/theme');

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Failed to fetch theme settings');
        }

        const theme = await response.json();
        populateThemeForm(theme);
    } catch (error) {
        console.error('Error loading theme:', error);
        showMessage('theme-message', error.message || 'Failed to load theme settings. Please refresh the page.', 'error');
    }
}

/**
 * Populate theme form with current values
 * @param {Object} theme - Theme settings object
 */
function populateThemeForm(theme) {
    // Background color
    if (theme.backgroundColor) {
        document.getElementById('background-color').value = theme.backgroundColor;
        document.getElementById('background-color-text').value = theme.backgroundColor;
    }

    // Background image URL
    if (theme.backgroundImageUrl) {
        document.getElementById('background-image').value = theme.backgroundImageUrl;
    }

    // Text color
    if (theme.textColor) {
        document.getElementById('text-color').value = theme.textColor;
        document.getElementById('text-color-text').value = theme.textColor;
    }

    // Button color
    if (theme.buttonColor) {
        document.getElementById('button-color').value = theme.buttonColor;
        document.getElementById('button-color-text').value = theme.buttonColor;
    }

    // Button text color
    if (theme.buttonTextColor) {
        document.getElementById('button-text-color').value = theme.buttonTextColor;
        document.getElementById('button-text-color-text').value = theme.buttonTextColor;
    }
}

/**
 * Set loading state for theme form submit button
 * @param {boolean} loading - Whether button is in loading state
 */
function setThemeFormLoading(loading) {
    const submitBtn = document.querySelector('#theme-form button[type="submit"]');
    const formInputs = document.querySelectorAll('#theme-form input');
    
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        formInputs.forEach(input => input.disabled = true);
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Theme';
        formInputs.forEach(input => input.disabled = false);
    }
}

/**
 * Handle theme form submission
 */
async function handleThemeFormSubmit(event) {
    event.preventDefault();

    // Get form values
    const backgroundColor = document.getElementById('background-color').value;
    const backgroundImageUrl = document.getElementById('background-image').value.trim();
    const textColor = document.getElementById('text-color').value;
    const buttonColor = document.getElementById('button-color').value;
    const buttonTextColor = document.getElementById('button-text-color').value;

    // Validate background image URL if provided
    if (backgroundImageUrl && !isValidURL(backgroundImageUrl)) {
        showMessage('theme-message', 'Please enter a valid background image URL starting with http:// or https://', 'error');
        return;
    }

    // Validate hex colors
    if (!isValidHexColor(backgroundColor)) {
        showMessage('theme-message', 'Invalid background color format', 'error');
        return;
    }

    if (!isValidHexColor(textColor)) {
        showMessage('theme-message', 'Invalid text color format', 'error');
        return;
    }

    if (!isValidHexColor(buttonColor)) {
        showMessage('theme-message', 'Invalid button color format', 'error');
        return;
    }

    if (!isValidHexColor(buttonTextColor)) {
        showMessage('theme-message', 'Invalid button text color format', 'error');
        return;
    }

    // Prepare theme data
    const themeData = {
        backgroundColor,
        backgroundImageUrl,
        textColor,
        buttonColor,
        buttonTextColor
    };

    setThemeFormLoading(true);

    try {
        const response = await fetchWithTimeout('/api/admin/theme', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(themeData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update theme');
        }

        await response.json();

        // Show success message
        showMessage('theme-message', 'Theme updated successfully!', 'success');

    } catch (error) {
        console.error('Error updating theme:', error);
        showMessage('theme-message', error.message || 'An error occurred. Please try again.', 'error');
    } finally {
        setThemeFormLoading(false);
    }
}

// ============================================
// Profile Management Functionality
// ============================================

/**
 * Update character counter for bio field
 */
function updateBioCharacterCount() {
    const bioTextarea = document.getElementById('profile-bio');
    const charCountEl = document.getElementById('bio-char-count');
    const counterEl = charCountEl.parentElement;
    
    const currentLength = bioTextarea.value.length;
    charCountEl.textContent = currentLength;
    
    // Update styling based on character count
    counterEl.classList.remove('warning', 'danger');
    if (currentLength >= 500) {
        counterEl.classList.add('danger');
    } else if (currentLength >= 450) {
        counterEl.classList.add('warning');
    }
}

/**
 * Load current profile data from server
 */
async function loadProfile() {
    try {
        const response = await fetchWithTimeout('/api/admin/profile');

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Failed to fetch profile data');
        }

        const profile = await response.json();
        populateProfileForm(profile);
    } catch (error) {
        console.error('Error loading profile:', error);
        showMessage('profile-message', error.message || 'Failed to load profile data. Please refresh the page.', 'error');
    }
}

/**
 * Populate profile form with current values
 * @param {Object} profile - Profile data object
 */
function populateProfileForm(profile) {
    // Profile photo URL
    if (profile.photoUrl) {
        document.getElementById('profile-photo').value = profile.photoUrl;
    }

    // Bio
    if (profile.bio) {
        document.getElementById('profile-bio').value = profile.bio;
        updateBioCharacterCount();
    }
}

/**
 * Set loading state for profile form submit button
 * @param {boolean} loading - Whether button is in loading state
 */
function setProfileFormLoading(loading) {
    const submitBtn = document.querySelector('#profile-form button[type="submit"]');
    const formInputs = document.querySelectorAll('#profile-form input, #profile-form textarea');
    
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        formInputs.forEach(input => input.disabled = true);
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Profile';
        formInputs.forEach(input => input.disabled = false);
    }
}

/**
 * Handle profile form submission
 */
async function handleProfileFormSubmit(event) {
    event.preventDefault();

    // Get form values
    const photoUrl = document.getElementById('profile-photo').value.trim();
    const bio = document.getElementById('profile-bio').value.trim();

    // Validate photo URL if provided
    if (photoUrl && !isValidURL(photoUrl)) {
        showMessage('profile-message', 'Please enter a valid photo URL starting with http:// or https://', 'error');
        return;
    }

    // Validate bio length
    if (bio.length > 500) {
        showMessage('profile-message', 'Bio must be 500 characters or less', 'error');
        return;
    }

    // Prepare profile data
    const profileData = {
        photoUrl,
        bio
    };

    setProfileFormLoading(true);

    try {
        const response = await fetchWithTimeout('/api/admin/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update profile');
        }

        await response.json();

        // Show success message
        showMessage('profile-message', 'Profile updated successfully!', 'success');

    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('profile-message', error.message || 'An error occurred. Please try again.', 'error');
    } finally {
        setProfileFormLoading(false);
    }
}

// ============================================
// API Configuration Functionality
// ============================================

let isApiConfigured = false;

/**
 * Load current configuration status from server
 */
async function loadConfig() {
    try {
        const response = await fetchWithTimeout('/api/admin/config');

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            throw new Error('Failed to fetch configuration');
        }

        const config = await response.json();
        isApiConfigured = config.nounProjectConfigured;
        displayConfigStatus(config.nounProjectConfigured);
    } catch (error) {
        console.error('Error loading config:', error);
        showMessage('config-message', error.message || 'Failed to load configuration. Please refresh the page.', 'error');
    }
}

/**
 * Display configuration status
 * @param {boolean} configured - Whether API keys are configured
 */
function displayConfigStatus(configured) {
    const statusEl = document.getElementById('config-status');
    
    if (configured) {
        statusEl.className = 'config-status configured';
        statusEl.innerHTML = '✓ The Noun Project API is configured. Icon search is enabled.';
    } else {
        statusEl.className = 'config-status not-configured';
        statusEl.innerHTML = '<strong>⚠ API Not Configured</strong>Icon search features are currently unavailable. Please enter your API credentials below to enable icon selection for links.';
    }
}

/**
 * Set loading state for config form submit button
 * @param {boolean} loading - Whether button is in loading state
 */
function setConfigFormLoading(loading) {
    const submitBtn = document.querySelector('#config-form button[type="submit"]');
    const formInputs = document.querySelectorAll('#config-form input');
    
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        formInputs.forEach(input => input.disabled = true);
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Configuration';
        formInputs.forEach(input => input.disabled = false);
    }
}

/**
 * Handle configuration form submission
 */
async function handleConfigFormSubmit(event) {
    event.preventDefault();

    // Get form values
    const apiKey = document.getElementById('noun-project-api-key').value.trim();
    const apiSecret = document.getElementById('noun-project-api-secret').value.trim();

    // Validate that both fields are provided
    if (!apiKey || !apiSecret) {
        showMessage('config-message', 'Both API key and secret are required', 'error');
        return;
    }

    // Prepare config data
    const configData = {
        nounProjectApiKey: apiKey,
        nounProjectApiSecret: apiSecret
    };

    setConfigFormLoading(true);

    try {
        const response = await fetchWithTimeout('/api/admin/config', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update configuration');
        }

        const result = await response.json();

        // Update configuration status
        isApiConfigured = result.nounProjectConfigured;
        displayConfigStatus(result.nounProjectConfigured);

        // Show success message
        showMessage('config-message', 'Configuration updated successfully! Icon search is now enabled.', 'success');

        // Clear the form fields for security
        document.getElementById('noun-project-api-key').value = '';
        document.getElementById('noun-project-api-secret').value = '';

    } catch (error) {
        console.error('Error updating config:', error);
        showMessage('config-message', error.message || 'An error occurred. Please try again.', 'error');
    } finally {
        setConfigFormLoading(false);
    }
}

// ============================================
// Logout Functionality
// ============================================

/**
 * Handle logout button click
 */
async function handleLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    const originalText = logoutBtn.textContent;
    
    logoutBtn.disabled = true;
    logoutBtn.textContent = 'Logging out...';
    
    try {
        const response = await fetchWithTimeout('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to logout');
        }

        // Redirect to login page after successful logout
        window.location.href = '/login.html';

    } catch (error) {
        console.error('Error during logout:', error);
        alert(error.message || 'Failed to logout. Please try again.');
        logoutBtn.disabled = false;
        logoutBtn.textContent = originalText;
    }
}

// ============================================
// Authentication Check
// ============================================

/**
 * Check if user is authenticated
 * If not, redirect to login page
 */
async function checkAuthentication() {
    try {
        const response = await fetchWithTimeout('/api/admin/links', {
            method: 'GET',
            credentials: 'include'
        }, 5000);

        if (!response.ok) {
            // Not authenticated, redirect to login page
            window.location.href = '/login.html';
            return false;
        }

        return true;
    } catch (error) {
        console.error('Authentication check failed:', error);
        // On error, redirect to login page
        window.location.href = '/login.html';
        return false;
    }
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const isAuthenticated = await checkAuthentication();

    if (!isAuthenticated) {
        // Will redirect to login, stop initialization
        return;
    }

    // Load configuration status on page load
    loadConfig();

    // Load profile on page load
    loadProfile();

    // Load links on page load
    loadLinks();

    // Load theme on page load
    loadTheme();

    // Set up profile form submission
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', handleProfileFormSubmit);

    // Set up bio character counter
    const bioTextarea = document.getElementById('profile-bio');
    bioTextarea.addEventListener('input', updateBioCharacterCount);

    // Set up link form submission
    const linkForm = document.getElementById('link-form');
    linkForm.addEventListener('submit', handleLinkFormSubmit);

    // Set up cancel button
    const cancelBtn = document.getElementById('cancel-btn');
    cancelBtn.addEventListener('click', handleCancelEdit);

    // Set up visual type selector
    document.querySelectorAll('.visual-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleVisualTypeChange(btn.dataset.type);
        });
    });

    // Set up icon search
    const iconSearchBtn = document.getElementById('icon-search-btn');
    iconSearchBtn.addEventListener('click', searchIcons);

    // Set up real-time icon search with debouncing
    const iconSearchInput = document.getElementById('icon-search');
    iconSearchInput.addEventListener('input', handleIconSearchInput);

    // Allow Enter key to trigger icon search
    iconSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchIcons();
        }
    });

    // Set up theme form submission
    const themeForm = document.getElementById('theme-form');
    themeForm.addEventListener('submit', handleThemeFormSubmit);

    // Set up config form submission
    const configForm = document.getElementById('config-form');
    configForm.addEventListener('submit', handleConfigFormSubmit);

    // Set up logout button
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', handleLogout);

    // Sync color pickers with text inputs
    syncColorInputs('background-color', 'background-color-text');
    syncColorInputs('text-color', 'text-color-text');
    syncColorInputs('button-color', 'button-color-text');
    syncColorInputs('button-text-color', 'button-text-color-text');
});
