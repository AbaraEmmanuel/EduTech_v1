// ================================================
// COURSE PAGE - API INTEGRATION
// ================================================

// API Configuration
const API_BASE_URL = 'http://localhost:8080';
// const API_BASE_URL = 'https://jaromind-production-3060.up.railway.app';

console.log('🚀 Course page initialized');
console.log('🔗 API URL:', API_BASE_URL);

// Global State
let user = null;
let currentCourse = null;
let enrollment = null;
let completedLessons = [];
let currentLessonIndex = 0;

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 DOM loaded, starting course page...');
    
    // Check authentication
    if (!checkAuth()) {
        console.log('❌ Not authenticated, redirecting to login...');
        window.location.href = 'sign_in.html';
        return;
    }
    
    // Get course ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id') || urlParams.get('course');
    
    if (!courseId) {
        showError('No course ID provided');
        return;
    }
    
    console.log('📚 Loading course:', courseId);
    
    // Load course data
    await loadCourseData(courseId);
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
        updateTopbarAvatar();
        return true;
    } catch (error) {
        console.error('❌ Failed to parse user data:', error);
        return false;
    }
}

function updateTopbarAvatar() {
    const avatar = document.querySelector('.topbar-avatar');
    if (avatar && user && user.name) {
        const nameParts = user.name.split(' ');
        const initials = nameParts.length >= 2 
            ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
            : user.name.substring(0, 2).toUpperCase();
        avatar.textContent = initials;
    }
}

// ================================================
// DATA LOADING
// ================================================

