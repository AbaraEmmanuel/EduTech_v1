// ================================================
// DASHBOARD - API INTEGRATION
// ================================================

// API Configuration
//const API_BASE_URL = 'http://localhost:8080';
const API_BASE_URL = 'https://jaromind-production-3060.up.railway.app';

console.log('🚀 Dashboard initialized');
console.log('🔗 API URL:', API_BASE_URL);

// Global State
let user = null;
let enrollments = [];
let userTutor = null;
let dashboardStats = {
    coursesInProgress: 0,
    lessonsCompleted: 0,
    studyStreak: 0
};

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 DOM loaded, starting dashboard...');
    
    // Check authentication
    if (!checkAuth()) {
        console.log('❌ Not authenticated, redirecting to login...');
        window.location.href = 'sign_in.html';
        return;
    }
    
    // Load all data
    await loadDashboardData();
});

// ================================================
// AUTHENTICATION
// ================================================

function checkAuth() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
        return false;
    }
    
    try {
        user = JSON.parse(userData);
        console.log('✅ User authenticated:', user.name);
        console.log('📧 User email:', user.email);
        console.log('🔍 Full user object:', user);
        return true;
    } catch (error) {
        console.error('❌ Failed to parse user data:', error);
        return false;
    }
}

// ================================================
// DATA LOADING
// ================================================

