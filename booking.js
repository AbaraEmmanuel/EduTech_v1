/* ─────────────────────────────────────────
   booking.js  –  Tutor Booking Page Logic
───────────────────────────────────────── */

// ── DATA ──────────────────────────────────

const tutors = [
  {
    id: 1,
    name: 'Dr. Sarah Mitchell',
    field: 'Mathematics & Statistics',
    emoji: '👩‍🏫',
    subjects: ['Maths'],
    rate: 45,
    rating: 4.9,
    reviews: 124,
    sessions: 340,
    online: true,
    tags: ['Calculus', 'Algebra', 'Stats'],
  },
  {
    id: 2,
    name: 'James Okonkwo',
    field: 'Physics & Engineering',
    emoji: '👨‍🔬',
    subjects: ['Physics'],
    rate: 40,
    rating: 4.8,
    reviews: 89,
    sessions: 215,
    online: true,
    tags: ['Mechanics', 'Thermodynamics', 'Waves'],
  },
  {
    id: 3,
    name: 'Priya Sharma',
    field: 'Chemistry & Biology',
    emoji: '👩‍🔬',
    subjects: ['Chemistry', 'Biology'],
    rate: 38,
    rating: 4.7,
    reviews: 67,
    sessions: 180,
    online: false,
    tags: ['Organic Chem', 'Cell Biology'],
  },
  {
    id: 4,
    name: 'Tom Fletcher',
    field: 'Computer Science',
    emoji: '👨‍💻',
    subjects: ['Computer Science'],
    rate: 50,
    rating: 5.0,
    reviews: 203,
    sessions: 420,
    online: true,
    tags: ['Python', 'Algorithms', 'Data Structures'],
  },
  {
    id: 5,
    name: 'Amara Diallo',
    field: 'English Literature',
    emoji: '👩‍🏫',
    subjects: ['English'],
    rate: 32,
    rating: 4.6,
    reviews: 55,
    sessions: 140,
    online: false,
    tags: ['Essay Writing', 'Poetry', 'Comprehension'],
  },
  {
    id: 6,
    name: 'Wei Chen',
    field: 'Mathematics & Physics',
    emoji: '🧑‍🏫',
    subjects: ['Maths', 'Physics'],
    rate: 42,
    rating: 4.9,
    reviews: 178,
    sessions: 390,
    online: true,
    tags: ['Pure Maths', 'Optics', 'Calculus'],
  },
];

const timeSlots = [
  '8:00 AM','9:00 AM','10:00 AM','11:00 AM',
  '12:00 PM','1:00 PM','2:00 PM','3:00 PM',
  '4:00 PM','5:00 PM','6:00 PM','7:00 PM',
];

const unavailableSlots = ['8:00 AM', '12:00 PM', '3:00 PM'];

const avatarColors = ['#dbeafe','#dcfce7','#fef3c7','#ede9fe','#fce7f3','#f0fdf4'];

// ── STATE ─────────────────────────────────

let selectedTutor      = null;
let selectedDate       = null;
let selectedTime       = null;
let selectedSessionType = '1:1';
let currentMonth       = new Date(2026, 2, 1); // March 2026
let activeTag          = 'All';
let searchQuery        = '';

// ── HELPERS ───────────────────────────────

function avatarBg(id) {
  return avatarColors[(id - 1) % avatarColors.length];
}

function starSVG() {
  return `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
}

function calSVG() {
  return `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
}

function dotSVG() {
  return `<svg fill="currentColor" viewBox="0 0 24 24" width="10" height="10"><circle cx="12" cy="12" r="10"/></svg>`;
}

// ── RENDER TUTORS ─────────────────────────

