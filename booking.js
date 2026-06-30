/* ─────────────────────────────────────────
   booking.js  –  Tutor Booking Page Logic
   Fully connected to Jaromind Backend API
───────────────────────────────────────── */

// ── CONFIG ────────────────────────────────


//const API_BASE = 'https://jaromind-production-3060.up.railway.app';
const API_BASE = 'http://localhost:8080'; // Uncomment for local development


// Read JWT from wherever your app stores it (localStorage key must match your auth flow)
function getAuthToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`,
  };
}

// ── STATE ─────────────────────────────────

let tutors             = [];      // Loaded from API
let selectedTutor      = null;
let selectedDate       = null;
let selectedTime       = null;
let selectedSessionType = '1:1';
let currentMonth       = new Date();
let activeTag          = 'All';
let searchQuery        = '';
let availableSlots     = [];      // Loaded from API when date is picked
let isLoadingTutors    = false;
let isLoadingSlots     = false;
let isSubmitting       = false;

// ── AVATAR COLOURS (cosmetic, client-side only) ───────────────────────────────

const avatarColors = ['#dbeafe','#dcfce7','#fef3c7','#ede9fe','#fce7f3','#f0fdf4'];

function avatarBg(index) {
  return avatarColors[index % avatarColors.length];
}

// ── SVG HELPERS ───────────────────────────

function starSVG() {
  return `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
}
function calSVG() {
  return `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
}
function dotSVG() {
  return `<svg fill="currentColor" viewBox="0 0 24 24" width="10" height="10"><circle cx="12" cy="12" r="10"/></svg>`;
}
function spinnerSVG() {
  return `<svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
}

// ── API CALLS ─────────────────────────────

/**
 * Fetch tutors from the backend.
 * Applies subject and search filters server-side.
 */
async function fetchTutors() {
  isLoadingTutors = true;
  renderTutorsSkeleton();

  const params = new URLSearchParams();
  if (activeTag !== 'All') params.set('subject', activeTag);
  if (searchQuery)         params.set('search', searchQuery);

  try {
    const res = await fetch(`${API_BASE}/tutors?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    tutors = data.tutors || [];
  } catch (err) {
    console.error('Failed to fetch tutors:', err);
    tutors = [];
    showTutorError('Could not load tutors. Please check your connection.');
    return;
  } finally {
    isLoadingTutors = false;
  }

  renderTutors();
}

/**
 * Fetch availability slots for the selected tutor on the selected date.
 * Called every time selectedDate changes (after a tutor is chosen).
 */
async function fetchAvailability() {
  if (!selectedTutor || !selectedDate) return;

  isLoadingSlots = true;
  renderTimeSlotsLoading();

  const dateStr = formatDateForAPI(selectedDate); // "YYYY-MM-DD"

  try {
    const res = await fetch(
      `${API_BASE}/tutors/${selectedTutor.tutorId}/availability?date=${dateStr}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // data.slots = [{ slot: "9:00 AM", available: true }, ...]
    availableSlots = data.slots || [];
  } catch (err) {
    console.error('Failed to fetch availability:', err);
    availableSlots = [];
  } finally {
    isLoadingSlots = false;
  }

  renderTimeSlots();
}

/**
 * Submit the booking to the backend.
 */
async function submitBooking() {
  if (isSubmitting) return;

  // Guard: must be logged in
  if (!getAuthToken()) {
    showToast('Please log in to book a session.', 'error');
    return;
  }

  if (!selectedTutor)  { showToast('Please select a tutor.', 'error');      return; }
  if (!selectedDate)   { showToast('Please pick a date.', 'error');          return; }
  if (!selectedTime)   { showToast('Please choose a time slot.', 'error');   return; }

  isSubmitting = true;
  setConfirmBtnLoading(true);

  const payload = {
    tutorId:       selectedTutor.tutorId,
    sessionType:   selectedSessionType,
    sessionDate:   formatDateForAPI(selectedDate),  // "YYYY-MM-DD"
    timeSlot:      selectedTime,
    studentName:   getUserName(),   // pulled from token / local storage
    studentEmail:  getUserEmail(),
    paymentMethod: 'card',          // extend with a UI picker if needed
  };

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      // Show backend error message (e.g. "This time slot is already booked")
      showToast(data.error || 'Booking failed. Please try again.', 'error');
      return;
    }

    // ✅ Success — show confirmation modal with real booking data
    showSuccessModal(data.booking);

    // Refresh availability so the booked slot disappears immediately
    await fetchAvailability();

  } catch (err) {
    console.error('Booking submission failed:', err);
    showToast('Network error. Please try again.', 'error');
  } finally {
    isSubmitting = false;
    setConfirmBtnLoading(false);
  }
}

