// ================================================
// ENROLLMENT PAGE - API INTEGRATION
// ================================================

// API Configuration
const API_BASE_URL = 'https://jaromind-production-3060.up.railway.app';
// const API_BASE_URL = 'http://localhost:8080'; // Uncomment for local development

// Global State
let currentStep = 1;
const totalSteps = 5;
let selectedCourse = null;
let user = null;

// ================================================
// INITIALIZATION
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Enrollment page initialized');
    
    // Theme Management
    const savedTheme = localStorage.getItem('theme') || 'light-mode';
    document.body.className = savedTheme;
    updateModeIcon(savedTheme);

    const modeToggle = document.getElementById('modeToggle');
    if (modeToggle) {
        modeToggle.addEventListener('click', toggleTheme);
    }

    // Check authentication
    checkAuthStatus();

    // Load courses from API
    loadCourses();

    // Setup event listeners
    setupEventListeners();

    // Update progress
    updateProgress();

    // Handle auto-selection from URL
    handleAutoSelectFromURL();
});

// ================================================
// THEME MANAGEMENT
// ================================================

function toggleTheme() {
    if (document.body.classList.contains('light-mode')) {
        document.body.classList.replace('light-mode', 'dark-mode');
        localStorage.setItem('theme', 'dark-mode');
        updateModeIcon('dark-mode');
    } else {
        document.body.classList.replace('dark-mode', 'light-mode');
        localStorage.setItem('theme', 'light-mode');
        updateModeIcon('light-mode');
    }
}

function updateModeIcon(theme) {
    const modeToggle = document.getElementById('modeToggle');
    if (modeToggle) {
        modeToggle.textContent = theme === 'dark-mode' ? '🌙' : '🌞';
    }
}

// ================================================
// AUTHENTICATION
// ================================================

function checkAuthStatus() {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (userData && token) {
        user = JSON.parse(userData);
        console.log('✅ User authenticated:', user.name);
        
        // Pre-fill user information
        document.getElementById('fullName').value = user.name || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('phone').value = user.phone || '';
    } else {
        console.log('⚠️ User not authenticated - some features may be limited');
        // Optionally redirect to login
        // window.location.href = 'sign_in.html';
    }
}

// ================================================
// API CALLS
// ================================================

/**
 * Load all courses from API
 */
async function loadCourses() {
    try {
        console.log('📚 Loading courses from API...');
        
        const response = await fetch(`${API_BASE_URL}/courses`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const courses = data.courses || data;

        console.log(`✅ Loaded ${courses.length} courses`);

        // Populate dropdown
        const courseSelect = document.getElementById('courseSelect');
        courseSelect.innerHTML = '<option value="">Select a course</option>';

        courses.forEach(course => {
            if (course.is_active || course.isActive) {
                const option = document.createElement('option');
                option.value = course._id || course.id;
                option.textContent = course.title;
                option.dataset.course = JSON.stringify(course);
                courseSelect.appendChild(option);
            }
        });

    } catch (error) {
        console.error('❌ Error loading courses:', error);
        showError('Failed to load courses. Please refresh the page.');
    }
}

/**
 * Submit enrollment to API
 */
async function submitEnrollment(enrollmentData) {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Authentication required. Please log in.');
        }

        console.log('📝 Submitting enrollment:', enrollmentData);

        const response = await fetch(`${API_BASE_URL}/enrollments`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(enrollmentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit enrollment');
        }

        const result = await response.json();
        console.log('✅ Enrollment successful:', result);
        
        return result;

    } catch (error) {
        console.error('❌ Error submitting enrollment:', error);
        throw error;
    }
}

/**
 * Get course details by ID
 */
async function getCourseById(courseId) {
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Course not found');
        }

        const data = await response.json();
        return data.course || data.data || data;

    } catch (error) {
        console.error('❌ Error fetching course:', error);
        throw error;
    }
}

// ================================================
// AUTO-SELECT FROM URL
// ================================================

function handleAutoSelectFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseIdFromUrl = urlParams.get('courseId') || urlParams.get('course');
    
    if (courseIdFromUrl) {
        console.log('🔗 Auto-selecting course from URL:', courseIdFromUrl);
        
        // Hide manual select view, show selected view
        const manualView = document.getElementById('courseManualSelectView');
        const selectedView = document.getElementById('courseSelectedView');
        
        if (manualView) manualView.style.display = 'none';
        if (selectedView) selectedView.style.display = 'block';
        
        // Wait for courses to load, then auto-select
        const checkCoursesLoaded = setInterval(() => {
            const courseSelect = document.getElementById('courseSelect');
            if (courseSelect && courseSelect.options.length > 1) {
                clearInterval(checkCoursesLoaded);
                
                // Find and select the course
                let courseFound = false;
                for (let i = 0; i < courseSelect.options.length; i++) {
                    if (courseSelect.options[i].value === courseIdFromUrl) {
                        courseSelect.selectedIndex = i;
                        courseFound = true;
                        break;
                    }
                }
                
                if (courseFound) {
                    const selectedOption = courseSelect.options[courseSelect.selectedIndex];
                    if (selectedOption && selectedOption.dataset.course) {
                        selectedCourse = JSON.parse(selectedOption.dataset.course);
                        
                        // Display course info
                        displayCourseSummary(selectedCourse);
                        displayQuickCourseView(selectedCourse);
                        
                        console.log('✅ Course auto-selected:', selectedCourse.title);
                    }
                } else {
                    console.error('❌ Course not found:', courseIdFromUrl);
                    showError('Course not found. Please select a course manually.');
                    
                    // Show manual select view
                    if (manualView) manualView.style.display = 'block';
                    if (selectedView) selectedView.style.display = 'none';
                }
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkCoursesLoaded);
        }, 5000);
    }
}