async function loadCourseData(courseId) {
    try {
        const startTime = performance.now();
        showLoading();
        
        const token = localStorage.getItem('token');
        
        // Check cache first (5 minute cache)
        const cachedEnrollments = getCachedEnrollments();
        
        console.log('📖 Fetching course and enrollment...');
        const fetchStart = performance.now();
        
        // Fetch course (always fresh)
        const coursePromise = fetch(`${API_BASE_URL}/courses/${courseId}`, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        // Fetch enrollments (use cache if available)
        const enrollmentPromise = cachedEnrollments 
            ? Promise.resolve({ ok: true, json: () => Promise.resolve(cachedEnrollments) })
            : fetch(`${API_BASE_URL}/enrollments`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        
        const [courseResponse, enrollmentResponse] = await Promise.all([
            coursePromise,
            enrollmentPromise
        ]);
        
        const fetchEnd = performance.now();
        console.log(`⏱️ Fetch took: ${(fetchEnd - fetchStart).toFixed(0)}ms`);
        
        // Process course
        if (!courseResponse.ok) {
            throw new Error('Course not found');
        }
        
        const courseData = await courseResponse.json();
        currentCourse = courseData.course || courseData;
        console.log('✅ Course loaded:', currentCourse.title);
        
        // Process enrollment
        if (enrollmentResponse.ok) {
            const enrollmentData = await enrollmentResponse.json();
            
            // Cache the result
            if (!cachedEnrollments) {
                cacheEnrollments(enrollmentData);
            }
            
            const enrollments = enrollmentData.enrollments || [];
            
            enrollment = enrollments.find(e => 
                e.course && (e.course.id === courseId || e.course._id === courseId)
            );
            
            if (enrollment) {
                completedLessons = enrollment.enrollment?.completedLessons || [];
                console.log('✅ Enrollment found, progress:', enrollment.enrollment.progress + '%');
            } else {
                console.log('⚠️ No enrollment found for this course');
            }
        }
        
        // Render
        renderCourse();
        hideLoading();
        
        const totalTime = performance.now() - startTime;
        console.log(`✅ Total load time: ${totalTime.toFixed(0)}ms`);
        
    } catch (error) {
        console.error('❌ Error loading course:', error);
        showError(error.message);
    }
}

// Cache helpers
function getCachedEnrollments() {
    const cached = sessionStorage.getItem('enrollments_cache');
    if (!cached) return null;
    
    try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // Cache valid for 5 minutes
        if (age < 5 * 60 * 1000) {
            console.log('✅ Using cached enrollments');
            return data;
        }
    } catch (e) {
        return null;
    }
    
    return null;
}

function cacheEnrollments(data) {
    sessionStorage.setItem('enrollments_cache', JSON.stringify({
        data: data,
        timestamp: Date.now()
    }));
}

// ================================================
// RENDERING
// ================================================

function renderCourse() {
    if (!currentCourse) return;
    
    // Update page title
    document.title = `JaroMind – ${currentCourse.title}`;
    
    // Update header
    document.getElementById('courseTitle').textContent = currentCourse.title;
    
    // Instructor
    const instructorName = currentCourse.tutor?.name || currentCourse.instructor || 'JaroMind';
    document.getElementById('instructorName').textContent = instructorName;
    
    // Progress
    const progress = enrollment?.enrollment?.progress || 0;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressPercent').textContent = progress + '%';
    
    // Current lesson title
    const lessons = currentCourse.curriculum || [];
    if (lessons.length > 0) {
        const currentLesson = lessons[currentLessonIndex] || lessons[0];
        document.getElementById('currentLessonTitle').textContent = currentLesson.title;
        document.getElementById('videoLabel').textContent = currentLesson.title;
        document.getElementById('videoCaption').textContent = `${instructorName} • ${currentCourse.title}`;
        
        // Load video if available
        loadVideo(currentLesson);
    } else {
        document.getElementById('currentLessonTitle').textContent = 'No lessons available';
    }
    
    // Render outline
    renderOutline();
    
    // ✅ NEW: Initialize video progress tracking
    initializeVideoTracking();
}

function renderOutline() {
    const list = document.getElementById('outlineList');
    const lessons = currentCourse.curriculum || [];
    
    if (lessons.length === 0) {
        list.innerHTML = '<li style="padding: 1rem; text-align: center; color: #6b7280;">No lessons available</li>';
        document.getElementById('lessonsCompleted').textContent = 'Lessons Completed: 0 / 0';
        return;
    }
    
    list.innerHTML = lessons.map((lesson, index) => {
        const lessonId = lesson.id || `lesson-${index}`;
        const isCompleted = completedLessons.includes(lessonId);
        const isActive = index === currentLessonIndex;
        
        const checkClass = isCompleted ? 'done' : isActive ? '' : 'upcoming';
        const checkIcon = isCompleted ? '✓' : isActive ? '✓' : '';
        
        return `
            <li class="outline-item ${isActive ? 'active' : ''}" onclick="selectLesson(${index})">
                <div class="lesson-check ${checkClass}">${checkIcon}</div>
                <span class="lesson-title">${lesson.title}</span>
                ${isCompleted ? '<span class="lesson-badge">• Completed</span>' : ''}
            </li>
        `;
    }).join('');
    
    // Update completion count
    const completedCount = completedLessons.length;
    document.getElementById('lessonsCompleted').textContent = 
        `Lessons Completed: ${completedCount} / ${lessons.length}`;
}

function loadVideo(lesson) {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoSource = document.getElementById('videoSource');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    const markCompleteBtn = document.getElementById('markCompleteBtn');
    
    if (lesson.videoUrl && lesson.videoUrl.trim() !== '') {
        // Has video URL - hide mark complete button
        videoSource.src = lesson.videoUrl;
        videoPlayer.load();
        videoPlayer.style.display = 'block';
        videoPlaceholder.style.display = 'none';
        if (markCompleteBtn) markCompleteBtn.style.display = 'none';
    } else {
        // No video - show placeholder and mark complete button
        videoPlayer.style.display = 'none';
        videoPlaceholder.style.display = 'flex';
        
        // Show mark complete button if lesson not already completed
        const lessonId = lesson.id || `lesson-${currentLessonIndex}`;
        const isCompleted = completedLessons.includes(lessonId);
        
        if (markCompleteBtn) {
            if (isCompleted) {
                markCompleteBtn.style.display = 'none';
            } else {
                markCompleteBtn.style.display = 'block';
                markCompleteBtn.textContent = '✓ Mark Lesson as Complete';
            }
        }
    }
}

// ================================================
// LESSON INTERACTION
// ================================================

window.selectLesson = async function(index) {
    const lessons = currentCourse.curriculum || [];
    if (index < 0 || index >= lessons.length) return;
    
    currentLessonIndex = index;
    const lesson = lessons[index];
    
    // Update UI
    document.getElementById('currentLessonTitle').textContent = lesson.title;
    document.getElementById('videoLabel').textContent = lesson.title;
    
    // Load video
    loadVideo(lesson);
    
    // Update outline
    renderOutline();
    
    // NOTE: Don't auto-mark complete on click
    // Let user watch the video first
    // Completion is tracked via video progress events
};

async function markLessonComplete(lessonId) {
    if (!enrollment) {
        console.log('⚠️ No enrollment, cannot mark lesson complete');
        return;
    }
    
    // Check if already completed
    if (completedLessons.includes(lessonId)) {
        console.log('✓ Lesson already completed');
        return;
    }
    
    try {
        // Add to completed lessons
        completedLessons.push(lessonId);
        
        // Calculate new progress
        const totalLessons = (currentCourse.curriculum || []).length;
        const progress = Math.round((completedLessons.length / totalLessons) * 100);
        
        console.log('📝 Marking lesson complete, new progress:', progress + '%');
        
        // Show saving indicator
        showSavingIndicator();
        
        const token = localStorage.getItem('token');
        const enrollmentId = enrollment.enrollment.enrollmentId || enrollment.enrollment.id;
        
        const response = await fetch(`${API_BASE_URL}/enrollments/${enrollmentId}/progress`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                progress: progress,
                completedLessons: completedLessons
            })
        });
        
        if (response.ok) {
            console.log('✅ Progress saved to database');
            
            // Update UI
            document.getElementById('progressBar').style.width = progress + '%';
            document.getElementById('progressPercent').textContent = progress + '%';
            
            // Update enrollment object
            if (enrollment.enrollment) {
                enrollment.enrollment.progress = progress;
                enrollment.enrollment.completedLessons = completedLessons;
            }
            
            // Re-render outline to show checkmark
            renderOutline();
            
            // Show success feedback
            showSavedIndicator();
            
            // Show celebration if course completed
            if (progress >= 100) {
                setTimeout(() => {
                    showCourseCompletedModal();
                }, 500);
            }
        } else {
            throw new Error('Failed to save progress');
        }
        
    } catch (error) {
        console.error('❌ Error updating progress:', error);
        // Remove from completed lessons if save failed
        const index = completedLessons.indexOf(lessonId);
        if (index > -1) {
            completedLessons.splice(index, 1);
        }
        showErrorIndicator('Failed to save progress. Please try again.');
    }
}