// ── RENDER: TUTOR LIST ────────────────────

function renderTutorsSkeleton() {
  const list = document.getElementById('tutorsList');
  list.innerHTML = [1,2,3].map(() => `
    <div class="tutor-card" style="pointer-events:none; opacity:.55;">
      <div class="tutor-avatar" style="background:#e5e7eb;">&nbsp;</div>
      <div class="tutor-info">
        <div style="height:14px;background:#e5e7eb;border-radius:6px;width:55%;margin-bottom:8px;"></div>
        <div style="height:11px;background:#f3f4f6;border-radius:6px;width:35%;"></div>
      </div>
    </div>`).join('');
}

function showTutorError(msg) {
  document.getElementById('tutorsList').innerHTML = `
    <div class="empty-state">
      <div class="icon">⚠️</div>
      <p>${msg}</p>
    </div>`;
}

function renderTutors() {
  const list = document.getElementById('tutorsList');

  if (tutors.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <p>No tutors found.<br>Try a different search.</p>
      </div>`;
    return;
  }

  list.innerHTML = tutors.map((t, index) => `
    <div class="tutor-card ${selectedTutor?.tutorId === t.tutorId ? 'selected' : ''}"
         onclick="selectTutor('${t.tutorId}')"
         id="tutor-${t.tutorId}">

      <div class="tutor-avatar" style="background:${avatarBg(index)};">
        ${t.avatarUrl
          ? `<img src="${t.avatarUrl}" alt="${t.name}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`
          : '🧑‍🏫'}
        ${t.isOnline ? '<div class="online-dot"></div>' : ''}
      </div>

      <div class="tutor-info">
        <div class="tutor-top">
          <div>
            <div class="tutor-name">${t.name}</div>
            <div class="tutor-field">${(t.subjects || []).join(' & ')}</div>
          </div>
          <div class="tutor-price">$${t.hourlyRate}<span>/hr</span></div>
        </div>

        <div class="tutor-stats">
          <div class="stat gold">
            ${starSVG()}
            ${t.rating.toFixed(1)} (${t.reviewCount} reviews)
          </div>
          <div class="stat">
            ${calSVG()}
            ${t.sessionCount} sessions
          </div>
          <div class="stat" style="color:${t.isOnline ? '#16a34a' : '#9ca3af'}">
            ${dotSVG()}
            ${t.isOnline ? 'Online now' : 'Offline'}
          </div>
        </div>

        <div class="tutor-tags">
          ${(t.tags || []).map(tag => `<span class="tutor-tag">${tag}</span>`).join('')}
        </div>
      </div>

      <button class="select-btn ${selectedTutor?.tutorId === t.tutorId ? 'chosen' : ''}"
              onclick="event.stopPropagation(); selectTutor('${t.tutorId}')">
        ${selectedTutor?.tutorId === t.tutorId ? '✓ Selected' : 'Select'}
      </button>
    </div>
  `).join('');
}

// ── SELECT TUTOR ──────────────────────────

function selectTutor(tutorId) {
  selectedTutor = tutors.find(t => t.tutorId === tutorId);
  if (!selectedTutor) return;

  renderTutors();

  document.getElementById('noTutorMsg').style.display     = 'none';
  document.getElementById('sessionDetails').style.display = 'block';
  document.getElementById('costPanel').style.display      = 'block';

  // Avatar: real image or emoji fallback
  const avatarEl = document.getElementById('miniAvatar');
  avatarEl.innerHTML = selectedTutor.avatarUrl
    ? `<img src="${selectedTutor.avatarUrl}" alt="${selectedTutor.name}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`
    : '🧑‍🏫';

  document.getElementById('miniName').textContent = selectedTutor.name;
  document.getElementById('miniSub').textContent  = (selectedTutor.subjects || []).join(' & ');

  updateCost();
  renderCalendar();

  // If a date was already chosen, immediately fetch availability for new tutor
  if (selectedDate) {
    fetchAvailability();
  } else {
    renderTimeSlots(); // Show default empty state
  }

  updateSteps(2);
}

// ── TAGS & SEARCH ─────────────────────────

function setTag(el, tag) {
  document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  activeTag = tag;
  fetchTutors(); // Re-fetch from API with new subject filter
}

// Debounced so we don't fire on every keystroke
let searchDebounce = null;
function filterTutors(val) {
  searchQuery = val;
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => fetchTutors(), 350);
}

