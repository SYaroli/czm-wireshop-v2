// czm-wireshop-v2-frontend/scripts/part.js
(function(){
  var API=(window.API_BASE||"https://czm-wireshop-v2-backend.onrender.com").replace(/\/+$/,"");
  var qs=new URLSearchParams(location.search), pn=(qs.get("pn")||"").trim();
  var $=function(id){return document.getElementById(id);};
  var title=$("part-title"), alertBox=$("part-alert"), view=$("part-view");
  function err(m){alertBox.textContent=m; alertBox.style.display="block";}
  function normPN(x){return String(x||"").toUpperCase().replace(/[^A-Z0-9]/g,"");}
  function jget(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}
  function jpost(u,b){return fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})
                       .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();});}

  function findRow(list,pnWanted){
    var want=normPN(pnWanted);
    for(var i=0;i<list.length;i++){
      var r=list[i];
      var pnKey=r.pn!=null?"pn":(r["Part Number"]!=null?"Part Number":(r.part_number!=null?"part_number":null));
      if(!pnKey) continue;
      if(normPN(r[pnKey])===want) return { 
        pn:r[pnKey],
        name:r.print_name||r["Print Name"]||r.name||"",
        location:r.location||r.bin||"",
        expected_hours:Number(r.expected_hours||0)||0,
        notes:r.notes||"",
        qty:Number(r.qty||0)||0
      };
    }
    return null;
  }

  function render(p){
    title.textContent="Part • "+p.pn;
    view.innerHTML=
      '<div class="ws-grid ws-grid--2col">'
      +'<div class="ws-field"><div class="ws-label">Part Number</div><div class="ws-value">'+p.pn+'</div></div>'
      +'<div class="ws-field"><div class="ws-label">Print Name</div><div class="ws-value">'+(p.name||"—")+'</div></div>'
      +'<div class="ws-field"><div class="ws-label">Location</div><div class="ws-value">'+(p.location||"—")+'</div></div>'
      +'<div class="ws-field"><div class="ws-label">Expected Hours</div><div class="ws-value">'+p.expected_hours+'</div></div>'
      +'<div class="ws-field ws-col-2"><div class="ws-label">Notes</div><div class="ws-value">'+(p.notes||"")+'</div></div>'
      +'<div class="ws-field"><div class="ws-label">Quantity</div><div class="ws-value" id="qty">'+p.qty
      +'</div><div class="ws-actions"><button id="minus" class="ws-btn ws-btn--danger">-</button>'
      +'<button id="plus" class="ws-btn ws-btn--primary">+</button></div></div></div>'
      +'<div id="logs" class="ws-card" style="margin-top:12px;padding:12px;"></div>';

    $("minus").onclick=function(){ jpost(API+'/api/inventory/'+encodeURIComponent(p.pn)+'/adjust',{delta:-1,source:'ui'})
      .then(function(r){$("qty").textContent=r.qty; loadLogs(p.pn);}).catch(function(e){err("Adjust failed: "+e.message);}); };
    $("plus").onclick=function(){ jpost(API+'/api/inventory/'+encodeURIComponent(p.pn)+'/adjust',{delta:1,source:'ui'})
      .then(function(r){$("qty").textContent=r.qty; loadLogs(p.pn);}).catch(function(e){err("Adjust failed: "+e.message);}); };
  }

  function loadLogs(pn){
    jget(API+'/api/inventory/'+encodeURIComponent(pn)+'/logs')
      .then(function(r){
        var rows=(r.logs||[]).map(function(l){
          return '<div class="ws-row"><span>'+l.ts+'</span><span>'+l.source+'</span><span>'+(l.delta>0?'+':'')+l.delta+'</span></div>';
        }).join("");
        $("logs").innerHTML='<div class="ws-label" style="margin-bottom:6px;">Recent Inventory Activity</div>'+rows;
      }).catch(function(){});
  }

  if(!pn){err("Missing pn"); return;}
  jget(API+'/api/inventory').then(function(list){
    var part=findRow(list,pn);
    if(!part){err("404: part not in inventory"); return;}
    render(part); loadLogs(part.pn);
  }).catch(function(e){err("Load failed: "+e.message);});
})();
