// czm-wireshop-v2-frontend/scripts/part.js
(() => {
  const $ = s => document.querySelector(s);
  const pn = new URLSearchParams(location.search).get('pn')?.trim();

  const title = $('h1') || document.createElement('h1');
  if (!title.parentNode) document.body.prepend(title);
  title.textContent = pn ? `Part • ${pn}` : 'Part';

  const statusEl = document.getElementById('status') || (function () {
    const d = document.createElement('div');
    d.id = 'status';
    d.style.margin = '12px';
    d.style.color = '#f88';
    document.body.prepend(d);
    return d;
  })();

  const setStatus = (msg, color = '#f88') => {
    statusEl.textContent = msg || '';
    statusEl.style.color = color;
  };

  if (!pn) {
    setStatus('Missing ?pn=…');
    return;
  }

  const API_BASE = (window.API_BASE || '').replace(/\/$/, '');
  const cred = window.API_CREDENTIALS || 'include';

  // Try to enrich from catalog.js if present
  const CATALOG = window.CATALOG || {};
  const meta = CATALOG[pn] || null;
  if (meta) {
    const nameEl = $('#part-name'); if (nameEl) nameEl.textContent = meta.print || meta.name || '';
    const notesEl = $('#part-notes'); if (notesEl) notesEl.textContent = meta.notes || '';
  }

  const url = `${API_BASE}/api/inventory/${encodeURIComponent(pn)}`;

  fetch(url, { credentials: cred })
    .then(r => (r.ok ? r.json() : Promise.reject({ status: r.status })))
    .then(data => {
      setStatus(''); // clear message

      // Quantity
      const qtyEl = $('#part-qty'); if (qtyEl) qtyEl.textContent = data.qty ?? 0;

      // Last updated
      const metaEl = $('#part-meta');
      if (metaEl) {
        metaEl.textContent = (data.updated_at || data.updated_by)
          ? `Updated ${data.updated_at || ''}${data.updated_by ? ` by ${data.updated_by}` : ''}`
          : '';
      }

      // History (optional)
      const histEl = $('#part-history');
      if (histEl && Array.isArray(data.history)) {
        histEl.innerHTML = '';
        data.history.forEach(row => {
          const li = document.createElement('li');
          const sign = row.change > 0 ? '+' : '';
          li.textContent = `${row.ts || ''}   ${sign}${row.change} → ${row.qty_after}`;
          histEl.appendChild(li);
        });
      }
    })
    .catch(err => {
      if (err && err.status === 404) setStatus('404: part not in inventory', '#fa0');
      else setStatus('Load failed. Open console for details.');
      console.error('part load error', err);
    });
})();
