// ═══════════════════════════════════════════════════════
//  js/catalogo.js  —  Catálogo: CRUD productos + categorías
// ═══════════════════════════════════════════════════════

import {
  getCategories, addCategory, updateCategory, deleteCategory, subscribeCategories,
  addProduct, updateProduct, deleteProduct, subscribeProducts
} from "./db.js";
import { uploadProductPhoto, deleteFile } from "./storage.js";
import { showToast, showLoading, hideLoading, showConfirm } from "../app.js";

/* ── State ───────────────────────────────────────────── */
let _categories   = [];
let _products     = [];
let _searchTerm   = "";
let _catFilter    = "";
let _editingId    = null;        // null = nuevo producto
let _editingCatId = null;        // null = nueva categoría
let _selectedCats = [];          // categorías del producto en edición
let _selectedTags = [];          // etiquetas del producto en edición
let _variants     = [];          // variantes del producto en edición
let _photos       = [];          // { url, path, file?, isNew? }
let _selectedIcon = "fas fa-tag";
let _unsubCats    = null;
let _unsubProds   = null;

const ICONS = [
  "fas fa-tag","fas fa-female","fas fa-male","fas fa-shoe-prints",
  "fas fa-hiking","fas fa-couch","fas fa-laptop","fas fa-tshirt",
  "fas fa-baby","fas fa-gem","fas fa-watch","fas fa-glasses",
  "fas fa-bag-shopping","fas fa-hat-cowboy","fas fa-socks",
  "fas fa-ring","fas fa-heart","fas fa-star","fas fa-box",
  "fas fa-blender","fas fa-plug","fas fa-headphones","fas fa-mobile",
  "fas fa-camera","fas fa-bicycle","fas fa-dumbbell","fas fa-palette",
  "fas fa-book","fas fa-music","fas fa-gamepad"
];

const VARIANT_TYPES = [
  "Talla","Color","Material","Modelo","Capacidad","Voltaje","Sabor",
  "Tamaño","Estilo","Peso","Acabado","Otro"
];

/* ── Init ────────────────────────────────────────────── */
window.addEventListener("adminReady", () => {
  _unsubCats  = subscribeCategories(cats => { _categories = cats; onCatsUpdated(); });
  _unsubProds = subscribeProducts(prods => { _products = prods; onProdsUpdated(); });
  buildIconGrid();
  setupClickOutsideHandlers();
});

function onCatsUpdated() {
  renderCatFilterChips();
  renderCatList();
  renderCatDropdown(_editingCats_inputVal || "");
}

function onProdsUpdated() {
  renderProductsTable();
}

/* ════════════════════════════════════════════════════════
   NAVIGATION / FILTER
════════════════════════════════════════════════════════ */
window.filterCatalog = function(val) {
  _searchTerm = val.toLowerCase();
  renderProductsTable();
};

window.setCatalogCatFilter = function(catId, btn) {
  _catFilter = catId;
  document.querySelectorAll(".cat-filter-chips .filter-chip")
    .forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderProductsTable();
};

function getFilteredProducts() {
  return _products.filter(p => {
    const matchSearch = !_searchTerm ||
      p.name?.toLowerCase().includes(_searchTerm) ||
      p.description?.toLowerCase().includes(_searchTerm) ||
      p.tags?.some(t => t.toLowerCase().includes(_searchTerm));
    const matchCat = !_catFilter ||
      (p.categories && p.categories.includes(_catFilter));
    return matchSearch && matchCat;
  });
}

/* ════════════════════════════════════════════════════════
   CATEGORY FILTER CHIPS (toolbar)
════════════════════════════════════════════════════════ */
function renderCatFilterChips() {
  const wrap = document.getElementById("catFilterChips");
  const allBtn = `<button class="filter-chip${!_catFilter?' active':''}" data-cat="" onclick="setCatalogCatFilter('',this)">Todos</button>`;
  const chips  = _categories.map(c =>
    `<button class="filter-chip${_catFilter===c.id?' active':''}" data-cat="${c.id}" onclick="setCatalogCatFilter('${c.id}',this)">
      <i class="${c.icon||'fas fa-tag'}" style="margin-right:4px;font-size:.75rem;"></i>${c.name}
    </button>`
  ).join("");
  wrap.innerHTML = allBtn + chips;
}

