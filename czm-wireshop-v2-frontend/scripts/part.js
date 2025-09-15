/* Part details page with resilient data loading.
   Order: try API endpoints → fall back to window.catalog (from catalog.js). */

(function () {
  const qs = new URLSearchParams(window.location.search);
  const pnQuery = (qs.get("pn") || "").trim();
  const titleEl = document.getElementById("part-title");
  const viewEl = document.getElementById("part-view");
  const alertEl = document.getElementById("part-alert");

  titleEl.textContent = pnQuery ? `Part • ${pnQuery}` : "Part";

  // Utility: show an error nicely
  function showError(msg) {
    alertEl.textContent = msg;
    alertEl.style.display = "block";
  }

  // Normalize part-number field across different shapes
  function getPN(row) {
    return (
      row?.pn ||
      row?.part_number ||
      row?.["Part Number"] ||
      row?.PartNumber ||
      row?.partNumber ||
      ""
    ).toString().trim();
  }

  function getPrintName(row) {
    return (
      row?.print_name ||
      row?.["Print Name"] ||
      row?.printName ||
      row?.PrintName ||
      ""
    ).toString().trim();
  }

  function getLocation(row) {
    return (
      row?.location ||
      row?.["Location"] ||
      row?.bin ||
      row?.["Bin"] ||
      ""
    ).toString().trim();
  }

  function getQty(row) {
    const v =
      row?.qty ??
      row?.quantity ??
      row?.["Qty"] ??
      row?.["Quantity"] ??
      0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  async function tryJson(url) {
    const r = await fetch(url, { credentials: "omit" });
    if (!r.ok) throw Object.assign(new Error(`${r.status}`), { status: r.status });
    return r.json();
  }

  async function loadList() {
    const base = (window.API_BASE || "").replace(/\/+$/, "");
    const candidates = [];

    // Prefer explicit base if provided in config.js
    if (base) {
      candidates.push(`${base}/api/parts`);
      candidates.push(`${base}/api/inventory`);
    }

    // Relative fallbacks in case the backend is proxied behind the same origin
    candidates.push(`/api/parts`);
    candidates.push(`/api/inventory`);
    candidates.push(`/parts`);
    candidates.push(`/inventory`);

    let lastErr = null;
    for (const url of candidates) {
      try {
        const data = await tryJson(url);
        if (Array.isArray(data) && data.length >= 0) return data;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.rows)) return data.rows;
      } catch (e) {
        lastErr = e;
        // keep trying
      }
    }

    // Final fallback: static catalog injected via /scripts/catalog.js
    if (Array.isArray(window.catalog) && window.catalog.length >= 0) {
      return window.catalog;
    }

    throw lastErr || new Error("No inventory endpoint available");
  }

  function renderPart(row) {
    viewEl.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "ws-grid ws-grid--2col";
    grid.innerHTML = `
      <div class="ws-field"><div class="ws-label">Part Number</div><div class="ws-value">${getPN(row)}</div></div>
      <div class="ws-field"><div class="ws-label">Print Name</div><div class="ws-value">${getPrintName(row) || "—"}</div></div>
      <div class="ws-field"><div class="ws-label">Location</div><div class="ws-value">${getLocation(row) || "—"}</div></div>
      <div class="ws-field"><div class="ws-label">Quantity</div><div class="ws-value">${getQty(row)}</div></div>
    `;

    viewEl.appendChild(grid);
  }

  (async function main() {
    if (!pnQuery) {
      showError("Missing pn query parameter.");
      return;
    }

    try {
      const list = await loadList();

      // find the matching row; accept exact and de-dotted comparisons
      const needle = pnQuery;
      const bare = needle.replace(/\./g, "");
      const row =
        list.find(r => getPN(r) === needle) ||
        list.find(r => getPN(r).replace(/\./g, "") === bare);

      if (!row) {
        showError(`Part not found in inventory: ${pnQuery}`);
        return;
      }

      renderPart(row);
    } catch (err) {
      showError(`Load failed: inventory source unavailable (${err?.status || err?.message || "error"})`);
    }
  })();
})();
