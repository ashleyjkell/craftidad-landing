// Landing page JavaScript
(function() {
    'use strict';

    const linksContainer = document.getElementById('links-container');
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
            const hasImage = link.imageUrl && link.imageUrl.trim() !== '';
            const imageClass = hasImage ? ' has-image' : '';
            const imageHtml = hasImage 
                ? `<img src="${escapeHtml(link.imageUrl)}" alt="" class="link-image" onerror="this.style.display='none'">` 
                : '';

            return `
                <a href="${escapeHtml(link.url)}" 
                   class="link-item${imageClass}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   role="listitem">
                    ${imageHtml}
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
        
        // Load theme and links in parallel
        await Promise.all([
            loadTheme(),
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
