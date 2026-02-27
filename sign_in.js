import { showNotification } from './notification.js';

const form = document.querySelector('.sign-in-form');
const submitButton = form.querySelector('button[type="submit"]');
const originalText = submitButton.textContent;

form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload

    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();

    // Disable button while logging in
    submitButton.textContent = 'Signing in...';
    submitButton.disabled = true;

    try {
        const response = await fetch("https://jaromind-production-3060.up.railway.app/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showNotification(data.error || "Login failed", "error");
            return;
        }

        // --- KEY FIX: Store BOTH token and user data ---
        if (data.token) {
            localStorage.setItem('token', data.token);
            
            // Also store user data if available
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            } else if (data.id || data._id || data.email || data.name) {
                // Create user object from response data
                const userData = {
                    id: data.id || data._id,
                    _id: data._id || data.id,
                    name: data.name || data.username || email.split('@')[0],
                    email: data.email || email,
                    username: data.username || email.split('@')[0],
                    token: data.token
                };
                localStorage.setItem('user', JSON.stringify(userData));
            } else {
                // Create minimal user object
                const userData = {
                    id: 'user_' + Date.now(),
                    name: email.split('@')[0],
                    email: email,
                    token: data.token
                };
                localStorage.setItem('user', JSON.stringify(userData));
            }
        } else {
            showNotification("Login succeeded but no token received", "warning");
            return;
        }

        showNotification('Sign-in successful!', 'success');

        setTimeout(() => {
            window.location.href = "courses.html";
        }, 1000);

    } catch (error) {
        console.error('Sign-in error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
});