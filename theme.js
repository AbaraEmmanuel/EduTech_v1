// theme.js — Global Dark/Light Mode Handler

export function initializeThemeToggle(buttonId = "modeToggle") {
    const modeToggle = document.getElementById(buttonId);
    const body = document.body;

    if (!modeToggle) return; // If page doesn't have a button, silently skip

    // Load saved mode
    const savedMode = localStorage.getItem("theme");
    if (savedMode) {
        body.className = savedMode;
        modeToggle.textContent = savedMode === "dark-mode" ? "🌙" : "🌞";
    }

    // Click handler
    modeToggle.addEventListener("click", () => {
        if (body.classList.contains("light-mode")) {
            body.classList.replace("light-mode", "dark-mode");
            modeToggle.textContent = "🌙";
            localStorage.setItem("theme", "dark-mode");
        } else {
            body.classList.replace("dark-mode", "light-mode");
            modeToggle.textContent = "🌞";
            localStorage.setItem("theme", "light-mode");
        }
    });
}
// ..