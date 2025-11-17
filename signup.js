import { showNotification } from './notification.js';
import { supabase } from './supabase.js';  // Import the supabase client

document.querySelector('.sign-up-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload

    showNotification('Processing...', 'loading');

    const firstName = e.target['first-name'].value;
    const lastName = e.target['last-name'].value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target['confirm-password'].value;
    const phoneNumber = e.target['phone-number'].value;

    // Ensure passwords match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    try {
        // Supabase Authentication Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: phoneNumber
                }
            }
        });

        if (authError) {
            throw authError;
        }

        const user = authData.user;

        // Save additional user data to Supabase 'users' table (if you have one)
        // Note: You might want to create a 'profiles' or 'users' table in Supabase
        if (user) {
            const { error: dbError } = await supabase
                .from('users')  // Change this to your table name
                .insert({
                    id: user.id,  // Use the same ID as auth user
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone_number: phoneNumber,
                    created_at: new Date().toISOString(),
                });

            if (dbError) {
                console.error('Error saving user data:', dbError);
                // Don't throw here - the user was created in auth, just the profile failed
            }
        }

        // Show notification on successful signup
        showNotification('Sign-up successful! Redirecting...', 'success');

        console.log('Redirecting to: dashboard.html');

        // Redirect after 2 seconds to allow time for the success notification
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (error) {
        console.error('Sign-up error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
});