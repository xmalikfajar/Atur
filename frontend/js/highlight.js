/**
 * highlight.js — Highlight {{environment_variable}} di input fields
 * Menggunakan overlay layer untuk URL input, dan border accent untuk KV inputs & body
 */

const ENV_VAR_REGEX = /\{\{(\w+)\}\}/g;

/**
 * updateURLHighlight — Sinkronkan highlight layer URL dengan teks input
 * Wrap {{var}} dengan <mark> tag
 */
export function updateURLHighlight() {
  const input = document.getElementById("url-input");
  const layer = document.getElementById("url-highlight-layer");
  if (!input || !layer) return;

  const text = input.value;

  if (!ENV_VAR_REGEX.test(text)) {
    // Reset regex state lalu cek ulang
    ENV_VAR_REGEX.lastIndex = 0;
    layer.innerHTML = "";
    return;
  }

  ENV_VAR_REGEX.lastIndex = 0;

  // Build HTML dengan highlight {{var}}
  let html = "";
  let lastIdx = 0;
  let match;

  while ((match = ENV_VAR_REGEX.exec(text)) !== null) {
    // Teks sebelum match
    html += escapeHTML(text.slice(lastIdx, match.index));
    // Match yang di-highlight
    html += `<mark class="env-var-highlight">{{${match[1]}}}</mark>`;
    lastIdx = ENV_VAR_REGEX.lastIndex;
  }

  // Sisa teks setelah match terakhir
  html += escapeHTML(text.slice(lastIdx));

  layer.innerHTML = html;
}

/**
 * updateAllEnvHighlights — Perbarui semua highlight dan indikator env
 * Dipanggil saat: input URL berubah, env berubah, tab switch, data load
 */
export function updateAllEnvHighlights() {
  updateURLHighlight();
  updateKVEnvIndicators();
  updateBodyEnvIndicator();
}

/**
 * updateKVEnvIndicators — Tambahkan indikator env pada KV rows (headers, form-data, dll)
 */
function updateKVEnvIndicators() {
  const rows = document.querySelectorAll(".kv-row");
  rows.forEach((row) => {
    // Hanya proses input value, bukan key
    const valueInputs = row.querySelectorAll(
      "input.kv-value, input.kv-file-path",
    );
    let hasEnv = false;

    valueInputs.forEach((inp) => {
      if (ENV_VAR_REGEX.test(inp.value)) {
        hasEnv = true;
        ENV_VAR_REGEX.lastIndex = 0;
      }
    });

    if (hasEnv) {
      row.classList.add("has-env");
    } else {
      row.classList.remove("has-env");
    }

    // Remove env-indicator sebelumnya
    const existing = row.querySelector(".env-indicator");
    if (existing) existing.remove();

    // Tambahkan badge indikator jika ada env var
    if (hasEnv) {
      const badge = document.createElement("span");
      badge.className = "env-indicator";
      badge.textContent = "env";
      row.appendChild(badge);
    }
  });
}

/**
 * updateBodyEnvIndicator — Tambahkan indikator env pada raw body panel
 */
function updateBodyEnvIndicator() {
  const bodyPanel = document.getElementById("body-raw");
  const textarea = document.getElementById("raw-body-input");
  if (!bodyPanel || !textarea) return;

  const hasEnv = ENV_VAR_REGEX.test(textarea.value);
  ENV_VAR_REGEX.lastIndex = 0;

  if (hasEnv) {
    bodyPanel.classList.add("has-env");
  } else {
    bodyPanel.classList.remove("has-env");
  }
}

/**
 * escapeHTML — Escape karakter khusus HTML
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
