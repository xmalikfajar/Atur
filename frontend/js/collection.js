/**
 * collection.js — Manajemen koleksi, history, dan environment
 */

import {
  renderCollectionList,
  renderHistoryList,
  fillRequestForm,
} from "./ui.js";

/**
 * initCollection — Memuat dan merender koleksi & history saat startup
 */
export async function initCollection() {
  await loadAndRenderCollections();
  await loadAndRenderHistory();
  bindCollectionModal();
}

/**
 * loadAndRenderCollections — Memuat koleksi dari backend dan merendernya
 */
async function loadAndRenderCollections() {
  try {
    const collections = await window.go.main.App.GetCollections();
    renderCollectionList(collections || [], (req) => {
      fillRequestForm(req);
    });
  } catch (err) {
    console.error("Gagal memuat koleksi:", err);
    renderCollectionList([], () => {});
  }
}

/**
 * loadAndRenderHistory — Memuat history dari backend dan merendernya
 */
async function loadAndRenderHistory() {
  try {
    const items = await window.go.main.App.GetHistory();
    renderHistoryList(items || [], (item) => {
      fillRequestForm(item);
    });
  } catch (err) {
    console.error("Gagal memuat history:", err);
    renderHistoryList([], () => {});
  }
}

/**
 * saveToHistory — Menyimpan satu item ke history dan memperbarui tampilan
 * @param {Object} item - Data request yang akan disimpan
 */
export async function saveToHistory(item) {
  try {
    // Buat ID unik dari timestamp
    const historyItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    await window.go.main.App.SaveHistory(historyItem);
    await loadAndRenderHistory();
  } catch (err) {
    console.error("Gagal menyimpan history:", err);
  }
}

/**
 * bindCollectionModal — Mengikat event untuk modal koleksi baru
 */
function bindCollectionModal() {
  const btnNew = document.getElementById("btn-new-collection");
  const modal = document.getElementById("modal-collection");
  const btnCancel = document.getElementById("btn-cancel-collection");
  const btnSave = document.getElementById("btn-save-collection");
  const nameInput = document.getElementById("collection-name-input");

  // Buka modal
  btnNew.addEventListener("click", () => {
    nameInput.value = "";
    modal.classList.remove("hidden");
    nameInput.focus();
  });

  // Tutup modal
  btnCancel.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // Tutup modal saat klik backdrop
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  // Simpan koleksi baru
  btnSave.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }

    const newCollection = {
      id: Date.now().toString(),
      name,
      requests: [],
    };

    try {
      await window.go.main.App.SaveCollection(newCollection);
      modal.classList.add("hidden");
      await loadAndRenderCollections();
    } catch (err) {
      console.error("Gagal menyimpan koleksi:", err);
      alert("Gagal menyimpan koleksi: " + String(err));
    }
  });

  // Simpan dengan Enter
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnSave.click();
    if (e.key === "Escape") modal.classList.add("hidden");
  });
}