// ================================================
// EVENT LISTENERS
// ================================================

function setupEventListeners() {
    // Course selection change
    document.getElementById('courseSelect').addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption.value) {
            selectedCourse = JSON.parse(selectedOption.dataset.course);
            displayCoursePreview(selectedCourse);
            displayCourseSummary(selectedCourse);
        } else {
            selectedCourse = null;
            document.getElementById('courseDetailsPreview').style.display = 'none';
            document.getElementById('courseSummary').style.display = 'none';
        }
    });

    // Radio options styling
    document.querySelectorAll('.radio-option').forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            const group = radio.name;
            
            // Remove selected class from all options in group
            document.querySelectorAll(`input[name="${group}"]`).forEach(r => {
                r.closest('.radio-option').classList.remove('selected');
            });
            
            // Add selected class to clicked option
            radio.checked = true;
            this.classList.add('selected');
        });
    });

    // Payment option styling
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            
            // Remove selected class from all payment options
            document.querySelectorAll('.payment-option').forEach(p => {
                p.classList.remove('selected');
            });
            
            // Add selected class
            radio.checked = true;
            this.classList.add('selected');
        });
    });

    // Form submission
    document.getElementById('enrollmentForm').addEventListener('submit', handleSubmit);
}

// ================================================
// DISPLAY FUNCTIONS
// ================================================

function displayCoursePreview(course) {
    const preview = document.getElementById('courseDetailsPreview');
    const description = document.getElementById('courseDescription');
    
    description.textContent = course.description || 'No description available';
    preview.style.display = 'block';
}

function displayCourseSummary(course) {
    const summary = document.getElementById('courseSummary');
    const thumbnail = document.getElementById('courseThumbnail');
    const title = document.getElementById('courseTitle');
    const lessons = document.getElementById('courseLessons');
    const duration = document.getElementById('courseDuration');
    const level = document.getElementById('courseLevel');
    const price = document.getElementById('coursePrice');

    // Set thumbnail
    if (course.image_url || course.imageUrl) {
        thumbnail.style.backgroundImage = `url('${course.image_url || course.imageUrl}')`;
        thumbnail.style.backgroundSize = 'cover';
        thumbnail.style.backgroundPosition = 'center';
    }

    title.textContent = course.title;
    lessons.textContent = `${course.lesson_count || course.lessonCount || 0} Lessons`;
    duration.textContent = course.duration || 'Self-paced';
    level.textContent = course.level || 'All Levels';

    const isFree = !course.price || course.price === 0;
    price.textContent = isFree ? 'Free' : `₦${course.price}`;
    price.className = isFree ? 'price free' : 'price';

    summary.style.display = 'block';

    // Update payment step based on course price
    updatePaymentStep(isFree);
}

function displayQuickCourseView(course) {
    const thumbnail = document.getElementById('quickCourseThumbnail');
    const title = document.getElementById('quickCourseTitle');
    const description = document.getElementById('quickCourseDescription');
    const lessons = document.getElementById('quickCourseLessons');
    const duration = document.getElementById('quickCourseDuration');
    const priceEl = document.getElementById('quickCoursePrice');

    // Set thumbnail
    if (course.image_url || course.imageUrl) {
        thumbnail.style.backgroundImage = `url('${course.image_url || course.imageUrl}')`;
        thumbnail.style.backgroundSize = 'cover';
        thumbnail.style.backgroundPosition = 'center';
    }

    title.textContent = course.title;
    description.textContent = course.description || 'No description available';
    lessons.innerHTML = `<i class="fas fa-play-circle"></i> ${course.lesson_count || course.lessonCount || 0} Lessons`;
    duration.innerHTML = `<i class="fas fa-clock"></i> ${course.duration || 'Self-paced'}`;

    const isFree = !course.price || course.price === 0;
    priceEl.innerHTML = `<i class="fas fa-tag"></i> ${isFree ? 'Free' : '₦' + course.price}`;
    priceEl.style.color = isFree ? 'var(--success-color)' : 'var(--primary-color)';
}

