// Part page loader: try API endpoints, then fall back by fetching catalog.js as text (MIME-safe) and eval to get window.catalog.
(function () {
  const qs = new URLSearchParams(location.search);
  const pnQuery = (qs.get("pn") || "").trim();

  const titleEl = document.getElementById("part-title");
  const viewEl = document.getElementById("part-view");
  const alertEl = document.getElementById("part-alert");

  titleEl.textContent = pnQuery ? `Part • ${pnQuery}` : "Part";

  function showError(msg) {
    alertEl.textContent = msg;
    alertEl.style.display = "block";
  }

  const getPN = r => (
    r?.pn ?? r?.part_number ?? r?.["Part Number"] ?? r?.PartNumber ?? r?.partNumber ?? ""
  ).toString().trim();

  const getPrintName = r => (
    r?.print_name ?? r?.["Print Name"] ?? r?.printName ?? r?.PrintName ?? ""
  ).toString().trim();

  const getLocation = r => (
    r?.location ?? r?.["Location"] ?? r?.bin ?? r?.["Bin"] ?? ""
  ).toString().trim();

  const getQty = r => {
    const v = r?.qty ?? r?.quantity ?? r?.["Qty"] ?? r?.["Quantity"] ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  async function tryJson(url) {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw Object.assign(new Error(`${res.status}`), { status: res.status });
    return res.json();
  }

  async function loadFromApi() {
    const base = (window.API_BASE || "").replace(/\/+$/, "");
    const urls = [];
    if (base) urls.push(`${base}/api/parts`, `${base}/api/inventory`);
    urls.push("/api/parts", "/api/inventory", "/parts", "/inventory");

    let lastErr = null;
    for (const u of urls) {
      try {
        const data = await tryJson(u);
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.rows)) return data.rows;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("no api");
  }

  async function loadFromCatalogJs() {
    // Fetch as text to bypass MIME execution blocking, then eval to define window.catalog
    const res = await fetch("/scripts/catalog.js", { cache: "no-store" });
    if (!res.ok) throw new Error(`catalog.js ${res.status}`);
    const code = await res.text();
    // Sandboxed-ish eval: attach catalog to window
    (function run(win) { eval(code); })(window); // catalog.js in your repo defines window.catalog = [...]
    const list = Array.isArray(window.catalog) ? window.catalog : [];
    if (!list) throw new Error("catalog missing");
    return list;
  }

  async function loadList() {
    try {
      return await loadFromApi();
    } catch {
      return await loadFromCatalogJs();
    }
  }

  function renderPart(row) {
    viewEl.innerHTML = `
      <div class="ws-grid ws-grid--2col">
        <div class="ws-field"><div class="ws-label">Part Number</div><div class="ws-value">${getPN(row)}</div></div>
        <div class="ws-field"><div class="ws-label">Print Name</div><div class="ws-value">${getPrintName(row) || "—"}</div></div>
        <div class="ws-field"><div class="ws-label">Location</div><div class="ws-value">${getLocation(row) || "—"}</div></div>
        <div class="ws-field"><div class="ws-label">Quantity</div><div class="ws-value">${getQty(row)}</div></div>
      </div>
    `;
  }

  (async function main() {
    if (!pnQuery) { showError("Missing pn query parameter."); return; }

    try {
      const list = await loadList();
      const bare = pnQuery.replace(/\./g, "");
      const row =
        list.find(r => getPN(r) === pnQuery) ||
        list.find(r => getPN(r).replace(/\./g, "") === bare);

      if (!row) { showError(`Part not found in inventory: ${pnQuery}`); return; }
      renderPart(row);
    } catch (err) {
      showError(`Load failed: inventory source unavailable (${err?.status || err?.message || "error"})`);
    }
  })();
})();
