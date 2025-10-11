// Import Firebase services
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDn0sCZM1034UP8oAm2L2LHvF440QaVzu4",
  authDomain: "edtech-fc816.firebaseapp.com",
  projectId: "edtech-fc816",
  storageBucket: "edtech-fc816.firebasestorage.app",
  messagingSenderId: "996383017899",
  appId: "1:996383017899:web:d56648f25b527b67f5e0ee",
  measurementId: "G-77Y00DED1T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and Firestore
const auth = getAuth(app);  // Initialize auth here
const db = getFirestore(app);  // Initialize Firestore here

// Export auth and db so they can be used in other files
export { auth, db };
