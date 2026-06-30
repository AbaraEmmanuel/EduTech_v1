/* ═══════════════════════════════════════════════════════════════
   JM TUTORS — TUTOR DASHBOARD JAVASCRIPT (ENHANCED)
   Full CRUD operations with better error handling
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ════════════════════════════════════
   1. CONFIG & SESSION
════════════════════════════════════ */
const API_BASE = 'https://jaromind.onrender.com';

const SESSION = {
  token:   localStorage.getItem('jm_tutor_token'),
  tutorId: localStorage.getItem('jm_tutor_id'),
  name:    localStorage.getItem('jm_tutor_name') || 'Tutor',
  email:   localStorage.getItem('jm_tutor_email') || '',
};

/* Auth guard — redirect if no token */
if (!SESSION.token) {
  window.location.href = 'tutors_sign_in.html';
}

/* ════════════════════════════════════
   2. SIDEBAR — MOBILE OPEN / CLOSE
════════════════════════════════════ */
function openSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');

  sidebar.classList.add('open');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSidebar();
});

/* ════════════════════════════════════
   3. TOAST NOTIFICATIONS
════════════════════════════════════ */
let toastTimer = null;

function showToast(msg, type = 'error') {
  const toast   = document.getElementById('toast');
  const msgEl   = document.getElementById('toastMsg');
  const iconEl  = document.getElementById('toastIcon');

  msgEl.textContent  = msg;
  iconEl.textContent = type === 'error' ? '⚠️' : '✅';
  toast.style.background = type === 'error' ? '#dc2626' : '#16a34a';

  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5500);
}

function hideToast() {
  document.getElementById('toast').classList.remove('show');
}

