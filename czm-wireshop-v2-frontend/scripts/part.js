(function () {
  const API = (window.API_BASE || "https://czm-wireshop-v2-backend.onrender.com").replace(/\/+$/, "");
  const qs = new URLSearchParams(location.search);
  const pn = (qs.get("pn") || "").trim();

  const $ = (id) => document.getElementById(id);
  const title = $("part-title"), alertBox = $("part-alert"), view = $("part-view");
  const showErr = (m) => { alertBox.textContent = m; alertBox.style.display = "block"; };

  const jget  = (u) => fetch(u).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });
  const jpost = (u,b) => fetch(u, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(b) })
                          .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

  const norm = (x)=> (x||"").toString().replace(/\s+/g,"").replace(/\./g,"").toUpperCase();

  async function loadCatalog() {
    if (!window.catalog) {
      await new Promise((res,rej)=>{ const s=document.createElement("script"); s.src="/scripts/catalog.js?v=20250915a"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
    }
    if (!Array.isArray(window.catalog)) throw new Error("catalog missing");
    return window.catalog;
  }

  async function getQty(pn) {
    const list = await jget(`${API}/api/inventory`);
    const row = list.find(r => norm(r.pn) === norm(pn));
    return row ? Number(row.qty||0) : 0;
  }

  function render(part, qty) {
    title.textContent = `Part • ${part.pn}`;
    view.innerHTML = `
      <div class="ws-grid ws-grid--2col">
        <div class="ws-field"><div class="ws-label">Part Number</div><div class="ws-value">${part.pn}</div></div>
        <div class="ws-field"><div class="ws-label">Print Name</div><div class="ws-value">${part.name || "—"}</div></div>
        <div class="ws-field"><div class="ws-label">Location</div><div class="ws-value">${part.location || "—"}</div></div>
        <div class="ws-field"><div class="ws-label">Expected Hours</div><div class="ws-value">${part.expected_hours ?? 0}</div></div>
        <div class="ws-field ws-col-2"><div class="ws-label">Notes</div><div class="ws-value">${part.notes || ""}</div></div>
        <div class="ws-field">
          <div class="ws-label">Quantity</div>
          <div class="ws-value" id="qty">${qty}</div>
          <div class="ws-actions">
            <button id="minus" class="ws-btn ws-btn--danger">-</button>
            <button id="plus"  class="ws-btn ws-btn--primary">+</button>
          </div>
        </div>
      </div>
      <div id="logs" class="ws-card" style="margin-top:12px;padding:12px;"></div>
    `;
    $("minus").onclick = async () => {
      const r = await jpost(`${API}/api/inventory/${encodeURIComponent(part.pn)}/adjust`, { delta: -1, source: "ui" });
      $("qty").textContent = r.qty; loadLogs(part.pn);
    };
    $("plus").onclick = async () => {
      const r = await jpost(`${API}/api/inventory/${encodeURIComponent(part.pn)}/adjust`, { delta: +1, source: "ui" });
      $("qty").textContent = r.qty; loadLogs(part.pn);
    };
  }

  async function loadLogs(pn) {
    try {
      const r = await jget(`${API}/api/inventory/${encodeURIComponent(pn)}/logs`);
      $("logs").innerHTML = `<div class="ws-label" style="margin-bottom:6px;">Recent Inventory Activity</div>` +
        (r.logs || []).map(l => `<div class="ws-row"><span>${l.ts}</span><span>${l.source}</span><span>${l.delta>0?'+':''}${l.delta}</span></div>`).join("");
    } catch {}
  }

  (async function main() {
    if (!pn) { showErr("Missing pn"); return; }
    const catalog = await loadCatalog();
    const row = catalog.find(r => norm(r.pn || r.part_number || r["Part Number"]) === norm(pn));
    if (!row) { showErr("Part not found in catalog"); return; }
    const part = {
      pn,
      name: row.print_name || row["Print Name"] || row.name || "",
      location: row.location || row.bin || "",
      expected_hours: Number(row.expected_hours || 0) || 0,
      notes: row.notes || ""
    };
    const qty = await getQty(pn);
    render(part, qty);
    await loadLogs(pn);
  })();
})();
