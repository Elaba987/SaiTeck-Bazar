// ═══════════════════════════════════════════════════════
//  js/firebase.js  —  Inicialización de Firebase (Web SDK v10, CDN)
//
//  Exporta: app, auth, db, storage
//  Usados por: auth.js, db.js, storage.js
// ═══════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Configuración del proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDM8ZHaYI7UAbOhF8xK7H853EWwMbem_O8",
  authDomain: "saiteck-bazar.firebaseapp.com",
  projectId: "saiteck-bazar",
  storageBucket: "saiteck-bazar.firebasestorage.app",
  messagingSenderId: "801683968411",
  appId: "1:801683968411:web:803c5895b3125f20b4d13e",
  measurementId: "G-B484L070KT"
};

// Inicializar Firebase
export const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// Nota: getAnalytics() se omite porque requiere medición/cookies que
// pueden ser bloqueadas por "Tracking Prevention" del navegador y no
// es necesario para el funcionamiento del panel de administración.