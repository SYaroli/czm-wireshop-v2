// scripts/config.js — route all relative fetches to the backend
window.API_BASE = "https://czm-wireshop-v2-backend.onrender.com";
const _fetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  if (typeof input === "string" && input.startsWith("/"))
    input = window.API_BASE.replace(/\/+$/,"") + input;
  return _fetch(input, init);
};
