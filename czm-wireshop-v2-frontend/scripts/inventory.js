(function(){
  const QTY_KEY = "ws.qty";
  const LOG_KEY = "ws.logs";
  function loadQty(){ try{return JSON.parse(localStorage.getItem(QTY_KEY) || "{}");}catch{ return {}; } }
  function saveQty(map){ localStorage.setItem(QTY_KEY, JSON.stringify(map)); }
  function loadLogs(){ try{return JSON.parse(localStorage.getItem(LOG_KEY) || "{}");}catch{ return {}; } }
  function saveLogs(map){ localStorage.setItem(LOG_KEY, JSON.stringify(map)); }

  const qty = loadQty();
  const logs = loadLogs();

  const body = document.getElementById("invBody");
  const filter = document.getElementById("filter");
  const count = document.getElementById("count");

  function addLog(partNumber, delta, newQty, user){
    const arr = logs[partNumber] || [];
    arr.push({ t: Date.now(), by: user || "", d: delta, qty: newQty });
    logs[partNumber] = arr;
    saveLogs(logs);
  }

  function row(model){
    const key = model.partNumber;
    const q = qty[key] ?? 0;
    const tr = document.createElement("tr");
    const href = `part.html?pn=${encodeURIComponent(key)}`;
    tr.innerHTML = `
      <td><a href="${href}" class="plink">${model.partNumber}</a></td>
      <td>${model.printName || ""}</td>
      <td>${model.location || ""}</td>
      <td class="qty" data-key="${key}">${q}</td>
      <td>
        <div class="adjust">
          <input class="adjinput" type="number" step="1" placeholder="+/-">
        </div>
      </td>
      <td><button class="apply">Apply</button></td>
    `;

    const input = tr.querySelector(".adjinput");
    const apply = tr.querySelector(".apply");

    function doApply(){
      const delta = parseInt(input.value, 10);
      const safeDelta = Number.isFinite(delta) ? delta : 0;
      const newVal = Math.max(0, (qty[key] ?? 0) + safeDelta);
      qty[key] = newVal;
      saveQty(qty);
      const s = window.sessionAPI?.getSession?.() || {};
      addLog(key, safeDelta, newVal, s.username || "");
      tr.querySelector(".qty").textContent = newVal;
      input.value = "";
    }

    apply.addEventListener("click", doApply);
    input.addEventListener("keydown", (e)=>{ if (e.key === "Enter") doApply(); });

    return tr;
  }

  function matches(m, term){
    if (!term) return true;
    term = term.toLowerCase();
    return (m.partNumber && m.partNumber.toLowerCase().includes(term))
      || (m.printName && m.printName.toLowerCase().includes(term))
      || (m.location && m.location.toLowerCase().includes(term));
  }

  function render(){
    const term = filter.value.trim().toLowerCase();
    body.innerHTML = "";
    let shown = 0;
    (window.catalog || []).forEach(m => {
      if (!matches(m, term)) return;
      body.appendChild(row(m));
      shown++;
    });
    count.textContent = `${shown} items`;
  }

  filter.addEventListener("input", render);
  render();
})();