/* ════════════════════════════════════
   4. HTTP HELPERS
════════════════════════════════════ */
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SESSION.token}`,
  };
}

async function apiFetch(path, options = {}) {
  try {
    const res  = await fetch(`${API_BASE}${path}`, {
      headers: authHeaders(),
      ...options,
    });

    if (res.status === 401) {
      // Token expired or invalid
      showToast('Session expired. Please login again.', 'error');
      setTimeout(() => signOut(), 2000);
      return null;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || data.message || `Request failed (${res.status})`);
    }

    return data;
  } catch (err) {
    // Don't show toast for expected errors during initial load
    if (!path.includes('/tutors/') && !path.includes('/bookings')) {
      showToast(`Error: ${err.message}`);
    }
    throw err;
  }
}

/* ════════════════════════════════════
   5. NAME / AVATAR HELPERS
════════════════════════════════════ */
const AVATAR_PALETTE = [
  'linear-gradient(135deg,#2563eb,#60a5fa)',
  'linear-gradient(135deg,#16a34a,#4ade80)',
  'linear-gradient(135deg,#d97706,#fbbf24)',
  'linear-gradient(135deg,#0d9488,#2dd4bf)',
  'linear-gradient(135deg,#7c3aed,#a78bfa)',
  'linear-gradient(135deg,#e11d48,#fb7185)',
  'linear-gradient(135deg,#0284c7,#38bdf8)',
];

function avatarColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitial(name = '') {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

/* ════════════════════════════════════
   6. DATE HELPERS
════════════════════════════════════ */
function isToday(isoString) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth()    === n.getMonth()    &&
    d.getDate()     === n.getDate()
  );
}

function isFutureNotToday(isoString) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const n = new Date();
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nDay = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return dDay > nDay;
}

function formatShortDate(isoString) {
  if (!isoString) return '–';
  return new Date(isoString).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatFullDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '–';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/* ════════════════════════════════════
   7. APPLY SESSION NAME (FALLBACK)
════════════════════════════════════ */
function applyNameFromStorage() {
  const name  = SESSION.name || 'Tutor';
  const first = name.split(' ')[0];
  const init  = getInitial(name);
  setNameUI(first, name, init);
}

function setNameUI(first, full, init) {
  setText('hdrName', first);
  setText('sbName',  full);
  setContent('sbInit',  init);
  setContent('topInit', init);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setContent(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ════════════════════════════════════
   8. FETCH TUTOR PROFILE
════════════════════════════════════ */
let cachedTutor = null;

async function fetchTutorProfile() {
  if (!SESSION.tutorId) {
    applyNameFromStorage();
    return null;
  }

  try {
    const data = await apiFetch(`/tutors/${SESSION.tutorId}`);
    if (!data || !data.success) throw new Error(data?.error || 'Profile not found');
    cachedTutor = data.tutor;
    return cachedTutor;
  } catch (err) {
    // Don't show error for missing profile - use fallback data
    console.warn('Profile fetch failed:', err.message);
    applyNameFromStorage();
    // Return default profile data
    return {
      name: SESSION.name,
      email: SESSION.email,
      sessionCount: 0,
      rating: 0,
      reviewCount: 0,
      hourlyRate: 0,
      subjects: ['Tutoring'],
      bio: ''
    };
  }
}

/* ════════════════════════════════════
   9. APPLY PROFILE TO UI
════════════════════════════════════ */
function applyProfile(tutor) {
  if (!tutor) {
    // Use default values if no tutor data
    tutor = {
      name: SESSION.name || 'Tutor',
      sessionCount: 0,
      rating: 0,
      reviewCount: 0,
      hourlyRate: 0,
      subjects: ['Tutoring']
    };
  }

  const name  = tutor.name || SESSION.name || 'Tutor';
  const first = name.split(' ')[0];
  const init  = getInitial(name);

  // Update stored name
  localStorage.setItem('jm_tutor_name', name);
  SESSION.name = name;

  setNameUI(first, name, init);

  // Update stats with fallback values
  setText('statSessions', tutor.sessionCount ?? '0');
  setText('statRating',   tutor.rating ? tutor.rating.toFixed(1) : '—');
  setText('statReviews',  `${tutor.reviewCount ?? 0} review${(tutor.reviewCount ?? 0) === 1 ? '' : 's'}`);
  setText('statRate',     tutor.hourlyRate ? formatCurrency(tutor.hourlyRate) : '—');

  // Update profile strip
  const strip = document.getElementById('profileStrip');
  if (strip) {
    strip.style.display = 'flex';
    setContent('profileInit',     init);
    setText('profileName',        name);
    setText('profileSubjects',    (tutor.subjects || ['Tutoring']).slice(0, 3).join(', ') || '—');
    setText('profileRating',      tutor.rating ? tutor.rating.toFixed(1) : '—');
    setText('profileReviews',     `(${tutor.reviewCount ?? 0})`);
    setText('profileSessions',    tutor.sessionCount ?? '0');
    setText('profileRate',        tutor.hourlyRate ? formatCurrency(tutor.hourlyRate) : '—');
  }
}

/* ════════════════════════════════════
   10. FETCH BOOKINGS
════════════════════════════════════ */
let cachedBookings = [];

async function fetchBookings() {
  try {
    const data = await apiFetch('/bookings');
    if (!data || !data.success) {
      // If API fails, return empty array with warning
      console.warn('Bookings fetch returned no data');
      return [];
    }
    const raw = data.bookings || [];
    cachedBookings = raw.map((b) => b.booking || b);
    return cachedBookings;
  } catch (err) {
    // Don't show error for bookings - just return empty
    console.warn('Bookings fetch failed:', err.message);
    return [];
  }
}

/* ════════════════════════════════════
   11. RENDER LESSON ROW HTML
════════════════════════════════════ */
function buildLessonHTML(booking) {
  const name   = booking.studentName  || 'Student';
  const init   = getInitial(name);
  const color  = avatarColor(name);
  const time   = booking.timeSlot     || '–';
  const date   = formatShortDate(booking.sessionDate);
  const type   = booking.sessionType  || '1:1';
  const status = booking.status       || '';

  let chipHTML = '';
  if (status === 'confirmed' && isToday(booking.sessionDate)) {
    chipHTML = `<span class="lesson-chip chip-live">● Live</span>`;
  } else if (status === 'confirmed') {
    chipHTML = `<span class="lesson-chip chip-soon">Confirmed</span>`;
  } else if (status === 'pending') {
    chipHTML = `<span class="lesson-chip chip-pending">Pending</span>`;
  }

  return `
    <div class="lesson">
      <span class="lesson-time">${escapeHTML(time)}</span>
      <div class="lesson-av" style="background:${color}">${escapeHTML(init)}</div>
      <div class="lesson-info">
        <div class="lesson-name">${escapeHTML(name)}</div>
        <div class="lesson-sub">${escapeHTML(type)} · ${escapeHTML(date)}</div>
      </div>
      ${chipHTML}
      <button class="lesson-action" onclick="markAttendance('${booking.id || ''}')" title="Mark Attendance">✅</button>
    </div>`;
}

function buildEmptyState(icon, message) {
  return `
    <div class="empty-state">
      <span class="empty-state-icon">${icon}</span>
      ${message}
    </div>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ════════════════════════════════════
   12. RENDER LESSONS INTO DOM
