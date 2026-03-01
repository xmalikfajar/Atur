/**
 * collection.js — Manajemen koleksi, history, dan environment
 */

import {
  renderCollectionList,
  renderHistoryList,
  fillRequestForm,
} from "./ui.js";

// State environment aktif saat ini
let activeEnvId = "";
let allEnvironments = [];

/**
 * initCollection — Memuat dan merender koleksi, history, dan env saat startup
 */
export async function initCollection() {
  await loadAndRenderCollections();
  await loadAndRenderHistory();
  await loadAndRenderEnvSelector();
  bindCollectionModal();
  bindEnvModal();
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

// ===== Environment Variables =====

/**
 * loadAndRenderEnvSelector — Memuat environment dan mengisi dropdown selector
 */
async function loadAndRenderEnvSelector() {
  try {
    allEnvironments = (await window.go.main.App.GetEnvironments()) || [];
    renderEnvSelector();
  } catch (err) {
    console.error("Gagal memuat environment:", err);
    allEnvironments = [];
  }
}

/**
 * renderEnvSelector — Render ulang dropdown env-select
 */
function renderEnvSelector() {
  const select = document.getElementById("env-select");
  const currentVal = select.value;
  select.innerHTML = '<option value="">— Tanpa Env —</option>';
  allEnvironments.forEach((env) => {
    const opt = document.createElement("option");
    opt.value = env.id;
    opt.textContent = env.name;
    select.appendChild(opt);
  });
  // Pertahankan pilihan jika masih ada
  if (allEnvironments.find((e) => e.id === currentVal)) {
    select.value = currentVal;
  }
  activeEnvId = select.value;
}

/**
 * getActiveEnvVars — Mengembalikan variables dari environment yang dipilih
 * @returns {Object} map key→value atau {} jika tidak ada env aktif
 */
export function getActiveEnvVars() {
  if (!activeEnvId) return {};
  const env = allEnvironments.find((e) => e.id === activeEnvId);
  return env?.variables || {};
}

/**
 * bindEnvModal — Mengikat event untuk modal environment
 */
function bindEnvModal() {
  const btnManage = document.getElementById("btn-manage-env");
  const modal = document.getElementById("modal-env");
  const btnCancel = document.getElementById("btn-cancel-env");
  const btnSave = document.getElementById("btn-save-env");
  const btnAddEnv = document.getElementById("btn-add-env");
  const btnAddVar = document.getElementById("btn-add-env-var");
  const btnDeleteEnv = document.getElementById("btn-delete-env");
  const envSelect = document.getElementById("env-select");

  // Track env yang sedang diedit di modal
  let editingEnvId = null;

  // Sync activeEnvId saat dropdown berubah
  envSelect.addEventListener("change", () => {
    activeEnvId = envSelect.value;
  });

  // Buka modal
  btnManage.addEventListener("click", async () => {
    await loadAndRenderEnvSelector();
    renderEnvListInModal(null);
    modal.classList.remove("hidden");
  });

  // Tutup modal & backdrop
  btnCancel.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  // Tambah environment baru
  btnAddEnv.addEventListener("click", async () => {
    const newEnv = {
      id: Date.now().toString(),
      name: "Environment Baru",
      variables: {},
    };
    try {
      await window.go.main.App.SaveEnvironment(newEnv);
      allEnvironments.push(newEnv);
      renderEnvListInModal(newEnv.id);
      renderEnvSelector();
    } catch (err) {
      console.error("Gagal membuat environment:", err);
    }
  });

  // Hapus environment
  btnDeleteEnv.addEventListener("click", async () => {
    if (!editingEnvId) return;
    if (!confirm("Hapus environment ini?")) return;
    try {
      await window.go.main.App.DeleteEnvironment(editingEnvId);
      allEnvironments = allEnvironments.filter((e) => e.id !== editingEnvId);
      editingEnvId = null;
      renderEnvListInModal(null);
      renderEnvSelector();
    } catch (err) {
      console.error("Gagal menghapus environment:", err);
    }
  });

  // Tambah variable baru
  btnAddVar.addEventListener("click", () => {
    addEnvVarRow("", "");
  });

  // Simpan environment + variables
  btnSave.addEventListener("click", async () => {
    if (!editingEnvId) {
      modal.classList.add("hidden");
      return;
    }

    const nameInput = document.getElementById("env-name-input");
    const name = nameInput.value.trim() || "Environment";
    const variables = collectEnvVars();

    const envToSave = { id: editingEnvId, name, variables };
    try {
      await window.go.main.App.SaveEnvironment(envToSave);
      // Update lokal
      const idx = allEnvironments.findIndex((e) => e.id === editingEnvId);
      if (idx >= 0) allEnvironments[idx] = envToSave;
      renderEnvSelector();
      renderEnvListInModal(editingEnvId);
    } catch (err) {
      console.error("Gagal menyimpan environment:", err);
      alert("Gagal menyimpan: " + String(err));
    }
  });

  // ===== Helper internal modal =====

  /**
   * renderEnvListInModal — Render daftar env di kolom kiri modal
   * @param {string|null} selectId - ID env yang langsung dibuka editornya
   */
  function renderEnvListInModal(selectId) {
    const list = document.getElementById("env-list");
    list.innerHTML = "";

    allEnvironments.forEach((env) => {
      const li = document.createElement("li");
      li.className = "env-list-item" + (env.id === selectId ? " active" : "");
      li.textContent = env.name;
      li.addEventListener("click", () => {
        openEnvEditor(env.id);
        // Update active style
        document
          .querySelectorAll(".env-list-item")
          .forEach((el) => el.classList.remove("active"));
        li.classList.add("active");
      });
      list.appendChild(li);
    });

    if (selectId) {
      openEnvEditor(selectId);
    } else {
      document.getElementById("env-editor-empty").classList.remove("hidden");
      document.getElementById("env-editor").classList.add("hidden");
      editingEnvId = null;
    }
  }

  /**
   * openEnvEditor — Buka editor untuk environment tertentu
   * @param {string} id
   */
  function openEnvEditor(id) {
    const env = allEnvironments.find((e) => e.id === id);
    if (!env) return;

    editingEnvId = id;
    document.getElementById("env-editor-empty").classList.add("hidden");
    document.getElementById("env-editor").classList.remove("hidden");
    document.getElementById("env-name-input").value = env.name;

    // Render vars
    const varsList = document.getElementById("env-vars-list");
    varsList.innerHTML = "";
    Object.entries(env.variables || {}).forEach(([k, v]) => addEnvVarRow(k, v));
  }
}

/**
 * addEnvVarRow — Tambah baris key-value variable di modal env
 */
function addEnvVarRow(key = "", value = "") {
  const container = document.getElementById("env-vars-list");
  const row = document.createElement("div");
  row.className = "kv-row";
  row.innerHTML = `
    <input type="text" class="kv-key" placeholder="VARIABLE_NAME" value="${escapeAttr(key)}" />
    <input type="text" class="kv-value" placeholder="value" value="${escapeAttr(value)}" />
    <button class="btn-remove" title="Hapus">×</button>
  `;
  row
    .querySelector(".btn-remove")
    .addEventListener("click", () => row.remove());
  container.appendChild(row);
}

/**
 * collectEnvVars — Kumpulkan semua variable dari modal editor
 * @returns {Object} map key→value
 */
function collectEnvVars() {
  const result = {};
  document.querySelectorAll("#env-vars-list .kv-row").forEach((row) => {
    const key = row.querySelector(".kv-key").value.trim();
    const value = row.querySelector(".kv-value").value.trim();
    if (key) result[key] = value;
  });
  return result;
}

// ===== Modal Koleksi =====

/**
 * bindCollectionModal — Mengikat event untuk modal koleksi baru
 */
function bindCollectionModal() {
  const btnNew = document.getElementById("btn-new-collection");
  const modal = document.getElementById("modal-collection");
  const btnCancel = document.getElementById("btn-cancel-collection");
  const btnSave = document.getElementById("btn-save-collection");
  const nameInput = document.getElementById("collection-name-input");

  btnNew.addEventListener("click", () => {
    nameInput.value = "";
    modal.classList.remove("hidden");
    nameInput.focus();
  });

  btnCancel.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

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

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnSave.click();
    if (e.key === "Escape") modal.classList.add("hidden");
  });
}

// ===== Helper =====

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
