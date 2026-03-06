// ================================================
// COURSE PAGE - API INTEGRATION
// ================================================

const API_BASE_URL = 'https://jaromind-production-3060.up.railway.app';

console.log('🚀 Course page initialized');

// ── Global State ──────────────────────────────
let user               = null;
let currentCourse      = null;
let enrollment         = null;
let completedLessons   = [];
let currentLessonIndex = 0;

// ── Quiz State ────────────────────────────────
let activeQuiz        = null;
let quizAnswers       = [];
let quizCurrentQ      = 0;
let quizTimerInterval = null;
let quizSecondsLeft   = 0;

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) {
        window.location.href = 'sign_in.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const courseId  = urlParams.get('id') || urlParams.get('course');

    if (!courseId) {
        showError('No course ID provided');
        return;
    }

    await loadCourseData(courseId);
    setupSidebarTabs();
    setupQuizModal();
});

// ================================================
// AUTHENTICATION
// ================================================

function checkAuth() {
    const token    = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) return false;
    try {
        user = JSON.parse(userData);
        updateTopbarAvatar();
        return true;
    } catch {
        return false;
    }
}

function updateTopbarAvatar() {
    const avatar = document.querySelector('.topbar-avatar');
    if (avatar && user?.name) {
        const parts = user.name.split(' ');
        avatar.textContent = parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : user.name.substring(0, 2).toUpperCase();
    }
}

// ================================================
// DATA LOADING
// ================================================

async function loadCourseData(courseId) {
    try {
        showLoading();
        const token  = localStorage.getItem('token');
        const cached = getCachedEnrollments();

        const [courseResponse, enrollmentResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/courses/${courseId}`, {
                headers: { 'Content-Type': 'application/json' }
            }),
            cached
                ? Promise.resolve({ ok: true, json: () => Promise.resolve(cached) })
                : fetch(`${API_BASE_URL}/enrollments`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
        ]);

        if (!courseResponse.ok) throw new Error('Course not found');

        const courseData = await courseResponse.json();
        currentCourse    = courseData.course || courseData;

        console.log('✅ Course loaded:', currentCourse.title);
        console.log('📦 Quizzes:', currentCourse.metadata?.quizzes?.length || 0);
        console.log('📦 Assignments:', currentCourse.metadata?.assignments?.length || 0);

        if (enrollmentResponse.ok) {
            const enrollmentData = await enrollmentResponse.json();
            if (!cached) cacheEnrollments(enrollmentData);

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

        renderCourse();
        renderQuizzes();
        renderAssignments();
        hideLoading();

    } catch (error) {
        console.error('❌ Error loading course:', error);
        showError(error.message);
    }
}

// ── Enrollment cache (5 min) ──────────────────

function getCachedEnrollments() {
    const cached = sessionStorage.getItem('enrollments_cache');
    if (!cached) return null;
    try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 5 * 60 * 1000) return data;
    } catch { /* ignore */ }
    return null;
}

function cacheEnrollments(data) {
    sessionStorage.setItem('enrollments_cache', JSON.stringify({
        data,
        timestamp: Date.now()
    }));
}

// ================================================
// RENDERING — COURSE
// ================================================

function renderCourse() {
    if (!currentCourse) return;

    document.title = `JaroMind – ${currentCourse.title}`;
    document.getElementById('courseTitle').textContent = currentCourse.title;

    const instructorName = currentCourse.tutor?.name || currentCourse.instructor || 'JaroMind';
    document.getElementById('instructorName').textContent = instructorName;

    const progress = enrollment?.enrollment?.progress || 0;
    document.getElementById('progressBar').style.width     = progress + '%';
    document.getElementById('progressPercent').textContent = progress + '%';

    const lessons = currentCourse.curriculum || [];
    if (lessons.length > 0) {
        const lesson = lessons[currentLessonIndex] || lessons[0];
        document.getElementById('currentLessonTitle').textContent = lesson.title;
        document.getElementById('videoLabel').textContent         = lesson.title;
        document.getElementById('videoCaption').textContent       = `${instructorName} • ${currentCourse.title}`;
        loadVideo(lesson);
    } else {
        document.getElementById('currentLessonTitle').textContent = 'No lessons available';
    }

    renderOutline();
    initializeVideoTracking();
}

// ================================================
// RENDERING — OUTLINE
// ================================================

function renderOutline() {
    const list    = document.getElementById('outlineList');
    const lessons = currentCourse?.curriculum || [];

    if (lessons.length === 0) {
        list.innerHTML = '<li style="padding:1rem;text-align:center;color:#6b7280;">No lessons available</li>';
        document.getElementById('lessonsCompleted').textContent = 'Lessons Completed: 0 / 0';
        return;
    }

    list.innerHTML = lessons.map((lesson, index) => {
        const lessonId    = lesson.id || `lesson-${index}`;
        const isCompleted = completedLessons.includes(lessonId);
        const isActive    = index === currentLessonIndex;
        const checkClass  = isCompleted ? 'done' : isActive ? '' : 'upcoming';
        const checkIcon   = isCompleted ? '✓' : isActive ? '▶' : '';

        return `
            <li class="outline-item ${isActive ? 'active' : ''}" onclick="selectLesson(${index})">
                <div class="lesson-check ${checkClass}">${checkIcon}</div>
                <span class="lesson-title">${lesson.title}</span>
                ${isCompleted ? '<span class="lesson-badge">• Done</span>' : ''}
            </li>
        `;
    }).join('');

    document.getElementById('lessonsCompleted').textContent =
        `Lessons Completed: ${completedLessons.length} / ${lessons.length}`;
}

// ================================================
// VIDEO — YouTube / Vimeo / Direct / None
// ================================================

/**
 * Detect what kind of URL was uploaded and return an embed-safe URL.
 * Returns { type: 'youtube'|'vimeo'|'direct'|'none', embedUrl }
 */
function resolveVideoUrl(url) {
    if (!url || !url.trim()) return { type: 'none' };

    // YouTube — watch, embed, shorts, youtu.be
    const ytMatch = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    if (ytMatch) {
        return {
            type: 'youtube',
            embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`
        };
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
        return {
            type: 'vimeo',
            embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
        };
    }

    // Anything else: treat as a direct file/stream
    return { type: 'direct', embedUrl: url };
}