════════════════════════════════════ */
function renderLessons(bookings) {
  const active   = bookings.filter((b) => b.status !== 'cancelled');
  const todayArr = active.filter((b) => isToday(b.sessionDate));
  const upcomArr = active.filter((b) => isFutureNotToday(b.sessionDate)).slice(0, 6);

  // Update today count
  const todayEl = document.getElementById('statToday');
  if (todayEl) {
    todayEl.textContent = todayArr.length.toString();
  }
  const hintEl = document.getElementById('statTodayHint');
  if (hintEl) {
    hintEl.textContent = todayArr.length === 0
      ? 'No sessions today'
      : `Next: ${todayArr[0].timeSlot || 'today'}`;
  }

  // Today's lessons
  const todayContainer = document.getElementById('todayLessons');
  if (todayContainer) {
    todayContainer.innerHTML = todayArr.length
      ? todayArr.map(buildLessonHTML).join('')
      : buildEmptyState('📅', 'No bookings today');
  }

  // Upcoming lessons
  const upcomingContainer = document.getElementById('upcomingLessons');
  if (upcomingContainer) {
    upcomingContainer.innerHTML = upcomArr.length
      ? upcomArr.map(buildLessonHTML).join('')
      : buildEmptyState('🔭', 'No upcoming bookings');
  }
}

/* ════════════════════════════════════
   13. CHART — SESSION ACTIVITY
════════════════════════════════════ */
let chartMode   = 'sessions';
let chartPeriod = 'week';
let chartInstance = null;

function buildChartData() {
  const now    = new Date();
  const labels = [];
  const values = [];

  const bookings = cachedBookings || [];

  if (chartPeriod === 'week') {
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      labels.push(day.toLocaleDateString('en-GB', { weekday: 'short' }));

      const dayBookings = bookings.filter((b) => {
        if (!b.sessionDate || b.status === 'cancelled') return false;
        const bd = new Date(b.sessionDate);
        return bd >= day && bd < nextDay;
      });

      values.push(
        chartMode === 'sessions'
          ? dayBookings.length
          : dayBookings.reduce((sum, b) => sum + (b.amount || 0), 0)
      );
    }
  } else {
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      labels.push(`W${8 - i}`);

      const weekBookings = bookings.filter((b) => {
        if (!b.sessionDate || b.status === 'cancelled') return false;
        const bd = new Date(b.sessionDate);
        return bd >= weekStart && bd < weekEnd;
      });

      values.push(
        chartMode === 'sessions'
          ? weekBookings.length
          : weekBookings.reduce((sum, b) => sum + (b.amount || 0), 0)
      );
    }
  }

  return { labels, values };
}

