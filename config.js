// config.js
// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ---------------------------------------------------------
// 1. FIREBASE CONFIGURATION
// ---------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyAYHskTvQ69W9DWwXrHIX-tpA37mtbbzZY",
    authDomain: "hspm-3rd.firebaseapp.com",
    projectId: "hspm-3rd",
    storageBucket: "hspm-3rd.firebasestorage.app",
    messagingSenderId: "334367239141",
    appId: "1:334367239141:web:c6ab2cd8b5c0ab82c35d0c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Initialized just in case, even if using ImgBB

// ---------------------------------------------------------
// 2. THIRD PARTY API KEYS
// ---------------------------------------------------------
const IMGBB_API_KEY = "50c308e7d6ec8313d9492e71dd53f61e";

// ---------------------------------------------------------
// 3. GLOBAL CONSTANTS (Church Info)
// ---------------------------------------------------------
const CHURCH_INFO = {
    name: "His Spirit and Power Ministry",
    shortName: "HSPM",
    currency: "₦" // Naira Symbol
};

// Export services for use in other files
export { app, auth, db, storage, IMGBB_API_KEY, CHURCH_INFO };