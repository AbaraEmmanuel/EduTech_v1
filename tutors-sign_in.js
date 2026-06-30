const API_BASE = 'http://localhost:8080';

document.querySelector('.sign-in-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.querySelector('.sign-in-form .btn');

  // Clear any existing error
  const existingErr = document.getElementById('loginErr');
  if (existingErr) existingErr.remove();

  if (!email || !password) {
    showError('Please enter your email and password.');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  try {
    const res  = await fetch(`${API_BASE}/tutors/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Invalid email or password.');
    }

    const token = data.token;
    const tutor = data.tutor || data.user || {};

    if (!token) throw new Error('No token received. Please try again.');

    // Persist session
    localStorage.setItem('jm_tutor_token', token);
    localStorage.setItem('jm_tutor_id',    tutor._id || tutor.id || '');
    localStorage.setItem('jm_tutor_name',  tutor.firstName || tutor.name || email.split('@')[0]);
    localStorage.setItem('jm_tutor_email', email);

    // Redirect to tutor dashboard
    window.location.href = 'tutor-dashboard.html';

  } catch (err) {
    showError(err.message || 'Login failed. Please try again.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  }
});

function showError(msg) {
  const form = document.querySelector('.sign-in-form');
  const err  = document.createElement('p');
  err.id          = 'loginErr';
  err.textContent = msg;
  err.style.cssText = `
    color: #e53e3e;
    font-size: .85rem;
    margin: 8px 0 0;
    padding: 10px 14px;
    background: rgba(229,62,62,.08);
    border-radius: 8px;
    border-left: 3px solid #e53e3e;
  `;
  const btn = form.querySelector('.btn');
  form.insertBefore(err, btn);
}