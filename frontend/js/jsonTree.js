/**
 * jsonTree.js — Render JSON sebagai expandable/collapsible tree
 * Menggunakan <details> + <summary> untuk node tree
 */

/**
 * renderJSONTree — Render JSON string sebagai tree di container
 * @param {string} jsonStr - JSON string mentah
 * @param {HTMLElement} container - Element target
 */
export function renderJSONTree(jsonStr, container) {
  container.innerHTML = "";

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    // Bukan JSON valid — fallback ke raw text
    return;
  }

  const root = buildTreeNode(null, data, 0);
  container.appendChild(root);
}

/**
 * buildTreeNode — Rekursif membangun DOM tree dari nilai JSON
 */
function buildTreeNode(key, value, depth) {
  if (value === null) {
    return leafNode(key, "null", "tree-null");
  }

  if (typeof value === "boolean") {
    return leafNode(key, String(value), "tree-boolean");
  }

  if (typeof value === "number") {
    return leafNode(key, String(value), "tree-number");
  }

  if (typeof value === "string") {
    return leafNode(key, `"${value}"`, "tree-string");
  }

  if (Array.isArray(value)) {
    return containerNode(key, value, depth, "[", "]");
  }

  if (typeof value === "object") {
    return containerNode(key, value, depth, "{", "}");
  }

  return leafNode(key, String(value), "");
}

/**
 * containerNode — Node untuk Object atau Array (dapat di-expand)
 */
function containerNode(key, obj, depth, openBracket, closeBracket) {
  const entries = Array.isArray(obj)
    ? obj.map((v, i) => [i, v])
    : Object.entries(obj);

  const count = entries.length;
  const label = Array.isArray(obj) ? `Array[${count}]` : `Object{${count}}`;

  const details = document.createElement("details");
  details.open = depth < 2; // auto-expand 2 level pertama
  details.style.marginLeft = depth * 16 + "px";

  const summary = document.createElement("summary");
  summary.innerHTML = `<span class="tree-toggle">▶</span>`;

  if (key !== null && key !== undefined) {
    summary.innerHTML += `<span class="tree-key">${escapeHTML(String(key))}</span>`;
  }

  summary.innerHTML += `<span class="tree-bracket">${openBracket}</span> <span class="tree-count">${count} items</span>`;
  details.appendChild(summary);

  // Batasi render untuk array/object besar (performa)
  const maxRender = 100;
  const limited = entries.length > maxRender;
  const toRender = limited ? entries.slice(0, maxRender) : entries;

  toRender.forEach(([k, v]) => {
    details.appendChild(
      buildTreeNode(Array.isArray(obj) ? null : k, v, depth + 1),
    );
  });

  if (limited) {
    const more = document.createElement("div");
    more.style.marginLeft = (depth + 1) * 16 + "px";
    more.style.color = "var(--color-text-muted)";
    more.style.fontSize = "11px";
    more.textContent = `... dan ${entries.length - maxRender} item lainnya`;
    details.appendChild(more);
  }

  // Tutup bracket
  const close = document.createElement("div");
  close.style.marginLeft = depth * 16 + "px";
  close.innerHTML = `<span class="tree-bracket">${closeBracket}</span>`;
  details.appendChild(close);

  return details;
}

/**
 * leafNode — Node untuk nilai primitif (string, number, boolean, null)
 */
function leafNode(key, displayValue, cssClass) {
  const div = document.createElement("div");
  div.style.padding = "1px 4px";

  let html = "";
  if (key !== null && key !== undefined) {
    html += `<span class="tree-key">${escapeHTML(String(key))}</span>`;
  }
  html += `<span class="${cssClass}">${escapeHTML(displayValue)}</span>`;

  div.innerHTML = html;
  return div;
}

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