// Manual "Mark Complete" button functionality
window.markCurrentLessonComplete = async function() {
    const lessons = currentCourse?.curriculum || [];
    if (lessons.length === 0) return;
    
    const currentLesson = lessons[currentLessonIndex];
    const lessonId = currentLesson.id || `lesson-${currentLessonIndex}`;
    
    await markLessonComplete(lessonId);
};

// Next lesson button
document.getElementById('nextLessonBtn')?.addEventListener('click', () => {
    const lessons = currentCourse?.curriculum || [];
    const nextIndex = currentLessonIndex + 1;
    
    if (nextIndex < lessons.length) {
        selectLesson(nextIndex);
    } else {
        showCourseCompletedModal();
    }
});

// ================================================
// VIDEO INTERACTION & PROGRESS TRACKING
// ================================================

window.playVideo = function() {
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer.style.display !== 'none') {
        videoPlayer.play();
    }
};

// Track video watching progress
function setupVideoProgressTracking() {
    const videoPlayer = document.getElementById('videoPlayer');
    
    if (!videoPlayer) return;
    
    let hasMarkedComplete = false;
    
    // Track when video reaches 80% completion
    videoPlayer.addEventListener('timeupdate', async function() {
        if (hasMarkedComplete) return;
        
        const percentWatched = (videoPlayer.currentTime / videoPlayer.duration) * 100;
        
        // Mark complete when 80% watched
        if (percentWatched >= 80) {
            hasMarkedComplete = true;
            
            const lessons = currentCourse?.curriculum || [];
            const currentLesson = lessons[currentLessonIndex];
            const lessonId = currentLesson?.id || `lesson-${currentLessonIndex}`;
            
            if (lessonId && !completedLessons.includes(lessonId)) {
                console.log('🎥 Video 80% watched, marking complete');
                await markLessonComplete(lessonId);
            }
        }
    });
    
    // Reset tracking when video ends or new video loads
    videoPlayer.addEventListener('loadedmetadata', function() {
        hasMarkedComplete = false;
    });
}

