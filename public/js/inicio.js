// ═══════════════════════════════════════════════════════
//  js/inicio.js  —  Sección Inicio: perfil + destacados
//
//  Además de guardar el perfil del comerciante, mantiene
//  sincronizado el documento público en
//  public_businesses/{slug} para que la landing/marketplace
//  pueda listar y buscar este negocio.
// ═══════════════════════════════════════════════════════

import { getProfile, saveProfile, subscribeProducts, getCategories } from "./db.js";
import { uploadLogo, uploadBanner }                   from "./storage.js";
import { showToast, showLoading, hideLoading }         from "../app.js";
import { currentUser }                                 from "./auth.js";
import { db }                                          from "./firebase.js";
import {
  doc, getDoc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let _logoFile   = null;
let _bannerFile = null;
let _themeColor = "#EC4899";
let _allProducts = [];
let _featuredIds = new Set();
let _unsubProducts = null;
let _currentSlug = null; // slug ya guardado en public_businesses (si existe)

/* ── Init on admin ready ─────────────────────────────── */
window.addEventListener("adminReady", async () => {
  await loadInicioData();
  subscribeToProducts();
});

async function loadInicioData() {
  const profile = await getProfile();

  document.getElementById("iBazarName").value = profile.bazarName  || "";
  document.getElementById("iSlogan").value    = profile.slogan     || "";
  document.getElementById("iWelcome").value   = profile.welcome    || "";

  if (profile.logoUrl) {
    showLogoPreview(profile.logoUrl);
  }
  if (profile.bannerUrl) {
    showBannerPreview(profile.bannerUrl);
  }
  if (profile.themeColor) {
    _themeColor = profile.themeColor;
    selectThemeColor(profile.themeColor, null, true);
  }
  if (profile.featuredIds) {
    _featuredIds = new Set(profile.featuredIds);
  }

  _currentSlug = profile.slug || null;
  updatePreviewLink(_currentSlug);

  // Update sidebar bazar name live
  const bazarName = profile.bazarName || "Mi Bazar";
  document.getElementById("userBazarName").textContent = bazarName;
  document.getElementById("userAvatar").textContent    = bazarName.charAt(0).toUpperCase();
}

function subscribeToProducts() {
  if (_unsubProducts) _unsubProducts();
  _unsubProducts = subscribeProducts(products => {
    _allProducts = products;
    renderFeaturedPicker();
  });
}

/* ════════════════════════════════════════════════════════
   SLUG — helpers
════════════════════════════════════════════════════════ */

/**
 * Convierte un nombre de bazar en un slug URL-friendly.
 * Ej: "Bazar Lupita ✦" → "bazar-lupita"
 */
function slugify(text) {
  return (text || "")
    .toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")  // quita símbolos/emojis
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const RESERVED_SLUGS = ["admin", "index", "bazar", "api", "static", "assets", "public"];

/**
 * Genera un slug disponible a partir del nombre del bazar.
 * Si el slug base ya existe (de otro usuario), agrega un
 * sufijo numérico hasta encontrar uno libre.
 * Si el slug ya pertenece a este mismo usuario, lo reutiliza.
 */
async function resolveAvailableSlug(bazarName, uid) {
  let base = slugify(bazarName);
  if (!base) base = "mi-bazar";
  if (RESERVED_SLUGS.includes(base)) base = `${base}-tienda`;

  let candidate = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ref  = doc(db, "public_businesses", candidate);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().uid === uid) {
      return candidate;
    }
    candidate = `${base}-${n}`;
    n++;
  }
}

/**
 * Sincroniza (crea/actualiza) el documento público del negocio.
 * Si el nombre del bazar cambió y eso cambia el slug, también
 * elimina el documento antiguo para no dejar duplicados.
 */
async function syncPublicBusiness({ uid, bazarName, slogan, themeColor, logoUrl, categories }) {
  const newSlug = await resolveAvailableSlug(bazarName, uid);

  // Si el slug cambió respecto al guardado previamente, borra el anterior
  if (_currentSlug && _currentSlug !== newSlug) {
    try { await deleteDoc(doc(db, "public_businesses", _currentSlug)); }
    catch (e) { console.warn("No se pudo eliminar slug anterior:", e); }
  }

  await setDoc(doc(db, "public_businesses", newSlug), {
    uid,
    slug: newSlug,
    bazarName: bazarName || "Mi Bazar",
    slogan: slogan || "",
    themeColor: themeColor || "#EC4899",
    logoUrl: logoUrl || "",
    categories: categories || [],
    updatedAt: Date.now()
  }, { merge: false });

  _currentSlug = newSlug;
  return newSlug;
}

function updatePreviewLink(slug) {
  const link = document.getElementById("previewLink");
  if (!link) return;
  if (slug) {
    link.href = `/${slug}`;
    link.classList.remove("disabled");
  } else {
    link.href = "#";
  }
}

/**
 * Actualiza solo el campo "categories" del documento público
 * existente (sin tocar slug/nombre/logo). Se usa desde
 * catalogo.js cuando se crean/editan/eliminan categorías,
 * para que el buscador del marketplace quede al día sin
 * necesidad de ir a guardar la sección Inicio.
 *
 * Si el negocio aún no tiene slug (nunca se guardó Inicio),
 * no hace nada — se sincronizará la primera vez que se guarde.
 */