// ── SESSION TYPE ──────────────────────────

function selectSession(el, type) {
  document.querySelectorAll('.session-type').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  selectedSessionType = type;
  updateCost();
}

// ── CALENDAR ──────────────────────────────

function renderCalendar() {
  const grid  = document.getElementById('calGrid');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  document.getElementById('calMonth').textContent =
    currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const dayLabels   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();

  let html = dayLabels.map(d => `<div class="cal-day-label">${d}</div>`).join('');

  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<button class="cal-day other-month disabled">${prevDays - i}</button>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date      = new Date(year, month, d);
    const isPast    = date < today;
    const isToday   = date.getTime() === today.getTime();
    const isSelected = selectedDate &&
                       selectedDate.getDate()     === d &&
                       selectedDate.getMonth()    === month &&
                       selectedDate.getFullYear() === year;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let cls = 'cal-day';
    if (isPast)               cls += ' disabled';
    if (isToday)              cls += ' today';
    if (isSelected)           cls += ' selected';
    if (isWeekend && !isPast) cls += ' other-month';

    html += `<button class="${cls}" onclick="selectDate(${year}, ${month}, ${d})">${d}</button>`;
  }

  grid.innerHTML = html;
}

function changeMonth(dir) {
  // Don't allow navigating to past months
  const proposed = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + dir, 1);
  const thisMonth = new Date();
  thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
  if (proposed < thisMonth) return;

  currentMonth = proposed;
  renderCalendar();
}

function selectDate(y, m, d) {
  selectedDate = new Date(y, m, d);
  selectedTime = null;
  renderCalendar();
  updateCost();
  updateSteps(selectedTutor ? 3 : 2);

  // Fetch real availability from backend
  fetchAvailability();
}

// ── TIME SLOTS ────────────────────────────

function renderTimeSlotsLoading() {
  const grid = document.getElementById('timeGrid');
  grid.innerHTML = `
    <div style="grid-column:1/-1; text-align:center; padding:16px; color:var(--text-muted); font-size:13px;">
      ${spinnerSVG()} Loading slots…
    </div>`;
}

function renderTimeSlots() {
  const grid = document.getElementById('timeGrid');

  if (!selectedDate) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:12px; color:var(--text-muted); font-size:13px;">
        Pick a date to see available times
      </div>`;
    return;
  }

  if (availableSlots.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:12px; color:var(--text-muted); font-size:13px;">
        No slots available for this date
      </div>`;
    return;
  }

  grid.innerHTML = availableSlots.map(({ slot, available }) => {
    const isSelected = selectedTime === slot;
    let cls = 'time-slot';
    if (!available)  cls += ' unavailable';
    if (isSelected)  cls += ' selected';
    return `<button class="${cls}" onclick="selectTime('${slot}')">${slot}</button>`;
  }).join('');
}