/* ════════════════════════════════════════════════════════
   PRODUCTS TABLE
════════════════════════════════════════════════════════ */
function renderProductsTable() {
  const tbody    = document.getElementById("productsTableBody");
  const filtered = getFilteredProducts();

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">
      <i class="fas fa-box-open"></i><br>
      ${_products.length ? "No hay resultados para tu búsqueda." : "Aún no tienes productos. ¡Crea el primero!"}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const thumb    = p.photos && p.photos[0] ? p.photos[0].url : "";
    const catNames = (p.categories || []).map(cid => {
      const cat = _categories.find(c => c.id === cid);
      return cat ? `<span class="cat-chip">${cat.name}</span>` : "";
    }).join("");
    const statusBadge = p.active !== false
      ? `<span class="status-badge active"><i class="fas fa-circle" style="font-size:.5rem"></i> Activo</span>`
      : `<span class="status-badge inactive"><i class="fas fa-circle" style="font-size:.5rem"></i> Inactivo</span>`;
    const price = p.price != null ? `$${Number(p.price).toLocaleString("es-MX")}` : "—";
    const stock = p.stock != null ? p.stock : "—";

    return `
    <tr>
      <td>
        ${thumb
          ? `<img class="product-thumb" src="${thumb}" alt="${p.name}" />`
          : `<div class="product-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--gray-100);"><i class="fas fa-image" style="color:var(--gray-300)"></i></div>`
        }
      </td>
      <td>
        <div class="product-name-cell">${p.name || "—"}</div>
        <div class="product-desc-cell">${p.description || ""}</div>
      </td>
      <td>${catNames || '<span style="color:var(--gray-300);font-size:.75rem">Sin categoría</span>'}</td>
      <td style="font-weight:700;color:var(--gray-800)">${price}</td>
      <td style="color:var(--gray-600)">${stock}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" title="Editar" onclick="openProductModal('${p.id}')">
            <i class="fas fa-pencil"></i>
          </button>
          <button class="btn-icon" title="Duplicar" onclick="duplicateProduct('${p.id}')">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn-icon danger" title="Eliminar" onclick="confirmDeleteProduct('${p.id}','${(p.name||'').replace(/'/g,"\\'")}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

/* ════════════════════════════════════════════════════════
   PRODUCT MODAL — OPEN / CLOSE
════════════════════════════════════════════════════════ */
window.openProductModal = function(id = null) {
  _editingId    = id;
  _selectedCats = [];
  _selectedTags = [];
  _variants     = [];
  _photos       = [];

  document.getElementById("productModalTitle").textContent = id ? "Editar producto" : "Nuevo producto";
  document.getElementById("pName").value    = "";
  document.getElementById("pDesc").value    = "";
  document.getElementById("pPrice").value   = "";
  document.getElementById("pStock").value   = "";
  document.getElementById("pActive").checked = true;
  document.querySelector('input[name="pCondition"][value="nuevo"]').checked = true;
  renderPhotosGrid();
  renderSelectedCats();
  renderSelectedTags();
  renderVariants();

  if (id) {
    const p = _products.find(x => x.id === id);
    if (p) populateProductForm(p);
  }

  document.getElementById("productModalOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("pName").focus(), 100);
};

function populateProductForm(p) {
  document.getElementById("pName").value    = p.name        || "";
  document.getElementById("pDesc").value    = p.description || "";
  document.getElementById("pPrice").value   = p.price       != null ? p.price : "";
  document.getElementById("pStock").value   = p.stock       != null ? p.stock : "";
  document.getElementById("pActive").checked = p.active !== false;

  const condVal = p.condition || "nuevo";
  const condRadio = document.querySelector(`input[name="pCondition"][value="${condVal}"]`);
  if (condRadio) condRadio.checked = true;

  _selectedCats = [...(p.categories || [])];
  _selectedTags = [...(p.tags       || [])];
  _variants     = JSON.parse(JSON.stringify(p.variants || []));
  _photos       = JSON.parse(JSON.stringify(p.photos   || []));

  renderPhotosGrid();
  renderSelectedCats();
  renderSelectedTags();
  renderVariants();
}

window.closeProductModal = function() {
  document.getElementById("productModalOverlay").classList.add("hidden");
  document.body.style.overflow = "";
  _editingId = null;
};

window.closeProductModalOnBg = function(e) {
  if (e.target === document.getElementById("productModalOverlay")) closeProductModal();
};

/* ════════════════════════════════════════════════════════
   SAVE PRODUCT
════════════════════════════════════════════════════════ */
window.saveProduct = async function() {
  const name  = document.getElementById("pName").value.trim();
  const price = document.getElementById("pPrice").value;
  if (!name) { showToast("El nombre del producto es obligatorio.", "error"); return; }

  showLoading();
  try {
    const productId = _editingId || `prod_${Date.now()}`;

    // Upload new photos
    const uploadedPhotos = [];
    for (let i = 0; i < _photos.length; i++) {
      const ph = _photos[i];
      if (ph.file) {
        // new upload
        const result = await uploadProductPhoto(ph.file, productId, i);
        uploadedPhotos.push({ url: result.url, path: result.path });
      } else {
        uploadedPhotos.push({ url: ph.url, path: ph.path || "" });
      }
    }

    const data = {
      name,
      description: document.getElementById("pDesc").value.trim(),
      price:       price !== "" ? parseFloat(price) : null,
      stock:       document.getElementById("pStock").value !== "" ? parseInt(document.getElementById("pStock").value) : null,
      condition:   document.querySelector('input[name="pCondition"]:checked')?.value || "nuevo",
      active:      document.getElementById("pActive").checked,
      categories:  [..._selectedCats],
      tags:        [..._selectedTags],
      variants:    _variants.filter(v => v.type && v.values?.length),
      photos:      uploadedPhotos
    };

    if (_editingId) {
      await updateProduct(_editingId, data);
      showToast("✅ Producto actualizado", "success");
    } else {
      await addProduct(data);
      showToast("✅ Producto creado", "success");
    }

    hideLoading();
    closeProductModal();
  } catch(e) {
    hideLoading();
    console.error(e);
    showToast("Error al guardar el producto.", "error");
  }
};

/* ── Duplicate ───────────────────────────────────────── */
window.duplicateProduct = async function(id) {
  const p = _products.find(x => x.id === id);
  if (!p) return;
  showLoading();
  try {
    const { id: _, createdAt: __, updatedAt: ___, ...rest } = p;
    await addProduct({ ...rest, name: `${rest.name} (copia)`, active: false });
    hideLoading();
    showToast("Producto duplicado.", "success");
  } catch(e) {
    hideLoading();
    showToast("Error al duplicar.", "error");
  }
};

/* ── Delete ──────────────────────────────────────────── */
window.confirmDeleteProduct = function(id, name) {
  showConfirm(
    "¿Eliminar producto?",
    `Se eliminará permanentemente "<strong>${name}</strong>". Esta acción no se puede deshacer.`,
    async () => {
      showLoading();
      try {
        const p = _products.find(x => x.id === id);
        if (p?.photos) {
          for (const ph of p.photos) {
            if (ph.path) await deleteFile(ph.path);
          }
        }
        await deleteProduct(id);
        hideLoading();
        showToast("Producto eliminado.", "success");
      } catch(e) {
        hideLoading();
        showToast("Error al eliminar.", "error");
      }
    }
  );
};

/* ════════════════════════════════════════════════════════
   PHOTOS
════════════════════════════════════════════════════════ */
window.handlePhotoUpload = function(event) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    const url = URL.createObjectURL(file);
    _photos.push({ url, file, path: null });
  });
  event.target.value = ""; // allow re-uploading same file
  renderPhotosGrid();
};

function renderPhotosGrid() {
  const grid = document.getElementById("photosGrid");
  const items = _photos.map((ph, i) => `
    <div class="photo-thumb-wrap${i===0?' is-main':''}" id="photo-${i}">
      <img src="${ph.url}" alt="Foto ${i+1}" />
      ${i===0 ? '<div class="photo-main-badge">Principal</div>' : ''}
      <button class="photo-remove" onclick="removePhoto(${i})" title="Eliminar foto">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join("");

  const addBtn = `
    <div class="photo-add-btn" onclick="document.getElementById('photoFileInput').click()">
      <i class="fas fa-plus"></i>
      <span>Agregar foto</span>
    </div>`;

  grid.innerHTML = items + addBtn;
}

