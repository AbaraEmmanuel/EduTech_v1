import { showNotification } from './notification.js';

document.querySelector('.sign-up-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = e.target['first-name'].value.trim();
    const lastName = e.target['last-name'].value.trim();
    const email = e.target.email.value.trim();
    const phoneNumber = e.target['phone-number'].value.trim();
    const password = e.target.password.value.trim();
    const confirmPassword = e.target['confirm-password'].value.trim();

    // --- Frontend validation ---
    if (!firstName || !lastName) {
        showNotification('Please enter both first and last name', 'error');
        return;
    }

    if (!email) {
        showNotification('Please enter an email address', 'error');
        return;
    }

    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    if (!phoneNumber) {
        showNotification('Please enter a phone number', 'error');
        return;
    }

    // Optional: simple phone validation (digits only, 7-15 characters)
    // const phoneRegex = /^\d{7,15}$/;
    // if (!phoneRegex.test(phoneNumber)) {
    //     showNotification('Please enter a valid phone number (digits only)', 'error');
    //     return;
    // }

    if (!password || !confirmPassword) {
        showNotification('Please enter and confirm your password', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    const fullName = `${firstName} ${lastName}`.trim();

    try {
        const response = await fetch("https://jaromind-production-3060.up.railway.app/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                Name: fullName,
                Email: email,
                Phone: phoneNumber,
                Password: password,
                Level: "spark" 
            })
        });

        const data = await response.json();
        // console.log("Backend response:", data);

        if (!response.ok) {
            showNotification(data.message || "Registration failed", "error");
            return;
        }

        showNotification("Sign-up successful! Redirecting...", "success");

        setTimeout(() => {
            window.location.href = "sign_in.html";
        }, 2000);

    } catch (error) {
        console.error("Sign-up error:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
});