function loadVideo(lesson) {
    const videoPlayer      = document.getElementById('videoPlayer');
    const videoSource      = document.getElementById('videoSource');
    const videoIframeWrap  = document.getElementById('videoIframeWrap');
    const videoIframe      = document.getElementById('videoIframe');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    const markCompleteBtn  = document.getElementById('markCompleteBtn');

    // Reset all panels
    videoPlayer.style.display      = 'none';
    videoIframeWrap.style.display  = 'none';
    videoPlaceholder.style.display = 'none';
    if (markCompleteBtn) markCompleteBtn.style.display = 'none';

    const { type, embedUrl } = resolveVideoUrl(lesson.videoUrl);

    if (type === 'youtube' || type === 'vimeo') {
        // ── Iframe embed ──────────────────────────────
        videoIframe.src           = embedUrl;
        videoIframeWrap.style.display = 'block';

        // Can't track timeupdate across cross-origin iframes,
        // so show manual "Mark Complete" button instead.
        const lessonId    = lesson.id || `lesson-${currentLessonIndex}`;
        const isCompleted = completedLessons.includes(lessonId);
        if (markCompleteBtn && !isCompleted) {
            markCompleteBtn.style.display = 'block';
            markCompleteBtn.textContent   = '✓ Mark Lesson as Complete';
        }

    } else if (type === 'direct') {
        // ── Native <video> ────────────────────────────
        videoSource.src = embedUrl;
        videoPlayer.load();
        videoPlayer.style.display = 'block';

    } else {
        // ── No video ─────────────────────────────────
        videoPlaceholder.style.display = 'flex';
        const lessonId    = lesson.id || `lesson-${currentLessonIndex}`;
        const isCompleted = completedLessons.includes(lessonId);
        if (markCompleteBtn && !isCompleted) {
            markCompleteBtn.style.display = 'block';
            markCompleteBtn.textContent   = '✓ Mark Lesson as Complete';
        }
    }
}

// ================================================
// LESSON INTERACTION
// ================================================

