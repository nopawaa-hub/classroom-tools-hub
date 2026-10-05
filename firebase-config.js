/* ============================================================
   Classroom Tools Hub — shared Firebase config + helpers
   ------------------------------------------------------------
   Loaded once at the top of each tool before its own <script>.
   Exposes:
     window.CTH_FIREBASE_CONFIG  — the web app config object
     window.cthDb()             — promise resolving to a Firestore db handle
     window.cthReady            — true once Firestore SDK is initialised
   ============================================================ */

// Web app config for project "classroom-tools-hub"
window.CTH_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBYxi5cqRXkuhOZ9dRPG2iGQYeBhc2DYYk",
  authDomain: "classroom-tools-hub.firebaseapp.com",
  projectId: "classroom-tools-hub",
  storageBucket: "classroom-tools-hub.firebasestorage.app",
  messagingSenderId: "86304266855",
  appId: "1:86304266855:web:6364c94d2c3c35ed06d2c2"
};

// Hosting URL (the live deployment)
window.CTH_HOSTING_URL = "https://classroom-tools-hub.web.app";

/* --- Firestore loader (lazy, deduped) -----------------------------------
   We pull the modular Firestore SDK from a CDN the first time a tool
   actually needs the database, then cache the promise. A tool calls:

       const db = await cthDb();

   and gets back the Firestore instance. If the network/CDN is down,
   the promise rejects and tools fall back to localStorage gracefully
   (each tool decides its own fallback).                                */
let _dbPromise = null;
window.cthDb = function cthDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = (async () => {
    const fbAppMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const fbFsMod  = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const app = fbAppMod.initializeApp(window.CTH_FIREBASE_CONFIG);
    return fbFsMod.getFirestore(app);
  })().catch((err) => {
    console.warn("[Classroom Tools Hub] Firestore unavailable, falling back to localStorage.", err);
    _dbPromise = null; // allow retry later
    throw err;
  });
  return _dbPromise;
};

/* Online/offline indicator (tools may use to decide sync behaviour) */
window.cthOnline = () => navigator.onLine;
