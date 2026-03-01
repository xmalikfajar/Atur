/**
 * ui.js — Render & manipulasi DOM
 * Bertanggung jawab atas semua perubahan tampilan
 */

import { addKVRow, addFileRow } from "./main.js";

/**
 * initUI — Inisialisasi tampilan awal
 */
export function initUI() {
  // Tidak ada inisialisasi khusus saat ini
}

/**
 * switchSidebarTab — Mengganti tab aktif di sidebar
 */
export function switchSidebarTab(tabName) {
  document
    .querySelectorAll(".sidebar-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".sidebar-panel")
    .forEach((p) => p.classList.remove("active"));

  document
    .querySelector(`.sidebar-tab[data-tab="${tabName}"]`)
    .classList.add("active");
  document.getElementById(`panel-${tabName}`).classList.add("active");
}

/**
 * renderResponse — Menampilkan hasil response ke UI
 * @param {Object} response - Objek response dari backend
 */
export function renderResponse(response) {
  const metaEl = document.getElementById("response-meta");
  const tabsEl = document.getElementById("response-tabs");
  const placeholder = document.getElementById("response-placeholder");
  const bodyEl = document.getElementById("response-body");
  const headersBody = document.getElementById("response-headers-body");
  const statusEl = document.getElementById("resp-status");
  const durationEl = document.getElementById("resp-duration");
  const sizeEl = document.getElementById("resp-size");

  // Tampilkan meta & tabs
  metaEl.classList.remove("hidden");
  tabsEl.classList.remove("hidden");
  placeholder.classList.add("hidden");
  bodyEl.classList.remove("hidden");

  if (response.error) {
    // Tampilkan error
    statusEl.textContent = "Error";
    statusEl.className = "badge badge-5xx";
    durationEl.textContent = response.duration ? `${response.duration} ms` : "";
    sizeEl.textContent = "";
    bodyEl.textContent = response.error;
    headersBody.innerHTML = "";
    return;
  }

  // Status badge
  const code = response.statusCode;
  statusEl.textContent = response.status;
  statusEl.className = "badge " + getStatusClass(code);

  // Durasi & ukuran
  durationEl.textContent = `${response.duration} ms`;
  sizeEl.textContent = formatSize(response.size);

  // Body response — coba format JSON
  const bodyText = tryFormatJSON(response.body);
  bodyEl.textContent = bodyText;

  // Headers response
  headersBody.innerHTML = "";
  if (response.headers) {
    Object.entries(response.headers).forEach(([key, val]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHTML(key)}</td><td>${escapeHTML(val)}</td>`;
      headersBody.appendChild(tr);
    });
  }
}

/**
 * renderHistoryList — Merender daftar history di sidebar
 * @param {Array} items - Array HistoryItem
 * @param {Function} onSelect - Callback saat item dipilih
 */
export function renderHistoryList(items, onSelect) {
  const list = document.getElementById("history-list");
  list.innerHTML = "";

  if (!items || items.length === 0) {
    list.innerHTML =
      '<li style="padding:12px;color:var(--color-text-muted);font-size:12px;">Belum ada history.</li>';
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "sidebar-item";
    li.innerHTML = `
      <span class="method-badge method-${item.method}">${item.method}</span>
      <span class="item-url" title="${escapeHTML(item.url)}">${escapeHTML(item.url)}</span>
    `;
    li.addEventListener("click", () => onSelect(item));
    list.appendChild(li);
  });
}

/**
 * renderCollectionList — Merender daftar koleksi di sidebar
 * @param {Array} collections - Array Collection
 * @param {Function} onSelectRequest - Callback saat request dipilih
 */
export function renderCollectionList(collections, onSelectRequest) {
  const list = document.getElementById("collection-list");
  list.innerHTML = "";

  if (!collections || collections.length === 0) {
    list.innerHTML =
      '<li style="padding:12px;color:var(--color-text-muted);font-size:12px;">Belum ada koleksi.</li>';
    return;
  }

  collections.forEach((col) => {
    const li = document.createElement("li");
    li.className = "sidebar-item";
    li.style.flexDirection = "column";
    li.style.alignItems = "flex-start";
    li.style.gap = "4px";

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:center;gap:6px;width:100%;cursor:pointer;";
    header.innerHTML = `<span style="font-size:12px;">📁</span><span class="item-name">${escapeHTML(col.name)}</span>`;

    const subList = document.createElement("ul");
    subList.style.cssText = "width:100%;padding-left:16px;display:none;";

    header.addEventListener("click", () => {
      subList.style.display =
        subList.style.display === "none" ? "block" : "none";
    });

    if (col.requests && col.requests.length > 0) {
      col.requests.forEach((req) => {
        const subLi = document.createElement("li");
        subLi.className = "sidebar-item";
        subLi.style.padding = "5px 8px";
        subLi.innerHTML = `
          <span class="method-badge method-${req.method}">${req.method}</span>
          <span class="item-name" title="${escapeHTML(req.url)}">${escapeHTML(req.name || req.url)}</span>
        `;
        subLi.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRequest(req);
        });
        subList.appendChild(subLi);
      });
    }

    li.appendChild(header);
    li.appendChild(subList);
    list.appendChild(li);
  });
}

/**
 * fillRequestForm — Mengisi form request dari data yang tersimpan
 * @param {Object} item - HistoryItem atau RequestItem
 */
export function fillRequestForm(item) {
  document.getElementById("method-select").value = item.method || "GET";
  document.getElementById("url-input").value = item.url || "";

  // Isi headers
  const headersList = document.getElementById("headers-list");
  headersList.innerHTML = "";
  if (item.headers) {
    Object.entries(item.headers).forEach(([k, v]) =>
      addKVRow("headers-list", k, v),
    );
  }

  // Set body type
  const bodyType = item.bodyType || "none";
  const radio = document.querySelector(
    `input[name="body-type"][value="${bodyType}"]`,
  );
  if (radio) {
    radio.checked = true;
    radio.dispatchEvent(new Event("change"));
  }

  // Isi raw body
  if (bodyType === "raw") {
    document.getElementById("raw-body-input").value = item.body || "";
  }
}

// ===== Helper Functions =====

/**
 * getStatusClass — Mengembalikan class CSS berdasarkan status code
 */
function getStatusClass(code) {
  if (code >= 200 && code < 300) return "badge-2xx";
  if (code >= 300 && code < 400) return "badge-3xx";
  if (code >= 400 && code < 500) return "badge-4xx";
  return "badge-5xx";
}

/**
 * tryFormatJSON — Mencoba memformat string sebagai JSON yang rapi
 */
function tryFormatJSON(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/**
 * formatSize — Memformat ukuran bytes menjadi string yang mudah dibaca
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * escapeHTML — Escape karakter HTML untuk mencegah XSS
 */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