function selectTime(t) {
  selectedTime = t;
  renderTimeSlots();
  updateCost();
}

// ── COST SUMMARY ──────────────────────────

function updateCost() {
  if (!selectedTutor) return;

  const multipliers = { '1:1': 1, 'Group': 0.6, 'Workshop': 0.4 };
  const base  = selectedTutor.hourlyRate * (multipliers[selectedSessionType] ?? 1);
  const total = Math.max(0, base + 2 - 5); // +$2 platform fee, -$5 promo

  document.getElementById('costLabel').textContent = `${selectedSessionType} session (60 min)`;
  document.getElementById('costBase').textContent  = `$${base.toFixed(2)}`;
  document.getElementById('costTotal').textContent = `$${total.toFixed(2)}`;
}

// ── STEPS INDICATOR ───────────────────────

function updateSteps(active) {
  for (let i = 1; i <= 3; i++) {
    const step = document.getElementById(`step${i}`);
    step.className = 'step ' + (i < active ? 'done' : i === active ? 'active' : 'pending');
    if (i < 3) {
      const line = document.getElementById(`line${i}`);
      line.className = 'step-line ' + (i < active ? 'done' : '');
    }
  }
}

// ── CONFIRM BOOKING ───────────────────────

// Called by the Confirm Booking button in the HTML
function confirmBooking() {
  submitBooking(); // Hands off to the async API function
}

function showSuccessModal(booking) {
  // booking comes from the real API response (models.TutorBooking)
  const tutorName  = selectedTutor?.name || '—';
  const dateStr    = selectedDate
    ? selectedDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : booking?.sessionDate || '—';

  document.getElementById('successTutor').textContent = `${tutorName} · ${selectedSessionType} Session`;
  document.getElementById('successDate').textContent  = dateStr;
  document.getElementById('successTime').textContent  = `${booking?.timeSlot || selectedTime} · 60 minutes`;
  document.getElementById('successOverlay').classList.add('show');
}

function closeSuccess() {
  document.getElementById('successOverlay').classList.remove('show');
}

// ── CONFIRM BUTTON LOADING STATE ──────────

function setConfirmBtnLoading(loading) {
  const btn = document.querySelector('.btn-confirm');
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `${spinnerSVG()} Confirming…`;
  } else {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Confirm Booking`;
  }
}

// ── TOAST NOTIFICATION ────────────────────

function showToast(message, type = 'info') {
  // Remove any existing toast
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const colors = {
    error:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
    success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:300;
    background:${c.bg}; border:1.5px solid ${c.border}; color:${c.text};
    padding:14px 20px; border-radius:10px; font-size:14px; font-weight:600;
    box-shadow:0 4px 20px rgba(0,0,0,0.1); max-width:320px;
    animation:fadeSlideUp .25s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

// ── SPINNER CSS ───────────────────────────
// Injected once so booking.css stays clean

(function injectSpinnerStyle() {
  if (document.getElementById('spin-style')) return;
  const style = document.createElement('style');
  style.id = 'spin-style';
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin .8s linear infinite; display:inline-block; vertical-align:middle; }
  `;
  document.head.appendChild(style);
})();

// ── USER INFO HELPERS ─────────────────────
// Reads name/email from localStorage (adjust keys to match your auth flow)

function getUserName() {
  return localStorage.getItem('userName')
      || localStorage.getItem('name')
      || 'Student';
}

function getUserEmail() {
  return localStorage.getItem('userEmail')
      || localStorage.getItem('email')
      || '';
}

// ── DATE HELPER ───────────────────────────

function formatDateForAPI(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // "YYYY-MM-DD"
}

// ── SIDEBAR (mobile) ──────────────────────

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ── INIT ──────────────────────────────────

// Kick off with real data from the backend
fetchTutors();
renderCalendar();