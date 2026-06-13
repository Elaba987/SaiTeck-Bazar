// ═══════════════════════════════════════════════════════
//  app.js  —  Orquestador principal del panel admin
//
//  Exporta utilidades globales usadas por los módulos:
//    showToast, showLoading, hideLoading, showConfirm
//
//  También maneja:
//    · Navegación entre secciones
//    · Toggle de sidebar (móvil)
//    · goTo() global
// ═══════════════════════════════════════════════════════

/* ════════════════════════════════════════════════════════
   TOAST
════════════════════════════════════════════════════════ */
export function showToast(msg, type = "") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className   = `toast ${type}`;
  el.classList.remove("hidden");
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.classList.add("hidden"), 350);
  }, 3000);
}
window.showToast = showToast;

/* ════════════════════════════════════════════════════════
   LOADING OVERLAY
════════════════════════════════════════════════════════ */
export function showLoading() {
  document.getElementById("loadingOverlay")?.classList.remove("hidden");
}
export function hideLoading() {
  document.getElementById("loadingOverlay")?.classList.add("hidden");
}
window.showLoading = showLoading;
window.hideLoading = hideLoading;

/* ════════════════════════════════════════════════════════
   CONFIRM DIALOG
════════════════════════════════════════════════════════ */
let _confirmCallback = null;

export function showConfirm(title, msg, onOk) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmMsg").innerHTML    = msg;
  _confirmCallback = onOk;
  document.getElementById("confirmOverlay").classList.remove("hidden");
}

window.closeConfirm = function() {
  document.getElementById("confirmOverlay").classList.add("hidden");
  _confirmCallback = null;
};

document.getElementById("confirmOkBtn").addEventListener("click", () => {
  closeConfirm();
  if (_confirmCallback) _confirmCallback();
});

// Close on overlay click
document.getElementById("confirmOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("confirmOverlay")) closeConfirm();
});

/* ════════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════════ */
const SECTION_LABELS = {
  inicio:      "Inicio",
  catalogo:    "Catálogo",
  referencias: "Referencias",
  contacto:    "Contacto"
};

window.goTo = function(id) {
  // Hide all sections
  document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
  // Show target
  const target = document.getElementById(`sec-${id}`);
  if (target) target.classList.add("active");

  // Update nav items
  document.querySelectorAll(".nav-item").forEach(b => {
    b.classList.toggle("active", b.dataset.section === id);
  });

  // Update topbar title
  const titleEl = document.getElementById("topbarTitle");
  if (titleEl) titleEl.textContent = SECTION_LABELS[id] || id;

  // Close sidebar on mobile
  if (window.innerWidth <= 768) closeSidebar();

  // Scroll to top
  document.querySelector(".main-content")?.scrollTo(0, 0);
};

/* ════════════════════════════════════════════════════════
   SIDEBAR TOGGLE (MOBILE)
════════════════════════════════════════════════════════ */
window.toggleSidebar = function() {
  const sidebar  = document.getElementById("sidebar");
  const overlay  = document.getElementById("sidebarOverlay");
  const isOpen   = sidebar.classList.contains("open");
  if (isOpen) {
    closeSidebar();
  } else {
    sidebar.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
};

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
}
window.closeSidebar = closeSidebar;

/* ════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
════════════════════════════════════════════════════════ */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    // Close any open modal in order of priority
    if (!document.getElementById("productModalOverlay")?.classList.contains("hidden")) {
      window.closeProductModal?.();
      return;
    }
    if (!document.getElementById("catModalOverlay")?.classList.contains("hidden")) {
      window.closeCatModal?.();
      return;
    }
    if (!document.getElementById("confirmOverlay")?.classList.contains("hidden")) {
      window.closeConfirm?.();
      return;
    }
    if (window.innerWidth <= 768) closeSidebar();
  }
});

/* ════════════════════════════════════════════════════════
   ADMIN READY → Initial navigation
════════════════════════════════════════════════════════ */
window.addEventListener("adminReady", ({ detail }) => {
  // Navigate to inicio by default
  goTo("inicio");
  hideLoading();
});