// Call this after course loads
function initializeVideoTracking() {
    setTimeout(() => {
        setupVideoProgressTracking();
    }, 500);
}

// ================================================
// UI STATES
// ================================================

function showLoading() {
    document.getElementById('courseTitle').textContent = 'Loading course...';
    document.getElementById('outlineList').innerHTML = 
        '<li style="padding: 1rem; text-align: center; color: #6b7280;">⏳ Loading...</li>';
}

function hideLoading() {
    // Content is already rendered
}

function showError(message) {
    document.getElementById('courseTitle').textContent = 'Error';
    document.getElementById('outlineList').innerHTML = 
        `<li style="padding: 1rem; text-align: center; color: #ef4444;">${message}</li>`;
    
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    if (videoPlaceholder) {
        videoPlaceholder.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                <p style="color: white;">${message}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: white; color: #1f2937; border: none; border-radius: 8px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }
}

// ================================================
// PROGRESS SAVE INDICATORS
// ================================================

function showSavingIndicator() {
    const percent = document.getElementById('progressPercent');
    if (percent) {
        percent.style.opacity = '0.5';
        percent.textContent = 'Saving...';
    }
}

function showSavedIndicator() {
    const percent = document.getElementById('progressPercent');
    if (percent) {
        const progress = enrollment?.enrollment?.progress || 0;
        percent.style.opacity = '1';
        percent.textContent = progress + '%';
        
        // Brief flash to show it saved
        percent.style.color = '#10b981';
        setTimeout(() => {
            percent.style.color = '';
        }, 1000);
    }
}

function showErrorIndicator(message) {
    const percent = document.getElementById('progressPercent');
    if (percent) {
        percent.style.opacity = '1';
        percent.style.color = '#ef4444';
        percent.textContent = '⚠️ Error';
        
        setTimeout(() => {
            const progress = enrollment?.enrollment?.progress || 0;
            percent.textContent = progress + '%';
            percent.style.color = '';
        }, 3000);
    }
    
    console.error(message);
}

function showCourseCompletedModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 3rem; border-radius: 16px; text-align: center; max-width: 500px;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
            <h2 style="margin-bottom: 1rem; color: #1f2937;">Congratulations!</h2>
            <p style="color: #6b7280; margin-bottom: 2rem;">
                You've completed all lessons in <strong>${currentCourse?.title}</strong>
            </p>
            <button onclick="window.location.href='studendashboard.html'" 
                style="padding: 0.75rem 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem;">
                Back to Dashboard
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ================================================
// DEBUG TOOLS
// ================================================

window.courseDebug = {
    getCourse: () => currentCourse,
    getEnrollment: () => enrollment,
    getCompletedLessons: () => completedLessons,
    getCurrentLesson: () => currentLessonIndex,
    reloadCourse: () => {
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id') || urlParams.get('course');
        if (courseId) loadCourseData(courseId);
    }
};

console.log('✅ Course.js loaded');
console.log('💡 Debug tools: window.courseDebug');