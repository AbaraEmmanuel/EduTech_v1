// Import Firebase services
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBnzUWyfIDIlKtNsjlwHhA3JhR5LHhb9qU",
  authDomain: "edtech-tutors.firebaseapp.com",
  projectId: "edtech-tutors",
  storageBucket: "edtech-tutors.firebasestorage.app",
  messagingSenderId: "87645108821",
  appId: "1:87645108821:web:ff6957f6cb738dc2bcf2dc",
  measurementId: "G-GTXDL1WX0L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and Firestore
const auth = getAuth(app);  // Initialize auth here
const db = getFirestore(app);  // Initialize Firestore here

// Export auth and db so they can be used in other files
export { auth, db };
