/* ═══════════════════════════════════════════════════════════════
   JM TUTORS — BOOKING PAGE JAVASCRIPT
   API Base: https://jaromind.onrender.com
   Endpoints:
     GET  /tutors?subject=&search=&isOnline=  → tutor list
     GET  /tutors/:id/availability?date=       → time slots
     POST /bookings                            → create booking (JWT)

   FIX: studentEmail & studentName are collected from a form
        (panel #2) before submission — never blank/invalid.
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ════════════════════════════════════
   1. CONFIG
════════════════════════════════════ */
const API_BASE = 'https://jaromind.onrender.com';

/* ════════════════════════════════════
   2. STATE
════════════════════════════════════ */
let tutors          = [];
let selectedTutor   = null;
let selectedDate    = null;
let selectedTime    = null;
let sessionType     = '1:1';
let availableSlots  = [];
let currentMonth    = new Date();
let activeTag       = 'All';
let searchQuery     = '';
let onlineOnly      = false;
let searchTimer     = null;
let isLoadingTutors = false;
let isLoadingSlots  = false;
let isSubmitting    = false;

/* ════════════════════════════════════
   3. AUTH
════════════════════════════════════ */
function getToken() {
  /* Check all common keys your app might use */
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('jm_token') ||
    localStorage.getItem('jm_tutor_token') ||
    ''
  );
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

/* ════════════════════════════════════
   4. SIDEBAR — MOBILE
════════════════════════════════════ */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('visible');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSidebar();
});

/* ════════════════════════════════════
   5. TOAST
════════════════════════════════════ */
let toastTimer = null;

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toastMsg');
  const icon  = document.getElementById('toastIcon');

  const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
  icon.textContent  = icons[type] || icons.info;
  msgEl.textContent = msg;

  toast.className = `toast ${type} show`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
  const toast = document.getElementById('toast');
  if (toast) toast.classList.remove('show');
}

