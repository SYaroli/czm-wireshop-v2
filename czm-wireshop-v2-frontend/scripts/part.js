(function(){
  const API = (window.API_BASE || "").replace(/\/+$/,'');
  const qs = new URLSearchParams(location.search);
  const pn = (qs.get('pn') || '').trim();
  const title = document.getElementById('part-title');
  const alertBox = document.getElementById('part-alert');
  const view = document.getElementById('part-view');
  title.textContent = pn ? `Part • ${pn}` : 'Part';

  const err = m => { alertBox.textContent = m; alertBox.style.display='block'; };

  const get = (u)=> fetch(u).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });
  const post = (u,b)=> fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });

  function render(part){
    view.innerHTML = `
      <div class="ws-grid ws-grid--2col">
        <div class="ws-field"><div class="ws-label">Part Number</div><div class="ws-value">${part.pn}</div></div>
        <div class="ws-field"><div class="ws-label">Print Name</div><div class="ws-value">${part.name || '—'}</div></div>
        <div class="ws-field"><div class="ws-label">Location</div><div class="ws-value">${part.location || '—'}</div></div>
        <div class="ws-field"><div class="ws-label">Expected Hours</div><div class="ws-value">${part.expected_hours ?? 0}</div></div>
        <div class="ws-field ws-col-2"><div class="ws-label">Notes</div><div class="ws-value">${part.notes || ''}</div></div>
        <div class="ws-field"><div class="ws-label">Quantity</div>
          <div class="ws-value" id="qty">${part.qty ?? 0}</div>
          <div class="ws-actions">
            <button id="minus" class="ws-btn ws-btn--danger">-</button>
            <button id="plus" class="ws-btn ws-btn--primary">+</button>
          </div>
        </div>
      </div>
      <div id="logs" class="ws-card" style="margin-top:12px;padding:12px;"></div>
    `;
    document.getElementById('minus').onclick = async ()=> { const r = await post(`${API}/api/inventory/${encodeURIComponent(pn)}/adjust`, {delta:-1, source:'ui'}); document.getElementById('qty').textContent = r.qty; loadLogs(); };
    document.getElementById('plus').onclick  = async ()=> { const r = await post(`${API}/api/inventory/${encodeURIComponent(pn)}/adjust`, {delta:+1, source:'ui'}); document.getElementById('qty').textContent = r.qty; loadLogs(); };
  }

  async function loadLogs(){
    try{
      const r = await get(`${API}/api/inventory/${encodeURIComponent(pn)}/logs`);
      const box = document.getElementById('logs');
      box.innerHTML = `<div class="ws-label" style="margin-bottom:6px;">Recent Inventory Activity</div>` +
        (r.logs||[]).map(l=>`<div class="ws-row"><span>${l.ts}</span><span>${l.source}</span><span>${l.delta>0?'+':''}${l.delta}</span></div>`).join('');
    }catch(e){ /* silent */ }
  }

  (async function main(){
    if(!pn){ err('Missing pn'); return; }
    try{
      const r = await get(`${API}/api/parts/${encodeURIComponent(pn)}`);
      render(r.part); await loadLogs();
    }catch(e){ err(`Load failed: ${e.message}`); }
  })();
})();
