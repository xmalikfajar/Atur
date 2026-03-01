/**
 * main.js — Entry point aplikasi Atur
 * Menginisialisasi semua modul dan event listener utama
 */

import { initUI, switchSidebarTab } from "./ui.js";
import { sendRequest } from "./request.js";
import { initCollection, getActiveEnvVars } from "./collection.js";
import { OpenFileDialog } from "../wailsjs/go/main/App.js";
import {
  initTabs,
  createTab,
  updateActiveTabTitle,
  saveResponseToActiveTab,
} from "./tabs.js";

// Inisialisasi saat DOM siap
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  initCollection();
  bindEvents();
  initTabs({
    getState: getDOMState,
    setState: setDOMState,
  });
});

/**
 * bindEvents — Mengikat semua event listener utama
 */
function bindEvents() {
  // Tombol kirim request
  document.getElementById("btn-send").addEventListener("click", handleSend);

  // Kirim dengan Enter di URL input
  const urlInput = document.getElementById("url-input");
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
  });

  // Update judul tab saat URL berubah
  urlInput.addEventListener("input", () => {
    updateActiveTabTitle(urlInput.value.trim() || "New Request");
  });

  // Tab sidebar
  document.querySelectorAll(".sidebar-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchSidebarTab(tab.dataset.tab));
  });

  // Tab request (Headers / Body)
  document.querySelectorAll(".req-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchRequestTab(tab.dataset.tab));
  });

  // Tab response (Body / Headers)
  document.querySelectorAll(".resp-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchResponseTab(tab.dataset.tab));
  });

  // Selector tipe body
  document.querySelectorAll('input[name="body-type"]').forEach((radio) => {
    radio.addEventListener("change", () => switchBodyType(radio.value));
  });

  // Tombol tambah header
  document.getElementById("btn-add-header").addEventListener("click", () => {
    addKVRow("headers-list");
  });

  // Tombol tambah field form-data
  document
    .getElementById("btn-add-form-field")
    .addEventListener("click", () => {
      addKVRow("form-data-list");
    });

  // Tombol tambah file form-data
  document.getElementById("btn-add-form-file").addEventListener("click", () => {
    addFileRow("form-data-list");
  });

  // Tombol tambah field urlencoded
  document
    .getElementById("btn-add-urlencoded-field")
    .addEventListener("click", () => {
      addKVRow("urlencoded-list");
    });

  // Tombol hapus history
  document
    .getElementById("btn-clear-history")
    .addEventListener("click", handleClearHistory);
}

/**
 * handleSend — Mengumpulkan data form dan mengirim request
 */
async function handleSend() {
  const method = document.getElementById("method-select").value;
  const url = document.getElementById("url-input").value.trim();

  if (!url) {
    alert("URL tidak boleh kosong.");
    return;
  }

  const headers = collectKVRows("headers-list");
  const bodyType = document.querySelector(
    'input[name="body-type"]:checked',
  ).value;

  let body = "";
  let formFields = [];

  if (bodyType === "raw") {
    body = document.getElementById("raw-body-input").value;
    const rawCT = document.getElementById("raw-content-type").value;
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = rawCT;
    }
  } else if (bodyType === "form-data") {
    formFields = collectFormDataRows("form-data-list");
  } else if (bodyType === "urlencoded") {
    formFields = collectKVRowsAsFields("urlencoded-list");
  }

  // Ambil environment variables yang aktif
  const envVars = getActiveEnvVars();

  const payload = { method, url, headers, body, bodyType, formFields, envVars };

  // Tampilkan loading
  const btnSend = document.getElementById("btn-send");
  btnSend.disabled = true;
  btnSend.textContent = "Mengirim...";

  const response = await sendRequest(payload);

  btnSend.disabled = false;
  btnSend.textContent = "Kirim";

  // Simpan response ke state tab aktif
  saveResponseToActiveTab(response);

  // Tampilkan response
  const { renderResponse } = await import("./ui.js");
  renderResponse(response);

  // Simpan ke history jika tidak ada error
  if (!response.error) {
    const { saveToHistory } = await import("./collection.js");
    await saveToHistory({
      method,
      url,
      headers,
      body,
      bodyType,
      statusCode: response.statusCode,
      duration: response.duration,
    });
  }
}

