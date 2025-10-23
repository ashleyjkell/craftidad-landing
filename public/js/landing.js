// Landing page JavaScript
(function() {
    'use strict';

    const linksContainer = document.getElementById('links-container');
    const profileContainer = document.getElementById('profile-container');
    const backgroundOverlay = document.querySelector('.background-overlay');

    /**
     * Show loading state
     */
    function showLoading() {
        linksContainer.innerHTML = '<div class="loading">Loading links...</div>';
    }

    /**
     * Show error state
     * @param {string} message - Error message to display
     */
    function showError(message) {
        linksContainer.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
    }

    /**
     * Show empty state
     */
    function showEmptyState() {
        linksContainer.innerHTML = '<div class="empty-state">No links available at the moment.</div>';
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
     * Fetch and display profile info
     */
    async function loadProfile() {
        try {
            const response = await fetch('/api/profile');

            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            const profile = await response.json();
            displayProfile(profile);
        } catch (error) {
            console.error('Error loading profile:', error);
            // Profile is optional, so we don't show an error to the user
            // Just hide the profile container
            profileContainer.style.display = 'none';
        }
    }

    /**
     * Fetch and display links
     */
    async function loadLinks() {
        try {
            const response = await fetch('/api/links');

            if (!response.ok) {
                throw new Error('Failed to load links');
            }

            const links = await response.json();
            displayLinks(links);
        } catch (error) {
            console.error('Error loading links:', error);
            showError('Unable to load links. Please try again later.');
        }
    }

    /**
     * Fetch and apply theme settings
     */
    async function loadTheme() {
        try {
            const response = await fetch('/api/theme');

            if (!response.ok) {
                throw new Error('Failed to load theme');
            }

            const theme = await response.json();
            applyTheme(theme);
        } catch (error) {
            console.error('Error loading theme:', error);
            // Continue with default theme if theme loading fails
        }
    }

    /**
     * Display profile info on the page
     * @param {Object} profile - Profile object with photoUrl and bio
     */
    function displayProfile(profile) {
        // Check if profile has any data
        const hasPhoto = profile.photoUrl && profile.photoUrl.trim() !== '';
        const hasBio = profile.bio && profile.bio.trim() !== '';

        if (!hasPhoto && !hasBio) {
            // Hide profile container if no data
            profileContainer.style.display = 'none';
            return;
        }

        // Build profile HTML
        let profileHtml = '';

        if (hasPhoto) {
            profileHtml += `<img src="${escapeHtml(profile.photoUrl)}" alt="Profile photo" class="profile-photo" onerror="this.style.display='none'">`;
        }

        if (hasBio) {
            profileHtml += `<p class="profile-bio">${escapeHtml(profile.bio)}</p>`;
        }

        profileContainer.innerHTML = profileHtml;
    }

    /**
     * Display links on the page
     * @param {Array} links - Array of link objects
     */
    function displayLinks(links) {
        // Filter only active links and sort by order
        const activeLinks = links
            .filter(link => link.active)
            .sort((a, b) => a.order - b.order);

        if (activeLinks.length === 0) {
            showEmptyState();
            return;
        }

        // Create link elements
        linksContainer.innerHTML = activeLinks.map(link => {
            // Determine visual type (default to 'none' if not specified)
            const visualType = link.visualType || 'none';
            
            let visualHtml = '';
            let visualClass = '';

            // Handle different visual types
            if (visualType === 'image' && link.imageUrl && link.imageUrl.trim() !== '') {
                visualHtml = `<img src="${escapeHtml(link.imageUrl)}" alt="" class="link-image" onerror="this.style.display='none'">`;
                visualClass = ' has-image';
            } else if (visualType === 'icon' && link.iconUrl && link.iconUrl.trim() !== '') {
                visualHtml = `<img src="${escapeHtml(link.iconUrl)}" alt="" class="link-icon" onerror="this.style.display='none'">`;
                visualClass = ' has-icon';
            }

            return `
                <a href="${escapeHtml(link.url)}" 
                   class="link-item${visualClass}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   role="listitem">
                    ${visualHtml}
                    <span class="link-label">${escapeHtml(link.label)}</span>
                </a>
            `;
        }).join('');
    }

    /**
     * Apply theme settings to the page
     * @param {Object} theme - Theme settings object
     */
    function applyTheme(theme) {
        // Apply background color
        if (theme.backgroundColor) {
            document.body.style.backgroundColor = theme.backgroundColor;
        }

        // Apply background image
        if (theme.backgroundImageUrl && theme.backgroundImageUrl.trim() !== '') {
            backgroundOverlay.style.backgroundImage = `url('${theme.backgroundImageUrl}')`;
        }

        // Apply text color
        if (theme.textColor) {
            document.body.style.color = theme.textColor;
        }

        // Apply button colors
        if (theme.buttonColor || theme.buttonTextColor) {
            const style = document.createElement('style');
            let css = '';

            if (theme.buttonColor) {
                css += `.link-item { background-color: ${theme.buttonColor}; }`;
            }

            if (theme.buttonTextColor) {
                css += `.link-item, .link-label { color: ${theme.buttonTextColor}; }`;
            }

            style.textContent = css;
            document.head.appendChild(style);
        }
    }

    /**
     * Initialize the landing page
     */
    async function init() {
        showLoading();
        
        // Load theme, profile, and links in parallel
        await Promise.all([
            loadTheme(),
            loadProfile(),
            loadLinks()
        ]);
    }

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
