// ═══════════════════════════════════════════════════════
//  js/bazar-public.js  —  Vista pública de un bazar
//
//  Adapta la lógica del bazar.html original (catálogo,
//  filtros, carrusel, modal, WhatsApp) para que renderice
//  los datos reales del comerciante leídos desde Firestore
//  (perfil, categorías, productos), identificado por el
//  slug en la URL: /{slug}
//
//  Solo lectura — sin edición. Interacciones básicas:
//  navegación, filtros, búsqueda, carrusel, modal de
//  producto y contacto por WhatsApp.
// ═══════════════════════════════════════════════════════

import { getBusinessBySlug, getBusinessData } from "./db-public.js";

/* ── Mapa de colores conocido para variantes "Color" ─── */
const COLOR_MAP = {
  'Rosa':'#FFB3C8','Lavanda':'#C4B5FD','Blanco':'#F5F5F5','Negro':'#1F2937',
  'Vino':'#7C2D12','Azul oscuro':'#1E3A5F','Gris':'#9CA3AF','Azul cielo':'#93C5FD',
  'Verde menta':'#6EE7B7','Verde militar':'#4D7C0F','Nude':'#D4A574','Rojo':'#EF4444',
  'Café':'#92400E','Beige':'#F5DEB3','Mostaza':'#EAB308','Natural':'#D2B48C',
  'Azul marino':'#1E3A5F','Plata':'#C0C0C0','Rose Gold':'#F4A7B9',
  'Verde':'#22C55E','Negro/Rojo':'#1F2937','Blanco/Azul':'#BFDBFE',
};
function colorHex(name) {
  return COLOR_MAP[name] || "#CCCCCC";
}

/* ── State ───────────────────────────────────────────── */
const state = {
  profile: null,
  categories: [],     // [{id,name,icon}]
  products: [],        // productos activos
  search: "",
  categoryFilter: "",  // id de categoría (filtro principal / catálogo)
  catTab: "",          // id de categoría (tabs del catálogo)
  modal: { product: null, imgIdx: 0, variantSelections: {} }
};

/* ── Init ────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  const slug = getSlugFromUrl();
  if (!slug) {
    showNotFound("No se especificó ningún bazar.");
    return;
  }

  try {
    const business = await getBusinessBySlug(slug);
    if (!business) {
      showNotFound(`No encontramos el bazar "${slug}".`);
      return;
    }

    const { profile, categories, products } = await getBusinessData(business.uid);

    state.profile    = profile || {};
    state.categories = categories || [];
    state.products   = products || [];

    applyBranding(state.profile, business);
    renderHeader();
    renderHero();
    renderCategoryFilterBar();
    renderProducts();
    renderCatalogTabs();
    renderContact();

    document.getElementById("bazarApp")?.classList.remove("hidden");
    document.getElementById("bazarLoading")?.classList.add("hidden");
  } catch (e) {
    console.error("Error cargando bazar:", e);
    showNotFound("Ocurrió un error al cargar este bazar. Intenta más tarde.");
  }
}

/* ════════════════════════════════════════════════════════
   URL / SLUG
════════════════════════════════════════════════════════ */
function getSlugFromUrl() {
  // Soporta /:slug (rewrite de hosting) y ?slug=... / ?uid=... como fallback
  const params = new URLSearchParams(window.location.search);
  if (params.get("slug")) return params.get("slug");

  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (path && path !== "bazar.html" && path !== "index.html") return path;

  return null;
}

/* ════════════════════════════════════════════════════════
   NOT FOUND STATE
════════════════════════════════════════════════════════ */
function showNotFound(msg) {
  document.getElementById("bazarLoading")?.classList.add("hidden");
  const el = document.getElementById("bazarNotFound");
  if (el) {
    el.classList.remove("hidden");
    const msgEl = el.querySelector("[data-notfound-msg]");
    if (msgEl) msgEl.textContent = msg;
  }
}

/* ════════════════════════════════════════════════════════
   BRANDING (color, logo, título)
════════════════════════════════════════════════════════ */
function applyBranding(profile, business) {
  const color = profile.themeColor || business.themeColor || "#EC4899";
  document.documentElement.style.setProperty("--pink-500", color);
  document.documentElement.style.setProperty("--pink-600", darkenHex(color, 20));
  document.documentElement.style.setProperty("--pink-400", lightenHex(color, 15));

  const name = profile.bazarName || business.bazarName || "Mi Bazar";
  document.title = `${name} ✦ Tu Tienda Favorita`;
}