function renderChart() {
  const canvas = document.getElementById('chart');
  if (!canvas) return;

  // If chart container is not visible yet, try again after a delay
  if (!canvas.offsetParent) {
    setTimeout(renderChart, 300);
    return;
  }

  const ctx  = canvas.getContext('2d');
  const { labels, values } = buildChartData();

  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, 'rgba(37,99,235,.20)');
  grad.addColorStop(1, 'rgba(37,99,235,0)');

  if (chartInstance) chartInstance.destroy();

  // Only create chart if we have labels
  if (labels.length === 0) {
    labels.push('No Data');
    values.push(0);
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor:          '#2563eb',
        borderWidth:          2.5,
        pointBackgroundColor: '#2563eb',
        pointBorderColor:     '#fff',
        pointBorderWidth:     2,
        pointRadius:          4,
        pointHoverRadius:     6,
        fill:                 true,
        backgroundColor:      grad,
        tension:              .42,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleFont:   { family: 'Plus Jakarta Sans', size: 11, weight: '700' },
          bodyFont:    { family: 'Plus Jakarta Sans', size: 12 },
          padding:     10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) =>
              chartMode === 'earnings'
                ? `  ${formatCurrency(ctx.raw)}`
                : `  ${ctx.raw} session${ctx.raw === 1 ? '' : 's'}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font:  { family: 'Plus Jakarta Sans', size: 10 },
            color: '#7d8fa9',
          },
        },
        y: {
          beginAtZero: true,
          grid:  { color: '#e4edf7', drawBorder: false },
          ticks: {
            font:  { family: 'Plus Jakarta Sans', size: 10 },
            color: '#7d8fa9',
            stepSize: 1,
            callback: (v) =>
              chartMode === 'earnings' ? formatCurrency(v) : `${v}`,
          },
        },
      },
    },
  });
}

function setMode(mode, btn) {
  chartMode = mode;
  document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderChart();
}

function setPeriod(period, btn) {
  chartPeriod = period;
  document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderChart();
}

/* ════════════════════════════════════
   14. SET TOPBAR DATE
════════════════════════════════════ */
function setTopbarDate() {
  const dateEl = document.getElementById('hdrDate');
  if (dateEl) {
    dateEl.textContent = `${formatFullDate()} · Let's make today great`;
  }
}

/* ════════════════════════════════════
   15. SIGN OUT
════════════════════════════════════ */
function signOut() {
  [
    'jm_tutor_token',
    'jm_tutor_id',
    'jm_tutor_name',
    'jm_tutor_email',
  ].forEach((key) => localStorage.removeItem(key));

  window.location.href = 'tutor-login.html';
}

