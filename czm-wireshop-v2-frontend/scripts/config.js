// scripts/config.js
// Route relative fetches to the backend and force credentials off (CORS-safe).
window.API_BASE = "https://czm-wireshop-v2-backend.onrender.com";

const _fetch = window.fetch.bind(window);

function toBackend(url) {
  return window.API_BASE.replace(/\/+$/, "") + url;
}

window.fetch = async (input, init = {}) => {
  // Always strip credentials to avoid CORS wildcard errors
  const cleanInit = { ...init, credentials: "omit" };

  if (typeof input === "string" && input.startsWith("/")) {
    // Try both with and without /api so we match whatever the backend exposes
    const candidates = input.startsWith("/api/")
      ? [input, input.replace(/^\/api/, "")]
      : [input, "/api" + input];

    let last;
    for (const p of candidates) {
      try {
        const res = await _fetch(toBackend(p), cleanInit);
        if (res.ok) return res;
        last = res;
      } catch (e) {
        last = e;
      }
    }
    if (last instanceof Response) return last;
    throw last;
  }

  // Absolute URLs or Requests: just pass through, but enforce credentials: "omit"
  return _fetch(input, cleanInit);
};

console.log("API_BASE active (no-credentials):", window.API_BASE);
