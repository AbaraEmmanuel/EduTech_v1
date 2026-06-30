/* ═══════════════════════════════════════════════════════════════
   JM TUTORS — TUTOR DASHBOARD JAVASCRIPT
   Connects to: http://localhost:8080
   Endpoints used:
     GET /tutors/:id          → profile, stats
     GET /bookings            → today + upcoming lessons, chart data
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ════════════════════════════════════
   1. CONFIG & SESSION
════════════════════════════════════ */
const API_BASE = 'http://localhost:8080';

const SESSION = {
  token:   localStorage.getItem('jm_tutor_token'),
  tutorId: localStorage.getItem('jm_tutor_id'),
  name:    localStorage.getItem('jm_tutor_name') || 'Tutor',
  email:   localStorage.getItem('jm_tutor_email') || '',
};

/* Auth guard — redirect if no token */
if (!SESSION.token) {
  window.location.href = 'tutor-login.html';
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

/* Close sidebar on Escape key */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSidebar();
});

/* Close sidebar when a nav link is clicked on mobile */
document.querySelectorAll('.sb-item[data-page]').forEach((item) => {
  item.addEventListener('click', () => {
    if (window.innerWidth < 1024) closeSidebar();
  });
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
  const res  = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
    ...options,
  });

  /* Handle 401 → force re-login */
  if (res.status === 401) {
    signOut();
    return null;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }

  return data;
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
  // Strip time — compare date only
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