/* ════════════════════════════════════
   16. PAGE RENDERERS
════════════════════════════════════ */
function renderDashboard() {
  const name = SESSION.name.split(' ')[0] || 'Tutor';
  
  return `
    <div class="tab-content">
      <div class="welcome-section" style="background:linear-gradient(135deg,#2563eb,#6366f1);border-radius:14px;padding:28px 32px;color:#fff;margin-bottom:28px;box-shadow:0 8px 30px rgba(37,99,235,0.25);">
        <h2 style="font-size:22px;font-weight:600;margin-bottom:4px;color:#fff;">Welcome back, ${name}! 👋</h2>
        <p style="opacity:0.85;font-size:14px;margin:0;">Here's what's happening with your students and courses today.</p>
      </div>

      <!-- Profile Strip -->
      <div class="profile-strip" id="profileStrip" style="display:none">
        <div class="profile-av" id="profileInit">–</div>
        <div class="profile-info">
          <div class="profile-name" id="profileName">–</div>
          <div class="profile-meta">
            <span class="meta-chip"><strong id="profileSubjects">–</strong></span>
            <span class="meta-chip">⭐ <strong id="profileRating">–</strong> <span id="profileReviews"></span></span>
            <span class="meta-chip">🎓 <strong id="profileSessions">–</strong> sessions</span>
            <span class="meta-chip">💰 <strong id="profileRate">–</strong></span>
          </div>
        </div>
        <div class="profile-badge" id="profileOnline">
          <span class="online-dot"></span> Online
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card c-blue">
          <div class="stat-icon">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="stat-label">Today's Lessons</div>
          <div class="stat-val" id="statToday">0</div>
          <div class="stat-hint" id="statTodayHint">No sessions today</div>
          <div class="stat-bar"></div>
        </div>

        <div class="stat-card c-green">
          <div class="stat-icon">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <div class="stat-label">Total Sessions</div>
          <div class="stat-val" id="statSessions">0</div>
          <div class="stat-hint">All time</div>
          <div class="stat-bar"></div>
        </div>

        <div class="stat-card c-amber">
          <div class="stat-icon">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </div>
          <div class="stat-label">My Rating</div>
          <div class="stat-val" id="statRating">—</div>
          <div class="stat-hint" id="statReviews">0 reviews</div>
          <div class="stat-bar"></div>
        </div>

        <div class="stat-card c-rose">
          <div class="stat-icon">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="stat-label">Hourly Rate</div>
          <div class="stat-val" id="statRate">—</div>
          <div class="stat-hint">Per session hour</div>
          <div class="stat-bar"></div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="main-grid">
        <div class="card card-today">
          <div class="card-head">
            <span class="card-title">Today's Bookings</span>
            <button class="btn-primary" style="padding:6px 14px;font-size:12px;width:auto;margin:0;" onclick="openLessonModal()">+ Add</button>
          </div>
          <div id="todayLessons">
            <div class="lesson skel-lesson"><span class="skel skel-row"></span></div>
          </div>
        </div>

        <div class="card card-upcoming">
          <div class="card-head">
            <span class="card-title">Upcoming Bookings</span>
            <a href="#" class="card-link" onclick="showTab('lessons'); return false;">View All →</a>
          </div>
          <div id="upcomingLessons">
            <div class="lesson skel-lesson"><span class="skel skel-row"></span></div>
            <div class="lesson skel-lesson"><span class="skel skel-row"></span></div>
          </div>
        </div>

        <div class="card card-chart">
          <div class="card-head">
            <span class="card-title">Session Activity</span>
            <div class="toggle-group">
              <button class="toggle-btn active" onclick="setMode('sessions',this)">Sessions</button>
              <button class="toggle-btn" onclick="setMode('earnings',this)">Earnings</button>
            </div>
          </div>
          <div class="chart-wrap">
            <canvas id="chart"></canvas>
          </div>
          <div class="period-row">
            <button class="period-btn active" onclick="setPeriod('week',this)">Week</button>
            <button class="period-btn" onclick="setPeriod('month',this)">Month</button>
          </div>
        </div>

        <div class="card card-resources">
          <div class="card-head">
            <span class="card-title">Quick Actions</span>
          </div>
          <div style="display:grid; gap:10px;">
            <button class="btn-outline" onclick="openLessonModal()">📚 Schedule Lesson</button>
            <button class="btn-outline" onclick="openSettings(event)">⚙️ Edit Profile</button>
            <button class="btn-outline" onclick="showTab('students')">👥 View Students</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderStudents() {
  // Get unique students from bookings
  const students = [...new Set(cachedBookings.map(b => b.studentName).filter(Boolean))];
  
  return `
    <div class="tab-content">
      <div class="page-header">
        <h2>My Students</h2>
        <div class="header-actions">
          <button class="btn-primary" onclick="showToast('Student management coming soon!', 'success')">+ Add Student</button>
        </div>
      </div>
      ${students.length > 0 ? `
        <div style="display:grid; gap:12px;">
          ${students.map(name => {
            const sessions = cachedBookings.filter(b => b.studentName === name);
            const active = sessions.some(b => b.status === 'confirmed');
            const init = getInitial(name);
            const color = avatarColor(name);
            return `
              <div class="student-card" style="display:flex;align-items:center;gap:16px;padding:16px;background:var(--surface);border-radius:var(--r);border:1px solid var(--border);transition:var(--transition);">
                <div class="student-avatar" style="width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;flex-shrink:0;background:${color}">${init}</div>
                <div class="student-info" style="flex:1;">
                  <div class="student-name" style="font-weight:600;">${escapeHTML(name)}</div>
                  <div class="student-meta" style="font-size:13px;color:var(--muted);">${sessions.length} sessions</div>
                </div>
                <div class="student-status ${active ? 'active' : 'inactive'}" style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;${active ? 'background:#dcfce7;color:#16a34a;' : 'background:#fee2e2;color:#dc2626;'}">${active ? 'Active' : 'Inactive'}</div>
                <button class="btn-sm" onclick="viewStudent('${escapeHTML(name)}')">View</button>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="empty-state" style="text-align:center;padding:40px 0;color:var(--muted);">
          <span class="empty-state-icon" style="font-size:48px;display:block;margin-bottom:12px;">👥</span>
          <p style="font-size:16px;font-weight:600;color:var(--text);">No students yet</p>
          <p style="font-size:14px;">Start scheduling lessons to build your student list!</p>
        </div>
      `}
    </div>
  `;
}

function renderLessonsPage() {
  const active = cachedBookings.filter(b => b.status !== 'cancelled');
  
  return `
    <div class="tab-content">
      <div class="page-header">
        <h2>All Lessons</h2>
        <div class="header-actions">
          <button class="btn-primary" onclick="openLessonModal()">+ Schedule Lesson</button>
        </div>
      </div>
      <div style="background:var(--surface);border-radius:var(--r);padding:20px;border:1px solid var(--border);">
        ${active.length > 0 ? `
          <div style="display:grid; gap:12px;">
            ${active.slice(0, 10).map(b => buildLessonHTML(b)).join('')}
          </div>
        ` : buildEmptyState('📚', 'No lessons scheduled yet')}
      </div>
    </div>
  `;
}

function renderResources() {
  const resources = [
    { icon: '📄', name: 'Grammar Worksheets', meta: '5 files' },
    { icon: '🎯', name: 'Conversation Topics', meta: '12 topics' },
    { icon: '📚', name: 'IELTS Materials', meta: '8 files' },
    { icon: '💼', name: 'Business English Packs', meta: '6 files' },
  ];
  
  return `
    <div class="tab-content">
      <div class="page-header">
        <h2>Teaching Resources</h2>
        <div class="header-actions">
          <button class="btn-primary" onclick="showToast('Resource upload coming soon!', 'success')">+ Upload Resource</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px;">
        ${resources.map(r => `
          <div class="resource-card" style="padding:20px;background:var(--surface);border-radius:var(--r);border:1px solid var(--border);text-align:center;transition:var(--transition);cursor:pointer;">
            <div class="resource-icon" style="font-size:32px;margin-bottom:8px;">${r.icon}</div>
            <div class="resource-name" style="font-weight:600;">${r.name}</div>
            <div class="resource-meta" style="font-size:13px;color:var(--muted);">${r.meta}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderAnalytics() {
  const totalRevenue = cachedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  const avgPerSession = cachedBookings.length > 0 ? totalRevenue / cachedBookings.length : 0;
  const uniqueStudents = [...new Set(cachedBookings.map(b => b.studentName).filter(Boolean))].length;
  const completed = cachedBookings.filter(b => b.status === 'confirmed').length;
  const completionRate = cachedBookings.length > 0 ? (completed / cachedBookings.length) * 100 : 0;
  
  return `
    <div class="tab-content">
      <div class="page-header">
        <h2>Analytics</h2>
        <div class="header-actions">
          <button class="btn-secondary" onclick="showToast('Report generated!', 'success')">📊 Generate Report</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:24px;">
        <div class="stat-card c-blue" style="background:var(--surface);border-radius:var(--r);padding:20px;border:1px solid var(--border);">
          <div class="stat-label" style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Total Revenue</div>
          <div class="stat-val" style="font-family:var(--font-display);font-size:28px;font-weight:600;">${formatCurrency(totalRevenue)}</div>
        </div>
        <div class="stat-card c-green" style="background:var(--surface);border-radius:var(--r);padding:20px;border:1px solid var(--border);">
          <div class="stat-label" style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Average per Session</div>
          <div class="stat-val" style="font-family:var(--font-display);font-size:28px;font-weight:600;">${formatCurrency(avgPerSession)}</div>
        </div>
        <div class="stat-card c-amber" style="background:var(--surface);border-radius:var(--r);padding:20px;border:1px solid var(--border);">
          <div class="stat-label" style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Total Students</div>
          <div class="stat-val" style="font-family:var(--font-display);font-size:28px;font-weight:600;">${uniqueStudents}</div>
        </div>
        <div class="stat-card c-rose" style="background:var(--surface);border-radius:var(--r);padding:20px;border:1px solid var(--border);">
          <div class="stat-label" style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;">Completion Rate</div>
          <div class="stat-val" style="font-family:var(--font-display);font-size:28px;font-weight:600;">${Math.round(completionRate)}%</div>
        </div>
      </div>
    </div>
  `;
}

/* ════════════════════════════════════
   17. TAB NAVIGATION
════════════════════════════════════ */
function showTab(tab) {
  const content = document.getElementById('dashContent');
  let html = '';

  switch(tab) {
    case 'dashboard':
      html = renderDashboard();
      break;
    case 'students':
      html = renderStudents();
      break;
    case 'lessons':
      html = renderLessonsPage();
      break;
    case 'messages':
      html = `<div class="tab-content"><div class="page-header"><h2>Messages</h2></div><div class="empty-state" style="text-align:center;padding:40px 0;"><span class="empty-state-icon" style="font-size:48px;display:block;margin-bottom:12px;">💬</span><p style="font-size:16px;font-weight:600;">Messaging coming soon!</p></div></div>`;
      break;
    case 'payments':
      html = `<div class="tab-content"><div class="page-header"><h2>Payments</h2></div><div class="empty-state" style="text-align:center;padding:40px 0;"><span class="empty-state-icon" style="font-size:48px;display:block;margin-bottom:12px;">💰</span><p style="font-size:16px;font-weight:600;">Payment history coming soon!</p></div></div>`;
      break;
    case 'resources':
      html = renderResources();
      break;
    case 'analytics':
      html = renderAnalytics();
      break;
    default:
      html = renderDashboard();
  }

  content.innerHTML = html;

  // Update active nav
  document.querySelectorAll('.sb-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === tab);
  });

  // Re-apply profile and bookings data if dashboard
  if (tab === 'dashboard') {
    if (cachedTutor) applyProfile(cachedTutor);
    if (cachedBookings.length) renderLessons(cachedBookings);
    setTimeout(renderChart, 200);
  }
}

/* ════════════════════════════════════
   18. CRUD OPERATIONS
════════════════════════════════════ */

// --- Profile Update ---
async function saveProfileSettings(e) {
  e.preventDefault();
  const msgEl = document.getElementById('settingsMsg');
  const btn = document.getElementById('settingsSaveBtn');
  
  const data = {
    name: document.getElementById('settingsName').value.trim(),
    subjects: document.getElementById('settingsSubjects').value.split(',').map(s => s.trim()).filter(Boolean),
    hourlyRate: parseFloat(document.getElementById('settingsRate').value),
    bio: document.getElementById('settingsBio').value.trim(),
    calendlyUrl: document.getElementById('settingsCalendly').value.trim(),
  };

  try {
    btn.textContent = 'Saving…';
    btn.disabled = true;

    const res = await fetch(`${API_BASE}/tutors/${SESSION.tutorId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to update profile');
    
    const result = await res.json();
    
    // Update cache
    if (result.tutor) {
      cachedTutor = { ...cachedTutor, ...result.tutor };
      localStorage.setItem('jm_tutor_name', data.name);
      SESSION.name = data.name;
    }

    msgEl.style.color = '#16a34a';
    msgEl.textContent = '✅ Profile updated successfully!';
    btn.textContent = 'Saved!';
    
    setTimeout(() => {
      closeSettings();
      loadDashboard();
    }, 1500);

  } catch (err) {
    msgEl.style.color = '#dc2626';
    msgEl.textContent = `Error: ${err.message}`;
    btn.textContent = 'Save Changes';
    btn.disabled = false;
  }
}

// --- Add Lesson ---
async function saveLesson(e) {
  e.preventDefault();
  const msgEl = document.getElementById('lessonMsg');
  const btn = e.target.querySelector('button[type="submit"]');

  const data = {
    studentName: document.getElementById('lessonStudent').value.trim(),
    sessionDate: document.getElementById('lessonDate').value,
    timeSlot: document.getElementById('lessonTime').value.trim(),
    sessionType: document.getElementById('lessonType').value,
    status: 'confirmed',
  };

  try {
    btn.textContent = 'Saving…';
    btn.disabled = true;

    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Failed to create lesson');

    msgEl.style.color = '#16a34a';
    msgEl.textContent = '✅ Lesson scheduled successfully!';
    
    setTimeout(() => {
      closeLessonModal();
      loadDashboard();
    }, 1500);

  } catch (err) {
    msgEl.style.color = '#dc2626';
    msgEl.textContent = `Error: ${err.message}`;
    btn.textContent = 'Add Lesson';
    btn.disabled = false;
  }
}

// --- Mark Attendance ---
async function markAttendance(bookingId) {
  if (!bookingId) {
    showToast('Cannot mark attendance: No booking ID', 'error');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}/attendance`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ attended: true }),
    });

    if (!res.ok) throw new Error('Failed to mark attendance');
    
    showToast('✅ Attendance marked!', 'success');
    loadDashboard();

  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