window.removePhoto = function(idx) {
  const ph = _photos[idx];
  // If it was a blob URL, revoke it
  if (ph.url && ph.url.startsWith("blob:")) URL.revokeObjectURL(ph.url);
  // If already uploaded, mark for deletion (will delete on next save if needed)
  _photos.splice(idx, 1);
  renderPhotosGrid();
};

/* ════════════════════════════════════════════════════════
   CATEGORIES — SELECTOR (inside product modal)
════════════════════════════════════════════════════════ */
let _editingCats_inputVal = "";

window.filterCatSuggestions = function(val) {
  _editingCats_inputVal = val;
  renderCatDropdown(val);
};

window.showCatDropdown = function() {
  renderCatDropdown(document.getElementById("catInput").value);
};

function renderCatDropdown(search) {
  const dropdown = document.getElementById("catDropdown");
  const term     = search.toLowerCase();
  const avail    = _categories.filter(c =>
    !_selectedCats.includes(c.id) &&
    c.name.toLowerCase().includes(term)
  );

  let html = avail.map(c => `
    <div class="tag-dropdown-item" onclick="selectCat('${c.id}')">
      <i class="${c.icon||'fas fa-tag'}"></i>${c.name}
    </div>`
  ).join("");

  if (search && !_categories.find(c => c.name.toLowerCase() === term)) {
    html += `<div class="tag-dropdown-item" onclick="createAndSelectCat('${search.replace(/'/g,"\\'")}')">
      <i class="fas fa-plus"></i>Crear "<strong>${search}</strong>"
    </div>`;
  }
  if (!html) html = `<div class="tag-dropdown-empty">Sin resultados</div>`;

  dropdown.innerHTML = html;
  dropdown.classList.remove("hidden");
}

