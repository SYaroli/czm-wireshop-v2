// czm-wireshop-v2-frontend/scripts/part.js
(function () {
  const API = (window.API_BASE || "https://czm-wireshop-v2-backend.onrender.com").replace(/\/+$/, "");
  const qs = new URLSearchParams(location.search);
  const pnParam = (qs.get("pn") || "").trim();

  const $ = (id) => document.getElementById(id);
  const title = $("part-title"), alertBox = $("part-alert"), view = $("part-view");
  const showErr = (m) => { alertBox.textContent = m; alertBox.style.display = "block"; };
  const N = (x) => (x ?? "").toString().toUpperCase();
  const NPN = (x) => N(x).replace(/[^A-Z0-9]/g, ""); // normalize part numbers: drop dots/spaces/etc.

  const jget  = (u) => fetch(u).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });
  const jpost = (u,b) => fetch(u, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(b) })
                          .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); });

  function pickKey(obj, tests) {
    const keys = Object.keys(obj);
    for (const t of tests) {
      const k = keys.find(k => t.test(k));
      if (k) return k;
    }
    return null;
  }

  function inferPartRow(list, pnWanted) {
    const wanted = NPN(pnWanted);
    for (const row of list) {
      // try common keys
      let pnKey = pickKey(row, [
        /^pn$/i, /^part[_\s-]*number$/i, /^partnum(ber)?$/i, /^sku$/i, /^id$/i, /^number$/i, /^part$/i
      ]) || Object.keys(row).find(k => NPN(row[k]).length >= 6 && /[0-9]/.test(row[k]); // heuristic
      if (!pnKey) continue;
      if (NPN(row[pnKey]) === wanted) {
        // map other fields loosely
        const nameKey = pickKey(row, [/^print[_\s-]*name$/i, /^name$/i, /^desc(ription)?$/i, /^title$/i]) || null;
        const locKey  = pickKey(row, [/^loc(ation)?$/i, /^bin$/i]) || null;
        const qtyKey  = pickKey(row, [/^qty$/i, /^quantity$/i, /^count$/i]) || null;
        const hrsKey  = pickKey(row, [/^expected[_\s-]*hours?$/i, /hours?/i]) || null;
        const noteKey = pickKey(row, [/^notes?$/i, /^comment$/i]) || null;

        return {
          pn: row[pnKey],
          name: nameKey ? row[nameKey] : "",
          location: locKey ? row[locKey] : "",
          expected_hours: Number(row[hrsKey] ?? 0) || 0,
          notes: noteKey ? row[noteKey] : "",
          qty: Number(row[qtyKey] ?? 0) || 0
        };
      }
    }
    return null;
  }

  function render(part) {
    title.textContent = `Part • ${part.pn}`;
    view.innerHTML = `
      <div class="ws-grid ws-grid--2col">
        <div class="ws-field"><div class="ws-label">Part Number</div><div class="ws-value">${part.pn}</div></div>
        <div class="ws-field"><div class="ws-label">Print Name</div><div class="ws-value">${part.name || "—"}</div></div>
        <div class="ws-field"><div class="ws-label">Location</div><div class="ws-value">${part.location || "—"}</div></div>
        <div class="ws-field"><div class="ws-label">Expected Hours</div><div class="ws-value">${part.expected_hours}</div></div>
        <div class="ws-field ws-col-2"><div class="ws-label">Notes</div><div class="ws-value">${part.notes || ""}</div></div>
        <div class="ws-field">
          <div class="ws-label">Quantity</div>
          <div class="ws-value" id="qty">${part.qty}</div>
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
    if (!pnParam) { showErr("Missing pn"); return; }
    try {
      const list = await jget(`${API}/api/inventory`);
      const part = inferPartRow(list, pnParam);
      if (!part) { showErr("404: part not in inventory"); return; }
      render(part);
      await loadLogs(part.pn);
    } catch (e) {
      showErr(`Load failed: ${e.message}`);
    }
  })();
})();
