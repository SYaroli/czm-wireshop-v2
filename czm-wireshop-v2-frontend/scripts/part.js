// scripts/part.js
(function () {
  const qs = new URLSearchParams(window.location.search);
  const part = qs.get("pn");

  const el = (id) => document.getElementById(id);
  const show = (id, v=true) => (el(id).style.display = v ? "" : "none");

  function api(path, init) {
    // Works with your existing relative fetch setup: '/api/...'
    return fetch(path, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      ...init,
    });
  }

  async function load() {
    if (!part) {
      show("loading", false);
      el("error").textContent = "Missing part number (?pn=...)";
      show("error", true);
      return;
    }
    el("title").textContent = `Part • ${part}`;
    el("pn").textContent = part;

    try {
      // Adjust this endpoint only if your backend differs
      const res = await api(`/api/parts/${encodeURIComponent(part)}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const item = data || {};
      el("name").textContent = item.printName || item.name || "(unnamed)";
      el("loc").textContent = item.location ?? "?";
      el("qty").textContent = item.qty ?? 0;

      show("loading", false);
      show("details", true);

      // Hook up adjust button
      el("apply").onclick = async () => {
        const delta = parseInt(el("adj").value, 10) || 0;
        try {
          const up = await api(`/api/parts/${encodeURIComponent(part)}/adjust`, {
            method: "POST",
            body: JSON.stringify({ delta }),
          });
          if (!up.ok) throw new Error(`Adjust ${up.status}`);
          const fresh = await up.json();
          el("qty").textContent = fresh.qty ?? fresh.newQty ?? "?";
          el("adj").value = "0";
        } catch (e) {
          el("error").textContent = `Adjust failed: ${e.message}`;
          show("error", true);
        }
      };
    } catch (e) {
      show("loading", false);
      el("error").textContent = `Load failed: ${e.message}`;
      show("error", true);
    }
  }

  load();
})();