function updatePaymentStep(isFree) {
    const freeBanner = document.getElementById('freeCourseBanner');
    const paymentSection = document.getElementById('paymentMethodsSection');

    if (isFree) {
        freeBanner.style.display = 'block';
        paymentSection.style.display = 'none';
        // Remove required from payment method
        document.querySelectorAll('input[name="paymentMethod"]').forEach(input => {
            input.removeAttribute('required');
        });
    } else {
        freeBanner.style.display = 'none';
        paymentSection.style.display = 'block';
        // Add required to payment method
        const checkedPayment = document.querySelector('input[name="paymentMethod"]:checked');
        if (checkedPayment) {
            checkedPayment.setAttribute('required', 'required');
        }
    }
}

// ================================================
// FORM NAVIGATION
// ================================================

window.changeStep = function(direction) {
    // Validate current step before moving forward
    if (direction === 1 && !validateStep(currentStep)) {
        return;
    }

    currentStep += direction;

    // Update step display
    const steps = document.querySelectorAll('.form-step');
    steps.forEach((step, index) => {
        if (index + 1 === currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    // Update progress indicators
    updateProgress();

    // Update buttons
    updateButtons();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function updateProgress() {
    const steps = document.querySelectorAll('.step');
    const progressLine = document.getElementById('progressLine');

    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    // Update progress line
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressLine.style.width = `${progress}%`;
}

function updateButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Show/hide previous button
    if (currentStep === 1 || currentStep === 5) {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'inline-flex';
    }

    // Show/hide next/submit button
    if (currentStep === 4) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-flex';
    } else if (currentStep === 5) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'none';
    }
}

// ================================================
// VALIDATION
// ================================================

function validateStep(step) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.classList.remove('show');

    if (step === 1) {
        if (!selectedCourse) {
            showError('Please select a course');
            return false;
        }
        return true;
    }

    if (step === 2) {
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const education = document.getElementById('education').value;

        if (!fullName) {
            showError('Please enter your full name');
            return false;
        }
        if (!email || !isValidEmail(email)) {
            showError('Please enter a valid email address');
            return false;
        }
        if (!phone) {
            showError('Please enter your phone number');
            return false;
        }
        if (!education) {
            showError('Please select your education level');
            return false;
        }
    }

    if (step === 3) {
        const learningGoal = document.getElementById('learningGoal').value.trim();
        if (!learningGoal || learningGoal.length < 20) {
            showError('Please describe your learning goals (minimum 20 characters)');
            return false;
        }
    }

    if (step === 4) {
        const termsAccept = document.getElementById('termsAccept').checked;
        if (!termsAccept) {
            showError('Please accept the terms and conditions');
            return false;
        }
    }

    return true;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ================================================
// FORM SUBMISSION
// ================================================

async function handleSubmit(e) {
    e.preventDefault();

    if (!validateStep(4)) {
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const formData = new FormData(e.target);
        const enrollmentData = {
            courseId: selectedCourse._id || selectedCourse.id,
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            education: formData.get('education'),
            experience: formData.get('experience'),
            learningGoal: formData.get('learningGoal'),
            schedule: formData.get('schedule'),
            studyTime: formData.get('studyTime'),
            referralSource: formData.get('referralSource'),
            paymentMethod: formData.get('paymentMethod'),
            termsAccepted: formData.get('termsAccept') === 'on'
        };

        // Submit to API
        const result = await submitEnrollment(enrollmentData);

        console.log('✅ Enrollment complete:', result);

        // Show confirmation
        displayConfirmation(enrollmentData);

        // Move to confirmation step
        currentStep = 5;
        updateProgress();
        const steps = document.querySelectorAll('.form-step');
        steps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === 5);
        });
        updateButtons();

        // Optional: Show success notification
        if (typeof showNotification === 'function') {
            showNotification('Enrollment successful! Welcome to the course.', 'success');
        }

    } catch (error) {
        console.error('❌ Enrollment error:', error);
        showError(error.message || 'Failed to complete enrollment. Please try again.');
    } finally {
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Complete Enrollment';
    }
}

function displayConfirmation(data) {
    document.getElementById('confirmCourse').textContent = selectedCourse.title;
    document.getElementById('confirmName').textContent = data.fullName;
    document.getElementById('confirmEmail').textContent = data.email;
    document.getElementById('confirmDate').textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const isFree = !selectedCourse.price || selectedCourse.price === 0;
    document.getElementById('confirmPayment').textContent = isFree ? 'Free Course' : 'Payment Pending';
    document.getElementById('confirmPayment').style.color = isFree ? 'var(--success-color)' : '#f59e0b';
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// ================================================
// EXPORTS (for testing/debugging)
// ================================================

window.enrollmentDebug = {
    getCurrentStep: () => currentStep,
    getSelectedCourse: () => selectedCourse,
    getUser: () => user,
    reloadCourses: loadCourses,
    testSubmit: submitEnrollment
};

console.log('✅ Enrollment.js loaded successfully');
console.log('💡 Debug tools available at: window.enrollmentDebug');