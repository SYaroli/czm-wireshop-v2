// czm-wireshop-v2-frontend/scripts/part.js
// No catalog.js. Get the row from /api/inventory, then show qty and logs and allow +/-.
(function () {
  const API = (window.API_BASE || "https://czm-wireshop-v2-backend.onrender.com").replace(/\/+$/, "");
  const qs = new URLSearchParams(location.search);
  const pn = (qs.get("pn") || "").trim();

  const $ = (id) => document.getElementById(id);
  const title = $("part-title"), alertBox = $("part-alert"), view = $("part-view");
  const showErr = (m) => { alertBox.textContent = m; alertBox.style.display = "block"; };
  const norm = (x) => (x || "").toString().replace(/\s+/g, "").replace(/\./g, "").toUpperCase();

  const jget  = (u) => fetch(u).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });
  const jpost = (u,b) => fetch(u, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(b) })
                          .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

  function render(part) {
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
          <div class="ws-value" id="qty">${part.qty ?? 0}</div>
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
    try {
      const list = await jget(`${API}/api/inventory`);
      const row = list.find(x => norm(x.pn || x["Part Number"]) === norm(pn));
      if (!row) { showErr("404: part not in inventory"); return; }
      const part = {
        pn,
        name: row.name || row.print_name || row["Print Name"] || "",
        location: row.location || row.bin || "",
        expected_hours: Number(row.expected_hours || 0) || 0,
        notes: row.notes || "",
        qty: Number(row.qty || 0) || 0
      };
      render(part);
      await loadLogs(pn);
    } catch (e) {
      showErr(`Load failed: ${e.message}`);
    }
  })();
})();