function darkenHex(hex, amount) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("")}`;
}
function lightenHex(hex, amount) {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("")}`;
}

/* ════════════════════════════════════════════════════════
   HEADER
════════════════════════════════════════════════════════ */
function renderHeader() {
  const name = state.profile.bazarName || "Mi Bazar";
  const logoEl = document.getElementById("bazarLogo");
  if (logoEl) {
    if (state.profile.logoUrl) {
      logoEl.innerHTML = `<img src="${state.profile.logoUrl}" alt="${escapeHtml(name)}" class="header-logo-img" />`;
    } else {
      logoEl.innerHTML = `${escapeHtml(name)} <span>✦</span>`;
    }
  }
  const nameEls = document.querySelectorAll("[data-bazar-name]");
  nameEls.forEach(el => el.textContent = name);
}

/* ════════════════════════════════════════════════════════
   HERO
════════════════════════════════════════════════════════ */
function renderHero() {
  const p = state.profile;

  const titleEl = document.getElementById("heroTitle");
  if (titleEl) {
    titleEl.innerHTML = p.bazarName
      ? `${escapeHtml(p.bazarName)}`
      : `Tu tienda <em>favorita</em> en línea`;
  }

  const subEl = document.getElementById("heroSubtitle");
  if (subEl) {
    subEl.textContent = p.slogan || "Encuentra productos increíbles al mejor precio.";
  }

  const welcomeEl = document.getElementById("heroWelcome");
  if (welcomeEl) {
    if (p.welcome) {
      welcomeEl.textContent = p.welcome;
      welcomeEl.classList.remove("hidden");
    } else {
      welcomeEl.classList.add("hidden");
    }
  }

  const bannerEl = document.getElementById("heroBanner");
  if (bannerEl) {
    if (p.bannerUrl) {
      bannerEl.style.backgroundImage = `url('${p.bannerUrl}')`;
      bannerEl.classList.add("has-banner");
    } else {
      bannerEl.classList.remove("has-banner");
    }
  }

  // Featured products (if profile.featuredIds set)
  renderFeatured();
}

function renderFeatured() {
  const wrap = document.getElementById("featuredSection");
  if (!wrap) return;
  const ids = state.profile.featuredIds || [];
  if (!ids.length) { wrap.classList.add("hidden"); return; }

  const featured = state.products.filter(p => ids.includes(p.id));
  if (!featured.length) { wrap.classList.add("hidden"); return; }

  wrap.classList.remove("hidden");
  const grid = document.getElementById("featuredGrid");
  if (grid) grid.innerHTML = featured.map(buildCard).join("");
}

/* ════════════════════════════════════════════════════════
   FILTER BAR (Inicio)
════════════════════════════════════════════════════════ */
function renderCategoryFilterBar() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;

  if (!state.categories.length) {
    bar.innerHTML = "";
    return;
  }

  let html = `<span class="filter-label">Categoría</span>`;
  html += `<button class="filter-chip active" data-cat="" onclick="window.__bazarSetFilter('','category', this)">Todo</button>`;
  state.categories.forEach(c => {
    html += `<button class="filter-chip" data-cat="${c.id}" onclick="window.__bazarSetFilter('${c.id}','category', this)">
      <i class="${c.icon || 'fas fa-tag'}" style="margin-right:4px;"></i>${escapeHtml(c.name)}
    </button>`;
  });
  html += `<div class="filter-sep"></div>`;
  html += `<span class="filter-label">Estado</span>`;
  html += `<button class="filter-chip" data-cond="nuevo" onclick="window.__bazarSetFilter('nuevo','condition', this)">Nuevo</button>`;
  html += `<button class="filter-chip" data-cond="usado" onclick="window.__bazarSetFilter('usado','condition', this)">Usado</button>`;
  html += `<button class="clear-filters" onclick="window.__bazarClearFilters()">✕ Limpiar filtros</button>`;

  bar.innerHTML = html;
}

window.__bazarSetFilter = function(val, key, btn) {
  if (key === "category") {
    state.categoryFilter = (state.categoryFilter === val) ? "" : val;
    document.querySelectorAll('#filterBar .filter-chip[data-cat]').forEach(b => {
      b.classList.toggle("active", b.dataset.cat === state.categoryFilter || (b.dataset.cat === "" && state.categoryFilter === ""));
    });
  } else if (key === "condition") {
    state.conditionFilter = (state.conditionFilter === val) ? "" : val;
    document.querySelectorAll('#filterBar .filter-chip[data-cond]').forEach(b => {
      b.classList.toggle("active", b.dataset.cond === state.conditionFilter);
    });
  }
  renderProducts();
};