// --- View Student ---
function viewStudent(name) {
  const modal = document.getElementById('studentModal');
  const content = document.getElementById('studentDetailContent');
  
  const studentBookings = cachedBookings.filter(b => b.studentName === name);
  
  content.innerHTML = `
    <h2>${escapeHTML(name)}</h2>
    <p class="modal-sub">${studentBookings.length} sessions</p>
    <div style="margin-bottom:16px;">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:8px;">Session History</h3>
      ${studentBookings.map(b => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
          <span>${formatShortDate(b.sessionDate)}</span>
          <span>${b.timeSlot || '—'}</span>
          <span style="color:${b.status === 'confirmed' ? '#16a34a' : '#6b7280'}">${b.status || '—'}</span>
        </div>
      `).join('') || '<p style="color:#9ca3af;">No sessions yet</p>'}
    </div>
  `;
  
  modal.style.display = 'flex';
}

/* ════════════════════════════════════
   19. MODAL CONTROLS
════════════════════════════════════ */

// Settings Modal
function openSettings(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'flex';

  if (cachedTutor) {
    document.getElementById('settingsName').value = cachedTutor.name || '';
    document.getElementById('settingsSubjects').value = (cachedTutor.subjects || []).join(', ');
    document.getElementById('settingsRate').value = cachedTutor.hourlyRate || '';
    document.getElementById('settingsBio').value = cachedTutor.bio || '';
    document.getElementById('settingsCalendly').value = cachedTutor.calendlyUrl || localStorage.getItem('jm_tutor_calendly') || '';
  }
  document.getElementById('settingsMsg').textContent = '';
}

function closeSettings() {
  document.getElementById('settingsModal').style.display = 'none';
}

// Lesson Modal
function openLessonModal() {
  document.getElementById('lessonModal').style.display = 'flex';
  document.getElementById('lessonDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('lessonMsg').textContent = '';
}

function closeLessonModal() {
  document.getElementById('lessonModal').style.display = 'none';
}

// Student Modal
function closeStudentModal() {
  document.getElementById('studentModal').style.display = 'none';
}

// Close modals on backdrop click
document.querySelectorAll('#settingsModal, #lessonModal, #studentModal').forEach(modal => {
  modal.addEventListener('click', function(e) {
    if (e.target === this) {
      this.style.display = 'none';
    }
  });
});

/* ════════════════════════════════════
   20. MAIN LOAD
════════════════════════════════════ */
async function loadDashboard() {
  setTopbarDate();
  applyNameFromStorage();
  showTab('dashboard');

  // Show loading state in stats
  const statElements = ['statToday', 'statSessions', 'statRating', 'statRate'];
  statElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '…';
  });

  try {
    const [tutor, bookings] = await Promise.all([
      fetchTutorProfile(),
      fetchBookings(),
    ]);

    cachedTutor = tutor;
    cachedBookings = bookings || [];
    
    applyProfile(tutor);
    renderLessons(cachedBookings);
    setTimeout(renderChart, 300);
  } catch (err) {
    console.warn('Dashboard load error:', err.message);
    // Still show the dashboard with whatever we have
    if (cachedTutor) applyProfile(cachedTutor);
    if (cachedBookings.length) renderLessons(cachedBookings);
  }
}

/* ════════════════════════════════════
   21. SIDEBAR NAV EVENT LISTENERS
════════════════════════════════════ */
document.querySelectorAll('.sb-item[data-page]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    showTab(item.dataset.page);
    if (window.innerWidth < 1024) closeSidebar();
  });
});

/* ════════════════════════════════════
   22. BOOT
════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', loadDashboard);