window.selectCat = function(id) {
  if (!_selectedCats.includes(id)) _selectedCats.push(id);
  document.getElementById("catInput").value = "";
  _editingCats_inputVal = "";
  document.getElementById("catDropdown").classList.add("hidden");
  renderSelectedCats();
};

window.createAndSelectCat = async function(name) {
  try {
    const ref = await addCategory({ name, icon: "fas fa-tag" });
    _selectedCats.push(ref.id);
    document.getElementById("catInput").value = "";
    _editingCats_inputVal = "";
    document.getElementById("catDropdown").classList.add("hidden");
    renderSelectedCats();
    showToast(`Categoría "${name}" creada.`, "success");
  } catch(e) {
    showToast("Error al crear categoría.", "error");
  }
};

window.removeCat = function(id) {
  _selectedCats = _selectedCats.filter(c => c !== id);
  renderSelectedCats();
};

function renderSelectedCats() {
  const wrap = document.getElementById("selectedCatsChips");
  wrap.innerHTML = _selectedCats.map(id => {
    const cat = _categories.find(c => c.id === id);
    if (!cat) return "";
    return `<span class="tag-chip-item">
      <i class="${cat.icon||'fas fa-tag'}" style="font-size:.65rem"></i>
      ${cat.name}
      <button onclick="removeCat('${id}')" title="Quitar"><i class="fas fa-times"></i></button>
    </span>`;
  }).join("");
}

/* ════════════════════════════════════════════════════════
   TAGS
════════════════════════════════════════════════════════ */
window.handleTagInput = function(event) {
  if (event.key === "Enter" || event.key === ",") {
    event.preventDefault();
    const val = event.target.value.trim().replace(/,$/, "");
    if (val && !_selectedTags.includes(val)) {
      _selectedTags.push(val);
      renderSelectedTags();
    }
    event.target.value = "";
  }
};