/**
 * handleClearHistory — Menghapus semua history
 */
async function handleClearHistory() {
  if (!confirm("Hapus semua history?")) return;
  try {
    await window.go.main.App.DeleteHistory();
    document.getElementById("history-list").innerHTML = "";
  } catch (err) {
    console.error("Gagal menghapus history:", err);
  }
}

// ===== State DOM untuk Tab System =====

/**
 * getDOMState — Membaca state request saat ini dari DOM
 * @returns {Object} state lengkap tab
 */
export function getDOMState() {
  const method = document.getElementById("method-select").value;
  const url = document.getElementById("url-input").value;
  const bodyType =
    document.querySelector('input[name="body-type"]:checked')?.value || "none";
  const headers = collectKVRows("headers-list");

  let body = "";
  let formFields = [];

  if (bodyType === "raw") {
    body = document.getElementById("raw-body-input").value;
  } else if (bodyType === "form-data") {
    formFields = collectFormDataRows("form-data-list");
  } else if (bodyType === "urlencoded") {
    formFields = collectKVRowsAsFields("urlencoded-list");
  }

  return { method, url, headers, body, bodyType, formFields };
}

/**
 * setDOMState — Menulis state ke DOM (saat pindah tab)
 * @param {Object} state
 */
export function setDOMState(state) {
  if (!state) return;

  document.getElementById("method-select").value = state.method || "GET";
  document.getElementById("url-input").value = state.url || "";

  // Headers
  document.getElementById("headers-list").innerHTML = "";
  Object.entries(state.headers || {}).forEach(([k, v]) =>
    addKVRow("headers-list", k, v),
  );

  // Body type
  const radio = document.querySelector(
    `input[name="body-type"][value="${state.bodyType || "none"}"]`,
  );
  if (radio) {
    radio.checked = true;
    switchBodyType(state.bodyType || "none");
  }

  // Raw body
  document.getElementById("raw-body-input").value = state.body || "";

  // Form-data
  document.getElementById("form-data-list").innerHTML = "";
  (state.formFields || []).forEach((f) => {
    if (f.isFile) addFileRow("form-data-list", f.key, f.filePath);
    else addKVRow("form-data-list", f.key, f.value);
  });

  // Urlencoded
  document.getElementById("urlencoded-list").innerHTML = "";

  // Response
  if (state.response) {
    import("./ui.js").then(({ renderResponse }) =>
      renderResponse(state.response),
    );
  } else {
    // Reset response area
    document.getElementById("response-meta").classList.add("hidden");
    document.getElementById("response-tabs").classList.add("hidden");
    document.getElementById("response-placeholder").classList.remove("hidden");
    document.getElementById("response-body").classList.add("hidden");
    document.getElementById("response-body").textContent = "";
    document.getElementById("response-headers-body").innerHTML = "";
  }
}

// ===== Tab Switching =====

function switchRequestTab(tabName) {
  document
    .querySelectorAll(".req-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".req-panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelector(`.req-tab[data-tab="${tabName}"]`)
    .classList.add("active");
  document.getElementById(`req-panel-${tabName}`).classList.add("active");
}

function switchResponseTab(tabName) {
  document
    .querySelectorAll(".resp-tab")
    .forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".resp-panel").forEach((p) => {
    p.classList.remove("active");
    p.classList.add("hidden");
  });
  document
    .querySelector(`.resp-tab[data-tab="${tabName}"]`)
    .classList.add("active");
  const panel = document.getElementById(`resp-panel-${tabName}`);
  panel.classList.remove("hidden");
  panel.classList.add("active");
}

