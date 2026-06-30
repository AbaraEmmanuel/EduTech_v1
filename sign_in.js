// sign_in.js
import { showNotification } from './notification.js';

// Set your API base URL (change to production when ready)
const BASE_URL = 'http://localhost:8080';
// const BASE_URL = 'https://jaromind-production-3060.up.railway.app';

document.querySelector('.sign-in-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();

    // Frontend validation
    if (!email) {
        showNotification('Please enter your email address', 'error');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    if (!password) {
        showNotification('Please enter your password', 'error');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('Login response:', data);

        if (!response.ok) {
            showNotification(data.error || data.message || 'Login failed', 'error');
            return;
        }

        // Save token and user data
        if (data.token) localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

        showNotification('Login successful! Loading…', 'success');

        // Check enrollments and redirect accordingly
        await checkEnrollmentsAndRedirect(data.token);

    } catch (error) {
        console.error('Login error:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
});

// Core function: fetch enrollments and redirect
async function checkEnrollmentsAndRedirect(token) {
    try {
        console.log('🔍 Checking user enrollments…');

        const response = await fetch(`${BASE_URL}/enrollments`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('⚠️ Could not fetch enrollments, redirecting to courses');
            setTimeout(() => window.location.href = 'courses.html', 1500);
            return;
        }

        const data = await response.json();
        const enrollments = data.enrollments || [];
        console.log(`📊 User has ${enrollments.length} enrollment(s)`);

        if (enrollments.length > 0) {
            // User is enrolled → go to dashboard
            showNotification('Welcome back! Loading your dashboard…', 'success');
            setTimeout(() => window.location.href = 'studendashboard.html', 1500);
        } else {
            // No enrollments → go to course catalog
            showNotification('Welcome! Browse our courses to get started.', 'success');
            setTimeout(() => window.location.href = 'courses.html', 1500);
        }

    } catch (error) {
        console.error('❌ Enrollment check error:', error);
        // Fallback: redirect to courses on error
        setTimeout(() => window.location.href = 'courses.html', 1500);
    }
}