async function loadDashboardData() {
    try {
        showLoadingState();
        
        // Load enrollments (main data)
        await loadEnrollments();
        
        // Load tutor info (if available)
        await loadTutorInfo();
        
        // Calculate stats
        calculateStats();
        
        // Render everything
        renderDashboard();
        
        hideLoadingState();
        
        console.log('✅ Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('❌ Failed to load dashboard data:', error);
        showErrorState(error.message);
    }
}

async function loadEnrollments() {
    try {
        const token = localStorage.getItem('token');
        
        console.log('📚 Loading enrollments from API...');
        
        const response = await fetch(`${API_BASE_URL}/enrollments`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load enrollments: ${response.status}`);
        }
        
        const data = await response.json();
        enrollments = data.enrollments || [];
        
        console.log(`✅ Loaded ${enrollments.length} enrollments`);
        
        // Log first enrollment for debugging
        if (enrollments.length > 0) {
            console.log('📖 Sample enrollment:', enrollments[0]);
        }
        
    } catch (error) {
        console.error('❌ Error loading enrollments:', error);
        throw error;
    }
}

async function loadTutorInfo() {
    try {
        const token = localStorage.getItem('token');
        
        // Check if user object has tutor info
        if (user && user.tutorId) {
            console.log('👨‍🏫 User has tutor assigned:', user.tutorId);
            
            // Optional: Fetch full tutor details from API
            // Uncomment when tutor endpoint is ready
            /*
            const response = await fetch(`${API_BASE_URL}/tutors/${user.tutorId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                userTutor = data.tutor || data;
                console.log('✅ Tutor details loaded:', userTutor.name);
            }
            */
            
            // For now, use basic info from user object
            userTutor = {
                id: user.tutorId,
                name: user.tutorName || 'Your Tutor'
            };
        } else {
            console.log('👨‍🏫 No tutor assigned');
        }
        
    } catch (error) {
        console.error('❌ Error loading tutor info:', error);
        // Not critical, continue without tutor info
    }
}

// ================================================
// STATS CALCULATION
// ================================================

function calculateStats() {
    if (!enrollments || enrollments.length === 0) {
        dashboardStats = {
            coursesInProgress: 0,
            lessonsCompleted: 0,
            studyStreak: 0
        };
        return;
    }
    
    // Count active courses
    dashboardStats.coursesInProgress = enrollments.filter(e => 
        e.enrollment && e.enrollment.status === 'active'
    ).length;
    
    // Sum completed lessons
    dashboardStats.lessonsCompleted = enrollments.reduce((sum, e) => {
        const lessons = e.enrollment?.completedLessons || [];
        return sum + lessons.length;
    }, 0);
    
    // Calculate study streak (days since last access)
    dashboardStats.studyStreak = calculateStudyStreak();
    
    console.log('📊 Dashboard stats:', dashboardStats);
}

function calculateStudyStreak() {
    if (!enrollments || enrollments.length === 0) return 0;
    
    // Find most recent access
    let mostRecentAccess = null;
    
    enrollments.forEach(e => {
        if (e.enrollment?.lastAccessedAt) {
            const accessDate = new Date(e.enrollment.lastAccessedAt);
            if (!mostRecentAccess || accessDate > mostRecentAccess) {
                mostRecentAccess = accessDate;
            }
        }
    });
    
    if (!mostRecentAccess) return 0;
    
    // Calculate days since last access
    const now = new Date();
    const diffTime = Math.abs(now - mostRecentAccess);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If accessed today or yesterday, show streak
    // For marketing purposes, show at least 1 day if accessed recently
    return diffDays <= 2 ? Math.max(1, diffDays) : 0;
}

// ================================================
// RENDERING
// ================================================

function renderDashboard() {
    renderWelcomeMessage();
    renderProgressCards();
    renderCourseGrid();
    renderTopbarAvatar();
    renderTutorPanel(); // Marketing: Always show
}

function renderWelcomeMessage() {
    const welcomeText = document.querySelector('.welcome-text h1');
    if (!welcomeText) return;
    
    if (!user) {
        console.warn('⚠️ No user data available for welcome message');
        return;
    }
    
    // Try to get name from different possible fields
    let userName = user.name || user.fullName || user.username || 'Student';
    
    // Check if name is actually an email username (no spaces and matches email)
    if (!userName.includes(' ') && user.email && userName === user.email.split('@')[0]) {
        console.warn('⚠️ Name field contains email username, using capitalized version');
        // Remove numbers and capitalize: comfortabara265 -> Comfortabara
        userName = userName.replace(/[0-9]/g, '');
        userName = userName.charAt(0).toUpperCase() + userName.slice(1);
    }
    
    console.log('👋 Rendering welcome for:', userName);
    
    // Split name into parts
    const nameParts = userName.split(' ');
    const firstName = nameParts[0];
    
    // Get last name initial if available
    let displayName = firstName;
    if (nameParts.length > 1) {
        const lastNameInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
        displayName = `${firstName} ${lastNameInitial}.`;
    }
    
    welcomeText.textContent = `Welcome back, ${displayName} 👋`;
}

function renderTopbarAvatar() {
    const avatar = document.querySelector('.topbar-avatar');
    if (avatar && user && user.name) {
        const initials = getInitials(user.name);
        avatar.textContent = initials;
        console.log('👤 Avatar updated:', initials, 'from name:', user.name);
    } else if (avatar) {
        console.warn('⚠️ User name not available, avatar not updated');
        console.log('User object:', user);
    }
}

function renderProgressCards() {
    // Card 1: Courses in Progress
    const coursesCard = document.querySelector('.pcard:nth-child(1) h3');
    if (coursesCard) {
        coursesCard.textContent = dashboardStats.coursesInProgress;
    }
    
    // Card 2: Lessons Completed
    const lessonsCard = document.querySelector('.pcard:nth-child(2) h3');
    if (lessonsCard) {
        lessonsCard.textContent = dashboardStats.lessonsCompleted;
    }
    
    // Card 3: Study Streak
    const streakCard = document.querySelector('.pcard:nth-child(3) h3');
    if (streakCard) {
        streakCard.textContent = `${dashboardStats.studyStreak} Days`;
    }
}

function renderCourseGrid() {
    const grid = document.getElementById('courseGrid');
    if (!grid) return;
    
    if (!enrollments || enrollments.length === 0) {
        grid.innerHTML = renderEmptyState();
        return;
    }
    
    // Transform enrollments to course cards
    const courseCards = enrollments.map(e => {
        const enrollment = e.enrollment;
        const course = e.course;
        
        return {
            id: course.id || course._id,
            title: course.title,
            subtitle: course.description || 'Continue learning',
            progress: enrollment.progress || 0,
            imageUrl: course.imageUrl,
            color: getCourseColor(course.category),
            emoji: getCourseEmoji(course.category || course.subject),
            started: enrollment.progress > 0,
            lessonsCompleted: enrollment.completedLessons?.length || 0,
            totalLessons: course.lessonCount || 0
        };
    });
    
    grid.innerHTML = courseCards.map(renderCourseCard).join('');
}

function renderCourseCard(course) {
    // Use image if available, otherwise use emoji with color
    const courseVisual = course.imageUrl 
        ? `<img src="${course.imageUrl}" alt="${course.title}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
           <div class="course-img-placeholder" style="background:${course.color};display:none;">${course.emoji}</div>`
        : `<div class="course-img-placeholder" style="background:${course.color}">${course.emoji}</div>`;
    
    return `
        <a class="course-card" href="course.html?id=${course.id}">
            ${courseVisual}
            <div class="course-body">
                <div class="course-title">${course.title}</div>
                <div class="course-sub">${truncate(course.subtitle, 60)}</div>
                <div class="progress-bar-wrap">
                    <div class="progress-fill" style="width:${course.progress}%"></div>
                </div>
                <div class="progress-label">${course.progress}% • ${course.lessonsCompleted}/${course.totalLessons} lessons</div>
                <button class="${course.started ? 'btn-continue' : 'btn-outline'}">
                    ${course.started ? 'Continue' : 'Start Course ›'}
                </button>
            </div>
        </a>
    `;
}

function renderTutorPanel() {
    const tutorPanel = document.querySelector('.tutor-panel');
    if (!tutorPanel) return;
    
    // Marketing approach: Always show, but different content based on tutor status
    if (userTutor) {
        // User has a tutor assigned - show contact info
        tutorPanel.innerHTML = `
            <div class="tutor-text">
                <h3>Your Tutor</h3>
                <p>${userTutor.name}</p>
                <button class="btn-secondary" style="margin-top:12px" onclick="location.href='tutor.html?id=${userTutor.id}'">
                    Contact Tutor
                </button>
            </div>
            <div class="tutor-img">👨‍🏫</div>
        `;
    } else {
        // No tutor assigned - show CTA (marketing!)
        tutorPanel.innerHTML = `
            <div class="tutor-text">
                <h3>Need a Tutor?</h3>
                <p>Get personalized help from expert tutors.</p>
                <button class="btn-secondary" style="margin-top:12px" onclick="location.href='tutor.html'">
                    Find a Tutor
                </button>
            </div>
            <div class="tutor-img">👩‍💻</div>
        `;
    }
}

function renderEmptyState() {
    return `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
            <h3 style="margin-bottom: 0.5rem; color: #1f2937;">No Courses Yet</h3>
            <p style="color: #6b7280; margin-bottom: 1.5rem;">
                You haven't enrolled in any courses yet. Browse our catalog to get started!
            </p>
            <a href="courses.html" class="btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                Browse Courses
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </a>
        </div>
    `;
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function getInitials(name) {
    // Handle missing or empty name
    if (!name || name.trim() === '') {
        console.warn('⚠️ No name provided to getInitials');
        // Fallback to email if available
        if (user && user.email) {
            const emailName = user.email.split('@')[0];
            return emailName.substring(0, 2).toUpperCase();
        }
        return 'U';
    }
    
    // Check if name is actually an email username (contains no spaces)
    // Example: "comfortabara265" instead of "Comfort Abara"
    if (!name.includes(' ') && user && user.email && name === user.email.split('@')[0]) {
        console.warn('⚠️ Name field contains email username, extracting initials from email');
        // Try to extract real name from email (e.g., comfortabara265 -> CA)
        const emailUsername = user.email.split('@')[0];
        // Remove numbers
        const cleanName = emailUsername.replace(/[0-9]/g, '');
        
        // Try to split by common patterns (camelCase, underscore, etc.)
        if (cleanName.includes('_')) {
            const parts = cleanName.split('_');
            return (parts[0][0] + (parts[1] ? parts[1][0] : parts[0][1])).toUpperCase();
        }
        
        // For names like "comfortabara" -> "CA" (first and ~middle letter)
        // This is best-effort extraction
        return cleanName.substring(0, 2).toUpperCase();
    }
    
    // Normal name processing
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function getCourseColor(category) {
    const colors = {
        'Mathematics': '#1e3a5f',
        'Science': '#1a3a2a',
        'Physics': '#2a1a3a',
        'Chemistry': '#3a1a1a',
        'Biology': '#1a3a1a',
        'English': '#3a2a1a',
        'History': '#2a1a3a',
        'Literature': '#1a2a3a'
    };
    
    return colors[category] || '#1e3a5f';
}

function getCourseEmoji(subject) {
    const emojis = {
        'Mathematics': '📐',
        'Math': '📐',
        'Science': '🔬',
        'Physics': '⚛️',
        'Chemistry': '🧪',
        'Biology': '🧬',
        'English': '📖',
        'Literature': '📚',
        'History': '🏛️',
        'Geography': '🌍',
        'Computer Science': '💻',
        'Art': '🎨',
        'Music': '🎵'
    };
    
    return emojis[subject] || '📚';
}

function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ================================================
// UI STATES
// ================================================

function showLoadingState() {
    const grid = document.getElementById('courseGrid');
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
                <p style="color: #6b7280;">Loading your courses...</p>
            </div>
        `;
    }
}

function hideLoadingState() {
    // Loading state is replaced by actual content
}

function showErrorState(message) {
    const grid = document.getElementById('courseGrid');
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                <h3 style="margin-bottom: 0.5rem; color: #1f2937;">Something went wrong</h3>
                <p style="color: #6b7280; margin-bottom: 1.5rem;">${message}</p>
                <button class="btn-primary" onclick="location.reload()">
                    Try Again
                </button>
            </div>
        `;
    }
}

// ================================================
// SIDEBAR CONTROLS
// ================================================

function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('show');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

// Make functions globally accessible
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;

// ================================================
// DEBUG TOOLS
// ================================================

window.dashboardDebug = {
    getUser: () => user,
    getEnrollments: () => enrollments,
    getStats: () => dashboardStats,
    getTutor: () => userTutor,
    reloadData: loadDashboardData,
    checkAuth: () => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        console.log('🔐 Auth Status:');
        console.log('  Token:', token ? 'EXISTS' : 'MISSING');
        console.log('  User:', user ? JSON.parse(user) : 'MISSING');
        return { hasToken: !!token, hasUser: !!user };
    },
    checkUserData: () => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            console.error('❌ No user data in localStorage');
            return null;
        }
        try {
            const parsed = JSON.parse(userData);
            console.log('✅ User data structure:');
            console.log('  Name:', parsed.name);
            console.log('  Email:', parsed.email);
            console.log('  ID:', parsed.id);
            console.log('  Full object:', parsed);
            return parsed;
        } catch (e) {
            console.error('❌ Failed to parse user data:', e);
            return null;
        }
    }
};

console.log('✅ Dashboard.js loaded');
console.log('💡 Debug tools: window.dashboardDebug');