/* ════════════════════════════════════
   6. HELPERS — DOM
════════════════════════════════════ */
function qs(id)         { return document.getElementById(id); }
function show(id)       { const el = qs(id); if (el) el.style.display = ''; }
function hide(id)       { const el = qs(id); if (el) el.style.display = 'none'; }
function showEl(id, d)  { const el = qs(id); if (el) el.style.display = d || 'block'; }
function setText(id, v) { const el = qs(id); if (el) el.textContent = v; }
function escHTML(s)     {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ════════════════════════════════════
   7. HELPERS — AVATAR
════════════════════════════════════ */
const PALETTE = [
  '#dbeafe','#dcfce7','#fef3c7','#ede9fe',
  '#fce7f3','#f0fdf4','#fff7ed','#f0fdfa',
];

function bgColor(idx) { return PALETTE[idx % PALETTE.length]; }

function avatarHTML(tutor, idx) {
  if (tutor.avatarUrl) {
    return `<img src="${escHTML(tutor.avatarUrl)}" alt="${escHTML(tutor.name)}" loading="lazy">`;
  }
  return '🧑‍🏫';
}

/* ════════════════════════════════════
   8. HELPERS — DATE
════════════════════════════════════ */
function toAPIDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function friendlyDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

/* ════════════════════════════════════
   9. FETCH TUTORS  GET /tutors
════════════════════════════════════ */
async function fetchTutors() {
  if (isLoadingTutors) return;
  isLoadingTutors = true;
  renderSkeleton();

  const params = new URLSearchParams();
  if (activeTag !== 'All') params.set('subject', activeTag);
  if (searchQuery)         params.set('search',  searchQuery);
  if (onlineOnly)          params.set('isOnline', 'true');

  try {
    const res  = await fetch(`${API_BASE}/tutors?${params}`);
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    const data = await res.json();
    tutors = data.tutors || [];
    renderTutors();
  } catch (err) {
    renderError(`Could not load tutors: ${err.message}`);
  } finally {
    isLoadingTutors = false;
  }
}

/* ════════════════════════════════════
   10. FETCH AVAILABILITY  GET /tutors/:id/availability?date=
════════════════════════════════════ */
async function fetchAvailability() {
  if (!selectedTutor || !selectedDate) return;
  isLoadingSlots = true;
  renderSlotsLoading();

  try {
    const dateStr = toAPIDate(selectedDate);
    const res  = await fetch(
      `${API_BASE}/tutors/${encodeURIComponent(selectedTutor.tutorId)}/availability?date=${dateStr}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    availableSlots = data.slots || [];
  } catch (err) {
    showToast(`Could not load slots: ${err.message}`, 'error');
    availableSlots = [];
  } finally {
    isLoadingSlots = false;
    renderTimeSlots();
  }
}

/* ════════════════════════════════════
   11. SUBMIT BOOKING  POST /bookings
   ─────────────────────────────────
   Collects studentName + studentEmail
   from the form in Panel 2 — this is
   the fix for the validation error.
════════════════════════════════════ */
async function submitBooking() {
  if (isSubmitting) return;

  /* Guard: auth */
  if (!getToken()) {
    showToast('Please log in to book a session.', 'error');
    return;
  }

  /* Guard: selections */
  if (!selectedTutor) { showToast('Please select a tutor.',      'error'); return; }
  if (!selectedDate)  { showToast('Please pick a date.',         'error'); return; }
  if (!selectedTime)  { showToast('Please choose a time slot.',  'error'); return; }

  /* ── Collect + validate form fields (panel 2) ── */
  const nameEl  = qs('fieldName');
  const emailEl = qs('fieldEmail');
  const phoneEl = qs('fieldPhone');
  const notesEl = qs('fieldNotes');

  const studentName  = nameEl?.value.trim()  || '';
  const studentEmail = emailEl?.value.trim() || '';
  const studentPhone = phoneEl?.value.trim() || '';
  const notes        = notesEl?.value.trim() || '';

  /* Clear previous errors */
  setText('errName',  '');
  setText('errEmail', '');
  nameEl?.classList.remove('has-error');
  emailEl?.classList.remove('has-error');

  let hasError = false;

  if (!studentName) {
    setText('errName', 'Full name is required.');
    nameEl?.classList.add('has-error');
    hasError = true;
  }

  if (!studentEmail) {
    setText('errEmail', 'Email address is required.');
    emailEl?.classList.add('has-error');
    hasError = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
    setText('errEmail', 'Please enter a valid email address.');
    emailEl?.classList.add('has-error');
    hasError = true;
  }

  if (hasError) {
    showToast('Please fix the highlighted fields.', 'error');
    /* Scroll panel into view */
    qs('panelStudent')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  /* ── Submit ── */
  isSubmitting = true;
  setConfirmLoading(true);

  const payload = {
    tutorId:       selectedTutor.tutorId,
    sessionType,
    sessionDate:   toAPIDate(selectedDate),   /* "YYYY-MM-DD" — required */
    timeSlot:      selectedTime,
    studentName,                              /* collected from form */
    studentEmail,                             /* collected from form — fixes validation */
    studentPhone,
    notes,
    paymentMethod: 'card',
  };

  try {
    const res  = await fetch(`${API_BASE}/bookings`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showToast(data.error || data.message || 'Booking failed. Please try again.', 'error');
      return;
    }

    /* ✅ Success */
    showSuccessModal(data.booking || {});
    /* Refresh slots so booked slot disappears */
    await fetchAvailability();

  } catch (err) {
    showToast(`Network error: ${err.message}`, 'error');
  } finally {
    isSubmitting = false;
    setConfirmLoading(false);
  }
}

/* ════════════════════════════════════
   12. RENDER — SKELETON
════════════════════════════════════ */
function renderSkeleton() {
  qs('tutorsList').innerHTML = [0,1,2].map(() => `
    <div class="tutor-skel">
      <div class="skel skel-av"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;padding:4px 0">
        <div class="skel skel-row" style="width:55%"></div>
        <div class="skel skel-row" style="width:35%"></div>
        <div class="skel skel-row" style="width:70%;height:11px"></div>
      </div>
    </div>`).join('');
}

/* ════════════════════════════════════
   13. RENDER — ERROR STATE
════════════════════════════════════ */
function renderError(msg) {
  qs('tutorsList').innerHTML = `
    <div class="error-state">
      <div class="state-icon">⚠️</div>
      <p>${escHTML(msg)}</p>
      <button onclick="fetchTutors()" style="margin-top:12px;padding:7px 18px;background:var(--accent);color:#fff;border-radius:8px;font-size:13px;font-weight:700">
        Retry
      </button>
    </div>`;
}

/* ════════════════════════════════════
   14. RENDER — TUTOR CARDS
════════════════════════════════════ */
function renderTutors() {
  const list = qs('tutorsList');

  if (!tutors.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="state-icon">🔍</div>
        <p>No tutors found.<br>Try a different search or filter.</p>
      </div>`;
    return;
  }

  list.innerHTML = tutors.map((t, i) => {
    const isSelected = selectedTutor?.tutorId === t.tutorId;
    const rating     = (t.rating || 0).toFixed(1);
    const subjects   = (t.subjects || []).join(' · ');
    const tags       = (t.tags || []).slice(0, 4).map(
      tag => `<span class="tutor-tag">${escHTML(tag)}</span>`
    ).join('');

    const onlineClass = t.isOnline ? 'online' : 'offline';
    const onlineText  = t.isOnline ? 'Online now' : 'Offline';
    const onlineDot   = t.isOnline
      ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:3px"></span>`
      : `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#d1d5db;margin-right:3px"></span>`;

    return `
      <div
        class="tutor-card ${isSelected ? 'selected' : ''}"
        id="tcard-${t.tutorId}"
        onclick="selectTutor('${escHTML(t.tutorId)}')"
        role="button"
        tabindex="0"
        aria-pressed="${isSelected}"
        onkeydown="if(event.key==='Enter')selectTutor('${escHTML(t.tutorId)}')"
      >
        <div class="tutor-av" style="background:${bgColor(i)}">
          ${avatarHTML(t, i)}
          ${t.isOnline ? '<div class="online-badge"></div>' : ''}
        </div>

        <div class="tutor-body">
          <div class="tutor-top">
            <div>
              <div class="tutor-name">${escHTML(t.name)}</div>
              <div class="tutor-field">${escHTML(subjects)}</div>
            </div>
            <div class="tutor-price">$${t.hourlyRate}<span>/hr</span></div>
          </div>

          <div class="tutor-stats">
            <span class="tstat gold">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              ${rating} (${t.reviewCount || 0})
            </span>
            <span class="tstat">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              ${t.sessionCount || 0} sessions
            </span>
            <span class="tstat ${onlineClass}">
              ${onlineDot}${onlineText}
            </span>
          </div>

          ${tags ? `<div class="tutor-tags">${tags}</div>` : ''}
        </div>

        <button
          class="select-btn ${isSelected ? 'chosen' : ''}"
          onclick="event.stopPropagation(); selectTutor('${escHTML(t.tutorId)}')"
          aria-label="Select ${escHTML(t.name)}"
        >
          ${isSelected ? '✓ Selected' : 'Select'}
        </button>
      </div>`;
  }).join('');
}

/* ════════════════════════════════════
   15. SELECT TUTOR
════════════════════════════════════ */
function selectTutor(tutorId) {
  selectedTutor = tutors.find(t => t.tutorId === tutorId) || null;
  if (!selectedTutor) return;

  renderTutors();

  /* Show session form */
  hide('emptyPick');
  showEl('sessionForm');

  /* Mini tutor card */
  const av = qs('miniAv');
  if (av) {
    av.innerHTML = selectedTutor.avatarUrl
      ? `<img src="${escHTML(selectedTutor.avatarUrl)}" alt="${escHTML(selectedTutor.name)}">`
      : '🧑‍🏫';
  }
  setText('miniName', selectedTutor.name);
  setText('miniSub',  (selectedTutor.subjects || []).join(' · '));

  updateCost();
  renderCalendar();

  /* Show detail panels */
  showEl('panelStudent');
  updateCost();

  /* Pre-fill form from localStorage if available */
  prefillStudentForm();

  if (selectedDate) {
    fetchAvailability();
  } else {
    qs('timeGrid').innerHTML = `<div class="time-hint">Pick a date to see available times</div>`;
  }

  updateSteps(2);

  /* Scroll to panel on mobile */
  if (window.innerWidth < 1024) {
    qs('panelSession')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* Pre-fill student form from localStorage */
function prefillStudentForm() {
  const nameEl  = qs('fieldName');
  const emailEl = qs('fieldEmail');

  if (nameEl && !nameEl.value) {
    nameEl.value =
      localStorage.getItem('userName') ||
      localStorage.getItem('name') ||
      localStorage.getItem('jm_tutor_name') || '';
  }

  if (emailEl && !emailEl.value) {
    emailEl.value =
      localStorage.getItem('userEmail') ||
      localStorage.getItem('email') ||
      localStorage.getItem('jm_tutor_email') || '';
  }
}

/* Clear selected tutor */
function clearTutor() {
  selectedTutor = null;
  selectedDate  = null;
  selectedTime  = null;
  renderTutors();
  showEl('emptyPick');
  hide('sessionForm');
  hide('panelStudent');
  hide('panelCost');
  updateSteps(1);
}

/* ════════════════════════════════════
   16. SEARCH & FILTER
════════════════════════════════════ */
function onSearchInput(val) {
  searchQuery = val;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchTutors, 380);
}

function setTag(el, tag) {
  document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  activeTag = tag;
  fetchTutors();
}

function toggleOnlineFilter() {
  onlineOnly = !onlineOnly;
  const btn   = document.querySelector('.filter-btn');
  const label = qs('filterBtnLabel');
  if (btn)   btn.classList.toggle('active', onlineOnly);
  if (label) label.textContent = onlineOnly ? 'Online ✓' : 'Filter';
  fetchTutors();
}

/* ════════════════════════════════════
   17. SESSION TYPE
════════════════════════════════════ */
function selectSessionType(el) {
  document.querySelectorAll('.stype').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  sessionType = el.dataset.type || '1:1';
  updateCost();
}

/* ════════════════════════════════════
   18. CALENDAR
════════════════════════════════════ */
function renderCalendar() {
  const grid    = qs('calGrid');
  const label   = qs('calMonthLabel');
  const today   = new Date();
  today.setHours(0,0,0,0);

  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  if (label) {
    label.textContent = currentMonth.toLocaleString('default', {
      month: 'long', year: 'numeric',
    });
  }

  const dayLabels   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();

  let html = dayLabels.map(d => `<div class="cal-lbl">${d}</div>`).join('');

  /* Padding from previous month */
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month">${prevDays - i}</div>`;
  }

  /* Current month days */
  for (let d = 1; d <= daysInMonth; d++) {
    const date      = new Date(year, month, d);
    const isPast    = date < today;
    const isTodayD  = date.getTime() === today.getTime();
    const isSel     = selectedDate &&
                      selectedDate.getDate()     === d &&
                      selectedDate.getMonth()    === month &&
                      selectedDate.getFullYear() === year;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    let cls = 'cal-day';
    if (isPast)                     cls += ' disabled';
    if (isTodayD)                   cls += ' today';
    if (isSel)                      cls += ' selected';
    if (isWeekend && !isPast)       cls += ' weekend';

    const attrs = isPast
      ? `aria-disabled="true"`
      : `onclick="selectDay(${year},${month},${d})" tabindex="0"
         onkeydown="if(event.key==='Enter')selectDay(${year},${month},${d})"`;

    html += `<div class="${cls}" ${attrs} role="button" aria-label="${d} ${label?.textContent || ''}">${d}</div>`;
  }

  if (grid) grid.innerHTML = html;
}

function changeMonth(dir) {
  const proposed  = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + dir, 1);
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
  if (proposed < thisMonth) return;
  currentMonth = proposed;
  renderCalendar();
}

function selectDay(y, m, d) {
  selectedDate = new Date(y, m, d);
  selectedTime = null;
  renderCalendar();
  updateCost();
  showEl('panelCost');
  updateSteps(selectedTutor ? 3 : 2);
  fetchAvailability();
}

/* ════════════════════════════════════
   19. TIME SLOTS
════════════════════════════════════ */
function renderSlotsLoading() {
  qs('timeGrid').innerHTML = `
    <div class="slots-loading">
      <svg class="spin" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Loading available times…
    </div>`;
}

function renderTimeSlots() {
  const grid = qs('timeGrid');
  if (!grid) return;

  if (!selectedDate) {
    grid.innerHTML = `<div class="time-hint">Pick a date to see available times</div>`;
    return;
  }

  if (!availableSlots.length) {
    grid.innerHTML = `<div class="time-hint">No slots available for this date</div>`;
    return;
  }

  grid.innerHTML = availableSlots.map(({ slot, available }) => {
    const isSel = selectedTime === slot;
    let cls = 'time-slot';
    if (!available) cls += ' unavailable';
    if (isSel)      cls += ' selected';
    const attrs = available
      ? `onclick="selectTime('${escHTML(slot)}')" tabindex="0"
         onkeydown="if(event.key==='Enter')selectTime('${escHTML(slot)}')"
         aria-label="${escHTML(slot)} ${available ? '' : '(unavailable)'}"
         aria-pressed="${isSel}"`
      : `aria-disabled="true"`;
    return `<button class="${cls}" ${attrs}>${escHTML(slot)}</button>`;
  }).join('');
}

function selectTime(t) {
  selectedTime = t;
  renderTimeSlots();
  updateCost();
  /* Show cost panel and student details panel */
  showEl('panelStudent');
  showEl('panelCost');
  updateSteps(3);
  /* Scroll to student panel */
  if (window.innerWidth < 1024) {
    qs('panelStudent')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ════════════════════════════════════
   20. COST CALC
════════════════════════════════════ */
const MULTIPLIERS = { '1:1': 1, 'Group': 0.6, 'Workshop': 0.4 };
const PLATFORM_FEE   = 2.00;
const PROMO_DISCOUNT = 5.00;

function updateCost() {
  if (!selectedTutor) return;

  const multi  = MULTIPLIERS[sessionType] ?? 1;
  const base   = selectedTutor.hourlyRate * multi;
  const total  = Math.max(0, base + PLATFORM_FEE - PROMO_DISCOUNT);

  const typeLabel = sessionType === '1:1' ? '1-on-1' : sessionType;
  setText('costLabel', `${typeLabel} session (60 min)`);
  setText('costBase',  `$${base.toFixed(2)}`);
  setText('costTotal', `$${total.toFixed(2)}`);
}

/* ════════════════════════════════════
   21. STEPS
════════════════════════════════════ */
function updateSteps(active) {
  for (let i = 1; i <= 3; i++) {
    const step = qs(`step${i}`);
    if (!step) continue;
    step.className = 'step ' + (i < active ? 'done' : i === active ? 'active' : 'pending');
    if (i < 3) {
      const line = qs(`line${i}`);
      if (line) line.className = 'step-line ' + (i < active ? 'done' : '');
    }
  }
}

/* ════════════════════════════════════
   22. CONFIRM / SUBMIT
════════════════════════════════════ */
function confirmBooking() {
  submitBooking();
}

function setConfirmLoading(loading) {
  const btn = qs('confirmBtn');
  if (!btn) return;
  if (loading) {
    btn.disabled   = true;
    btn.innerHTML  = `
      <svg class="spin" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Confirming…`;
  } else {
    btn.disabled  = false;
    btn.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Confirm Booking`;
  }
}

/* ════════════════════════════════════
   23. SUCCESS MODAL
════════════════════════════════════ */
function showSuccessModal(booking) {
  const name   = selectedTutor?.name || '–';
  const type   = sessionType === '1:1' ? '1-on-1' : sessionType;
  const date   = selectedDate ? friendlyDate(selectedDate) : (booking.sessionDate || '–');
  const time   = booking.timeSlot   || selectedTime || '–';
  const amount = booking.amount != null ? `$${booking.amount.toFixed(2)}` : '–';

  setText('successTutor',  `${name} · ${type} Session`);
  setText('successDate',   date);
  setText('successTime',   `${time} · 60 minutes`);
  setText('successAmount', amount);

  qs('successOverlay').classList.add('show');
}

function closeSuccess() {
  qs('successOverlay').classList.remove('show');
  /* Reset selection state after closing */
  selectedDate = null;
  selectedTime = null;
  renderCalendar();
  renderTimeSlots();
  updateSteps(selectedTutor ? 2 : 1);
}

/* ════════════════════════════════════
   24. TOPBAR AVATAR from localStorage
════════════════════════════════════ */
function initTopbarAvatar() {
  const name = localStorage.getItem('userName') ||
               localStorage.getItem('name')     ||
               localStorage.getItem('jm_tutor_name') || 'JD';
  const initials = name.trim().split(' ')
    .map(w => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  setText('topbarAvatar', initials || 'JD');
}

/* ════════════════════════════════════
   25. BOOT
════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initTopbarAvatar();
  renderCalendar();
  fetchTutors();
});