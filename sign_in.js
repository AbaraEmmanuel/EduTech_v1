import { showNotification } from './notification.js';

document.querySelector('.sign-in-form').addEventListener('submit', async (e) => {
    e.preventDefault();

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

        // Save JWT token if returned
        if (data.token) {
            localStorage.setItem("token", data.token);
        }

        showNotification("Sign-in successful!", "success");

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 2000);

    } catch (error) {
        console.error("Sign-in error:", error);
        showNotification(`Error: ${error.message}`, "error");
    }
});
