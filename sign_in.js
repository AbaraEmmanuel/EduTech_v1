import { showNotification } from './notification.js';

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
        const response = await fetch("https://jaromind-production-3060.up.railway.app/login", {
        //const response = await fetch("http://localhost:8080/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();
        console.log("Login response:", data);

        if (!response.ok) {
            showNotification(data.error || data.message || "Login failed", "error");
            return;
        }

        // Save token and user data
        if (data.token) {
            localStorage.setItem('token', data.token);
        }

        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        showNotification("Login successful! Loading...", "success");

        // ✅ NEW: Check if user has enrollments before redirecting
        await checkEnrollmentsAndRedirect(data.token);

    } catch (error) {
        console.error("Login error:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
});

// ✅ NEW FUNCTION: Check enrollments and redirect accordingly
async function checkEnrollmentsAndRedirect(token) {
    try {
        console.log('🔍 Checking user enrollments...');
        
        // Fetch user's enrollments
        const enrollmentResponse = await fetch("https://jaromind-production-3060.up.railway.app/enrollments", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!enrollmentResponse.ok) {
            console.warn('⚠️ Could not fetch enrollments, redirecting to courses');
            // If can't fetch enrollments, default to courses page
            setTimeout(() => {
                window.location.href = "courses.html";
            }, 1500);
            return;
        }

        const enrollmentData = await enrollmentResponse.json();
        const enrollments = enrollmentData.enrollments || [];
        
        console.log('📊 User has', enrollments.length, 'enrollment(s)');

        // Check if user has any active enrollments
        const hasEnrollments = enrollments.length > 0;

        if (hasEnrollments) {
            console.log('✅ User has enrollments → Redirecting to dashboard');
            showNotification("Welcome back! Loading your dashboard...", "success");
            setTimeout(() => {
                window.location.href = "studendashboard.html";
            }, 1500);
        } else {
            console.log('📚 User has no enrollments → Redirecting to courses');
            showNotification("Welcome! Browse our courses to get started.", "success");
            setTimeout(() => {
                window.location.href = "courses.html";
            }, 1500);
        }

    } catch (error) {
        console.error('❌ Error checking enrollments:', error);
        // On error, default to courses page (safer for new users)
        setTimeout(() => {
            window.location.href = "courses.html";
        }, 1500);
    }
}