// ═══════════════════════════════════════════════════════
//  js/storage.js  —  Firebase Storage helpers
//
//  Paths:
//    users/{uid}/logo/logo.{ext}
//    users/{uid}/banner/banner.{ext}
//    users/{uid}/products/{productId}/{filename}
// ═══════════════════════════════════════════════════════

import { storage }     from "./firebase.js";
import { currentUser } from "./auth.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const uid = () => currentUser?.uid;

/* ── Compress image before upload ────────────────────── */
export function compressImage(file, maxW = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => resolve(blob), "image/jpeg", quality);
    };
    img.src = url;
  });
}

/* ── Upload logo ─────────────────────────────────────── */
export async function uploadLogo(file) {
  const compressed = await compressImage(file, 600, 0.88);
  const ext  = file.name.split(".").pop().toLowerCase();
  const path = `users/${uid()}/logo/logo.jpg`;
  const r    = ref(storage, path);
  await uploadBytes(r, compressed, { contentType: "image/jpeg" });
  return getDownloadURL(r);
}

/* ── Upload banner ───────────────────────────────────── */
export async function uploadBanner(file) {
  const compressed = await compressImage(file, 1400, 0.85);
  const path = `users/${uid()}/banner/banner.jpg`;
  const r    = ref(storage, path);
  await uploadBytes(r, compressed, { contentType: "image/jpeg" });
  return getDownloadURL(r);
}

/* ── Upload product photo ────────────────────────────── */
export async function uploadProductPhoto(file, productId, index) {
  const compressed = await compressImage(file, 1000, 0.84);
  const filename   = `photo_${index}_${Date.now()}.jpg`;
  const path       = `users/${uid()}/products/${productId}/${filename}`;
  const r          = ref(storage, path);
  await uploadBytes(r, compressed, { contentType: "image/jpeg" });
  return { url: await getDownloadURL(r), path };
}

/* ── Delete file by path ─────────────────────────────── */
export async function deleteFile(path) {
  try {
    await deleteObject(ref(storage, path));
  } catch(e) {
    // Ignore "object not found" errors
    if (e.code !== "storage/object-not-found") console.warn("deleteFile:", e);
  }
}