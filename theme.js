// theme.js — Global Dark/Light Mode Handler

// Inject CSS rules for light/dark mode directly from JS
(function injectThemeStyles() {
    const style = document.createElement("style");
    style.textContent = `
        /* ========= LIGHT MODE ========= */
        body.light-mode {
            background: #f6efe8;
            color: #0f172a;
        }

        body.light-mode .content,
        body.light-mode .sidebar,
        body.light-mode .calendar-panel,
        body.light-mode .card {
            background: #ffffff;
            color: #0f172a;
        }

        body.light-mode .proj .bar {
            background: rgba(255,255,255,0.25);
        }

        /* ========= DARK MODE ========= */
        body.dark-mode {
            background: #0f0f14;
            color: #e4e4e7;
        }

        body.dark-mode .content,
        body.dark-mode .sidebar,
        body.dark-mode .calendar-panel,
        body.dark-mode .card {
            background: #1a1a20 !important;
            color: #e4e4e7 !important;
            border-color: rgba(255,255,255,0.1) !important;
        }

        body.dark-mode .proj {
            color: #fff;
            box-shadow: 0 6px 18px rgba(0,0,0,0.4);
        }

        body.dark-mode nav li:hover {
            background: rgba(255,255,255,0.07);
        }

        body.dark-mode .muted,
        body.dark-mode .small {
            color: #9ca3af !important;
        }

        /* Mode toggle button */
        #modeToggle {
            background: transparent;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 4px;
        }
    `;
    document.head.appendChild(style);
})();


// ============ THEME TOGGLE LOGIC ============
export function initializeThemeToggle(buttonId = "modeToggle") {
    const modeToggle = document.getElementById(buttonId);
    const body = document.body;

    if (!modeToggle) return;

    // Load saved mode
    const savedMode = localStorage.getItem("theme");
    if (savedMode) {
        body.className = savedMode;
        modeToggle.textContent = savedMode === "dark-mode" ? "🌙" : "🌞";
    } else {
        body.classList.add("light-mode");
    }

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