function switchBodyType(type) {
  document
    .querySelectorAll(".body-panel")
    .forEach((p) => p.classList.add("hidden"));
  if (type !== "none") {
    const panelMap = {
      raw: "body-raw",
      "form-data": "body-form-data",
      urlencoded: "body-urlencoded",
    };
    const panelId = panelMap[type];
    if (panelId) document.getElementById(panelId).classList.remove("hidden");
  }
}

// ===== Key-Value Helpers =====

/**
 * addKVRow — Menambahkan baris key-value ke dalam container
 */
export function addKVRow(containerId, key = "", value = "") {
  const container = document.getElementById(containerId);
  const row = document.createElement("div");
  row.className = "kv-row";
  row.innerHTML = `
    <input type="text" class="kv-key" placeholder="Key" value="${escapeAttr(key)}" />
    <input type="text" class="kv-value" placeholder="Value" value="${escapeAttr(value)}" />
    <button class="btn-remove" title="Hapus">×</button>
  `;
  row
    .querySelector(".btn-remove")
    .addEventListener("click", () => row.remove());
  container.appendChild(row);
}

/**
 * addFileRow — Menambahkan baris file upload dengan tombol Browse
 */
export function addFileRow(containerId, key = "", filePath = "") {
  const container = document.getElementById(containerId);
  const row = document.createElement("div");
  row.className = "kv-row";
  row.dataset.isFile = "true";
  row.innerHTML = `
    <input type="text" class="kv-key" placeholder="Key" value="${escapeAttr(key)}" />
    <div class="file-input-group">
      <input type="text" class="kv-file-path kv-value" placeholder="Klik Browse untuk pilih file..." value="${escapeAttr(filePath)}" readonly />
      <button class="btn-browse" title="Pilih file">Browse</button>
    </div>
    <button class="btn-remove" title="Hapus">×</button>
  `;

  // Tombol Browse → buka OS file picker via Wails
  row.querySelector(".btn-browse").addEventListener("click", async () => {
    try {
      const selectedPath = await OpenFileDialog();
      if (selectedPath) {
        row.querySelector(".kv-file-path").value = selectedPath;
      }
    } catch (err) {
      console.error("Gagal membuka file dialog:", err);
    }
  });

  row
    .querySelector(".btn-remove")
    .addEventListener("click", () => row.remove());
  container.appendChild(row);
}

/**
 * collectKVRows — Mengumpulkan key-value dari container sebagai objek
 */
function collectKVRows(containerId) {
  const result = {};
  document.querySelectorAll(`#${containerId} .kv-row`).forEach((row) => {
    const key = row.querySelector(".kv-key").value.trim();
    const value = row.querySelector(".kv-value").value.trim();
    if (key) result[key] = value;
  });
  return result;
}

/**
 * collectKVRowsAsFields — Mengumpulkan key-value sebagai array FormField
 */
function collectKVRowsAsFields(containerId) {
  const fields = [];
  document.querySelectorAll(`#${containerId} .kv-row`).forEach((row) => {
    const key = row.querySelector(".kv-key").value.trim();
    const value = row.querySelector(".kv-value").value.trim();
    if (key) fields.push({ key, value, isFile: false, filePath: "" });
  });
  return fields;
}

/**
 * collectFormDataRows — Mengumpulkan form-data termasuk file fields
 */
function collectFormDataRows(containerId) {
  const fields = [];
  document.querySelectorAll(`#${containerId} .kv-row`).forEach((row) => {
    const key = row.querySelector(".kv-key").value.trim();
    const isFile = row.dataset.isFile === "true";

    if (!key) return;

    if (isFile) {
      const filePathEl = row.querySelector(".kv-file-path");
      const filePath = filePathEl ? filePathEl.value.trim() : "";
      fields.push({ key, value: "", isFile: true, filePath });
    } else {
      const value = row.querySelector(".kv-value").value.trim();
      fields.push({ key, value, isFile: false, filePath: "" });
    }
  });
  return fields;
}

/**
 * escapeAttr — Escape karakter khusus untuk atribut HTML
 */
function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
