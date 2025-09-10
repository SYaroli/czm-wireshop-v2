(function(){
  const SESSION_KEY = "ws.session";
  function getSession(){ try{return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");}catch{ return null; } }
  function setSession(s){ localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  const loginForm = document.getElementById("loginForm");
  if (loginForm){
    loginForm.addEventListener("submit", (e)=>{
      e.preventDefault();
      const u = document.getElementById("username").value.trim();
      const p = document.getElementById("pin").value.trim();
      const msg = document.getElementById("loginMsg");
      const user = (window.users || []).find(x => x.username === u && x.pin === p);
      if (!user){ msg.textContent = "Invalid username or PIN."; return; }
      setSession({ username: user.username, role: user.role, when: Date.now() });
      location.href = "./inventory.html";
    });
  }

  const who = document.getElementById("who");
  const logoutBtn = document.getElementById("logoutBtn");
  if (who && logoutBtn){
    const s = getSession();
    if (!s){ location.href = "./index.html"; return; }
    who.textContent = s.username + " • " + s.role;
    logoutBtn.onclick = () => { clearSession(); location.href = "./index.html"; };
  }

  window.sessionAPI = { getSession, setSession, clearSession };
})();