function renderTutors() {
  const list = document.getElementById('tutorsList');
  let filtered = tutors;

  if (activeTag !== 'All') {
    filtered = filtered.filter(t => t.subjects.includes(activeTag));
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.field.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <p>No tutors found.<br>Try a different search.</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(t => `
    <div class="tutor-card ${selectedTutor?.id === t.id ? 'selected' : ''}"
         onclick="selectTutor(${t.id})"
         id="tutor-${t.id}">

      <div class="tutor-avatar" style="background:${avatarBg(t.id)};">
        ${t.emoji}
        ${t.online ? '<div class="online-dot"></div>' : ''}
      </div>

      <div class="tutor-info">
        <div class="tutor-top">
          <div>
            <div class="tutor-name">${t.name}</div>
            <div class="tutor-field">${t.field}</div>
          </div>
          <div class="tutor-price">$${t.rate}<span>/hr</span></div>
        </div>

        <div class="tutor-stats">
          <div class="stat gold">
            ${starSVG()}
            ${t.rating} (${t.reviews} reviews)
          </div>
          <div class="stat">
            ${calSVG()}
            ${t.sessions} sessions
          </div>
          <div class="stat" style="color:${t.online ? '#16a34a' : '#9ca3af'}">
            ${dotSVG()}
            ${t.online ? 'Online now' : 'Offline'}
          </div>
        </div>

        <div class="tutor-tags">
          ${t.tags.map(tag => `<span class="tutor-tag">${tag}</span>`).join('')}
        </div>
      </div>

      <button class="select-btn ${selectedTutor?.id === t.id ? 'chosen' : ''}"
              onclick="event.stopPropagation(); selectTutor(${t.id})">
        ${selectedTutor?.id === t.id ? '✓ Selected' : 'Select'}
      </button>
    </div>
  `).join('');
}

// ── SELECT TUTOR ──────────────────────────

function selectTutor(id) {
  selectedTutor = tutors.find(t => t.id === id);
  renderTutors();

  document.getElementById('noTutorMsg').style.display    = 'none';
  document.getElementById('sessionDetails').style.display = 'block';
  document.getElementById('costPanel').style.display      = 'block';

  document.getElementById('miniAvatar').textContent = selectedTutor.emoji;
  document.getElementById('miniName').textContent   = selectedTutor.name;
  document.getElementById('miniSub').textContent    = selectedTutor.field;

  updateCost();
  renderCalendar();
  renderTimeSlots();
  updateSteps(2);
}

// ── TAGS & SEARCH ─────────────────────────

function setTag(el, tag) {
  document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  activeTag = tag;
  renderTutors();
}

function filterTutors(val) {
  searchQuery = val;
  renderTutors();
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
  const today = new Date(2026, 2, 6); // fixed "today" for demo
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  document.getElementById('calMonth').textContent =
    currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const dayLabels   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();

  let html = dayLabels.map(d => `<div class="cal-day-label">${d}</div>`).join('');

  // Trailing days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<button class="cal-day other-month disabled">${prevDays - i}</button>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date      = new Date(year, month, d);
    const isPast    = date < today;
    const isToday   = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
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
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + dir, 1);
  renderCalendar();
}

function selectDate(y, m, d) {
  selectedDate = new Date(y, m, d);
  selectedTime = null;
  renderCalendar();
  renderTimeSlots();
  updateCost();
  updateSteps(3);
}

// ── TIME SLOTS ────────────────────────────

function renderTimeSlots() {
  const grid = document.getElementById('timeGrid');
  grid.innerHTML = timeSlots.map(t => {
    const isUnavail  = unavailableSlots.includes(t);
    const isSelected = selectedTime === t;
    let cls = 'time-slot';
    if (isUnavail)  cls += ' unavailable';
    if (isSelected) cls += ' selected';
    return `<button class="${cls}" onclick="selectTime('${t}')">${t}</button>`;
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
  const base  = selectedTutor.rate * (multipliers[selectedSessionType] ?? 1);
  const total = Math.max(0, base + 2 - 5);

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

function confirmBooking() {
  if (!selectedTutor) { alert('Please select a tutor.'); return; }
  if (!selectedDate)  { alert('Please pick a date.');    return; }
  if (!selectedTime)  { alert('Please choose a time slot.'); return; }

  document.getElementById('successTutor').textContent =
    `${selectedTutor.name} · ${selectedSessionType} Session`;

  document.getElementById('successDate').textContent =
    selectedDate.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

  document.getElementById('successTime').textContent =
    `${selectedTime} · 60 minutes`;

  document.getElementById('successOverlay').classList.add('show');
}

function closeSuccess() {
  document.getElementById('successOverlay').classList.remove('show');
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

renderTutors();
renderCalendar();