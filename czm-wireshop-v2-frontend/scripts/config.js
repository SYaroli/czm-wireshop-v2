// scripts/config.js
// Single source of truth for backend
window.API_BASE = "https://czm-wireshop-v2-backend.onrender.com";

// Wrap only network calls (window.fetch), never touches <link>/<img>/etc.
const _fetch = window.fetch.bind(window);

// Try best-effort path variants so the frontend works regardless of /api prefix.
async function fetchWithApiFallback(input, init) {
  if (typeof input !== "string" || !input.startsWith("/")) {
    return _fetch(input, init); // absolute URLs or non-strings untouched
  }

  // Candidate URL builders
  const mk = (p) => window.API_BASE.replace(/\/+$/, "") + p;

  // If caller gave "/api/…", also try without /api; if they gave "/…", also try with /api.
  const paths = [];
  if (input.startsWith("/api/")) {
    paths.push(input, input.replace(/^\/api/, ""));   // "/api/x", "/x"
  } else {
    paths.push(input, "/api" + input);                // "/x", "/api/x"
  }

  let lastErr;
  for (const p of paths) {
    try {
      const res = await _fetch(mk(p), init);
      if (res.ok) return res;
      lastErr = res; // remember to surface the last failure
    } catch (e) {
      lastErr = e;
    }
  }
  // If every variant failed, return the last Response or throw the last Error
  if (lastErr instanceof Response) return lastErr;
  throw lastErr;
}

// Install the wrapper
window.fetch = (input, init) => fetchWithApiFallback(input, init);

console.log("API_BASE active:", window.API_BASE);