window.__bazarClearFilters = function() {
  state.search = "";
  state.categoryFilter = "";
  state.conditionFilter = "";
  const searchInput = document.getElementById("globalSearch");
  if (searchInput) searchInput.value = "";
  document.querySelectorAll('#filterBar .filter-chip').forEach((b, i) => {
    b.classList.toggle("active", i === 0);
  });
  renderProducts();
};

/* ════════════════════════════════════════════════════════
   SEARCH (header)
════════════════════════════════════════════════════════ */
window.handleSearch = function(val) {
  state.search = (val || "").toLowerCase();
  renderProducts();
  if (isCatalogActive()) renderCatalog();
};

function isCatalogActive() {
  return document.getElementById("catalogo")?.classList.contains("active");
}

/* ════════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════════ */
window.goTo = function(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  document.querySelectorAll("nav button").forEach(b => {
    b.classList.toggle("active", b.dataset.section === id);
  });
  if (id === "catalogo") renderCatalog();
  if (id === "contacto") populateContactSelect();
  window.scrollTo(0, 0);
};

window.scrollToProducts = function() {
  document.getElementById("productsSection")?.scrollIntoView({ behavior: "smooth" });
};

/* ════════════════════════════════════════════════════════
   FILTER / SEARCH LOGIC
════════════════════════════════════════════════════════ */
function getFiltered() {
  return state.products.filter(p => {
    const matchSearch = !state.search ||
      (p.name || "").toLowerCase().includes(state.search) ||
      (p.description || "").toLowerCase().includes(state.search) ||
      (p.tags || []).some(t => t.toLowerCase().includes(state.search)) ||
      categoryNames(p.categories).some(n => n.toLowerCase().includes(state.search));

    const matchCat = !state.categoryFilter ||
      (p.categories || []).includes(state.categoryFilter);

    const matchCond = !state.conditionFilter || p.condition === state.conditionFilter;

    return matchSearch && matchCat && matchCond;
  });
}

function categoryNames(catIds = []) {
  return catIds
    .map(id => state.categories.find(c => c.id === id)?.name)
    .filter(Boolean);
}

/* ════════════════════════════════════════════════════════
   PRODUCT CARD
════════════════════════════════════════════════════════ */
function buildCard(p) {
  const imgs = (p.photos || []).map(ph => ph.url);
  const hasImgs = imgs.length > 0;

  let imgMarkup = hasImgs
    ? imgs.map((src, i) => `<img src="${src}" alt="${escapeAttr(p.name)}" class="${i>0?'hidden':''}" loading="lazy"/>`).join("")
    : `<div class="card-no-image"><i class="fas fa-image"></i></div>`;

  let dotsMarkup = imgs.length > 1
    ? imgs.map((_, i) => `<span class="card-dot${i===0?' active':''}"></span>`).join("")
    : "";

  let navMarkup = imgs.length > 1
    ? `<button class="card-nav prev" onclick="window.__bazarCardNav(event,'${p.id}',-1)"><i class="fas fa-chevron-left"></i></button>
       <button class="card-nav next" onclick="window.__bazarCardNav(event,'${p.id}',1)"><i class="fas fa-chevron-right"></i></button>`
    : "";

  const isNew = (p.tags || []).some(t => t.toLowerCase() === "nuevo");
  const isOferta = (p.tags || []).some(t => t.toLowerCase() === "oferta");
  let badge = "";
  if (isOferta) badge = `<span class="card-badge" style="background:var(--pink-500);color:var(--white)">🏷️ Oferta</span>`;
  else if (isNew) badge = `<span class="card-badge">⭐ Nuevo</span>`;

  const condLabel = p.condition === "nuevo"
    ? `<span class="card-condition nuevo">Nuevo</span>`
    : `<span class="card-condition usado">Usado</span>`;

  const cats = categoryNames(p.categories);
  const catLabel = cats.length ? cats[0] : "";

  const price = p.price != null ? `$${Number(p.price).toLocaleString("es-MX")}` : "Consultar";

  return `
  <div class="product-card" id="card-${p.id}" data-imgidx="0">
    <div class="card-carousel">
      ${imgMarkup}
      ${navMarkup}
      ${badge}
      ${condLabel}
      <div class="card-dots" id="cdots-${p.id}">${dotsMarkup}</div>
    </div>
    <div class="card-body">
      ${catLabel ? `<div class="card-category">${escapeHtml(catLabel)}</div>` : ""}
      <div class="card-title">${escapeHtml(p.name || "")}</div>
      <div class="card-desc">${escapeHtml(p.description || "")}</div>
      <div class="card-footer">
        <div class="card-price">${price}${p.price != null ? ` <span>MXN</span>` : ""}</div>
        <button class="card-btn" onclick="window.openModal('${p.id}')">Ver detalle</button>
      </div>
    </div>
  </div>`;
}

