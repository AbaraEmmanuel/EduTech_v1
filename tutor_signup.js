import { showNotification } from './notification.js'; // Import notification
import { auth, db } from './firebasetutors.js'; // Import auth and db from firebase.js
import { 
    createUserWithEmailAndPassword, 
    sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.querySelector('.form-container form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent form from reloading the page

    showNotification('Processing your registration...', 'Loading');

    // Get form inputs
    const name = e.target.name.value.trim();
    const email = e.target.email.value.trim();
    const subjects = Array.from(e.target.subject.selectedOptions).map(option => option.value);
    const bio = e.target.bio.value.trim();
    const videoUrl = e.target.videoUrl.value.trim();
    const gender = e.target.gender.value;

    // Validate inputs
    if (!name || !email || !bio || !videoUrl || !gender) {
        showNotification('Please fill in all the fields.', 'error');
        return;
    }

    // Validate YouTube link
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(videoUrl)) {
        showNotification('Please provide a valid YouTube link.', 'error');
        return;
    }

    try {
        // Firebase Authentication Sign Up
        const password = 'temporaryPassword123'; // Use your actual password logic
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Send email verification
        await sendEmailVerification(user);

        // Save tutor data to Firestore
        await setDoc(doc(db, 'tutors', user.uid), {
            name,
            email,
            subjects,
            bio,
            videoUrl,
            gender,
            password,
            createdAt: serverTimestamp(),
        });

        // Show success message
        showNotification('Sign-up successful! Please check your email to verify your account.', 'success');

        // Display email verification message in the UI
        const confirmationMessage = `
            <div class="confirmation-message">
                <p>Thank you for signing up, <strong>${name}</strong>!</p>
                <p>We have sent a verification email to <strong>${email}</strong>. Please check your inbox and verify your email address before you can sign in.</p>
            </div>
        `;
        document.querySelector('.form-container').innerHTML = confirmationMessage;

    } catch (error) {
        console.error('Error signing up:', error);
        showNotification('Something went wrong. Please try again later.', 'error');
    }
});
