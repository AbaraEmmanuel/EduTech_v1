import { showNotification } from './notification.js';  // Import from notification.js
import { auth } from './firebasetutors.js';  // Import auth from firebase.js
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Event listener for form submission
document.querySelector('.sign-in-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload

    const email = e.target.email.value;
    const password = e.target.password.value;

    console.log('Form submitted:', email, password); // Debug: Check form values

    if (!email || !password) {
        alert("Please fill in both fields.");
        return;
    }

    showNotification('...', 'Loading');

    try {
        // Firebase Authentication Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('User signed in:', user);  // Debug: Check user info

        // Check if the user's email is verified
        if (!user.emailVerified) {
            showNotification('Please verify your email before signing in.', 'error');
            // Optionally, sign the user out immediately to prevent session creation
            auth.signOut();
            return; // Stop the login process here
        }

        // Show notification on successful sign-in
        showNotification('Sign-in successful!', 'success');

        // Delay the redirect to ensure the notification shows first
        setTimeout(() => {
            window.location.href = 'tutor_dashboard.html';  // Redirect to dashboard after successful sign-in
        }, 2000); // 2-second delay to show the notification

    } catch (error) {
        console.error('Sign-in error:', error);  // Debug: Log error message
        showNotification('Something went wrong. Please try again later.', 'error');
    }
});
