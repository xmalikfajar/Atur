/**
 * main.js — Entry point aplikasi Atur
 * Menginisialisasi semua modul dan event listener utama
 */

import { initUI, switchSidebarTab } from "./ui.js";
import { sendRequest } from "./request.js";
import {
  initCollection,
  getActiveEnvVars,
  exportSelectedCollection,
  importCollectionFromFile,
} from "./collection.js";
import {
  exportRequestAsCurl,
  importFromCurl,
  showCurlModal,
  closeCurlModal,
  switchCurlTab,
  copyToClipboard,
  setExportOutput,
  getImportInput,
  clearImportInput,
} from "./curl.js";
import { updateAllEnvHighlights, updateURLHighlight } from "./highlight.js";
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
  initSidebarToggle();
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

  // Update judul tab & highlight env vars saat URL berubah
  urlInput.addEventListener("input", () => {
    updateActiveTabTitle(urlInput.value.trim() || "New Request");
    updateURLHighlight();
  });

  // Tab sidebar
  document.querySelectorAll(".sidebar-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchSidebarTab(tab.dataset.tab));
  });

  // Tab request (Headers / Body / Auth)
  document.querySelectorAll(".req-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchRequestTab(tab.dataset.tab));
  });

  // Selector tipe auth
  document.querySelectorAll('input[name="auth-type"]').forEach((radio) => {
    radio.addEventListener("change", () => switchAuthType(radio.value));
  });

  // Toggle show/hide password di Basic Auth
  document.getElementById("btn-toggle-pass").addEventListener("click", () => {
    const passInput = document.getElementById("auth-basic-pass");
    const isHidden = passInput.type === "password";
    passInput.type = isHidden ? "text" : "password";
    document.getElementById("btn-toggle-pass").textContent = isHidden
      ? "🙈"
      : "👁";
  });

  // Tab response (Body / Headers)
  document.querySelectorAll(".resp-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchResponseTab(tab.dataset.tab));
  });

  // Selector tipe body
  document.querySelectorAll('input[name="body-type"]').forEach((radio) => {
    radio.addEventListener("change", () => switchBodyType(radio.value));
  });

  // Env selector change — refresh semua highlight
  document.getElementById("env-select").addEventListener("change", () => {
    updateAllEnvHighlights();
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

  // Tombol format raw body
  document
    .getElementById("btn-format-body")
    .addEventListener("click", handleFormatBody);

  // Keyboard shortcut: Ctrl+Shift+F → format raw body
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
      e.preventDefault();
      handleFormatBody();
    }
  });

  // Keyboard shortcut: Ctrl+B → toggle sidebar
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "b") {
      e.preventDefault();
      document.getElementById("btn-toggle-sidebar").click();
    }
  });

  // Tombol hapus history
  document
    .getElementById("btn-clear-history")
    .addEventListener("click", handleClearHistory);

  // Tombol export curl
  document
    .getElementById("btn-export-curl")
    .addEventListener("click", handleExportCurl);

  // Curl tab switching
  document.querySelectorAll(".curl-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchCurlTab(tab.dataset.tab));
  });

  // Tombol copy curl
  document
    .getElementById("btn-copy-curl")
    .addEventListener("click", handleCopyCurl);

  // Tombol import curl
  document
    .getElementById("btn-import-curl")
    .addEventListener("click", handleImportCurl);

  // Tombol close curl modal
  document
    .getElementById("btn-close-curl")
    .addEventListener("click", closeCurlModal);

  // Tombol export koleksi
  document
    .getElementById("btn-export-collection")
    .addEventListener("click", exportSelectedCollection);

  // Tombol import koleksi
  document
    .getElementById("btn-import-collection")
    .addEventListener("click", importCollectionFromFile);

  // --- Observer untuk highlight env vars ---

  // MutationObserver: refresh highlight saat KV rows berubah
  const kvLists = document.querySelectorAll(
    "#headers-list, #form-data-list, #urlencoded-list",
  );
  const kvObserver = new MutationObserver(() => updateAllEnvHighlights());
  kvLists.forEach((list) => {
    kvObserver.observe(list, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });

  // Input event pada body textarea
  document
    .getElementById("raw-body-input")
    .addEventListener("input", () => updateAllEnvHighlights());

  // Input event pada semua KV inputs (delegasi)
  document.addEventListener("input", (e) => {
    if (
      e.target.matches(
        "#headers-list input, #form-data-list input, #urlencoded-list input",
      )
    ) {
      updateAllEnvHighlights();
    }
  });
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

  // Inject auth headers (merge ke headers, auth override jika ada konflik)
  const authHeaders = collectAuthHeaders();
  Object.assign(headers, authHeaders);

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

/**
 * handleExportCurl — Export request saat ini sebagai curl command
 */
async function handleExportCurl() {
  const method = document.getElementById("method-select").value;
  const url = document.getElementById("url-input").value.trim();

  if (!url) {
    alert("URL tidak boleh kosong untuk export curl.");
    return;
  }

  const headers = collectKVRows("headers-list");

  // Inject auth headers
  const authHeaders = collectAuthHeaders();
  Object.assign(headers, authHeaders);

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

  try {
    const curlCommand = await exportRequestAsCurl(payload);
    setExportOutput(curlCommand);
    showCurlModal();
  } catch (err) {
    console.error("Gagal export curl:", err);
    alert("Error: " + err.message);
  }
}

/**
 * handleCopyCurl — Copy curl command ke clipboard
 */
function handleCopyCurl() {
  const curlCommand = document.getElementById("curl-output").value;
  if (!curlCommand) {
    alert("Tidak ada curl command untuk di-copy.");
    return;
  }
  copyToClipboard(curlCommand);
}

/**
 * handleImportCurl — Import curl command menjadi request
 */
async function handleImportCurl() {
  const curlCommand = getImportInput();

  if (!curlCommand) {
    alert("Masukkan curl command terlebih dahulu.");
    return;
  }

  try {
    const payload = await importFromCurl(curlCommand);

    // Update DOM dengan payload yang diimpor
    document.getElementById("method-select").value = payload.method || "GET";
    document.getElementById("url-input").value = payload.url || "";

    // Set headers
    document.getElementById("headers-list").innerHTML = "";
    Object.entries(payload.headers || {}).forEach(([k, v]) => {
      addKVRow("headers-list", k, v);
    });

    // Set body type dan body
    const bodyType = payload.bodyType || "none";
    const bodyRadio = document.querySelector(
      `input[name="body-type"][value="${bodyType}"]`,
    );
    if (bodyRadio) {
      bodyRadio.checked = true;
      switchBodyType(bodyType);
    }

    if (bodyType === "raw" && payload.body) {
      document.getElementById("raw-body-input").value = payload.body;
    }

    // Set form fields
    if (bodyType === "form-data") {
      document.getElementById("form-data-list").innerHTML = "";
      (payload.formFields || []).forEach((f) => {
        if (f.isFile) {
          addFileRow("form-data-list", f.key, f.filePath);
        } else {
          addKVRow("form-data-list", f.key, f.value);
        }
      });
    } else if (bodyType === "urlencoded") {
      document.getElementById("urlencoded-list").innerHTML = "";
      (payload.formFields || []).forEach((f) => {
        if (!f.isFile) {
          addKVRow("urlencoded-list", f.key, f.value);
        }
      });
    }

    clearImportInput();
    closeCurlModal();
    alert("Request berhasil diimpor dari curl command!");

    // Update judul tab
    updateActiveTabTitle(payload.url || "Imported Request");

    // Refresh highlight env vars
    updateAllEnvHighlights();
  } catch (err) {
    console.error("Gagal import curl:", err);
    alert("Error: " + err.message);
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
  const authType =
    document.querySelector('input[name="auth-type"]:checked')?.value || "none";
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

  const auth = {
    type: authType,
    bearerToken: document.getElementById("auth-bearer-token").value,
    basicUser: document.getElementById("auth-basic-user").value,
    basicPass: document.getElementById("auth-basic-pass").value,
    apiKeyName: document.getElementById("auth-apikey-name").value,
    apiKeyValue: document.getElementById("auth-apikey-value").value,
  };

  return { method, url, headers, body, bodyType, formFields, auth };
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

  // Auth
  const auth = state.auth || { type: "none" };
  const authRadio = document.querySelector(
    `input[name="auth-type"][value="${auth.type || "none"}"]`,
  );
  if (authRadio) {
    authRadio.checked = true;
    switchAuthType(auth.type || "none");
  }
  document.getElementById("auth-bearer-token").value = auth.bearerToken || "";
  document.getElementById("auth-basic-user").value = auth.basicUser || "";
  document.getElementById("auth-basic-pass").value = auth.basicPass || "";
  document.getElementById("auth-apikey-name").value =
    auth.apiKeyName || "X-API-Key";
  document.getElementById("auth-apikey-value").value = auth.apiKeyValue || "";

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

  // Refresh highlight env vars setelah DOM di-populate
  updateAllEnvHighlights();
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

/**
 * switchAuthType — Menampilkan sub-panel auth sesuai tipe yang dipilih
 */
function switchAuthType(type) {
  document
    .querySelectorAll(".auth-panel")
    .forEach((p) => p.classList.add("hidden"));
  const panelMap = {
    bearer: "auth-bearer",
    basic: "auth-basic",
    apikey: "auth-apikey",
  };
  const panelId = panelMap[type];
  if (panelId) document.getElementById(panelId).classList.remove("hidden");
}

/**
 * collectAuthHeaders — Menghasilkan header sesuai konfigurasi auth aktif
 * @returns {Object} header key→value untuk di-merge ke request headers
 */
function collectAuthHeaders() {
  const authType =
    document.querySelector('input[name="auth-type"]:checked')?.value || "none";

  switch (authType) {
    case "bearer": {
      const token = document.getElementById("auth-bearer-token").value.trim();
      if (token) return { Authorization: `Bearer ${token}` };
      break;
    }
    case "basic": {
      const user = document.getElementById("auth-basic-user").value;
      const pass = document.getElementById("auth-basic-pass").value;
      if (user || pass) {
        // Encode ke base64 — standar HTTP Basic Auth (RFC 7617)
        const encoded = btoa(unescape(encodeURIComponent(`${user}:${pass}`)));
        return { Authorization: `Basic ${encoded}` };
      }
      break;
    }
    case "apikey": {
      const name = document.getElementById("auth-apikey-name").value.trim();
      const value = document.getElementById("auth-apikey-value").value.trim();
      if (name && value) return { [name]: value };
      break;
    }
  }
  return {};
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

// ===== Sidebar Toggle =====

const SIDEBAR_KEY = "atur-sidebar-collapsed";

/**
 * initSidebarToggle — Inisialisasi toggle sidebar dan restore state dari localStorage
 */
function initSidebarToggle() {
  const sidebar = document.getElementById("sidebar");
  const btn = document.getElementById("btn-toggle-sidebar");

  if (!sidebar || !btn) return;

  // Restore state dari localStorage
  const collapsed = localStorage.getItem(SIDEBAR_KEY) === "true";
  if (collapsed) {
    sidebar.classList.add("collapsed");
    btn.textContent = "▶";
    btn.title = "Buka sidebar";
  }

  // Toggle saat tombol diklik
  btn.addEventListener("click", () => {
    const isNowCollapsed = sidebar.classList.toggle("collapsed");

    if (isNowCollapsed) {
      btn.textContent = "▶";
      btn.title = "Buka sidebar";
    } else {
      btn.textContent = "☰";
      btn.title = "Ciutkan sidebar";
    }

    // Simpan ke localStorage
    localStorage.setItem(SIDEBAR_KEY, isNowCollapsed.toString());
  });
}

// ===== Raw Body Formatter =====

/**
 * handleFormatBody — Format/beautify isi raw body sesuai content-type yang dipilih
 * Didukung: JSON, XML, HTML
 */
function handleFormatBody() {
  const textarea = document.getElementById("raw-body-input");
  const contentType = document.getElementById("raw-content-type").value;
  const rawText = textarea.value.trim();

  if (!rawText) return;

  try {
    switch (contentType) {
      case "application/json":
        textarea.value = formatJSON(rawText);
        break;
      case "application/xml":
      case "text/html":
        textarea.value = formatXML(rawText);
        break;
      default:
        // Text/plain — tidak ada formatting
        break;
    }

    // Feedback visual: flash hijau sebentar pada tombol
    const btn = document.getElementById("btn-format-body");
    btn.textContent = "✅ Formatted";
    btn.style.background = "var(--color-success, #2ecc71)";
    setTimeout(() => {
      btn.textContent = "✨ Format";
      btn.style.background = "";
    }, 1500);
  } catch (err) {
    console.error("Gagal format body:", err);
    alert("Gagal format: " + err.message);
  }
}

/**
 * formatJSON — Format string menjadi JSON yang rapi
 * @param {string} text - JSON string mentah (mungkin sudah terformat atau tidak)
 * @returns {string} JSON yang sudah di-indent
 */
function formatJSON(text) {
  const parsed = JSON.parse(text);
  return JSON.stringify(parsed, null, 2);
}

/**
 * formatXML — Format string menjadi XML yang rapi dengan indentasi
 * @param {string} text - XML/HTML string mentah
 * @returns {string} XML/HTML yang sudah di-indent
 */
function formatXML(text) {
  let formatted = "";
  let indent = 0;
  const indentStr = "  "; // 2 spasi

  // Tokenisasi: tag, closing tag, self-closing tag, text content
  const tokens = text
    .replace(/<!--[\s\S]*?-->/g, "") // hapus komentar dulu
    .replace(/>\s*</g, "><") // hapus whitespace antar tag
    .replace(/(>)([^<]+)(<)/g, (_m, p1, p2, p3) => {
      // Preserve text content, trim whitespace
      const trimmed = p2.replace(/\s+/g, " ").trim();
      return trimmed ? p1 + trimmed + p3 : p1 + p3;
    })
    .split(/(<[^>]+>)/g)
    .filter(Boolean);

  for (const token of tokens) {
    if (token.startsWith("</")) {
      // Closing tag
      indent = Math.max(0, indent - 1);
      formatted += "\n" + indentStr.repeat(indent) + token;
    } else if (token.startsWith("<") && token.endsWith("/>")) {
      // Self-closing tag
      formatted += "\n" + indentStr.repeat(indent) + token;
    } else if (token.startsWith("<")) {
      // Opening tag
      formatted += "\n" + indentStr.repeat(indent) + token;
      indent++;
    } else {
      // Text content (setelah di-trim)
      formatted += token;
    }
  }

  return formatted.trimStart();
}