window.removeTag = function(tag) {
  _selectedTags = _selectedTags.filter(t => t !== tag);
  renderSelectedTags();
};

function renderSelectedTags() {
  const wrap = document.getElementById("selectedTagsChips");
  wrap.innerHTML = _selectedTags.map(t => `
    <span class="tag-chip-item" style="background:var(--yellow-200);color:var(--gray-700)">
      ${t}
      <button onclick="removeTag('${t.replace(/'/g,"\\'")}')"><i class="fas fa-times"></i></button>
    </span>`
  ).join("");
}

/* ════════════════════════════════════════════════════════
   VARIANTS
════════════════════════════════════════════════════════ */
window.addVariantRow = function() {
  _variants.push({ type: VARIANT_TYPES[0], values: [] });
  renderVariants();
};

window.removeVariant = function(idx) {
  _variants.splice(idx, 1);
  renderVariants();
};

window.updateVariantType = function(idx, val) {
  _variants[idx].type = val;
};

window.updateVariantValues = function(idx, val) {
  _variants[idx].values = val.split(",").map(v => v.trim()).filter(Boolean);
};

function renderVariants() {
  const list = document.getElementById("variantsList");
  if (!_variants.length) {
    list.innerHTML = "";
    return;
  }
  list.innerHTML = _variants.map((v, i) => `
    <div class="variant-row">
      <div class="form-group" style="gap:4px">
        <label style="font-size:.72rem;color:var(--gray-400)">Tipo</label>
        <select onchange="updateVariantType(${i},this.value)">
          ${VARIANT_TYPES.map(t =>
            `<option value="${t}"${v.type===t?' selected':''}>${t}</option>`
          ).join("")}
        </select>
      </div>
      <div class="form-group" style="gap:4px">
        <label style="font-size:.72rem;color:var(--gray-400)">Valores (separados por coma)</label>
        <input type="text"
          value="${(v.values||[]).join(", ")}"
          placeholder="Ej. S, M, L, XL"
          oninput="updateVariantValues(${i},this.value)" />
      </div>
      <button class="btn-icon danger" onclick="removeVariant(${i})" style="align-self:flex-end;margin-bottom:2px">
        <i class="fas fa-times"></i>
      </button>
    </div>`
  ).join("");
}

