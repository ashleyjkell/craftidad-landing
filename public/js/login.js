// Login page functionality
(function() {
    'use strict';

    // DOM elements
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');
    const buttonText = loginButton.querySelector('.button-text');
    const buttonLoader = loginButton.querySelector('.button-loader');

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

    // Check if already authenticated on page load
    checkAuthentication();

    // Form submission handler
    loginForm.addEventListener('submit', handleLogin);

    /**
     * Check if user is already authenticated
     * If yes, redirect to admin panel
     */
    async function checkAuthentication() {
        try {
            const response = await fetchWithTimeout('/api/admin/links', {
                method: 'GET',
                credentials: 'include'
            }, 5000);

            if (response.ok) {
                // User is already authenticated, redirect to admin panel
                window.location.href = '/admin.html';
            }
        } catch (error) {
            // Not authenticated or error, stay on login page
            console.log('Not authenticated');
        }
    }

    /**
     * Handle login form submission
     * @param {Event} event - Form submit event
     */
    async function handleLogin(event) {
        event.preventDefault();

        // Clear previous error
        hideError();

        // Get form values
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Basic validation
        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }

        // Disable form during submission
        setLoading(true);

        try {
            const response = await fetchWithTimeout('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Successful login - redirect to admin panel
                window.location.href = '/admin.html';
            } else {
                // Login failed - show error message
                showError(data.error || 'Invalid username or password');
                setLoading(false);
            }
        } catch (error) {
            console.error('Login error:', error);
            showError(error.message || 'An error occurred. Please try again.');
            setLoading(false);
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }

    /**
     * Hide error message
     */
    function hideError() {
        errorMessage.textContent = '';
        errorMessage.classList.remove('show');
    }

    /**
     * Set loading state for form
     * @param {boolean} loading - Whether form is in loading state
     */
    function setLoading(loading) {
        loginButton.disabled = loading;
        
        if (loading) {
            buttonText.style.display = 'none';
            buttonLoader.style.display = 'inline-block';
            usernameInput.disabled = true;
            passwordInput.disabled = true;
        } else {
            buttonText.style.display = 'inline';
            buttonLoader.style.display = 'none';
            usernameInput.disabled = false;
            passwordInput.disabled = false;
            // Focus password field for retry
            passwordInput.focus();
            passwordInput.select();
        }
    }
})();
