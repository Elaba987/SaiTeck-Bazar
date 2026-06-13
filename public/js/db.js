// ═══════════════════════════════════════════════════════
//  js/db.js  —  Firestore CRUD helpers (per-user paths)
//
//  Estructura de datos en Firestore:
//  users/{uid}/
//    profile/main          → nombre bazar, slogan, contacto, themeColor…
//    categories/{catId}    → { name, icon, order, createdAt }
//    products/{productId}  → { name, desc, price, stock, categories[],
//                              tags[], variants[], photos[], condition,
//                              active, featured, createdAt, updatedAt }
// ═══════════════════════════════════════════════════════

import { db }           from "./firebase.js";
import { currentUser }  from "./auth.js";
import {
  collection, doc,
  addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc,
  query, orderBy, serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ── Path helpers ────────────────────────────────────── */
const uid = () => currentUser?.uid;
const profileRef   = () => doc(db, "users", uid(), "profile", "main");
const catsCol      = () => collection(db, "users", uid(), "categories");
const catRef       = (id) => doc(db, "users", uid(), "categories", id);
const productsCol  = () => collection(db, "users", uid(), "products");
const productRef   = (id) => doc(db, "users", uid(), "products", id);

/* ═══════════════════════════════════════════════════════
   PROFILE
═══════════════════════════════════════════════════════ */
export async function getProfile() {
  const snap = await getDoc(profileRef());
  return snap.exists() ? { id: snap.id, ...snap.data() } : {};
}

export async function saveProfile(data) {
  await setDoc(profileRef(), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/* ═══════════════════════════════════════════════════════
   CATEGORIES
═══════════════════════════════════════════════════════ */
export async function getCategories() {
  const q    = query(catsCol(), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeCategories(cb) {
  const q = query(catsCol(), orderBy("name"));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addCategory(data) {
  return await addDoc(catsCol(), { ...data, createdAt: serverTimestamp() });
}

export async function updateCategory(id, data) {
  await updateDoc(catRef(id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCategory(id) {
  await deleteDoc(catRef(id));
}

/* ═══════════════════════════════════════════════════════
   PRODUCTS
═══════════════════════════════════════════════════════ */
export async function getProducts() {
  const q    = query(productsCol(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeProducts(cb) {
  const q = query(productsCol(), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function addProduct(data) {
  return await addDoc(productsCol(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateProduct(id, data) {
  await updateDoc(productRef(id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteProduct(id) {
  await deleteDoc(productRef(id));
}

export async function getProduct(id) {
  const snap = await getDoc(productRef(id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}