// ═══════════════════════════════════════════════════════
//  js/db-public.js  —  Lecturas públicas de Firestore
//
//  Usado por:
//    · landing.js   (home / marketplace / buscador)
//    · bazar-public.js (vista de un bazar específico)
//
//  Estas funciones NO requieren autenticación: dependen de
//  las reglas de Firestore que permiten "read: if true" en
//  users/{uid}/profile, users/{uid}/categories,
//  users/{uid}/products y public_businesses/{slug}.
// ═══════════════════════════════════════════════════════

import { db } from "./firebase.js";
import {
  collection, doc, getDoc, getDocs,
  query, orderBy, limit as fsLimit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ═══════════════════════════════════════════════════════
   PUBLIC_BUSINESSES — índice para el marketplace
═══════════════════════════════════════════════════════ */

/**
 * Devuelve la lista completa de negocios publicados.
 * Cada doc: { slug, uid, bazarName, slogan, themeColor,
 *             logoUrl, categories: [string,...], updatedAt }
 */
export async function getAllBusinesses() {
  const snap = await getDocs(collection(db, "public_businesses"));
  return snap.docs.map(d => ({ slug: d.id, ...d.data() }));
}

/**
 * Obtiene el documento público de un negocio por su slug.
 * Retorna null si no existe.
 */
export async function getBusinessBySlug(slug) {
  const snap = await getDoc(doc(db, "public_businesses", slug));
  return snap.exists() ? { slug: snap.id, ...snap.data() } : null;
}

/* ═══════════════════════════════════════════════════════
   DATOS DE UN NEGOCIO (por uid) — para renderizar el bazar
═══════════════════════════════════════════════════════ */

/**
 * Perfil completo del bazar (Inicio + Contacto).
 */
export async function getPublicProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid, "profile", "main"));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Categorías del bazar, ordenadas por nombre.
 */
export async function getPublicCategories(uid) {
  const q = query(collection(db, "users", uid, "categories"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Productos activos del bazar, más recientes primero.
 * Filtra en cliente los que tengan active === false.
 */
export async function getPublicProducts(uid) {
  const q = query(collection(db, "users", uid, "products"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.active !== false);
}

/**
 * Carga combinada: perfil + categorías + productos de un uid.
 * Conveniente para inicializar la vista del bazar de una sola vez.
 */
export async function getBusinessData(uid) {
  const [profile, categories, products] = await Promise.all([
    getPublicProfile(uid),
    getPublicCategories(uid),
    getPublicProducts(uid)
  ]);
  return { profile, categories, products };
}

/* ═══════════════════════════════════════════════════════
   BÚSQUEDA (helper para landing.js)
═══════════════════════════════════════════════════════ */

/**
 * Filtra una lista de negocios (de getAllBusinesses) por
 * término de búsqueda (nombre o categoría) y/o categoría exacta.
 *
 * @param {Array} businesses  resultado de getAllBusinesses()
 * @param {string} term       texto de búsqueda (nombre o categoría)
 * @param {string} categoryFilter  nombre exacto de categoría (chip activo) o ""
 */
export function filterBusinesses(businesses, term = "", categoryFilter = "") {
  const t = term.trim().toLowerCase();
  return businesses.filter(b => {
    const matchesTerm = !t ||
      (b.bazarName || "").toLowerCase().includes(t) ||
      (b.slogan || "").toLowerCase().includes(t) ||
      (b.categories || []).some(c => c.toLowerCase().includes(t));

    const matchesCategory = !categoryFilter ||
      (b.categories || []).includes(categoryFilter);

    return matchesTerm && matchesCategory;
  });
}

/**
 * Construye la lista de categorías únicas (para chips de filtro)
 * a partir de la lista completa de negocios.
 */
export function getUniqueBusinessCategories(businesses) {
  const set = new Set();
  businesses.forEach(b => (b.categories || []).forEach(c => set.add(c)));
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}