// ═══════════════════════════════════════════════════════
//  js/landing.js  —  Home / Marketplace pública
//
//  Renderiza la lista de bazares disponibles, permite
//  buscar por nombre o categoría, filtrar por categoría
//  (chips) y navegar al bazar seleccionado (/{slug}).
//
//  No requiere autenticación.
// ═══════════════════════════════════════════════════════

import {
  getAllBusinesses, filterBusinesses, getUniqueBusinessCategories
} from "./db-public.js";

let _allBusinesses = [];
let _searchTerm    = "";
let _categoryFilter = "";

/* ── Init ────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  showLandingLoading(true);
  try {
    _allBusinesses = await getAllBusinesses();
  } catch (e) {
    console.error("Error cargando bazares:", e);
    _allBusinesses = [];
  }
  showLandingLoading(false);
  renderCategoryChips();
  renderBusinesses();
}

/* ════════════════════════════════════════════════════════
   LOADING STATE
════════════════════════════════════════════════════════ */
function showLandingLoading(isLoading) {
  const loader = document.getElementById("landingLoading");
  const grid    = document.getElementById("businessesGrid");
  if (loader) loader.classList.toggle("hidden", !isLoading);
  if (grid)   grid.classList.toggle("hidden", isLoading);
}

/* ════════════════════════════════════════════════════════
   SEARCH
════════════════════════════════════════════════════════ */
window.handleBusinessSearch = function(val) {
  _searchTerm = val;
  renderBusinesses();
};

/* ════════════════════════════════════════════════════════
   CATEGORY CHIPS
════════════════════════════════════════════════════════ */
function renderCategoryChips() {
  const wrap = document.getElementById("categoryChips");
  if (!wrap) return;

  const categories = getUniqueBusinessCategories(_allBusinesses);

  if (!categories.length) {
    wrap.innerHTML = "";
    return;
  }

  const allChip = `<button class="filter-chip active" data-cat="" onclick="setBusinessCategoryFilter('',this)">
    <i class="fas fa-th"></i> Todas
  </button>`;

  const chips = categories.map(cat => `
    <button class="filter-chip" data-cat="${escapeAttr(cat)}" onclick="setBusinessCategoryFilter('${escapeJs(cat)}',this)">
      ${escapeHtml(cat)}
    </button>`
  ).join("");

  wrap.innerHTML = allChip + chips;
}

window.setBusinessCategoryFilter = function(cat, btn) {
  _categoryFilter = cat;
  document.querySelectorAll("#categoryChips .filter-chip").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderBusinesses();
};

/* ════════════════════════════════════════════════════════
   RENDER BUSINESSES GRID
════════════════════════════════════════════════════════ */
function renderBusinesses() {
  const grid = document.getElementById("businessesGrid");
  if (!grid) return;

  const filtered = filterBusinesses(_allBusinesses, _searchTerm, _categoryFilter);

  // Update result count if present
  const countEl = document.getElementById("businessesCount");
  if (countEl) {
    countEl.textContent = _allBusinesses.length
      ? `${filtered.length} bazar${filtered.length !== 1 ? "es" : ""}`
      : "";
  }

  if (!_allBusinesses.length) {
    grid.innerHTML = `
      <div class="no-results">
        <i class="fas fa-store-slash"></i>
        <p>Todavía no hay bazares publicados.</p>
        <p style="font-size:.8rem;margin-top:6px;">¡Sé el primero! Crea tu cuenta de comerciante.</p>
      </div>`;
    return;
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search-minus"></i>
        <p>No encontramos bazares con esa búsqueda.</p>
        <button class="filter-chip active" style="margin-top:12px" onclick="clearBusinessFilters()">Ver todos</button>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(buildBusinessCard).join("");
}

window.clearBusinessFilters = function() {
  _searchTerm = "";
  _categoryFilter = "";
  const searchInput = document.getElementById("globalBusinessSearch");
  if (searchInput) searchInput.value = "";
  document.querySelectorAll("#categoryChips .filter-chip").forEach((b, i) => b.classList.toggle("active", i === 0));
  renderBusinesses();
};

/* ════════════════════════════════════════════════════════
   CARD BUILDER
════════════════════════════════════════════════════════ */
function buildBusinessCard(b) {
  const name   = escapeHtml(b.bazarName || "Bazar");
  const slogan = escapeHtml(b.slogan || "");
  const color  = b.themeColor || "#EC4899";
  const cats   = (b.categories || []).slice(0, 3)
    .map(c => `<span class="biz-cat-chip">${escapeHtml(c)}</span>`).join("");

  const avatar = b.logoUrl
    ? `<img src="${b.logoUrl}" alt="${name}" class="biz-logo" />`
    : `<div class="biz-logo biz-logo-placeholder" style="background:${color}">${(b.bazarName || "B").charAt(0).toUpperCase()}</div>`;

  return `
  <a class="business-card" href="/${encodeURIComponent(b.slug)}" style="--biz-color:${color}">
    ${avatar}
    <div class="biz-info">
      <div class="biz-name">${name}</div>
      ${slogan ? `<div class="biz-slogan">${slogan}</div>` : ""}
      ${cats ? `<div class="biz-cats">${cats}</div>` : ""}
    </div>
    <div class="biz-arrow"><i class="fas fa-arrow-right"></i></div>
  </a>`;
}

/* ════════════════════════════════════════════════════════
   ESCAPE HELPERS
════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(str) {
  return escapeHtml(str);
}
function escapeJs(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}