import { showNotification } from './notification.js';

// Event listener for form submission
document.querySelector('.sign-in-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload

    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();

    try {
        const response = await fetch("https://jaromind-production-5e3b.up.railway.app/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        // console.log("Backend response:", data);

        if (!response.ok) {
            showNotification(data.message || "Login failed", "error");
            return;
        }

        console.log('User signed in:', data.user);
        console.log('Session:', data.session);

        showNotification('Sign-in successful!', 'success');


    } catch (error) {
        console.error('Sign-in error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
});