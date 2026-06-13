// ═══════════════════════════════════════════════════════
//  js/auth.js  —  Firebase Auth: login, register, logout
// ═══════════════════════════════════════════════════════

import { auth, db }         from "./firebase.js";
import { showToast, showLoading, hideLoading } from "../app.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export let currentUser = null;

/* ── Auth state listener ─────────────────────────────── */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await initAdminShell(user);
  } else {
    currentUser = null;
    showAuthScreen();
  }
});

async function initAdminShell(user) {
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("adminShell").classList.remove("hidden");

  // Load user profile from Firestore
  const profileRef = doc(db, "users", user.uid, "profile", "main");
  const snap = await getDoc(profileRef);
  const data = snap.exists() ? snap.data() : {};

  const bazarName = data.bazarName || "Mi Bazar";
  document.getElementById("userBazarName").textContent = bazarName;
  document.getElementById("userEmail").textContent = user.email;
  document.getElementById("userAvatar").textContent = bazarName.charAt(0).toUpperCase();

  // Fire custom event so other modules can initialize
  window.dispatchEvent(new CustomEvent("adminReady", { detail: { user, profile: data } }));
}

function showAuthScreen() {
  document.getElementById("adminShell").classList.add("hidden");
  document.getElementById("authScreen").classList.remove("hidden");
}

/* ── toggleAuthMode ──────────────────────────────────── */
window.toggleAuthMode = function(mode) {
  ["loginForm","registerForm","resetForm"].forEach(id =>
    document.getElementById(id).classList.add("hidden")
  );
  clearAuthError();
  if (mode === "register") document.getElementById("registerForm").classList.remove("hidden");
  else if (mode === "reset") document.getElementById("resetForm").classList.remove("hidden");
  else document.getElementById("loginForm").classList.remove("hidden");
};

/* ── authLogin ───────────────────────────────────────── */
window.authLogin = async function() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass  = document.getElementById("loginPassword").value;
  if (!email || !pass) { showAuthError("Completa todos los campos."); return; }
  showLoading();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    hideLoading();
    showAuthError(friendlyError(e.code));
  }
};

/* ── authRegister ────────────────────────────────────── */
window.authRegister = async function() {
  const bazarName = document.getElementById("regBazarName").value.trim();
  const email     = document.getElementById("regEmail").value.trim();
  const pass      = document.getElementById("regPassword").value;
  if (!bazarName || !email || !pass) { showAuthError("Completa todos los campos."); return; }
  if (pass.length < 6) { showAuthError("La contraseña debe tener mínimo 6 caracteres."); return; }
  showLoading();
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    // Create user profile in Firestore
    await setDoc(doc(db, "users", cred.user.uid, "profile", "main"), {
      bazarName,
      email,
      themeColor: "#EC4899",
      createdAt: serverTimestamp()
    });
  } catch(e) {
    hideLoading();
    showAuthError(friendlyError(e.code));
  }
};

/* ── authReset ───────────────────────────────────────── */
window.authReset = async function() {
  const email = document.getElementById("resetEmail").value.trim();
  if (!email) { showAuthError("Ingresa tu correo."); return; }
  showLoading();
  try {
    await sendPasswordResetEmail(auth, email);
    hideLoading();
    showToast("✉️ Correo enviado. Revisa tu bandeja.", "success");
    toggleAuthMode("login");
  } catch(e) {
    hideLoading();
    showAuthError(friendlyError(e.code));
  }
};

/* ── authLogout ──────────────────────────────────────── */
window.authLogout = async function() {
  await signOut(auth);
  showToast("Sesión cerrada correctamente.");
};

/* ── Helpers ─────────────────────────────────────────── */
function showAuthError(msg) {
  const el = document.getElementById("authError");
  el.textContent = msg;
  el.classList.remove("hidden");
}
function clearAuthError() {
  document.getElementById("authError").classList.add("hidden");
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found":     "No existe una cuenta con ese correo.",
    "auth/wrong-password":     "Contraseña incorrecta.",
    "auth/email-already-in-use": "Ese correo ya está registrado.",
    "auth/invalid-email":      "El correo no es válido.",
    "auth/weak-password":      "La contraseña es muy débil.",
    "auth/too-many-requests":  "Demasiados intentos. Intenta más tarde.",
    "auth/network-request-failed": "Sin conexión a internet.",
  };
  return map[code] || "Ocurrió un error. Intenta nuevamente.";
}