window.__bazarCardNav = function(e, pid, dir) {
  e.stopPropagation();
  const card = document.getElementById(`card-${pid}`);
  const p = state.products.find(x => x.id === pid);
  if (!card || !p) return;
  const imgs = (p.photos || []);
  if (!imgs.length) return;
  let idx = parseInt(card.dataset.imgidx) || 0;
  idx = (idx + dir + imgs.length) % imgs.length;
  card.dataset.imgidx = idx;
  card.querySelectorAll(".card-carousel img").forEach((img, i) => img.classList.toggle("hidden", i !== idx));
  document.querySelectorAll(`#cdots-${pid} .card-dot`).forEach((d, i) => d.classList.toggle("active", i === idx));
};

/* ════════════════════════════════════════════════════════
   RENDER PRODUCTS (Inicio)
════════════════════════════════════════════════════════ */
function renderProducts() {
  const filtered = getFiltered();
  const grid  = document.getElementById("productsGrid");
  const count = document.getElementById("productsCount");
  if (count) count.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;
  if (!grid) return;

  if (!state.products.length) {
    grid.innerHTML = `<div class="no-results"><i class="fas fa-box-open"></i><p>Este bazar aún no tiene productos publicados.</p></div>`;
    return;
  }

  if (!filtered.length) {
    grid.innerHTML = `<div class="no-results"><i class="fas fa-search-minus"></i><p>No se encontraron productos con esos filtros.</p><button class="filter-chip active" style="margin-top:12px" onclick="window.__bazarClearFilters()">Ver todos</button></div>`;
    return;
  }

  grid.innerHTML = filtered.map(buildCard).join("");
}

/* ════════════════════════════════════════════════════════
   CATALOG (tabs por categoría)
════════════════════════════════════════════════════════ */
function renderCatalogTabs() {
  const tabs = document.getElementById("catTabs");
  if (!tabs) return;

  if (!state.categories.length) {
    tabs.innerHTML = "";
    return;
  }

  let html = `<button class="cat-tab active" onclick="window.__bazarSetCatTab('', this)"><i class="fas fa-th"></i> Todo</button>`;
  state.categories.forEach(c => {
    html += `<button class="cat-tab" onclick="window.__bazarSetCatTab('${c.id}', this)">
      <i class="${c.icon || 'fas fa-tag'}"></i> ${escapeHtml(c.name)}
    </button>`;
  });
  tabs.innerHTML = html;
}

