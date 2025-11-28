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
        const response = await fetch("https://jaromind-production-5e3b.up.railway.app/login", {
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

        // --- KEY FIX: store the JWT in localStorage ---
        if (data.token) {
            localStorage.setItem('token', data.token);
        } else {
            showNotification("Login succeeded but no token received", "warning");
            return;
        }

        showNotification('Sign-in successful!', 'success');

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);

    } catch (error) {
        console.error('Sign-in error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
});
