// ---- CONFIG: change to your institution's email domain ----
const DOMAIN = "college.edu";
const KEY = "lostly_", DAY = 864e5, PER = 9;
const store = {
  get(k, d){ try { const v = localStorage.getItem(KEY+k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(KEY+k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(KEY+k); } catch(e){} }
};
let session = null, items = [], view = "login", openId = null, chatWith = null, captcha = false, imgData = "", lastTotal = 0, slide = 0;
const FRESH = () => ({types:{lost:true, found:true}, when:"all", from:"", to:"", q:"", sort:"new", page:1});
let filter = FRESH();
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today = () => new Date().toISOString().slice(0,10);
const validEmail = e => new RegExp("^[^\\s@]+@" + DOMAIN.replace(/\./g,"\\.") + "$","i").test(e.trim());
const nm = e => { const n = String(e).split("@")[0]; return n.charAt(0).toUpperCase() + n.slice(1); };
const T = () => store.get("threads", {});
const REQ = `<i class="req" title="Required">*</i>`;

function init(){
  const s = store.get("session", null);
  if (s && s.exp > Date.now()) session = s;
  items = store.get("items_v3", null);
  if (!items) {
    const d = n => new Date(Date.now() - n*DAY).toISOString().slice(0,10), u = n => n + "@" + DOMAIN;
    items = [
      {id:1,type:"lost",name:"Blue water bottle",date:d(0),place:"Library, 2nd floor",emo:"💧",by:u("riya")},
      {id:2,type:"found",name:"Black calculator",date:d(1),place:"Canteen counter",emo:"🧮",by:u("arjun")},
      {id:3,type:"lost",name:"Hostel room keys",date:d(3),place:"Main ground",emo:"🔑",by:u("sana")},
      {id:4,type:"found",name:"Wireless earbuds",date:d(5),place:"Lecture hall B",emo:"🎧",by:u("kabir")},
      {id:5,type:"lost",name:"Physics notebook",date:d(8),place:"Block C corridor",emo:"📚",by:u("meera")},
      {id:6,type:"found",name:"Grey hoodie",date:d(12),place:"Sports complex",emo:"🧥",by:u("dev")},
      {id:7,type:"lost",name:"Student ID card",date:d(2),place:"Bus stop",emo:"💳",by:u("ana")},
      {id:8,type:"found",name:"Spectacles in case",date:d(4),place:"Seminar hall",emo:"👓",by:u("ishaan")},
      {id:9,type:"lost",name:"Black backpack",date:d(6),place:"Parking area",emo:"🎒",by:u("zoya")},
      {id:10,type:"found",name:"Torch",date:d(9),place:"Hostel gate",emo:"🔦",by:u("nikhil")}
    ];
    store.set("items_v3", items);
    store.set("threads", {["1|" + u("arjun")]:{item:1,asker:u("arjun"),msgs:[{from:u("arjun"),text:"Hi! I think I saw a blue bottle near the library desk.",t:Date.now()}]}});
  }
  view = session ? "home" : "login";
  render();
  setInterval(poll, 1500);
  setInterval(() => { if ($("#cph")) { slide = (slide + 1) % 3; drawSlide(); } }, 3500);
}
function login(email, remember){
  session = {email: email.trim().toLowerCase(), exp: Date.now() + (remember ? DAY : 2*36e5)};
  store.set("session", session); lastTotal = 0; go("home");
}
function logout(){ session = null; store.del("session"); captcha = false; chatWith = null; lastTotal = 0; document.title = "Lostly – From missing to managed"; go("login"); }
function go(v){ view = v; render(); window.scrollTo({top:0}); }
function toast(t){ const e = $("#toast"); e.textContent = t; e.classList.add("show"); setTimeout(() => e.classList.remove("show"), 2400); }
function count(el, n){
  if (!el) return; const s = +el.textContent || 0, t0 = performance.now();
  (function f(t){ const k = Math.min(1, (t - t0) / 600); el.textContent = Math.round(s + (n - s) * k); if (k < 1) requestAnimationFrame(f); })(t0);
}
const SLIDES = [["Lost something on campus?","Post it in 30 seconds and let your campus help you find it."],["Found something?","Report it and chat privately with the person who lost it."],["From missing to managed.","One simple place for every lost and found item."]];
function drawSlide(){
  const h = $("#cph"); if (!h) return;
  h.textContent = SLIDES[slide][0]; $("#cpp").textContent = SLIDES[slide][1];
  document.querySelectorAll(".dots i").forEach((d, i) => d.classList.toggle("on", i === slide));
}

/* ---------- rendering ---------- */
const views = {login:loginView, home:homeView, lost:() => formView("lost"), found:() => formView("found"), db:dbView, item:itemView};
function render(){
  renderTop();
  const a = $("#app"); a.className = view === "login" ? "bare" : "pad"; document.body.classList.toggle("onepage", view === "home");
  a.innerHTML = `<div class="page">${views[view] ? views[view]() : ""}</div>`;
  if (view === "db") drawGrid();
  if (view === "login") drawSlide();
  if (view === "home") { count($("#nl"), items.filter(i => i.type === "lost").length); count($("#nf"), items.filter(i => i.type === "found").length); }
  if (view === "item" && chatWith) drawChat(true);
  notif();
}
function renderTop(){
  const t = $("#top");
  if (!session || view === "login") { t.innerHTML = ""; return; }
  t.innerHTML = `<header class="hdr"><div class="logo" data-go="home">Lost<span>ly</span></div><div class="cell">From missing<br>to managed</div><div class="cell">${esc(session.email)}</div>
  <div class="tools"><div class="bellw"><button class="round" id="bell" aria-label="Chat notifications">🔔<i id="badge" class="badge hide">0</i></button><div class="dd hide" id="dd"></div></div>
  <button class="round" id="out" title="Log out" aria-label="Log out">⎋</button></div></header>`;
}
const fl = (e, l, t, d) => `<span class="fl" style="left:${l}%;top:${t}%;--d:${d}s">${e}</span>`;
function loginView(){
  return `<div class="split"><div class="lside">${fl("🔑",10,12,0)}${fl("🎧",78,10,.6)}${fl("📚",14,52,1.1)}${fl("🧥",80,48,.3)}${fl("🎒",46,6,.9)}${fl("💳",24,30,1.6)}${fl("🔦",68,30,1.3)}
    <div class="orb"><span>🔍</span></div><h2 id="cph"></h2><p id="cpp"></p><div class="dots"><i></i><i></i><i></i></div></div>
  <div class="rside"><div class="fwrap"><div style="text-align:center"><div class="logo biglogo">Lost<span>ly</span></div><p class="tagline">From missing to managed</p></div>
  <h2 class="wel">Welcome to Lostly</h2>
  <div class="field"><label for="em">Institution email ${REQ}</label><input type="email" id="em" autocomplete="email" placeholder="you@${DOMAIN}"></div>
  <div class="field"><label for="pw">Password ${REQ}</label><input type="password" id="pw" autocomplete="current-password"></div>
  <div class="capt ${captcha ? "ok" : ""}" id="cap"><div class="box">${captcha ? "✓" : ""}</div><span>I'm not a robot ${REQ}</span></div>
  <label class="rem"><input type="checkbox" id="rm"> Remember me</label>
  <div class="err" id="err"></div><button class="pillbtn" id="go">Sign in</button>
  <div class="or">or</div><button class="gbtn" id="goog"><b>G</b> Sign in with Google</button>
  <p class="hint" style="text-align:center"><i class="req">*</i> Required field</p></div></div></div>`;
}
function homeView(){
  const col = (t, i, L, title, p, em, sm) => `<button class="col ${t}" data-go="${t}" style="--i:${i}"><span class="bigl">${L}</span><b>${title}</b><p>${p}</p><small>${sm}</small><span class="ill">${em}</span><span class="arr">→</span></button>`;
  return `<div class="bento">
  <section class="bh">${fl("🔑",74,10,0)}${fl("🎧",88,44,.7)}${fl("📚",64,62,1.2)}${fl("🧥",52,6,.4)}${fl("💳",90,8,1.5)}
    <span class="label">CAMPUS LOST &amp; FOUND</span>
    <h1>Lost something?<br>Found something?<br><i>Let's</i> get it <mark>home.</mark></h1>
    <p class="script">+ reporting &nbsp;+ matching &nbsp;+ returning</p></section>
  <section class="bs"><div class="note">☐ Add a photo<br>☐ Say where<br>☐ Say when</div>
    <div class="stat l"><b id="nl">0</b><span>missing now</span></div><div class="stat f"><b id="nf">0</b><span>found, waiting</span></div>
    <p>Only @${DOMAIN} students see posts. Chat privately when you spot a match.</p></section>
  ${col("lost",0,"M","Missing","Lost something? Post it in 30 seconds.","🔍","Report →")}
  ${col("found",1,"F","Found","Found something? Help it get home.","🎒","Report →")}
  ${col("db",2,"B","Browse","See everything reported so far.","📋","Search &amp; filter →")}
  <footer class="ft"><div><small>REMINDER</small> Be kind. Return what you find.</div><div class="y"><span class="logo">Lost<span>ly</span></span> · From missing to managed</div><div>Only @${DOMAIN} accounts</div></footer></div>`;
}
function formView(t){
  const L = t === "lost";
  return `<div class="posterwrap"><button class="back" data-go="home">← Back</button><div class="poster ${t}"><div class="holes">${"<i></i>".repeat(12)}</div>
  <div class="ribbon">${L ? "MISSING" : "FOUND"}</div><p class="ptag">${L ? "Have you seen this item?" : "Is this yours? Claim it!"}</p>
  <div class="polaroid" id="drop"><span class="tape t1"></span><span class="tape t2"></span><div id="prev">📷 Tap to add a photo ${REQ}</div></div><input type="file" id="file" accept="image/*" class="hide">
  <div class="bub"><label for="nm">Item name ${REQ}</label><input type="text" id="nm" maxlength="60"></div>
  <div class="bub"><label for="dt">${L ? "Last seen on" : "Found on"} ${REQ}</label><input type="date" id="dt" max="${today()}" value="${today()}"></div>
  <div class="bub"><label for="pl">${L ? "Approximate location" : "Found at"} ${REQ}</label><input type="text" id="pl" maxlength="80" placeholder="e.g. Library, Block B"></div>
  <p class="hint" style="text-align:center;margin:10px 0 0"><i class="req">*</i> Required field</p><div class="err" id="err" style="text-align:center"></div>
  <button class="confirm ${t}" id="sub">Confirm</button></div></div>`;
}
function dbView(){
  const f = filter, r = (v, l) => `<label class="chk"><input type="radio" name="when" value="${v}" ${f.when === v ? "checked" : ""}> ${l}</label>`;
  return `<section class="band"><h1>Lost &amp; Found</h1><div class="crumb"><a data-go="home">Home</a> / Browse</div></section>
  <div class="shop"><aside class="side"><h3>Filter Options</h3>
  <div class="grp"><h4>Show items</h4><label class="chk"><input type="checkbox" data-t="lost" ${f.types.lost ? "checked" : ""}> Missing items</label><label class="chk"><input type="checkbox" data-t="found" ${f.types.found ? "checked" : ""}> Found items</label></div>
  <div class="grp"><h4>Date</h4>${r("all","Any date")}${r("today","Today")}${r("week","This week")}${r("month","This month")}${r("custom","Custom range 📅")}
  ${f.when === "custom" ? `<input type="date" id="from" value="${f.from}" aria-label="From"><input type="date" id="to" value="${f.to}" aria-label="To">` : ""}</div>
  <div class="grp"><h4>Search</h4><input id="q" type="text" placeholder="Name or place" value="${esc(f.q)}"></div></aside>
  <section><div class="resbar"><span id="showing"></span><label>Sort by <select id="sort"><option value="new" ${f.sort === "new" ? "selected" : ""}>Newest first</option><option value="old" ${f.sort === "old" ? "selected" : ""}>Oldest first</option></select></label></div>
  <div class="active" id="active"></div><div class="grid" id="grid"></div><div class="pager" id="pager"></div></section></div>`;
}
function inRange(it){
  if (!filter.types[it.type]) return false;
  if (filter.q && !(it.name + " " + it.place).toLowerCase().includes(filter.q.toLowerCase())) return false;
  const d = new Date(it.date + "T00:00:00"), n = new Date(); n.setHours(0,0,0,0);
  if (filter.when === "today") return d.getTime() === n.getTime();
  if (filter.when === "week") return n - d <= 6*DAY && d <= n;
  if (filter.when === "month") return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  if (filter.when === "custom") { if (filter.from && it.date < filter.from) return false; if (filter.to && it.date > filter.to) return false; }
  return true;
}
function art(it){ return it.img ? `<img src="${it.img}" alt="${esc(it.name)}">` : `<span class="emo">${it.emo || (it.type === "lost" ? "🔍" : "🎒")}</span>`; }
function tile(it, i){
  return `<article class="pcard ${it.type}" data-id="${it.id}" style="--i:${i}"><div class="art">${art(it)}<span class="tag">${it.type === "lost" ? "Missing" : "Found"}</span></div>
  <small>${it.type === "lost" ? "Last seen at" : "Found at"} ${esc(it.place)}</small><h3>${esc(it.name)}</h3><span class="d">${esc(it.date)}</span></article>`;
}
function drawGrid(){
  const s = filter.sort === "old" ? -1 : 1;
  const list = items.filter(inRange).sort((a,b) => s * (b.date.localeCompare(a.date) || b.id - a.id));
  const pages = Math.max(1, Math.ceil(list.length / PER)); filter.page = Math.min(filter.page, pages);
  const a = (filter.page-1) * PER, pg = list.slice(a, a + PER);
  $("#grid").innerHTML = pg.map(tile).join("") || `<div class="empty">Nothing here yet.</div>`;
  $("#showing").textContent = list.length ? `Showing ${a+1}-${a+pg.length} of ${list.length} results` : "No results";
  const ch = [];
  if (!(filter.types.lost && filter.types.found)) ch.push(["type", filter.types.lost ? "Missing only" : filter.types.found ? "Found only" : "Nothing selected"]);
  if (filter.when !== "all") ch.push(["when", {today:"Today", week:"This week", month:"This month", custom:"Custom range"}[filter.when]]);
  if (filter.q) ch.push(["q", "“" + esc(filter.q) + "”"]);
  $("#active").innerHTML = ch.length ? `Active filter ${ch.map(c => `<button class="achip" data-x="${c[0]}">${c[1]} ✕</button>`).join("")}<button class="clr" data-x="all">Clear All</button>` : "";
  const nb = (l, p, dis) => `<button class="pg" ${dis ? "disabled" : ""} data-p="${p}">${l}</button>`;
  $("#pager").innerHTML = pages > 1 ? nb("‹", filter.page-1, filter.page === 1) + Array.from({length:pages}, (_, i) => `<button class="pg ${i+1 === filter.page ? "on" : ""}" data-p="${i+1}">${i+1}</button>`).join("") + nb("›", filter.page+1, filter.page === pages) : "";
}
function itemView(){
  const it = items.find(x => x.id === openId); if (!it) return "";
  const L = it.type === "lost", own = it.by === session.email, th = T();
  let side;
  if (own) {
    const ks = Object.keys(th).filter(k => th[k].item === it.id);
    side = `<div class="prompt ${it.type}">This is your report 💬 Conversations</div>` +
      (ks.length ? `<div class="convs">${ks.map(k => `<button class="pill ${chatWith === th[k].asker ? "on" : ""}" data-open="${k}">${esc(nm(th[k].asker))}</button>`).join("")}</div>` : `<p class="hint">No one has messaged you about this yet.</p>`);
  } else {
    side = `<div class="prompt ${it.type}">${L ? "Seen it? Please tell me 💬" : "Is it yours? Send a message to the person 💬"}<div><button class="btn white" id="chatbtn">${L ? "Found my item? Chat" : "Yes, chat now"}</button></div></div>`;
  }
  const peer = own ? chatWith : it.by;
  const chat = chatWith ? `<div class="chat"><div class="chead">Private chat with <b>${esc(nm(peer || ""))}</b></div><div class="msgs" id="msgs"></div>
    <div class="send"><input type="text" id="mi" placeholder="Type a message…" maxlength="300"><button class="btn" id="ms">Send</button></div></div>` : "";
  return `<button class="back" data-go="db">← Back to list</button><div class="detail ${it.type}"><div class="art">${art(it)}<span class="tag">${L ? "Missing" : "Found"}</span></div>
  <div><h2>${esc(it.name)}</h2><div class="meta">${L ? "Last seen on" : "Found on"} <b>${esc(it.date)}</b></div><div class="meta">${L ? "Could be near" : "Found at"} <b>${esc(it.place)}</b></div>${side}${chat}</div></div>`;
}

/* ---------- chat + notifications ---------- */
function threadKey(it){ return it.id + "|" + (it.by === session.email ? chatWith : session.email); }
function drawChat(force){
  const it = items.find(x => x.id === openId), box = $("#msgs"); if (!it || !box || !chatWith) return;
  const k = threadKey(it), th = T()[k], m = th ? th.msgs : [];
  if (force || box.dataset.n != m.length) {
    box.innerHTML = `<div class="m sys">Private chat · only you two can see this</div>` + m.map(x => `<div class="m ${x.from === session.email ? "me" : "them"}">${esc(x.text)}<small>${new Date(x.t).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</small></div>`).join("");
    box.dataset.n = m.length; box.scrollTop = 1e9;
  }
  if (m.length) { const r = store.get("reads_" + session.email, {}); if (r[k] !== m[m.length-1].t) { r[k] = m[m.length-1].t; store.set("reads_" + session.email, r); } }
}
function sendMsg(){
  const it = items.find(x => x.id === openId), i = $("#mi"), v = i.value.trim(); if (!v || !chatWith) return;
  const all = T(), k = threadKey(it), asker = it.by === session.email ? chatWith : session.email;
  (all[k] = all[k] || {item:it.id, asker, msgs:[]}).msgs.push({from:session.email, text:v, t:Date.now()});
  store.set("threads", all); i.value = ""; drawChat(); notif();
}
function unreadList(){
  if (!session) return [];
  const t = T(), r = store.get("reads_" + session.email, {}), out = [];
  for (const k in t) {
    const th = t[k], it = items.find(x => x.id === th.item); if (!it) continue;
    if (th.asker !== session.email && it.by !== session.email) continue;
    const n = th.msgs.filter(m => m.from !== session.email && m.t > (r[k] || 0));
    if (n.length) { const l = n[n.length-1]; out.push({k, from:l.from, text:l.text, item:it.name, n:n.length, t:l.t}); }
  }
  return out.sort((a,b) => b.t - a.t);
}
function notif(){
  const bar = $("#nbar"), u = unreadList(), total = u.reduce((s, x) => s + x.n, 0);
  const b = $("#badge"); if (b) { b.textContent = total; b.classList.toggle("hide", !total); }
  if (!session || view === "login" || !total) bar.classList.add("hide");
  else {
    const x = u[0]; bar.classList.remove("hide");
    bar.innerHTML = `<span class="pulse"></span><span><b>${total} new chat message${total > 1 ? "s" : ""}</b> · ${esc(nm(x.from))} on “${esc(x.item)}”: ${esc(x.text.slice(0,50))}</span><button class="btn" data-open="${esc(x.k)}">Open</button>`;
    if (total > lastTotal) { bar.classList.remove("pop"); void bar.offsetWidth; bar.classList.add("pop"); }
  }
  lastTotal = total;
  document.title = (total ? "(" + total + ") " : "") + "Lostly – From missing to managed";
  const dd = $("#dd"); if (dd) dd.innerHTML = u.length ? u.map(x => `<button class="ddi" data-open="${esc(x.k)}"><b>${esc(nm(x.from))}</b> · ${esc(x.item)}<br><small>${esc(x.text.slice(0,60))}</small><i class="badge">${x.n}</i></button>`).join("") : `<p class="hint" style="padding:8px">No new messages.</p>`;
}
function openThread(k){ const th = T()[k]; if (!th) return; openId = th.item; chatWith = th.asker; go("item"); }
function poll(){
  if (!session) return;
  if (session.exp < Date.now()) return logout();
  if (view === "item") drawChat();
  notif();
}
window.addEventListener("storage", poll);

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const t = e.target, q = s => t.closest(s);
  if (!q("#dd") && !q("#bell")) { const d = $("#dd"); if (d) d.classList.add("hide"); }
  let x;
  if ((x = q("[data-open]"))) return openThread(x.dataset.open);
  if ((x = q("[data-go]"))) { chatWith = null; return go(x.dataset.go); }
  if ((x = q("[data-x]"))) {
    const k = x.dataset.x;
    if (k === "all") filter = FRESH(); else if (k === "type") filter.types = {lost:true, found:true}; else if (k === "when") { filter.when = "all"; filter.from = filter.to = ""; } else filter.q = "";
    filter.page = 1; return render();
  }
  if ((x = q("[data-p]")) && !x.disabled) { filter.page = +x.dataset.p; drawGrid(); return window.scrollTo({top:0, behavior:"smooth"}); }
  if ((x = q(".pcard[data-id]"))) { openId = +x.dataset.id; chatWith = null; return go("item"); }
  if (q("#bell")) return $("#dd").classList.toggle("hide");
  if (q("#out")) return logout();
  if (q("#cap")) { captcha = !captcha; $("#cap").classList.toggle("ok", captcha); $("#cap .box").textContent = captcha ? "✓" : ""; return; }
  if (q("#go")) {
    const em = $("#em").value, pw = $("#pw").value, er = $("#err");
    if (!validEmail(em)) return er.textContent = "Invalid email-id. Use your institution email (@" + DOMAIN + ").";
    if (pw.length < 6) return er.textContent = "Please enter your password (min 6 characters).";
    if (!captcha) return er.textContent = "Please confirm you're not a robot.";
    return login(em, $("#rm").checked);
  }
  if (q("#goog")) {
    const em = prompt("Demo Google sign-in. Enter your Google email:"); if (em === null) return;
    if (!validEmail(em)) return $("#err").textContent = "Invalid email-id. Only @" + DOMAIN + " accounts are allowed.";
    return login(em, $("#rm").checked);
  }
  if (q("#drop")) return $("#file").click();
  if (q("#sub")) {
    const nmv = $("#nm").value.trim(), dt = $("#dt").value, pl = $("#pl").value.trim();
    if (!imgData || !nmv || !dt || !pl) return $("#err").textContent = "Please fill every field marked * (including the photo).";
    items.push({id:Date.now(), type:view, name:nmv, date:dt, place:pl, img:imgData, by:session.email});
    store.set("items_v3", items); imgData = ""; filter = FRESH();
    toast("Posted! Thank you 🎉"); return go("db");
  }
  if (q("#chatbtn")) { chatWith = session.email; render(); const i = $("#mi"); if (i) i.focus(); return; }
  if (q("#ms")) return sendMsg();
});
document.addEventListener("input", e => { if (e.target.id === "q") { filter.q = e.target.value; filter.page = 1; drawGrid(); } });
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.t) { filter.types[el.dataset.t] = el.checked; filter.page = 1; drawGrid(); }
  if (el.name === "when") { filter.when = el.value; filter.page = 1; render(); }
  if (el.id === "sort") { filter.sort = el.value; drawGrid(); }
  if (el.id === "from") { filter.from = el.value; drawGrid(); }
  if (el.id === "to") { filter.to = el.value; drawGrid(); }
  if (el.id === "file" && el.files[0]) {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => {
      const s = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = im.width * s; c.height = im.height * s; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      imgData = c.toDataURL("image/jpeg", .7); $("#prev").innerHTML = `<img src="${imgData}" alt="Preview">`;
    }; im.src = r.result; };
    r.readAsDataURL(el.files[0]);
  }
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  if (e.target.id === "mi") sendMsg();
  if (e.target.id === "pw" || e.target.id === "em") $("#go").click();
});
init();