window.selectLesson = function(index) {
    const lessons = currentCourse?.curriculum || [];
    if (index < 0 || index >= lessons.length) return;

    currentLessonIndex = index;
    const lesson = lessons[index];

    document.getElementById('currentLessonTitle').textContent = lesson.title;
    document.getElementById('videoLabel').textContent         = lesson.title;

    loadVideo(lesson);
    renderOutline();
    initializeVideoTracking();
};

async function markLessonComplete(lessonId) {
    if (!enrollment || completedLessons.includes(lessonId)) return;

    completedLessons.push(lessonId);

    const totalLessons = (currentCourse?.curriculum || []).length;
    const progress     = Math.round((completedLessons.length / totalLessons) * 100);

    showSavingIndicator();

    try {
        const token        = localStorage.getItem('token');
        const enrollmentId = enrollment.enrollment.enrollmentId || enrollment.enrollment.id;

        const response = await fetch(`${API_BASE_URL}/enrollments/${enrollmentId}/progress`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ progress, completedLessons })
        });

        if (response.ok) {
            document.getElementById('progressBar').style.width     = progress + '%';
            document.getElementById('progressPercent').textContent = progress + '%';

            if (enrollment.enrollment) {
                enrollment.enrollment.progress         = progress;
                enrollment.enrollment.completedLessons = completedLessons;
            }

            renderOutline();
            showSavedIndicator();

            const markCompleteBtn = document.getElementById('markCompleteBtn');
            if (markCompleteBtn) markCompleteBtn.style.display = 'none';

            if (progress >= 100) setTimeout(showCourseCompletedModal, 500);

        } else {
            throw new Error('Failed to save progress');
        }

    } catch (error) {
        completedLessons.splice(completedLessons.indexOf(lessonId), 1);
        showErrorIndicator('Failed to save progress. Please try again.');
    }
}

window.markCurrentLessonComplete = async function() {
    const lessons = currentCourse?.curriculum || [];
    if (!lessons.length) return;
    const lesson   = lessons[currentLessonIndex];
    const lessonId = lesson.id || `lesson-${currentLessonIndex}`;
    await markLessonComplete(lessonId);
};

document.getElementById('nextLessonBtn')?.addEventListener('click', () => {
    const lessons   = currentCourse?.curriculum || [];
    const nextIndex = currentLessonIndex + 1;
    if (nextIndex < lessons.length) {
        selectLesson(nextIndex);
    } else {
        showCourseCompletedModal();
    }
});

// ================================================
// VIDEO PROGRESS TRACKING (native <video> only)
// ================================================

window.playVideo = function() {
    const vp = document.getElementById('videoPlayer');
    if (vp && vp.style.display !== 'none') vp.play();
};

function setupVideoProgressTracking() {
    const videoPlayer = document.getElementById('videoPlayer');
    if (!videoPlayer) return;

    let hasMarkedComplete = false;

    videoPlayer.addEventListener('timeupdate', async function() {
        if (hasMarkedComplete || !videoPlayer.duration) return;
        const pct = (videoPlayer.currentTime / videoPlayer.duration) * 100;
        if (pct >= 80) {
            hasMarkedComplete = true;
            const lessons  = currentCourse?.curriculum || [];
            const lesson   = lessons[currentLessonIndex];
            const lessonId = lesson?.id || `lesson-${currentLessonIndex}`;
            if (lessonId && !completedLessons.includes(lessonId)) {
                console.log('🎥 80% watched — marking complete');
                await markLessonComplete(lessonId);
            }
        }
    });

    videoPlayer.addEventListener('loadedmetadata', () => { hasMarkedComplete = false; });
}

function initializeVideoTracking() {
    setTimeout(setupVideoProgressTracking, 500);
}

// ================================================
// SIDEBAR TABS
// ================================================

function setupSidebarTabs() {
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const panel = this.dataset.panel;
            document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            const target = document.getElementById(`panel-${panel}`);
            if (target) target.classList.add('active');
        });
    });
}

// ================================================
// RENDERING — QUIZZES
// ================================================

