/**
 * curl.js — Logika export/import curl command
 */

/**
 * exportRequestAsCurl — Mengubah request payload menjadi perintah curl
 * @param {Object} payload - Request payload (method, url, headers, body, bodyType, formFields)
 * @returns {string} Curl command
 */
export async function exportRequestAsCurl(payload) {
  try {
    const curlCommand = await window.go.main.App.ExportToCurl(payload);
    return curlCommand;
  } catch (err) {
    console.error("Gagal export curl:", err);
    throw new Error("Gagal mengubah request menjadi curl: " + String(err));
  }
}

/**
 * importFromCurl — Mengurai perintah curl menjadi request payload
 * @param {string} curlCommand - Perintah curl
 * @returns {Object} Request payload
 */
export async function importFromCurl(curlCommand) {
  try {
    const payload = await window.go.main.App.ImportFromCurl(curlCommand);
    return payload;
  } catch (err) {
    console.error("Gagal import curl:", err);
    throw new Error("Gagal mengimpor curl command: " + String(err));
  }
}

/**
 * showCurlModal — Menampilkan modal curl export/import
 */
export function showCurlModal() {
  document.getElementById("modal-curl").classList.remove("hidden");
}

/**
 * closeCurlModal — Menutup modal curl
 */
export function closeCurlModal() {
  document.getElementById("modal-curl").classList.add("hidden");
}

/**
 * switchCurlTab — Mengganti tab aktif di modal curl (export/import)
 * @param {string} tabName - "export" atau "import"
 */
export function switchCurlTab(tabName) {
  // Ubah active tab indicator
  document.querySelectorAll(".curl-tab").forEach((tab) => {
    tab.classList.remove("active");
    if (tab.dataset.tab === tabName) {
      tab.classList.add("active");
      // Update styling
      tab.style.color = "var(--color-primary)";
      tab.style.borderBottom = "2px solid var(--color-primary)";
    } else {
      tab.style.color = "var(--color-text-muted)";
      tab.style.borderBottom = "none";
    }
  });

  // Ubah active panel
  document.querySelectorAll(".curl-panel").forEach((panel) => {
    panel.classList.add("hidden");
  });
  document
    .getElementById(`curl-panel-${tabName}`)
    .classList.remove("hidden");
}

/**
 * copyToClipboard — Copy teks ke clipboard
 * @param {string} text - Teks untuk di-copy
 */
export function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // Tampilkan notifikasi atau ubah tombol teks
      const btn = document.getElementById("btn-copy-curl");
      const originalText = btn.textContent;
      btn.textContent = "✅ Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    })
    .catch((err) => {
      console.error("Gagal copy ke clipboard:", err);
      alert("Gagal copy ke clipboard");
    });
}

/**
 * setExportOutput — Set textarea dengan curl output
 * @param {string} curlCommand - Perintah curl
 */
export function setExportOutput(curlCommand) {
  document.getElementById("curl-output").value = curlCommand;
}

/**
 * getImportInput — Ambil curl input dari textarea
 * @returns {string} Curl command dari input
 */
export function getImportInput() {
  return document.getElementById("curl-input").value.trim();
}

/**
 * clearImportInput — Bersihkan textarea input
 */
export function clearImportInput() {
  document.getElementById("curl-input").value = "";
}
