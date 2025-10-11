import { showNotification } from './notification.js';  // Import from notification.js
import { auth } from './firebase.js';  // Import auth from firebase.js
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Event listener for form submission
document.querySelector('.sign-in-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload

    const email = e.target.email.value;
    const password = e.target.password.value;

    console.log('Form submitted:', email, password); // Debug: Check form values

    try {
        // Firebase Authentication Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('User signed in:', user);  // Debug: Check user info

        // Show notification on successful sign-in
        showNotification('Sign-in successful!', 'success');

        // Delay the redirect to ensure the notification shows first
        setTimeout(() => {
            window.location.href = 'dashboard.html';  // Redirect to dashboard after successful sign-in
        }, 2000); // 2-second delay to show the notification

    } catch (error) {
        console.error('Sign-in error:', error);  // Debug: Log error message
        // Handle errors and show notification
        showNotification(`Error: ${error.message}`, 'error');
    }
});