function renderQuizzes() {
    const quizzes   = currentCourse?.metadata?.quizzes || [];
    const container = document.getElementById('quizList');
    const badge     = document.getElementById('quizBadge');

    if (!container) return;

    if (quizzes.length === 0) {
        container.innerHTML = `
            <div class="panel-empty">
                <div class="empty-icon">🧩</div>
                No quizzes for this course
            </div>`;
        return;
    }

    if (badge) {
        badge.style.display = 'inline';
        badge.textContent   = quizzes.length;
    }

    container.innerHTML = quizzes.map((quiz, index) => `
        <div class="quiz-card">
            <div class="quiz-card-title">${quiz.title || 'Quiz ' + (index + 1)}</div>
            <div class="quiz-meta">
                <span>⏱ ${quiz.duration || 30} min</span>
                <span>❓ ${(quiz.questions || []).length} questions</span>
                <span>✅ Pass: ${quiz.passingScore || 70}%</span>
            </div>
            <button class="btn-start-quiz" onclick="openQuiz(${index})">
                Start Quiz →
            </button>
        </div>
    `).join('');
}

// ================================================
// RENDERING — ASSIGNMENTS
// ================================================

function renderAssignments() {
    const assignments = currentCourse?.metadata?.assignments || [];
    const container   = document.getElementById('assignmentList');
    const badge       = document.getElementById('assignmentBadge');

    if (!container) return;

    if (assignments.length === 0) {
        container.innerHTML = `
            <div class="panel-empty">
                <div class="empty-icon">📝</div>
                No assignments for this course
            </div>`;
        return;
    }

    if (badge) {
        badge.style.display = 'inline';
        badge.textContent   = assignments.length;
    }

    container.innerHTML = assignments.map((a, i) => {
        const desc      = (a.description || '').substring(0, 120);
        const resources = (a.resources || []).filter(Boolean);

        return `
            <div class="assignment-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
                    <div class="assignment-card-title">${a.title || 'Assignment ' + (i + 1)}</div>
                    <span class="assignment-type-badge">${a.type || 'task'}</span>
                </div>
                ${desc ? `<div class="assignment-desc">${desc}${(a.description || '').length > 120 ? '…' : ''}</div>` : ''}
                <div class="assignment-meta">
                    <span>⭐ ${a.points || 100} pts</span>
                    ${a.dueDate ? `<span>📅 Due: ${formatDate(a.dueDate)}</span>` : ''}
                    ${a.allowLate ? `<span>🕐 Late OK</span>` : ''}
                </div>
                ${resources.length > 0 ? `
                    <div style="margin-top:8px;">
                        ${resources.map(r => `
                            <a href="${r}" target="_blank" rel="noopener"
                                style="display:inline-block;margin-right:6px;margin-top:4px;font-size:11.5px;color:#667eea;text-decoration:none;">
                                📎 Resource
                            </a>`).join('')}
                    </div>` : ''}
            </div>
        `;
    }).join('');
}

function formatDate(str) {
    if (!str) return '';
    try {
        return new Date(str).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    } catch { return str; }
}

// ================================================
// QUIZ MODAL
// ================================================

function setupQuizModal() {
    document.getElementById('quizModalClose')?.addEventListener('click', closeQuizModal);
    document.getElementById('beginQuizBtn')?.addEventListener('click', startQuiz);
    document.getElementById('quizPrevBtn')?.addEventListener('click', () => navigateQuestion(-1));
    document.getElementById('quizNextBtn')?.addEventListener('click', () => navigateQuestion(1));
    document.getElementById('quizSubmitBtn')?.addEventListener('click', submitQuiz);
    document.getElementById('retryQuizBtn')?.addEventListener('click', () => {
        const quizzes = currentCourse?.metadata?.quizzes || [];
        const idx     = quizzes.indexOf(activeQuiz);
        if (idx !== -1) openQuiz(idx);
    });
    document.getElementById('closeResultBtn')?.addEventListener('click', closeQuizModal);

    // Close on overlay click
    document.getElementById('quizModalOverlay')?.addEventListener('click', function(e) {
        if (e.target === this) closeQuizModal();
    });
}

window.openQuiz = function(index) {
    const quizzes = currentCourse?.metadata?.quizzes || [];
    if (!quizzes[index]) return;

    activeQuiz   = quizzes[index];
    quizAnswers  = new Array((activeQuiz.questions || []).length).fill(null);
    quizCurrentQ = 0;

    document.getElementById('quizModalTitle').textContent      = activeQuiz.title || 'Quiz';
    document.getElementById('quizInstructionsText').textContent = activeQuiz.instructions || 'Answer all questions carefully. Good luck!';
    document.getElementById('quizStartDuration').textContent   = activeQuiz.duration || 30;
    document.getElementById('quizStartPass').textContent       = activeQuiz.passingScore || 70;
    document.getElementById('quizStartCount').textContent      = (activeQuiz.questions || []).length;

    showQuizScreen('start');
    document.getElementById('quizModalOverlay').classList.add('open');
};