window.__bazarSetCatTab = function(catId, btn) {
  state.catTab = catId;
  document.querySelectorAll("#catTabs .cat-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderCatalog();
};

function renderCatalog() {
  const grid = document.getElementById("catalogGrid");
  if (!grid) return;

  if (!state.products.length) {
    grid.innerHTML = `<div class="no-results" style="grid-column:1/-1"><i class="fas fa-box-open"></i><p>Este bazar aún no tiene productos publicados.</p></div>`;
    return;
  }

  // Aplica búsqueda global también en catálogo
  const term = state.search;
  const matches = p => !term ||
    (p.name || "").toLowerCase().includes(term) ||
    (p.description || "").toLowerCase().includes(term) ||
    categoryNames(p.categories).some(n => n.toLowerCase().includes(term));

  const cats = state.catTab
    ? state.categories.filter(c => c.id === state.catTab)
    : state.categories;

  let html = "";
  let any = false;

  if (cats.length) {
    cats.forEach(cat => {
      const prods = state.products.filter(p => (p.categories || []).includes(cat.id) && matches(p));
      if (!prods.length) return;
      any = true;
      html += `<div class="cat-section-header">
        <h3><i class="${cat.icon || 'fas fa-tag'}"></i> ${escapeHtml(cat.name)}</h3>
        <div class="cat-section-line"></div>
      </div>`;
      html += prods.map(buildCard).join("");
    });
  }

  // Productos sin categoría
  const uncategorized = state.products.filter(p => !(p.categories || []).length && matches(p));
  if (uncategorized.length && !state.catTab) {
    any = true;
    html += `<div class="cat-section-header">
      <h3><i class="fas fa-box"></i> Otros productos</h3>
      <div class="cat-section-line"></div>
    </div>`;
    html += uncategorized.map(buildCard).join("");
  }

  grid.innerHTML = any ? html : `<div class="no-results" style="grid-column:1/-1"><i class="fas fa-box-open"></i><p>No hay productos en esta categoría.</p></div>`;
}

/* ════════════════════════════════════════════════════════
   MODAL
════════════════════════════════════════════════════════ */
window.openModal = function(pid) {
  const p = state.products.find(x => x.id === pid);
  if (!p) return;
  state.modal = { product: p, imgIdx: 0, variantSelections: {} };
  renderModal();
  document.getElementById("modalOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
};

function renderModal() {
  const { product: p, imgIdx } = state.modal;
  const carousel = document.getElementById("modalCarousel");
  if (!carousel) return;

  const imgs = (p.photos || []).map(ph => ph.url);

  carousel.querySelectorAll("img").forEach(i => i.remove());
  if (imgs.length) {
    imgs.forEach((src, i) => {
      const img = document.createElement("img");
      img.src = src; img.alt = p.name || "";
      if (i !== imgIdx) img.classList.add("hidden");
      const prevBtn = carousel.querySelector(".modal-nav.prev");
      if (prevBtn) carousel.insertBefore(img, prevBtn);
      else carousel.appendChild(img);
    });
  } else {
    const ph = document.createElement("div");
    ph.className = "modal-no-image";
    ph.innerHTML = `<i class="fas fa-image"></i>`;
    const prevBtn = carousel.querySelector(".modal-nav.prev");
    if (prevBtn) carousel.insertBefore(ph, prevBtn);
    else carousel.appendChild(ph);
  }

  const dots = document.getElementById("modalDots");
  if (dots) {
    dots.innerHTML = imgs.map((_, i) =>
      `<button class="modal-dot${i===imgIdx?' active':''}" onclick="window.__bazarGoModalImg(${i})"></button>`
    ).join("");
  }

  const prevEl = document.getElementById("modalPrev");
  const nextEl = document.getElementById("modalNext");
  if (prevEl) prevEl.style.display = imgs.length > 1 ? "flex" : "none";
  if (nextEl) nextEl.style.display = imgs.length > 1 ? "flex" : "none";

  // Body
  const cats = categoryNames(p.categories);
  const catLabel = cats.length ? cats.join(", ") : "";

  let variantsHTML = "";
  (p.variants || []).forEach(v => {
    if (!v.values || !v.values.length) return;
    if (v.type === "Color") {
      variantsHTML += `<span class="option-label">${escapeHtml(v.type)}</span>
        <div class="option-group">${v.values.map(val => {
          const hex = colorHex(val);
          const active = state.modal.variantSelections[v.type] === val;
          return `<div class="color-opt${active?' active':''}" style="background:${hex}" onclick="window.__bazarSelectVariant('${escapeJs(v.type)}','${escapeJs(val)}')" title="${escapeAttr(val)}">
            <span class="color-tooltip">${escapeHtml(val)}</span>
          </div>`;
        }).join("")}</div>`;
    } else {
      variantsHTML += `<span class="option-label">${escapeHtml(v.type)}</span>
        <div class="option-group">${v.values.map(val => {
          const active = state.modal.variantSelections[v.type] === val;
          return `<button class="opt-btn${active?' active':''}" onclick="window.__bazarSelectVariant('${escapeJs(v.type)}','${escapeJs(val)}')">${escapeHtml(val)}</button>`;
        }).join("")}</div>`;
    }
  });

  const condBadge = p.condition === "nuevo"
    ? `<span style="display:inline-block;background:var(--pink-100);color:var(--pink-600);font-size:.72rem;font-weight:600;padding:3px 12px;border-radius:99px;">✨ Nuevo</span>`
    : `<span style="display:inline-block;background:var(--gray-100);color:var(--gray-500);font-size:.72rem;font-weight:600;padding:3px 12px;border-radius:99px;">📦 Usado</span>`;

  const price = p.price != null ? `$${Number(p.price).toLocaleString("es-MX")} <small>MXN</small>` : `Consultar precio`;
  const stockInfo = (p.stock != null)
    ? `<div style="font-size:.78rem;color:var(--gray-400);margin-bottom:10px;">${p.stock > 0 ? `${p.stock} disponibles` : "Sin stock por el momento"}</div>`
    : "";

  const body = document.getElementById("modalBody");
  if (body) {
    body.innerHTML = `
      ${catLabel ? `<div class="modal-category">${escapeHtml(catLabel)}</div>` : ""}
      <div class="modal-title">${escapeHtml(p.name || "")}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <div class="modal-price">${price}</div>
        ${condBadge}
      </div>
      ${stockInfo}
      <div class="modal-desc">${escapeHtml(p.description || "")}</div>
      ${variantsHTML}
      <button class="wapp-btn" onclick="window.sendProductWA()">
        <i class="fab fa-whatsapp"></i> Preguntar por WhatsApp
      </button>
    `;
  }
}

window.__bazarGoModalImg = function(idx) {
  const p = state.modal.product;
  state.modal.imgIdx = idx;
  const carousel = document.getElementById("modalCarousel");
  carousel?.querySelectorAll("img").forEach((img, i) => img.classList.toggle("hidden", i !== idx));
  document.querySelectorAll("#modalDots .modal-dot").forEach((d, i) => d.classList.toggle("active", i === idx));
};

window.modalCarouselNav = function(dir) {
  const p = state.modal.product;
  const imgs = (p.photos || []);
  if (!imgs.length) return;
  const newIdx = (state.modal.imgIdx + dir + imgs.length) % imgs.length;
  window.__bazarGoModalImg(newIdx);
};

window.__bazarSelectVariant = function(type, val) {
  if (state.modal.variantSelections[type] === val) {
    delete state.modal.variantSelections[type];
  } else {
    state.modal.variantSelections[type] = val;
  }
  renderModal();
};

window.closeModal = function() {
  document.getElementById("modalOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
};

window.closeModalOnBg = function(e) {
  if (e.target === document.getElementById("modalOverlay")) window.closeModal();
};

document.addEventListener("keydown", e => {
  if (e.key === "Escape") window.closeModal?.();
  if (document.getElementById("modalOverlay")?.classList.contains("open")) {
    if (e.key === "ArrowLeft") window.modalCarouselNav(-1);
    if (e.key === "ArrowRight") window.modalCarouselNav(1);
  }
});

/* ════════════════════════════════════════════════════════
   WHATSAPP
════════════════════════════════════════════════════════ */
function getWaNumber() {
  return (state.profile.contacto?.wapp || "").replace(/\D/g, "");
}

function buildWAMessage(p, variantSelections = {}) {
  const bazarName = state.profile.bazarName || "Mi Bazar";
  let msg = `¡Hola! 👋 Me interesa el siguiente producto de *${bazarName}*:\n\n`;
  msg += `🛍️ *${p.name}*\n`;
  if (p.price != null) msg += `💰 Precio: $${Number(p.price).toLocaleString("es-MX")} MXN\n`;
  msg += `📦 Condición: ${p.condition === "nuevo" ? "Nuevo" : "Usado"}\n`;
  Object.entries(variantSelections).forEach(([type, val]) => {
    msg += `🔸 ${type}: ${val}\n`;
  });
  msg += `\n¿Está disponible?`;
  return encodeURIComponent(msg);
}

window.sendProductWA = function() {
  const { product: p, variantSelections } = state.modal;
  if (!p) return;
  const wa = getWaNumber();
  if (!wa) { showToast("Este bazar no tiene WhatsApp configurado."); return; }
  const msg = buildWAMessage(p, variantSelections);
  window.open(`https://wa.me/${wa}?text=${msg}`, "_blank");
};

window.sendContactWA = function() {
  const wa = getWaNumber();
  if (!wa) { showToast("Este bazar no tiene WhatsApp configurado."); return; }

  const name = document.getElementById("cfName")?.value.trim();
  const productSel = document.getElementById("cfProduct");
  const product = productSel?.options[productSel.selectedIndex]?.text;
  const message = document.getElementById("cfMessage")?.value.trim();

  if (!name) { showToast("Por favor ingresa tu nombre"); return; }
  if (!message) { showToast("Por favor escribe un mensaje"); return; }

  let msg = `¡Hola! Soy *${name}*.\n\n`;
  if (productSel?.value) msg += `🛍️ Estoy interesado/a en: *${product}*\n\n`;
  msg += `📝 Mensaje:\n${message}`;

  const defaultMsg = state.profile.contacto?.wappMsg;
  if (defaultMsg && !productSel?.value) {
    msg = `${defaultMsg}\n\n${msg}`;
  }

  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
};

function populateContactSelect() {
  const sel = document.getElementById("cfProduct");
  if (!sel) return;
  // Reset (keep first placeholder option)
  while (sel.options.length > 1) sel.remove(1);
  state.products.forEach(p => {
    const o = document.createElement("option");
    o.value = p.id;
    o.text = p.price != null
      ? `${p.name} — $${Number(p.price).toLocaleString("es-MX")} MXN`
      : p.name;
    sel.appendChild(o);
  });
}

/* ════════════════════════════════════════════════════════
   CONTACT SECTION
════════════════════════════════════════════════════════ */
function renderContact() {
  const c = state.profile.contacto || {};
  const wrap = document.getElementById("contactLinks");
  if (!wrap) return;

  let html = "";

  if (c.wapp) {
    html += `<a class="social-link" href="https://wa.me/${c.wapp.replace(/\D/g,'')}" target="_blank">
      <div class="social-icon si-wapp"><i class="fab fa-whatsapp"></i></div>
      <div><div style="font-size:.7rem;color:var(--gray-400)">WhatsApp</div>${escapeHtml(formatPhone(c.wapp))}</div>
    </a>`;
  }
  if (c.phone) {
    html += `<a class="social-link" href="tel:${c.phone.replace(/\s/g,'')}">
      <div class="social-icon si-phone"><i class="fas fa-phone"></i></div>
      <div><div style="font-size:.7rem;color:var(--gray-400)">Teléfono${c.horario ? ` · ${escapeHtml(c.horario)}` : ""}</div>${escapeHtml(c.phone)}</div>
    </a>`;
  }
  if (c.ig) {
    html += `<a class="social-link" href="${c.igUrl || `https://instagram.com/${c.ig}`}" target="_blank">
      <div class="social-icon si-ig"><i class="fab fa-instagram"></i></div>
      <div><div style="font-size:.7rem;color:var(--gray-400)">Instagram</div>@${escapeHtml(c.ig)}</div>
    </a>`;
  }
  if (c.fb) {
    html += `<a class="social-link" href="${c.fbUrl || '#'}" target="_blank">
      <div class="social-icon si-fb"><i class="fab fa-facebook-f"></i></div>
      <div><div style="font-size:.7rem;color:var(--gray-400)">Facebook</div>${escapeHtml(c.fb)}</div>
    </a>`;
  }
  if (c.tiktok) {
    html += `<a class="social-link" href="${c.tiktokUrl || `https://tiktok.com/@${c.tiktok}`}" target="_blank">
      <div class="social-icon si-tiktok" style="background:#000"><i class="fab fa-tiktok"></i></div>
      <div><div style="font-size:.7rem;color:var(--gray-400)">TikTok</div>@${escapeHtml(c.tiktok)}</div>
    </a>`;
  }
  if (c.address) {
    html += `<a class="social-link" href="${c.maps || '#'}" target="_blank">
      <div class="social-icon si-phone"><i class="fas fa-map-marker-alt"></i></div>
      <div><div style="font-size:.7rem;color:var(--gray-400)">Dirección</div>${escapeHtml(c.address)}</div>
    </a>`;
  }

  if (!html) {
    html = `<p style="color:var(--gray-400);font-size:.85rem;">Este bazar aún no agregó información de contacto.</p>`;
  }

  wrap.innerHTML = html;

  // Hide submit/whatsapp form if no whatsapp configured
  const submitBtn = document.getElementById("contactSubmitBtn");
  if (submitBtn) submitBtn.style.display = c.wapp ? "" : "none";
  const note = document.getElementById("contactNote");
  if (note) note.style.display = c.wapp ? "" : "none";
}

function formatPhone(digits) {
  // Muestra el número tal cual viene (con código de país)
  return digits.startsWith("+") ? digits : `+${digits}`;
}

/* ════════════════════════════════════════════════════════
   TOAST
════════════════════════════════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ════════════════════════════════════════════════════════
   ESCAPE HELPERS
════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(str) { return escapeHtml(str); }
function escapeJs(str) {
  return String(str ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}