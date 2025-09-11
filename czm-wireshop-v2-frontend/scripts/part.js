// scripts/part.js — resilient loader that tries multiple API shapes
(function () {
  const qs = new URLSearchParams(location.search);
  const pn = qs.get("pn") || "";
  const $ = (id) => document.getElementById(id);
  const show = (id, v = true) => ($(id).style.display = v ? "" : "none");

  // Render helpers
  function setPart(p) {
    $("title").textContent = `Part • ${pn}`;
    $("pn").textContent = pn;
    $("name").textContent =
      p.printName || p.name || p.print_name || p.description || "(unnamed)";
    $("loc").textContent = p.location ?? p.loc ?? p.bin ?? "?";
    $("qty").textContent = p.qty ?? p.quantity ?? p.onhand ?? 0;
    show("loading", false);
    show("details", true);
  }
  function apiFetch(path, init) {
    return fetch(path, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      ...init,
    });
  }

  // Try endpoints until one succeeds
  async function getPart(pn) {
    const encoded = encodeURIComponent(pn);
    const candidates = [
      `/api/parts/${encoded}`,
      `/api/part/${encoded}`,
      `/api/inventory/${encoded}`,
      `/api/parts?pn=${encoded}`,
      `/api/part?pn=${encoded}`,
      `/api/inventory?pn=${encoded}`,
    ];

    let lastErr = null;
    for (const url of candidates) {
      try {
        const res = await apiFetch(url);
        if (!res.ok) {
          lastErr = `${res.status} ${res.statusText} @ ${url}`;
          continue;
        }
        const data = await res.json();

        // Accept object, or array with first matching by pn
        if (Array.isArray(data)) {
          const found =
            data.find(
              (x) =>
                String(x.partNumber || x.part || x.pn || x.part_no || "")
                  .trim()
                  .toLowerCase() === pn.trim().toLowerCase()
            ) || data[0];
          return found || null;
        }
        return data || null;
      } catch (e) {
        lastErr = `${e.message} @ ${url}`;
      }
    }
    throw new Error(lastErr || "No matching API");
  }

  async function main() {
    if (!pn) {
      show("loading", false);
      $("error").textContent = "Missing part number (?pn=...)";
      show("error", true);
      return;
    }

    try {
      const part = await getPart(pn);
      if (!part) throw new Error("Part not found");
      setPart(part);

      // Optional adjust handler; will try common endpoints
      $("apply").onclick = async () => {
        const delta = parseInt($("adj").value, 10) || 0;
        const encoded = encodeURIComponent(pn);
        const adjustCandidates = [
          `/api/parts/${encoded}/adjust`,
          `/api/part/${encoded}/adjust`,
          `/api/inventory/${encoded}/adjust`,
          `/api/adjust/${encoded}`,
        ];
        let ok = false;
        for (const url of adjustCandidates) {
          try {
            const up = await apiFetch(url, {
              method: "POST",
              body: JSON.stringify({ delta }),
            });
            if (!up.ok) continue;
            const fresh = await up.json();
            $("qty").textContent = fresh.qty ?? fresh.newQty ?? fresh.quantity ?? "?";
            $("adj").value = "0";
            ok = true;
            break;
          } catch {}
        }
        if (!ok) {
          $("error").textContent = "Adjust failed: no handler found";
          show("error", true);
        }
      };
    } catch (e) {
      show("loading", false);
      $("title").textContent = `Part • ${pn}`;
      $("pn").textContent = pn;
      $("error").textContent = `Load failed: ${e.message}`;
      show("error", true);
    }
  }

  // Inject minimal DOM if you’re using this file standalone
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
            <div style="margin-top:16px">
              <label for="adj" style="color:#9aa0a6">Adjust qty:</label>
              <input id="adj" type="number" step="1" value="0" style="width:100px" />
              <button id="apply">Apply</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  main();
})();