/* ════════════════════════════════════
   7. APPLY SESSION NAME (FALLBACK)
════════════════════════════════════ */
function applyNameFromStorage() {
  const name  = SESSION.name;
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
   GET /tutors/:id  (public endpoint)
════════════════════════════════════ */
async function fetchTutorProfile() {
  if (!SESSION.tutorId) {
    applyNameFromStorage();
    return null;
  }

  try {
    const data = await apiFetch(`/tutors/${SESSION.tutorId}`);
    if (!data || !data.success) throw new Error(data?.error || 'Profile not found');
    return data.tutor;
  } catch (err) {
    showToast(`Could not load profile: ${err.message}`);
    applyNameFromStorage();
    return null;
  }
}

/* ════════════════════════════════════
   9. APPLY PROFILE TO UI
════════════════════════════════════ */
function applyProfile(tutor) {
  if (!tutor) return;

  const name  = tutor.name || SESSION.name;
  const first = name.split(' ')[0];
  const init  = getInitial(name);

  /* Cache fresh name */
  localStorage.setItem('jm_tutor_name', name);
  SESSION.name = name;

  setNameUI(first, name, init);

  /* Stat cards */
  setText('statSessions', tutor.sessionCount ?? '–');
  setText('statRating',   tutor.rating ? tutor.rating.toFixed(1) : '–');
  setText('statReviews',  `${tutor.reviewCount ?? 0} review${tutor.reviewCount === 1 ? '' : 's'}`);
  setText('statRate',     tutor.hourlyRate ? `$${tutor.hourlyRate}` : '–');

  /* Profile strip */
  const strip = document.getElementById('profileStrip');
  if (strip) {
    strip.style.display = 'flex';
    setContent('profileInit',     init);
    setText('profileName',        name);
    setText('profileSubjects',    (tutor.subjects || []).slice(0, 3).join(', ') || '–');
    setText('profileRating',      tutor.rating ? tutor.rating.toFixed(1) : '–');
    setText('profileReviews',     `(${tutor.reviewCount ?? 0})`);
    setText('profileSessions',    tutor.sessionCount ?? '–');
    setText('profileRate',        tutor.hourlyRate ? `$${tutor.hourlyRate}` : '–');
  }
}

/* ════════════════════════════════════
   10. FETCH BOOKINGS
   GET /bookings  (JWT protected)
   Returns BookingSummary[] → we extract .booking
════════════════════════════════════ */
async function fetchBookings() {
  try {
    const data = await apiFetch('/bookings');
    if (!data || !data.success) throw new Error(data?.error || 'Failed to load bookings');

    /* data.bookings is BookingSummary[] {booking, tutor} */
    const raw = data.bookings || [];
    return raw.map((b) => b.booking || b);
  } catch (err) {
    showToast(`Bookings: ${err.message}`);
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
    </div>`;
}

function buildEmptyState(icon, message) {
  return `
    <div class="empty-state">
      <span class="empty-state-icon">${icon}</span>
      ${message}
    </div>`;
}

/* Simple XSS guard */
function escapeHTML(str) {
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

  /* Stat card */
  setText('statToday',     todayArr.length.toString());
  setText('statTodayHint',
    todayArr.length === 0
      ? 'No sessions today'
      : `Next: ${todayArr[0].timeSlot || 'today'}`
  );

  /* Today */
  const todayEl = document.getElementById('todayLessons');
  if (todayEl) {
    todayEl.innerHTML = todayArr.length
      ? todayArr.map(buildLessonHTML).join('')
      : buildEmptyState('📅', 'No bookings today');
  }

  /* Upcoming */
  const upcomEl = document.getElementById('upcomingLessons');
  if (upcomEl) {
    upcomEl.innerHTML = upcomArr.length
      ? upcomArr.map(buildLessonHTML).join('')
      : buildEmptyState('🔭', 'No upcoming bookings');
  }
}

/* ════════════════════════════════════
   13. CHART — SESSION ACTIVITY
════════════════════════════════════ */
let chartMode   = 'sessions';   /* 'sessions' | 'earnings' */
let chartPeriod = 'week';       /* 'week' | 'month' */
let chartInstance = null;
let cachedBookings = [];

function buildChartData() {
  const now    = new Date();
  const labels = [];
  const values = [];

  if (chartPeriod === 'week') {
    /* Last 7 days */
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      labels.push(day.toLocaleDateString('en-GB', { weekday: 'short' }));

      const dayBookings = cachedBookings.filter((b) => {
        if (b.status === 'cancelled') return false;
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
    /* Last 8 weeks */
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      labels.push(`W${8 - i}`);

      const weekBookings = cachedBookings.filter((b) => {
        if (b.status === 'cancelled') return false;
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

  const ctx  = canvas.getContext('2d');
  const { labels, values } = buildChartData();

  /* Gradient fill */
  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, 'rgba(37,99,235,.20)');
  grad.addColorStop(1, 'rgba(37,99,235,0)');

  if (chartInstance) chartInstance.destroy();

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
                ? `  $${ctx.raw.toFixed(2)}`
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
              chartMode === 'earnings' ? `$${v}` : `${v}`,
          },
        },
      },
    },
  });
}

/* Toggle chart mode (Sessions / Earnings) */
function setMode(mode, btn) {
  chartMode = mode;
  document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderChart();
}

/* Toggle chart period (Week / Month) */
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
   16. MAIN LOAD — orchestrates all fetches
════════════════════════════════════ */
async function loadDashboard() {
  /* Set date immediately */
  setTopbarDate();

  /* Apply stored name right away so UI isn't blank */
  applyNameFromStorage();

  /* Fetch profile + bookings in parallel */
  const [tutor, bookings] = await Promise.all([
    fetchTutorProfile(),
    fetchBookings(),
  ]);

  /* Apply profile data */
  applyProfile(tutor);

  /* Render bookings */
  cachedBookings = bookings;
  renderLessons(bookings);
  renderChart();
}

function openSettings(e) {
  e.preventDefault();
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'flex';

  // Pre-fill with saved value if available
  const saved = localStorage.getItem('jm_tutor_calendly');
  if (saved) {
    document.getElementById('calendlyInput').value = saved;
  }
}

function closeSettings() {
  document.getElementById('settingsModal').style.display = 'none';
  document.getElementById('settingsMsg').textContent = '';
}

// Close modal when clicking backdrop
document.getElementById('settingsModal').addEventListener('click', function(e) {
  if (e.target === this) closeSettings();
});

async function saveCalendlyLink() {
  const url    = document.getElementById('calendlyInput').value.trim();
  const msgEl  = document.getElementById('settingsMsg');
  const btn    = document.getElementById('saveSettingsBtn');

  // Basic validation
  if (!url) {
    msgEl.style.color = '#dc2626';
    msgEl.textContent = 'Please enter your Calendly URL.';
    return;
  }
  if (!url.startsWith('https://calendly.com/')) {
    msgEl.style.color = '#dc2626';
    msgEl.textContent = 'URL must start with https://calendly.com/';
    return;
  }

  btn.textContent = 'Saving…';
  btn.disabled    = true;

  try {
    // PATCH your tutor profile with the new calendlyUrl
    const res = await fetch(`${API_BASE}/tutors/${SESSION.tutorId}`, {
      method:  'PATCH',
      headers: authHeaders(),
      body:    JSON.stringify({ calendlyUrl: url }),
    });

    if (!res.ok) throw new Error('Failed to save');

    // Cache locally so we don't need to re-fetch
    localStorage.setItem('jm_tutor_calendly', url);

    msgEl.style.color   = '#16a34a';
    msgEl.textContent   = '✓ Saved! Students can now book sessions with you.';
    btn.textContent     = 'Saved';

    setTimeout(closeSettings, 1800);

  } catch (err) {
    msgEl.style.color = '#dc2626';
    msgEl.textContent = `Error: ${err.message}`;
    btn.textContent   = 'Save';
    btn.disabled      = false;
  }
}

/* ════════════════════════════════════
   17. BOOT
════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', loadDashboard);