import { showNotification } from './notification.js';
import { supabase } from './supabase.js';

document.querySelector('.sign-in-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;

    console.log('Form submitted:', email, password);

    try {
        // Set loading state
        submitButton.textContent = 'Signing in...';
        submitButton.disabled = true;

        // Supabase Authentication Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        console.log('User signed in:', data.user);
        console.log('Session:', data.session);

        showNotification('Sign-in successful!', 'success');

        // Verify session before redirect
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else {
            throw new Error('No active session created');
        }

    } catch (error) {
        console.error('Sign-in error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
});