export async function syncPublicCategories(categoryNames) {
  if (!_currentSlug || !currentUser) return;
  try {
    await setDoc(doc(db, "public_businesses", _currentSlug), {
      categories: categoryNames,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (e) {
    console.warn("No se pudo sincronizar categorías públicas:", e);
  }
}

/* ── Save inicio ─────────────────────────────────────── */
window.saveInicio = async function() {
  showLoading();
  try {
    const bazarName = document.getElementById("iBazarName").value.trim();

    const data = {
      bazarName,
      slogan:      document.getElementById("iSlogan").value.trim(),
      welcome:     document.getElementById("iWelcome").value.trim(),
      themeColor:  _themeColor,
      featuredIds: [..._featuredIds]
    };

    if (_logoFile) {
      data.logoUrl = await uploadLogo(_logoFile);
      _logoFile = null;
    }
    if (_bannerFile) {
      data.bannerUrl = await uploadBanner(_bannerFile);
      _bannerFile = null;
    }

    // Obtener nombres de categorías del comerciante (para el índice público)
    let categoryNames = [];
    try {
      const cats = await getCategories();
      categoryNames = cats.map(c => c.name);
    } catch (e) { /* sin categorías aún, ok */ }

    // Resolver/actualizar slug y documento público ANTES de guardar
    // el perfil, para poder almacenar el slug definitivo.
    const logoUrlForPublic = data.logoUrl || document.getElementById("logoPreview")?.src || "";
    const slug = await syncPublicBusiness({
      uid: currentUser.uid,
      bazarName,
      slogan: data.slogan,
      themeColor: data.themeColor,
      logoUrl: logoUrlForPublic.startsWith("blob:") ? "" : logoUrlForPublic,
      categories: categoryNames
    });
    data.slug = slug;

    await saveProfile(data);

    // Update sidebar live
    document.getElementById("userBazarName").textContent = data.bazarName || "Mi Bazar";
    document.getElementById("userAvatar").textContent    = (data.bazarName || "M").charAt(0).toUpperCase();
    updatePreviewLink(slug);

    hideLoading();
    showToast("✅ Inicio guardado correctamente", "success");
  } catch(e) {
    hideLoading();
    console.error(e);
    showToast("Error al guardar. Intenta nuevamente.", "error");
  }
};

/* ── Logo upload ─────────────────────────────────────── */
window.handleLogoUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  _logoFile = file;
  showLogoPreview(URL.createObjectURL(file));
};

function showLogoPreview(src) {
  const img  = document.getElementById("logoPreview");
  const ph   = document.getElementById("logoPlaceholder");
  const btn  = document.getElementById("removeLogoBtn");
  img.src    = src;
  img.classList.remove("hidden");
  ph.style.display  = "none";
  btn.style.display = "inline-flex";
}

window.removeLogo = function() {
  document.getElementById("logoPreview").classList.add("hidden");
  document.getElementById("logoPlaceholder").style.display = "flex";
  document.getElementById("removeLogoBtn").style.display   = "none";
  document.getElementById("logoFile").value = "";
  _logoFile = null;
};

/* ── Banner upload ───────────────────────────────────── */
window.handleBannerUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  _bannerFile = file;
  showBannerPreview(URL.createObjectURL(file));
};

function showBannerPreview(src) {
  const img = document.getElementById("bannerPreview");
  const ph  = document.getElementById("bannerPlaceholder");
  img.src   = src;
  img.classList.remove("hidden");
  ph.style.display = "none";
}

/* ── Theme color ─────────────────────────────────────── */
window.selectThemeColor = function(color, el, silent = false) {
  _themeColor = color;
  document.getElementById("customColor").value = color;
  document.querySelectorAll(".preset-swatch").forEach(s =>
    s.classList.toggle("active", s.dataset.color === color)
  );
  if (!silent) {
    // Apply live preview via CSS variable
    document.documentElement.style.setProperty("--pink-500", color);
    // Darken slightly for --pink-600
    document.documentElement.style.setProperty("--pink-600", darkenHex(color, 20));
  }
};

function darkenHex(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r   = Math.max(0, (num >> 16) - amount);
  const g   = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b   = Math.max(0, (num & 0xff) - amount);
  return `#${[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("")}`;
}

/* ── Featured picker ─────────────────────────────────── */
function renderFeaturedPicker() {
  const grid = document.getElementById("featuredPickerGrid");
  if (!_allProducts.length) {
    grid.innerHTML = `<div class="empty-state-sm"><i class="fas fa-box-open"></i> Carga productos en Catálogo primero</div>`;
    return;
  }

  const MAX = 6;
  grid.innerHTML = _allProducts.map(p => {
    const selected = _featuredIds.has(p.id);
    const thumb    = (p.photos && p.photos[0]) ? p.photos[0].url : "";
    return `
    <div class="featured-pick-item${selected ? " selected" : ""}" 
         id="fp-${p.id}"
         onclick="toggleFeatured('${p.id}')">
      ${thumb 
        ? `<img src="${thumb}" alt="${p.name}" />`
        : `<div style="aspect-ratio:1;background:var(--gray-100);display:flex;align-items:center;justify-content:center;"><i class="fas fa-image" style="color:var(--gray-300);font-size:1.2rem;"></i></div>`
      }
      <div class="fp-name">${p.name}</div>
      <div class="fp-check"><i class="fas fa-check"></i></div>
    </div>`;
  }).join("");
}

window.toggleFeatured = function(pid) {
  if (_featuredIds.has(pid)) {
    _featuredIds.delete(pid);
  } else {
    if (_featuredIds.size >= 6) {
      showToast("Máximo 6 productos destacados.");
      return;
    }
    _featuredIds.add(pid);
  }
  renderFeaturedPicker();
};