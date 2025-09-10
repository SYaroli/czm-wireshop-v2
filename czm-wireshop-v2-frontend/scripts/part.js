(function(){
  const LOG_KEY = "ws.logs";
  function loadLogs(){ try{return JSON.parse(localStorage.getItem(LOG_KEY) || "{}");}catch{ return {}; } }
  function qp(name){ const u = new URL(location.href); return u.searchParams.get(name) || ""; }

  const pn = qp("pn");
  const item = (window.catalog || []).find(m => m.partNumber === pn) || { partNumber: pn };

  // Title and detail fields
  document.getElementById("title").textContent = `Inventory — ${item.partNumber || pn}`;
  document.getElementById("pn").textContent = item.partNumber || pn;
  document.getElementById("printName").textContent = item.printName || "";
  document.getElementById("location").textContent = item.location || "";
  const expected = item.expectedHours ?? item.expected ?? item.expected_time ?? item.hours ?? "";
  document.getElementById("expected").textContent = expected === "" ? "" : expected;
  const notes = item.notes ?? item.note ?? "";
  document.getElementById("notes").textContent = notes;

  // Logs table
  const logs = loadLogs()[pn] || [];
  const body = document.getElementById("logBody");
  body.innerHTML = "";
  logs.sort((a,b)=>a.t-b.t).forEach(l => {
    const tr = document.createElement("tr");
    const dt = new Date(l.t);
    tr.innerHTML = `
      <td>${dt.toLocaleString()}</td>
      <td>${(l.by || "").split(".")[0]}</td>
      <td>${l.d > 0 ? "+"+l.d : l.d}</td>
      <td>${l.qty}</td>
    `;
    body.appendChild(tr);
  });
})();