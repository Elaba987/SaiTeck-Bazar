// ═══════════════════════════════════════════════════════
//  js/contacto.js  —  Sección Contacto: CRUD de redes
// ═══════════════════════════════════════════════════════

import { getProfile, saveProfile }           from "./db.js";
import { showToast, showLoading, hideLoading } from "../app.js";

/* ── Init ────────────────────────────────────────────── */
window.addEventListener("adminReady", async () => {
  await loadContactoData();
  setupPhoneMask();
  setupUrlAutoFill();
});

async function loadContactoData() {
  const profile = await getProfile();
  const c = profile.contacto || {};

  setValue("cWapp",      c.wapp      || "");
  setValue("cWappMsg",   c.wappMsg   || "");
  setValue("cPhone",     c.phone     || "");
  setValue("cHorario",   c.horario   || "");
  setValue("cIg",        c.ig        || "");
  setValue("cIgUrl",     c.igUrl     || "");
  setValue("cFb",        c.fb        || "");
  setValue("cFbUrl",     c.fbUrl     || "");
  setValue("cTiktok",    c.tiktok    || "");
  setValue("cTiktokUrl", c.tiktokUrl || "");
  setValue("cAddress",   c.address   || "");
  setValue("cMaps",      c.maps      || "");
}

/* ── Save contacto ───────────────────────────────────── */
window.saveContacto = async function() {
  showLoading();
  try {
    const data = {
      contacto: {
        wapp:      getValue("cWapp").replace(/\D/g,""),
        wappMsg:   getValue("cWappMsg"),
        phone:     getValue("cPhone"),
        horario:   getValue("cHorario"),
        ig:        getValue("cIg").replace(/^@/,""),
        igUrl:     getValue("cIgUrl"),
        fb:        getValue("cFb"),
        fbUrl:     getValue("cFbUrl"),
        tiktok:    getValue("cTiktok").replace(/^@/,""),
        tiktokUrl: getValue("cTiktokUrl"),
        address:   getValue("cAddress"),
        maps:      getValue("cMaps")
      }
    };

    // Auto-generate URLs if only username provided
    if (data.contacto.ig && !data.contacto.igUrl) {
      data.contacto.igUrl = `https://instagram.com/${data.contacto.ig}`;
    }
    if (data.contacto.tiktok && !data.contacto.tiktokUrl) {
      data.contacto.tiktokUrl = `https://tiktok.com/@${data.contacto.tiktok}`;
    }

    await saveProfile(data);
    hideLoading();
    showToast("✅ Contacto guardado correctamente", "success");

    // Re-fill auto-generated URLs
    setValue("cIgUrl",     data.contacto.igUrl     || "");
    setValue("cTiktokUrl", data.contacto.tiktokUrl || "");
  } catch(e) {
    hideLoading();
    console.error(e);
    showToast("Error al guardar. Intenta nuevamente.", "error");
  }
};

/* ── Auto-fill URL when username is typed ────────────── */
function setupUrlAutoFill() {
  const pairs = [
    { user: "cIg",     url: "cIgUrl",     base: "https://instagram.com/" },
    { user: "cTiktok", url: "cTiktokUrl", base: "https://tiktok.com/@"   }
  ];
  pairs.forEach(({ user, url, base }) => {
    const userEl = document.getElementById(user);
    const urlEl  = document.getElementById(url);
    if (!userEl || !urlEl) return;
    userEl.addEventListener("input", () => {
      const val = userEl.value.trim().replace(/^@/, "");
      if (val && !urlEl.value) {
        urlEl.value = base + val;
      }
    });
  });
}

/* ── Phone mask (WhatsApp): only digits ──────────────── */
function setupPhoneMask() {
  const wappEl = document.getElementById("cWapp");
  if (!wappEl) return;
  wappEl.addEventListener("input", () => {
    wappEl.value = wappEl.value.replace(/[^\d+]/g, "");
  });
}

/* ── Helpers ─────────────────────────────────────────── */
function getValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}
function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}