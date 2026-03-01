/**
 * tabs.js — Manajemen tab multi-request
 * Setiap tab menyimpan state request dan response secara independen
 */

// State semua tab: array of { id, title, state }
let tabs = [];
let activeTabId = null;
let tabCounter = 0;

// Callback untuk sinkronisasi dengan DOM (diisi dari main.js)
let onSwitchTab = null;

/**
 * initTabs — Inisialisasi sistem tab, buat 1 tab awal
 * @param {Function} callbacks.getState - Fungsi baca state dari DOM
 * @param {Function} callbacks.setState - Fungsi tulis state ke DOM
 */
export function initTabs({ getState, setState }) {
  onSwitchTab = { getState, setState };

  // Bind tombol + tab baru
  document.getElementById("btn-new-tab").addEventListener("click", () => {
    createTab();
  });

  // Buat tab pertama
  createTab();
}

/**
 * createTab — Membuat tab baru dengan state kosong
 * @param {Object} initialState - State awal opsional (untuk load dari history/koleksi)
 * @returns {string} ID tab yang dibuat
 */
export function createTab(initialState = null) {
  // Simpan state tab aktif sebelum pindah
  if (activeTabId !== null && onSwitchTab) {
    const current = tabs.find((t) => t.id === activeTabId);
    if (current) {
      current.state = onSwitchTab.getState();
    }
  }

  tabCounter++;
  const id = `tab-${tabCounter}`;
  const title = initialState?.name || `Request ${tabCounter}`;

  const tab = {
    id,
    title,
    state: initialState || emptyState(),
  };

  tabs.push(tab);
  renderTabBar();
  switchToTab(id);

  return id;
}

/**
 * switchToTab — Pindah ke tab tertentu
 * @param {string} id - ID tab tujuan
 */
export function switchToTab(id) {
  // Simpan state tab aktif saat ini
  if (activeTabId !== null && activeTabId !== id && onSwitchTab) {
    const current = tabs.find((t) => t.id === activeTabId);
    if (current) {
      current.state = onSwitchTab.getState();
    }
  }

  activeTabId = id;
  const tab = tabs.find((t) => t.id === id);
  if (!tab) return;

  // Tulis state tab baru ke DOM
  if (onSwitchTab) {
    onSwitchTab.setState(tab.state);
  }

  renderTabBar();
}

/**
 * closeTab — Menutup tab berdasarkan ID
 * @param {string} id - ID tab yang ditutup
 */
export function closeTab(id) {
  if (tabs.length <= 1) return; // Minimal 1 tab

  const idx = tabs.findIndex((t) => t.id === id);
  tabs = tabs.filter((t) => t.id !== id);

  // Tentukan tab berikutnya
  if (activeTabId === id) {
    const nextTab = tabs[Math.min(idx, tabs.length - 1)];
    activeTabId = null; // Reset dulu agar switchToTab tidak simpan state tab yang dihapus
    switchToTab(nextTab.id);
  } else {
    renderTabBar();
  }
}

/**
 * updateActiveTabTitle — Update judul tab aktif (misal saat URL diketik)
 * @param {string} title
 */
export function updateActiveTabTitle(title) {
  const tab = tabs.find((t) => t.id === activeTabId);
  if (tab && title) {
    tab.title = title.length > 30 ? title.slice(0, 30) + "…" : title;
    renderTabBar();
  }
}

/**
 * saveResponseToActiveTab — Simpan response ke state tab aktif
 * @param {Object} response
 */
export function saveResponseToActiveTab(response) {
  const tab = tabs.find((t) => t.id === activeTabId);
  if (tab) {
    if (!tab.state) tab.state = emptyState();
    tab.state.response = response;
  }
}

// ===== Internal =====

/**
 * emptyState — State kosong untuk tab baru
 */
function emptyState() {
  return {
    method: "GET",
    url: "",
    headers: {},
    body: "",
    bodyType: "none",
    formFields: [],
    response: null,
  };
}

/**
 * renderTabBar — Render ulang daftar tab di DOM
 */
function renderTabBar() {
  const tabList = document.getElementById("tab-list");
  tabList.innerHTML = "";

  tabs.forEach((tab) => {
    const el = document.createElement("div");
    el.className = "tab-item" + (tab.id === activeTabId ? " active" : "");
    el.dataset.tabId = tab.id;

    const titleEl = document.createElement("span");
    titleEl.className = "tab-title";
    titleEl.textContent = tab.title;
    titleEl.title = tab.title;

    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-close";
    closeBtn.textContent = "×";
    closeBtn.title = "Tutup tab";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    el.appendChild(titleEl);
    if (tabs.length > 1) el.appendChild(closeBtn);
    el.addEventListener("click", () => switchToTab(tab.id));

    tabList.appendChild(el);
  });
}