function closeQuizModal() {
    clearInterval(quizTimerInterval);
    document.getElementById('quizModalOverlay').classList.remove('open');

    // Clear iframe to stop any background audio
    const iframe = document.getElementById('videoIframe');
    const iframeSrc = iframe?.src;
    if (iframe && iframeSrc) { iframe.src = ''; iframe.src = iframeSrc; }
}

function startQuiz() {
    quizAnswers  = new Array((activeQuiz.questions || []).length).fill(null);
    quizCurrentQ = 0;

    quizSecondsLeft = (activeQuiz.duration || 30) * 60;
    clearInterval(quizTimerInterval);
    updateTimerDisplay();
    quizTimerInterval = setInterval(() => {
        quizSecondsLeft--;
        updateTimerDisplay();
        if (quizSecondsLeft <= 0) {
            clearInterval(quizTimerInterval);
            submitQuiz();
        }
    }, 1000);

    showQuizScreen('question');
    renderQuestion();
}

function updateTimerDisplay() {
    const el  = document.getElementById('quizTimer');
    if (!el) return;
    const min = Math.floor(quizSecondsLeft / 60).toString().padStart(2, '0');
    const sec = (quizSecondsLeft % 60).toString().padStart(2, '0');
    el.textContent = `⏱ ${min}:${sec}`;
    el.className   = `quiz-timer${quizSecondsLeft <= 60 ? ' warning' : ''}`;
}

function renderQuestion() {
    const questions = activeQuiz.questions || [];
    const q         = questions[quizCurrentQ];
    if (!q) return;

    const total    = questions.length;
    const letters  = ['A', 'B', 'C', 'D', 'E'];
    const options  = q.options || [];
    const selected = quizAnswers[quizCurrentQ];

    // Progress bar
    document.getElementById('quizProgressFill').style.width =
        `${((quizCurrentQ + 1) / total) * 100}%`;

    // Nav buttons
    document.getElementById('quizPrevBtn').style.display   = quizCurrentQ > 0              ? 'inline-block' : 'none';
    document.getElementById('quizNextBtn').style.display   = quizCurrentQ < total - 1      ? 'inline-block' : 'none';
    document.getElementById('quizSubmitBtn').style.display = quizCurrentQ === total - 1    ? 'inline-block' : 'none';

    document.getElementById('quizQuestionBody').innerHTML = `
        <div class="question-number">Question ${quizCurrentQ + 1} of ${total}</div>
        <div class="question-text">${q.question || 'No question text'}</div>
        ${options.map((opt, oi) => `
            <button class="option-btn ${selected === oi ? 'selected' : ''}" onclick="selectAnswer(${oi})">
                <span class="option-letter">${letters[oi] || oi + 1}</span>
                ${opt || ''}
            </button>
        `).join('')}
    `;
}

window.selectAnswer = function(optionIndex) {
    quizAnswers[quizCurrentQ] = optionIndex;
    renderQuestion();
};

function navigateQuestion(dir) {
    const total  = (activeQuiz.questions || []).length;
    quizCurrentQ = Math.max(0, Math.min(total - 1, quizCurrentQ + dir));
    renderQuestion();
}

function submitQuiz() {
    clearInterval(quizTimerInterval);

    const questions    = activeQuiz.questions || [];
    const passingScore = activeQuiz.passingScore || 70;
    let correct = 0;

    questions.forEach((q, i) => {
        // Support both correctAnswer and correct_answer field names
        const correctIdx = q.correctAnswer ?? q.correct_answer ?? -1;
        if (quizAnswers[i] === correctIdx) correct++;
    });

    const pct    = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const passed = pct >= passingScore;

    document.getElementById('resultEmoji').textContent  = passed ? '🎉' : '😅';
    document.getElementById('resultScore').textContent  = `${pct}%`;
    document.getElementById('resultLabel').textContent  = `${correct} / ${questions.length} correct`;
    document.getElementById('resultVerdict').innerHTML  = passed
        ? `<div class="quiz-result-pass">✅ Passed! (required: ${passingScore}%)</div>`
        : `<div class="quiz-result-fail">❌ Not passed yet (required: ${passingScore}%)</div>`;

    showQuizScreen('result');
}

