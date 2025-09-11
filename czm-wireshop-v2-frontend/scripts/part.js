// scripts/part.js — robust loader: try /api/parts then /api/inventory, pick the match.

(function () {
  const qs = new URLSearchParams(location.search);
  const pn = (qs.get("pn") || "").trim();

  const $ = (id) => document.getElementById(id);
  const show = (id, v = true) => ($(id).style.display = v ? "" : "none");
  const norm = (s) => String(s || "").replace(/[^\w]/g, "").toLowerCase(); // strip dots/spaces
  const key = norm(pn);

  async function getJSON(url) {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.json();
  }

  async function load() {
    $("title") && ($("title").textContent = `Part • ${pn}`);
    $("pn") && ($("pn").textContent = pn);

    if (!pn) {
      show("loading", false);
      $("error").textContent = "Missing part number (?pn=...)";
      show("error", true);
      return;
    }

    try {
      // Try canonical lists in order; whichever exists will return 200
      let list = null, lastErr = null;
      for (const path of ["/api/parts", "/api/inventory", "/parts", "/inventory"]) {
        try {
          list = await getJSON(path);
          if (Array.isArray(list)) break;
          list = null;
        } catch (e) { lastErr = e; }
      }
      if (!Array.isArray(list)) throw lastErr || new Error("No list endpoint found");

      const item =
        list.find((x) => {
          const candidates = [
            x.partNumber, x.part_number, x.part, x.pn, x.partNo, x.part_no
          ];
          return candidates.some((c) => norm(c) === key);
        }) || null;

      if (!item) throw new Error("Part not found in list");

      // Fill UI
      $("name") && ($("name").textContent =
        item.printName || item.print_name || item.name || "(unnamed)");
      $("loc") && ($("loc").textContent = item.location ?? item.loc ?? "?");
      $("qty") && ($("qty").textContent = item.qty ?? item.quantity ?? 0);

      show("loading", false);
      show("details", true);

      // Hide adjust until we wire an exact endpoint
      const adjWrap = document.getElementById("adjustWrap");
      if (adjWrap) adjWrap.style.display = "none";
    } catch (e) {
      show("loading", false);
      $("error").textContent = `Load failed: ${e.message}`;
      show("error", true);
    }
  }

  // Minimal DOM shell if page is bare
  if (!document.getElementById("details")) {
    document.body.innerHTML = `
      <div class="page" style="max-width:980px;margin:40px auto;padding:24px">
        <h2 id="title">Part</h2>
        <div class="card" style="background:#0f1115;border:1px solid #222;border-radius:14px;padding:20px">
          <div id="loading" style="color:#9aa0a6">Loading…</div>
          <div id="error" style="display:none;color:#ff7b7b;margin-top:12px"></div>
          <div id="details" style="display:none">
            <div style="display:flex;gap:16px;flex-wrap:wrap">
              <div><strong>Part #:</strong> <span id="pn"></span></div>
              <div><strong>Name:</strong> <span id="name"></span></div>
              <div><strong>Location:</strong> <span id="loc"></span></div>
              <div><strong>Qty:</strong> <span id="qty"></span></div>
            </div>
            <div id="adjustWrap" style="margin-top:16px">
              <label for="adj" style="color:#9aa0a6">Adjust qty:</label>
              <input id="adj" type="number" step="1" value="0" style="width:100px" />
              <button id="apply" disabled title="Adjust disabled on this view">Apply</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  load();
})();