/* ════════════════════════════════════════════════════════
   CATEGORIES MODAL
════════════════════════════════════════════════════════ */
window.openCatModal = function() {
  document.getElementById("catModalOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.getElementById("newCatInput").focus();
};

window.closeCatModal = function() {
  document.getElementById("catModalOverlay").classList.add("hidden");
  document.body.style.overflow = "";
};

window.closeCatModalOnBg = function(e) {
  if (e.target === document.getElementById("catModalOverlay")) closeCatModal();
};

function renderCatList() {
  const list = document.getElementById("catList");
  if (!list) return;
  if (!_categories.length) {
    list.innerHTML = `<div class="tag-dropdown-empty" style="padding:24px;text-align:center">No hay categorías aún.</div>`;
    return;
  }
  list.innerHTML = _categories.map(c => {
    const count = _products.filter(p => p.categories?.includes(c.id)).length;
    return `
    <div class="cat-list-item" id="catitem-${c.id}">
      <div class="cat-list-icon"><i class="${c.icon||'fas fa-tag'}"></i></div>
      <div class="cat-list-name" id="catname-${c.id}">${c.name}</div>
      <div class="cat-list-count">${count} producto${count!==1?'s':''}</div>
      <button class="btn-icon" onclick="startEditCat('${c.id}')" title="Editar">
        <i class="fas fa-pencil"></i>
      </button>
      <button class="btn-icon danger" onclick="confirmDeleteCat('${c.id}','${c.name.replace(/'/g,"\\'")}',${count})" title="Eliminar">
        <i class="fas fa-trash"></i>
      </button>
    </div>`;
  }).join("");
}

/* ── Add category ────────────────────────────────────── */
window.addCategory = async function() {
  const name = document.getElementById("newCatInput").value.trim();
  if (!name) { showToast("Escribe el nombre de la categoría.", "error"); return; }
  const exists = _categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (exists) { showToast("Esa categoría ya existe.", "error"); return; }
  try {
    await addCategory({ name, icon: _selectedIcon });
    document.getElementById("newCatInput").value = "";
    showToast(`Categoría "${name}" creada.`, "success");
  } catch(e) {
    showToast("Error al crear categoría.", "error");
  }
};

/* ── Edit category (inline) ──────────────────────────── */
window.startEditCat = function(id) {
  const cat  = _categories.find(c => c.id === id);
  if (!cat) return;
  const nameEl = document.getElementById(`catname-${id}`);
  const orig   = cat.name;
  nameEl.innerHTML = `
    <input type="text" value="${orig}"
      style="border:2px solid var(--pink-400);border-radius:6px;padding:4px 8px;font-size:.85rem;width:100%"
      id="editCatInput-${id}"
      onkeydown="if(event.key==='Enter')saveEditCat('${id}','${orig}');if(event.key==='Escape')cancelEditCat('${id}','${orig.replace(/'/g,"\\'")}')"
    />`;
  document.getElementById(`editCatInput-${id}`).focus();
  // Add save/cancel buttons
  const item = document.getElementById(`catitem-${id}`);
  item.setAttribute("data-editing","1");
};

window.saveEditCat = async function(id, orig) {
  const input = document.getElementById(`editCatInput-${id}`);
  if (!input) return;
  const newName = input.value.trim();
  if (!newName) return;
  try {
    await updateCategory(id, { name: newName });
    showToast("Categoría actualizada.", "success");
  } catch(e) {
    showToast("Error al actualizar.", "error");
  }
};

window.cancelEditCat = function(id, orig) {
  const nameEl = document.getElementById(`catname-${id}`);
  if (nameEl) nameEl.textContent = orig;
};

/* ── Delete category ─────────────────────────────────── */
window.confirmDeleteCat = function(id, name, count) {
  const msg = count > 0
    ? `La categoría "<strong>${name}</strong>" está en ${count} producto${count!==1?'s':''}. Esos productos perderán esta categoría.`
    : `Se eliminará la categoría "<strong>${name}</strong>". Esta acción no se puede deshacer.`;
  showConfirm("¿Eliminar categoría?", msg, async () => {
    try {
      await deleteCategory(id);
      showToast("Categoría eliminada.", "success");
    } catch(e) {
      showToast("Error al eliminar.", "error");
    }
  });
};

/* ════════════════════════════════════════════════════════
   ICON PICKER
════════════════════════════════════════════════════════ */
function buildIconGrid() {
  const grid = document.getElementById("iconGrid");
  if (!grid) return;
  grid.innerHTML = ICONS.map(ic => `
    <button class="icon-opt${ic===_selectedIcon?' active':''}"
      onclick="pickIcon('${ic}')" title="${ic}">
      <i class="${ic}"></i>
    </button>`
  ).join("");
}

window.toggleIconPicker = function() {
  document.getElementById("iconGrid").classList.toggle("hidden");
};

window.pickIcon = function(ic) {
  _selectedIcon = ic;
  document.getElementById("selectedIconPreview").className = ic;
  document.getElementById("iconGrid").classList.add("hidden");
  buildIconGrid();
};

/* ════════════════════════════════════════════════════════
   CLICK OUTSIDE HANDLERS
════════════════════════════════════════════════════════ */
function setupClickOutsideHandlers() {
  document.addEventListener("click", e => {
    // Close cat dropdown
    const catSel = document.getElementById("catSelector");
    const catDD  = document.getElementById("catDropdown");
    if (catSel && catDD && !catSel.contains(e.target)) {
      catDD.classList.add("hidden");
    }
    // Close icon picker
    const iconPick = document.getElementById("catIconPick");
    const iconGrid = document.getElementById("iconGrid");
    if (iconPick && iconGrid && !iconPick.contains(e.target)) {
      iconGrid.classList.add("hidden");
    }
  });
}