function showQuizScreen(screen) {
    document.getElementById('quizStartScreen').style.display    = screen === 'start'    ? 'block' : 'none';
    document.getElementById('quizQuestionScreen').style.display = screen === 'question' ? 'block' : 'none';
    document.getElementById('quizResultScreen').style.display   = screen === 'result'   ? 'block' : 'none';
}

// ================================================
// UI STATES
// ================================================

function showLoading() {
    document.getElementById('courseTitle').textContent = 'Loading course...';
    const list = document.getElementById('outlineList');
    if (list) list.innerHTML = '<li style="padding:1rem;text-align:center;color:#6b7280;">⏳ Loading...</li>';
}

function hideLoading() { /* content already rendered */ }

function showError(message) {
    const title = document.getElementById('courseTitle');
    if (title) title.textContent = 'Error';

    const list = document.getElementById('outlineList');
    if (list) list.innerHTML =
        `<li style="padding:1rem;text-align:center;color:#ef4444;">${message}</li>`;

    const ph = document.getElementById('videoPlaceholder');
    if (ph) {
        ph.style.display = 'flex';
        ph.innerHTML = `
            <div style="text-align:center;">
                <div style="font-size:2rem;margin-bottom:1rem;">⚠️</div>
                <p style="color:white;">${message}</p>
                <button onclick="location.reload()"
                    style="margin-top:1rem;padding:.5rem 1rem;background:white;color:#1f2937;border:none;border-radius:8px;cursor:pointer;">
                    Try Again
                </button>
            </div>
        `;
    }
}

// ================================================
// PROGRESS INDICATORS
// ================================================

function showSavingIndicator() {
    const el = document.getElementById('progressPercent');
    if (el) { el.style.opacity = '0.5'; el.textContent = 'Saving…'; }
}

function showSavedIndicator() {
    const el = document.getElementById('progressPercent');
    if (el) {
        const progress   = enrollment?.enrollment?.progress || 0;
        el.style.opacity = '1';
        el.textContent   = progress + '%';
        el.style.color   = '#10b981';
        setTimeout(() => { el.style.color = ''; }, 1200);
    }
}

function showErrorIndicator(message) {
    const el = document.getElementById('progressPercent');
    if (el) {
        el.style.opacity = '1';
        el.style.color   = '#ef4444';
        el.textContent   = '⚠️ Error';
        setTimeout(() => {
            el.textContent = (enrollment?.enrollment?.progress || 0) + '%';
            el.style.color = '';
        }, 3000);
    }
    console.error(message);
}

// ================================================
// COURSE COMPLETED MODAL
// ================================================

function showCourseCompletedModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,.8);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; padding: 20px;
    `;
    modal.innerHTML = `
        <div style="background:white;padding:3rem;border-radius:16px;text-align:center;max-width:480px;width:100%;">
            <div style="font-size:4rem;margin-bottom:1rem;">🎉</div>
            <h2 style="margin-bottom:1rem;color:#1f2937;">Congratulations!</h2>
            <p style="color:#6b7280;margin-bottom:2rem;">
                You've completed all lessons in <strong>${currentCourse?.title}</strong>
            </p>
            <button onclick="window.location.href='studendashboard.html'"
                style="padding:.75rem 2rem;background:linear-gradient(135deg,#667eea,#764ba2);
                color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:1rem;">
                Back to Dashboard
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ================================================
// DEBUG TOOLS
// ================================================

window.courseDebug = {
    getCourse:           () => currentCourse,
    getEnrollment:       () => enrollment,
    getCompletedLessons: () => completedLessons,
    getCurrentLesson:    () => currentLessonIndex,
    reloadCourse: () => {
        const p  = new URLSearchParams(window.location.search);
        const id = p.get('id') || p.get('course');
        if (id) loadCourseData(id);
    }
};

console.log('✅ course.js loaded — YouTube / Vimeo / Direct video support active');
console.log('💡 Debug: window.courseDebug');