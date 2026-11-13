// ---- CONFIG ----
const DOMAIN = "college.edu";                       // your institution's email domain
const ADMIN_EMAIL = "admin@" + DOMAIN, ADMIN_PASS = "admin123"; // LOCAL (VS Code) mode only – change these!
const KEY = "lostly_", DAY = 864e5, PER = 9, KINDS = ["items","msgs","flags","blocked","settings"];
let CB = null, ME = null, session = null, view = "login", openId = null, chatWith = null, captcha = false, imgData = "", lastTotal = 0, slide = 0, atab = "over";
const FRESH = () => ({types:{lost:true, found:true}, when:"all", from:"", to:"", q:"", sort:"new", page:1, mine:false});
let filter = FRESH();
const store = {
  get(k, d){ try { const v = localStorage.getItem(KEY+k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(KEY+k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(KEY+k); } catch(e){} }
};
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today = () => new Date().toISOString().slice(0,10);
const validEmail = e => new RegExp("^[^\\s@]+@" + DOMAIN.replace(/\./g,"\\.") + "$","i").test(String(e).trim());
const nm = e => { const n = String(e).split("@")[0]; return n.charAt(0).toUpperCase() + n.slice(1); };
const REQ = `<i class="req" title="Required">*</i>`;
const ekey = e => String(e).toLowerCase().replace(/[^a-z0-9@._-]/g, "_");

/* ---------- data layer: shared database when published, localStorage in VS Code ---------- */
const cache = {items:{}, msgs:{}, flags:{}, blocked:{}, settings:{}};
const L = k => Object.values(cache[k]);
function persist(k, id, o){
  if (CB) { const r = CB.collection(k).doc(String(id)); (o ? r.set(JSON.parse(JSON.stringify(o))) : r.delete()).catch(() => toast("Could not save – you may only have view access.")); }
  else store.set("c_" + k, cache[k]);
}
function put(k, id, o){ cache[k][id] = o; persist(k, id, o); }
function del(k, id){ delete cache[k][id]; persist(k, id, null); }
const setting = (k, d) => (cache.settings.main && cache.settings.main[k] !== undefined) ? cache.settings.main[k] : d;
const isBlocked = e => !!cache.blocked[ekey(e)];
const archived = it => it.status === "open" && (Date.now() - new Date(it.date + "T00:00:00")) > setting("archiveDays", 60) * DAY;
const live = it => it.status === "open" && !archived(it);
function threads(){
  const t = {};
  for (const m of L("msgs")) (t[m.thread] = t[m.thread] || {key:m.thread, item:m.item, asker:m.asker, msgs:[]}).msgs.push(m);
  for (const k in t) t[k].msgs.sort((a,b) => a.t - b.t);
  return t;
}
function loadLocal(){
  KINDS.forEach(k => cache[k] = store.get("c_" + k, {}));
  if (store.get("seeded4", 0)) return;
  const d = n => new Date(Date.now() - n*DAY).toISOString().slice(0,10), u = n => n + "@" + DOMAIN;
  [{id:1,type:"lost",name:"Blue water bottle",date:d(0),place:"Library, 2nd floor",emo:"💧",by:u("riya")},
   {id:2,type:"found",name:"Black calculator",date:d(1),place:"Canteen counter",emo:"🧮",by:u("arjun"),q:"Which brand is it?"},
   {id:3,type:"lost",name:"Hostel room keys",date:d(3),place:"Main ground",emo:"🔑",by:u("sana")},
   {id:4,type:"found",name:"Wireless earbuds",date:d(5),place:"Lecture hall B",emo:"🎧",by:u("kabir"),q:"What colour is the case?"},
   {id:5,type:"lost",name:"Physics notebook",date:d(8),place:"Block C corridor",emo:"📚",by:u("meera")},
   {id:6,type:"found",name:"Grey hoodie",date:d(12),place:"Sports complex",emo:"🧥",by:u("dev"),q:"Any logo on it?"},
   {id:7,type:"lost",name:"Student ID card",date:d(2),place:"Bus stop",emo:"💳",by:u("ana")},
   {id:8,type:"found",name:"Spectacles in case",date:d(4),place:"Seminar hall",emo:"👓",by:u("ishaan"),q:"What is the frame colour?"}]
  .forEach((x, i) => put("items", x.id, {...x, status:"open", t:Date.now() - i*36e5}));
  put("msgs", "1_arjun_seed", {id:"1_arjun_seed", thread:"1_" + u("arjun"), item:1, asker:u("arjun"), from:u("arjun"), text:"Hi! I think I saw a blue bottle near the library desk.", t:Date.now()});
  store.set("seeded4", 1);
}
async function init(){
  $("#app").innerHTML = `<div class="empty" style="padding:40vh 0">Loading…</div>`;
  if (window.claude) { try { const [d, u] = await Promise.all([claude.use("db"), claude.use("user")]); if (d && u) { CB = d; ME = await u.me(); } } catch(e){} }
  if (CB) KINDS.forEach(k => CB.collection(k).onSnapshot(sn => { cache[k] = Object.fromEntries(sn.docs.map(d => [d.id, d.data()])); onData(); }, () => toast("Database unavailable")));
  else { loadLocal(); const s = store.get("session", null); if (s && s.exp > Date.now()) session = s; }
  view = session ? (session.admin ? "admin" : "home") : "login";
  render(); setInterval(poll, 1500); setInterval(() => { if ($("#cph")) { slide = (slide + 1) % 3; drawSlide(); } }, 3500);
}
function onData(){
  if (!session) return;
  if (view === "db") drawGrid(); else if (view === "home") homeLive();
  else if (view === "admin" && atab !== "set") render();
  else if (view === "item") { if (!cache.items[openId]) return go("db"); drawChat(); }
  notif();
}
function startSession(email, admin, remember){
  if (!admin && isBlocked(email)) return fail("This account has been restricted by an admin.");
  session = {email: email.trim().toLowerCase(), admin, exp: Date.now() + (remember ? DAY : 2*36e5)};
  if (!CB) store.set("session", session);
  lastTotal = 0; go(admin ? "admin" : "home");
}
function logout(){ session = null; store.del("session"); captcha = false; chatWith = null; lastTotal = 0; document.title = "Lostly – From missing to managed"; go("login"); }
function go(v){ view = v; render(); window.scrollTo({top:0}); }
function fail(m){ const e = $("#err"); if (e) e.textContent = m; }
function toast(t){ const e = $("#toast"); e.textContent = t; e.classList.add("show"); setTimeout(() => e.classList.remove("show"), 2600); }
function count(el, n){
  if (!el) return; const s = +el.textContent || 0, t0 = performance.now();
  (function f(t){ const k = Math.min(1, (t - t0) / 600); el.textContent = Math.round(s + (n - s) * k); if (k < 1) requestAnimationFrame(f); })(t0);
}
const SLIDES = [["Lost something on campus?","Post it in 30 seconds and let your campus help you find it."],["Found something?","Report it and chat privately with the person who lost it."],["From missing to managed.","One simple place for every lost and found item."]];
function drawSlide(){ const h = $("#cph"); if (!h) return; h.textContent = SLIDES[slide][0]; $("#cpp").textContent = SLIDES[slide][1]; document.querySelectorAll(".dots i").forEach((d, i) => d.classList.toggle("on", i === slide)); }

/* ---------- rendering ---------- */
const views = {login:loginView, home:homeView, lost:() => formView("lost"), found:() => formView("found"), db:dbView, item:itemView, admin:adminView};
function render(){
  renderTop();
  const a = $("#app"); a.className = view === "login" ? "bare" : "pad"; document.body.classList.toggle("onepage", view === "home");
  a.innerHTML = `<div class="page">${views[view] ? views[view]() : ""}</div>`;
  if (view === "db") drawGrid(); if (view === "login") drawSlide(); if (view === "home") homeLive();
  if (view === "item" && chatWith) drawChat(true);
  notif();
}
function renderTop(){
  const t = $("#top");
  if (!session || view === "login") { t.innerHTML = ""; return; }
  t.innerHTML = `<header class="hdr"><div class="logo" data-go="home">Lost<span>ly</span></div><div class="cell">From missing<br>to managed</div><div class="cell">${esc(session.email)}</div>
  ${session.admin ? `<div class="cell"><button class="pill on" data-go="admin">⚙ Admin panel</button></div>` : ""}
  <div class="tools"><div class="bellw"><button class="round" id="bell" aria-label="Chat notifications">🔔<i id="badge" class="badge hide">0</i></button><div class="dd hide" id="dd"></div></div>
  <button class="round" id="out" title="Log out" aria-label="Log out">⎋</button></div></header>`;
}
const fl = (e, l, t, d) => `<span class="fl" style="left:${l}%;top:${t}%;--d:${d}s">${e}</span>`;
function loginView(){
  const form = CB ? `<p class="hint" style="text-align:center;margin:18px 0">Verified sign-in through your Claude account – no password or captcha needed.</p>
    <button class="pillbtn" id="cont">Continue as ${esc(ME.name || "you")}<br><small>${esc(ME.email || "")}</small></button><div class="err" id="err" style="text-align:center"></div>`
  : `<div class="field"><label for="em">Institution email ${REQ}</label><input type="email" id="em" autocomplete="email" placeholder="you@${DOMAIN}"></div>
  <div class="field"><label for="pw">Password ${REQ}</label><input type="password" id="pw" autocomplete="current-password"></div>
  <div class="capt ${captcha ? "ok" : ""}" id="cap"><div class="box">${captcha ? "✓" : ""}</div><span>I'm not a robot ${REQ}</span></div>
  <label class="rem"><input type="checkbox" id="rm"> Remember me</label>
  <div class="err" id="err"></div><button class="pillbtn" id="go">Sign in</button>
  <div class="or">or</div><button class="gbtn" id="goog"><b>G</b> Sign in with Google</button>
  <p class="hint" style="text-align:center"><i class="req">*</i> Required field</p>`;
  return `<div class="split"><div class="lside">${fl("🔑",10,12,0)}${fl("🎧",78,10,.6)}${fl("📚",14,52,1.1)}${fl("🧥",80,48,.3)}${fl("🎒",46,6,.9)}${fl("💳",24,30,1.6)}${fl("🔦",68,30,1.3)}
    <div class="orb"><span>🔍</span></div><h2 id="cph"></h2><p id="cpp"></p><div class="dots"><i></i><i></i><i></i></div></div>
  <div class="rside"><div class="fwrap"><div style="text-align:center"><div class="logo biglogo">Lost<span>ly</span></div><p class="tagline">From missing to managed</p></div>
  <h2 class="wel">Welcome to Lostly</h2>${form}
  <button class="gbtn" id="adm" style="margin-top:6px">🔐 Admin sign in</button></div></div></div>`;
}
function homeView(){
  const col = (t, i, Lt, title, p, em, sm) => `<button class="col ${t}" data-go="${t}" style="--i:${i}"><span class="bigl">${Lt}</span><b>${title}</b><p>${p}</p><small>${sm}</small><span class="ill">${em}</span></button>`;
  return `<div class="bento">
  <section class="bh">${fl("🔑",74,10,0)}${fl("🎧",88,44,.7)}${fl("📚",64,62,1.2)}${fl("🧥",52,6,.4)}
    <span class="label">CAMPUS LOST &amp; FOUND</span>
    <h1>Lost something?<br>Found something?<br><i>Let's</i> get it <mark>home.</mark></h1><p class="script">+ reporting &nbsp;+ matching &nbsp;+ returning</p></section>
  <section class="bs"><div class="stat l"><b id="nl">0</b><span>missing now</span></div><div class="stat f"><b id="nf">0</b><span>found, waiting</span></div><div class="stat r"><b id="nr">0</b><span>returned ✓</span></div><p id="notice"></p></section>
  ${col("lost",0,"M","Missing","Lost something? Post it in 30 seconds.","🔍","Report →")}${col("found",1,"F","Found","Found something? Help it get home.","🎒","Report →")}${col("db",2,"B","Browse","See everything reported so far.","📋","Search &amp; filter →")}
  <section class="recent"><h4>Recently reported</h4><div class="rs" id="rs"></div></section>
  <section class="mine"><h4>My activity</h4><div id="mine"></div></section>
  <footer class="ft"><div><small>REMINDER</small> Be kind. Never share ID numbers or OTPs.</div><div class="y"><span class="logo">Lost<span>ly</span></span> · From missing to managed</div><div>Only @${DOMAIN} accounts</div></footer></div>`;
}
function homeLive(){
  if (view !== "home" || !$("#rs")) return;
  const all = L("items"), li = all.filter(live), mine = all.filter(i => i.by === session.email), un = unreadList().reduce((s, x) => s + x.n, 0);
  count($("#nl"), li.filter(i => i.type === "lost").length); count($("#nf"), li.filter(i => i.type === "found").length); count($("#nr"), all.filter(i => i.status === "returned").length);
  const n = setting("notice", ""); $("#notice").innerHTML = n ? "📢 " + esc(n) : `Only @${DOMAIN} students see posts. Chat privately when you spot a match.`;
  const rs = li.sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 6);
  $("#rs").innerHTML = rs.length ? rs.map(i => `<button class="mini ${i.type}" data-item="${i.id}" title="${esc(i.name)}"><span class="mt">${i.img ? `<img src="${i.img}" alt="">` : (i.emo || "📦")}</span><b>${esc(i.name)}</b></button>`).join("") : `<span class="hint">Nothing reported yet – be the first!</span>`;
  $("#mine").innerHTML = `<div class="mrow"><span><b>${mine.filter(i => i.status === "open").length}</b> open</span><span><b>${mine.filter(i => i.status === "returned").length}</b> returned</span><button class="chipb" id="mchat"><b>${un}</b> unread chats</button></div><button class="sm" data-mine>My reports →</button>`;
}
function formView(t){
  const Lt = t === "lost";
  return `<div class="posterwrap"><button class="back" data-go="home">← Back</button><div class="poster ${t}"><div class="holes">${"<i></i>".repeat(12)}</div>
  <div class="ribbon">${Lt ? "MISSING" : "FOUND"}</div><p class="ptag">${Lt ? "Have you seen this item?" : "Is this yours? Claim it!"}</p>
  <div class="polaroid" id="drop"><span class="tape t1"></span><span class="tape t2"></span><div id="prev">📷 Tap to add a photo ${REQ}</div></div><input type="file" id="file" accept="image/*" class="hide">
  <div class="bub"><label for="nm">Item name ${REQ}</label><input type="text" id="nm" maxlength="60"></div>
  <div class="bub"><label for="dt">${Lt ? "Last seen on" : "Found on"} ${REQ}</label><input type="date" id="dt" max="${today()}" value="${today()}"></div>
  <div class="bub"><label for="pl">${Lt ? "Approximate location" : "Found at"} ${REQ}</label><input type="text" id="pl" maxlength="80" placeholder="e.g. Library, Block B"></div>
  ${Lt ? "" : `<div class="bub"><label for="qq">Verification question for the owner ${REQ}</label><input type="text" id="qq" maxlength="100" placeholder="e.g. What sticker is on the back?"></div>`}
  <p class="safe">🔒 Don't show ID numbers, phone numbers or faces in the photo.</p>
  <p class="hint" style="text-align:center;margin:6px 0 0"><i class="req">*</i> Required field</p><div class="err" id="err" style="text-align:center"></div>
  <button class="confirm ${t}" id="sub">Confirm</button></div></div>`;
}
function dbView(){
  const f = filter, r = (v, l) => `<label class="chk"><input type="radio" name="when" value="${v}" ${f.when === v ? "checked" : ""}> ${l}</label>`;
  return `<section class="band"><h1>Lost &amp; Found</h1><div class="crumb"><a data-go="home">Home</a> / Browse</div></section>
  <div class="shop"><aside class="side"><h3>Filter Options</h3>
  <div class="grp"><h4>Show items</h4><label class="chk"><input type="checkbox" data-t="lost" ${f.types.lost ? "checked" : ""}> Missing items</label><label class="chk"><input type="checkbox" data-t="found" ${f.types.found ? "checked" : ""}> Found items</label><label class="chk"><input type="checkbox" data-m ${f.mine ? "checked" : ""}> Only my reports</label></div>
  <div class="grp"><h4>Date</h4>${r("all","Any date")}${r("today","Today")}${r("week","This week")}${r("month","This month")}${r("custom","Custom range 📅")}
  ${f.when === "custom" ? `<input type="date" id="from" value="${f.from}" aria-label="From"><input type="date" id="to" value="${f.to}" aria-label="To">` : ""}</div>
  <div class="grp"><h4>Search</h4><input id="q" type="text" placeholder="Name or place" value="${esc(f.q)}"></div></aside>
  <section><div class="resbar"><span id="showing"></span><label>Sort by <select id="sort"><option value="new" ${f.sort === "new" ? "selected" : ""}>Newest first</option><option value="old" ${f.sort === "old" ? "selected" : ""}>Oldest first</option></select></label></div>
  <div class="active" id="active"></div><div class="grid" id="grid"></div><div class="pager" id="pager"></div></section></div>`;
}
function inRange(it){
  if (!live(it) || !filter.types[it.type]) return false;
  if (filter.mine && it.by !== session.email) return false;
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
  if (!$("#grid")) return;
  const s = filter.sort === "old" ? -1 : 1;
  const list = L("items").filter(inRange).sort((a,b) => s * (b.date.localeCompare(a.date) || b.t - a.t));
  const pages = Math.max(1, Math.ceil(list.length / PER)); filter.page = Math.min(filter.page, pages);
  const a = (filter.page-1) * PER, pg = list.slice(a, a + PER);
  $("#grid").innerHTML = pg.map(tile).join("") || `<div class="empty">Nothing here yet.</div>`;
  $("#showing").textContent = list.length ? `Showing ${a+1}-${a+pg.length} of ${list.length} results` : "No results";
  const ch = [];
  if (!(filter.types.lost && filter.types.found)) ch.push(["type", filter.types.lost ? "Missing only" : filter.types.found ? "Found only" : "Nothing selected"]);
  if (filter.mine) ch.push(["mine", "My reports"]);
  if (filter.when !== "all") ch.push(["when", {today:"Today", week:"This week", month:"This month", custom:"Custom range"}[filter.when]]);
  if (filter.q) ch.push(["q", "“" + esc(filter.q) + "”"]);
  $("#active").innerHTML = ch.length ? `Active filter ${ch.map(c => `<button class="achip" data-x="${c[0]}">${c[1]} ✕</button>`).join("")}<button class="clr" data-x="all">Clear All</button>` : "";
  const nb = (l, p, dis) => `<button class="pg" ${dis ? "disabled" : ""} data-p="${p}">${l}</button>`;
  $("#pager").innerHTML = pages > 1 ? nb("‹", filter.page-1, filter.page === 1) + Array.from({length:pages}, (_, i) => `<button class="pg ${i+1 === filter.page ? "on" : ""}" data-p="${i+1}">${i+1}</button>`).join("") + nb("›", filter.page+1, filter.page === pages) : "";
}
function itemView(){
  const it = cache.items[openId];
  if (!it) return `<button class="back" data-go="db">← Back</button><p class="empty">This report is no longer available.</p>`;
  const Lt = it.type === "lost", own = it.by === session.email, th = threads();
  let side;
  if (own) {
    const ks = Object.keys(th).filter(k => th[k].item === it.id);
    side = `<div class="prompt ${it.type}">This is your report${it.status !== "open" ? " · " + it.status : ""}</div>
      <div class="acts"><button class="sm" data-act="ret">${it.status === "returned" ? "Reopen" : "✓ Mark as returned"}</button><button class="sm d" data-act="del">🗑 Delete</button></div>` +
      (ks.length ? `<div class="convs">${ks.map(k => `<button class="pill ${chatWith === th[k].asker ? "on" : ""}" data-open="${esc(k)}">${esc(nm(th[k].asker))}</button>`).join("")}</div>` : `<p class="hint">No one has messaged you about this yet.</p>`);
  } else {
    side = `<div class="prompt ${it.type}">${Lt ? "Seen it? Please tell me 💬" : "Is it yours? Prove it 💬" + (it.q ? `<br><small>Verification: ${esc(it.q)}</small>` : "")}<div><button class="btn white" id="chatbtn">${Lt ? "Found my item? Chat" : "Yes, chat now"}</button></div></div>
      <button class="flag" data-act="flag">⚑ Report this post</button>`;
  }
  const peer = own ? chatWith : it.by;
  const chat = chatWith ? `<div class="chat"><div class="chead"><span>Private chat with <b>${esc(nm(peer || ""))}</b></span><button class="flag" data-act="flagchat">⚑ Report chat</button></div><div class="safe">🔒 Never share ID numbers, passwords or OTPs. Meet in a public campus spot.</div><div class="msgs" id="msgs"></div>
    <div class="send"><input type="text" id="mi" placeholder="${!own && !Lt ? "Answer the verification question…" : "Type a message…"}" maxlength="300"><button class="btn" id="ms">Send</button></div></div>` : "";
  return `<button class="back" data-go="db">← Back to list</button><div class="detail ${it.type}"><div class="art">${art(it)}<span class="tag">${Lt ? "Missing" : "Found"}</span></div>
  <div><h2>${esc(it.name)}</h2><div class="meta">${Lt ? "Last seen on" : "Found on"} <b>${esc(it.date)}</b></div><div class="meta">${Lt ? "Could be near" : "Found at"} <b>${esc(it.place)}</b></div>${side}${chat}</div></div>`;
}

/* ---------- admin ---------- */
function usersList(){
  const u = {}; const add = (e, k) => { if (!e) return; (u[e] = u[e] || {email:e, posts:0, msgs:0, flags:0})[k]++; };
  L("items").forEach(i => add(i.by, "posts")); L("msgs").forEach(m => add(m.from, "msgs")); L("flags").forEach(f => add(f.by, "flags"));
  L("blocked").forEach(b => { if (!u[b.email]) u[b.email] = {email:b.email, posts:0, msgs:0, flags:0}; });
  return Object.values(u).sort((a, b) => a.email.localeCompare(b.email));
}
function adminView(){
  if (!session.admin) return "";
  const its = L("items"), fls = L("flags").sort((a,b) => b.t - a.t), open = fls.filter(f => f.status === "open"), th = threads();
  const tab = (k, l) => `<button class="pill ${atab === k ? "on" : ""}" data-atab="${k}">${l}</button>`;
  const st = (l, n) => `<div class="ast"><b>${n}</b>${l}</div>`;
  let body = "";
  if (atab === "over") body = `<div class="astats">${st("Reports posted", its.length)}${st("Open now", its.filter(live).length)}${st("Returned", its.filter(i => i.status === "returned").length)}${st("Auto-archived", its.filter(archived).length)}${st("Hidden by admin", its.filter(i => i.status === "hidden").length)}${st("Messages", L("msgs").length)}${st("Open flags", open.length)}${st("Users seen", usersList().length)}</div>`;
  if (atab === "flags") body = `<div class="alist">${open.map(f => { const it = cache.items[f.item]; return `<div class="arow"><span>⚑ <b>${esc(it ? it.name : "(deleted item)")}</b>${f.thread ? " · chat" : ""}<br><small>${esc(f.reason)} — by ${esc(f.by)}</small></span>${it ? `<button class="sm" data-aview="${it.id}">View</button><button class="sm d" data-aflag="${f.id}:hide">Hide post</button>` : ""}<button class="sm" data-aflag="${f.id}:done">Dismiss</button></div>`; }).join("") || `<p class="empty">No open reports 🎉</p>`}</div>`;
  if (atab === "items") body = `<div class="alist">${its.sort((a,b) => (b.t||0) - (a.t||0)).map(i => `<div class="arow"><span><span class="stag">${i.type}</span> <b>${esc(i.name)}</b> <span class="stag">${archived(i) ? "archived" : i.status}</span><br><small>${esc(i.by)} · ${esc(i.date)} · ${esc(i.place)}</small></span>
    <button class="sm" data-aitem="${i.id}:${i.status === "hidden" ? "open" : "hide"}">${i.status === "hidden" ? "Unhide" : "Hide"}</button><button class="sm" data-aitem="${i.id}:${i.status === "returned" ? "open" : "ret"}">${i.status === "returned" ? "Reopen" : "Returned"}</button><button class="sm d" data-aitem="${i.id}:del">Delete</button></div>`).join("") || `<p class="empty">No reports yet.</p>`}</div>`;
  if (atab === "chats") body = `<div class="alist">${Object.values(th).map(t => { const it = cache.items[t.item]; return `<details class="arow"><summary><b>${esc(it ? it.name : "(deleted item)")}</b> · ${esc(nm(t.asker))} ↔ ${esc(it ? nm(it.by) : "?")} · ${t.msgs.length} msgs</summary>${t.msgs.map(m => `<div class="hint"><b>${esc(nm(m.from))}:</b> ${esc(m.text)}</div>`).join("")}<button class="sm d" data-athread="${esc(t.key)}">Delete chat</button></details>`; }).join("") || `<p class="empty">No chats yet.</p>`}</div>`;
  if (atab === "users") body = `<div class="alist">${usersList().map(u => `<div class="arow"><span><b>${esc(u.email)}</b><br><small>${u.posts} posts · ${u.msgs} messages · ${u.flags} flags filed</small></span>${isBlocked(u.email) ? `<span class="stag">blocked</span>` : ""}<button class="sm ${isBlocked(u.email) ? "" : "d"}" data-ablock="${esc(u.email)}">${isBlocked(u.email) ? "Unblock" : "Block"}</button></div>`).join("") || `<p class="empty">No users yet.</p>`}</div>`;
  if (atab === "set") body = `<div class="card setf"><div class="field"><label for="sd">Auto-archive reports after (days)</label><input type="text" id="sd" value="${setting("archiveDays", 60)}"></div>
    <div class="field"><label for="sn">Notice shown on the home page</label><input type="text" id="sn" maxlength="160" value="${esc(setting("notice", ""))}" placeholder="e.g. Lost &amp; found desk: Admin block, 10am–4pm"></div>
    <div class="acts"><button class="sm" id="asave">Save settings</button><button class="sm" id="aexp">⬇ Export all data</button>${CB ? "" : `<button class="sm d" id="areset">Reset demo data</button>`}</div></div>`;
  return `<button class="back" data-go="home">← Back to site</button><section class="band"><h1>Admin panel</h1><div class="crumb">Full control · ${CB ? "shared database" : "local demo data"}</div></section>
  <div class="atabs">${tab("over","Overview")}${tab("flags","Reports" + (open.length ? " (" + open.length + ")" : ""))}${tab("items","All posts")}${tab("chats","Chats")}${tab("users","Users")}${tab("set","Settings")}</div><div class="abody">${body}</div>`;
}
async function exportData(){
  const json = JSON.stringify({exported:new Date().toISOString(), ...cache}, null, 1);
  try { const d = window.claude ? await claude.use("downloads") : null; if (d) return await d.save({filename:"lostly-export.json", data:json}); } catch(e){}
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], {type:"application/json"})); a.download = "lostly-export.json"; a.click();
}

/* ---------- chat + notifications ---------- */
const tkey = (it, asker) => it.id + "_" + asker;
function threadKey(it){ return tkey(it, it.by === session.email ? chatWith : session.email); }
function drawChat(force){
  const it = cache.items[openId], box = $("#msgs"); if (!it || !box || !chatWith) return;
  const k = threadKey(it), th = threads()[k], m = th ? th.msgs : [];
  if (force || box.dataset.n != m.length) {
    box.innerHTML = `<div class="m sys">Private chat · only you two (and admins) can see this</div>` + m.map(x => `<div class="m ${x.from === session.email ? "me" : "them"}">${esc(x.text)}<small>${new Date(x.t).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</small></div>`).join("");
    box.dataset.n = m.length; box.scrollTop = 1e9;
  }
  if (m.length) { const r = store.get("reads_" + session.email, {}); if (r[k] !== m[m.length-1].t) { r[k] = m[m.length-1].t; store.set("reads_" + session.email, r); } }
}
function sendMsg(){
  const it = cache.items[openId], i = $("#mi"); let v = i.value.trim(); if (!v || !chatWith) return;
  if (isBlocked(session.email)) return toast("Your account is restricted by an admin.");
  const own = it.by === session.email, asker = own ? chatWith : session.email, k = tkey(it, asker);
  if (it.type === "found" && !own && !threads()[k]) v = "Verification answer: " + v;
  const id = k + "_" + Date.now();
  put("msgs", id, {id, thread:k, item:it.id, asker, from:session.email, text:v, t:Date.now()});
  i.value = ""; drawChat(); notif();
}
function unreadList(){
  if (!session) return [];
  const t = threads(), r = store.get("reads_" + session.email, {}), out = [];
  for (const k in t) {
    const th = t[k], it = cache.items[th.item]; if (!it) continue;
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
  if (total !== lastTotal && view === "home") homeLive();
  lastTotal = total;
  document.title = (total ? "(" + total + ") " : "") + "Lostly – From missing to managed";
  const dd = $("#dd"); if (dd) dd.innerHTML = u.length ? u.map(x => `<button class="ddi" data-open="${esc(x.k)}"><b>${esc(nm(x.from))}</b> · ${esc(x.item)}<br><small>${esc(x.text.slice(0,60))}</small><i class="badge">${x.n}</i></button>`).join("") : `<p class="hint" style="padding:8px">No new messages.</p>`;
}
function openThread(k){ const th = threads()[k]; if (!th) return; openId = th.item; chatWith = th.asker; go("item"); }
function poll(){
  if (!session) return;
  if (session.exp < Date.now()) return logout();
  if (view === "item") drawChat();
  notif();
}
window.addEventListener("storage", e => { if (!CB && e.key && e.key.startsWith(KEY + "c_")) { KINDS.forEach(k => cache[k] = store.get("c_" + k, {})); onData(); } poll(); });

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const t = e.target, q = s => t.closest(s);
  if (!q("#dd") && !q("#bell")) { const d = $("#dd"); if (d) d.classList.add("hide"); }
  let x;
  if ((x = q("[data-open]"))) return openThread(x.dataset.open);
  if ((x = q("[data-go]"))) { chatWith = null; return go(x.dataset.go); }
  if ((x = q("[data-item]"))) { openId = +x.dataset.item; chatWith = null; return go("item"); }
  if (q("[data-mine]")) { filter = FRESH(); filter.mine = true; return go("db"); }
  if (q("#mchat")) { const u = unreadList()[0]; return u ? openThread(u.k) : toast("No unread chats 🎉"); }
  if ((x = q("[data-atab]"))) { atab = x.dataset.atab; return render(); }
  if ((x = q("[data-aview]"))) { openId = +x.dataset.aview; chatWith = null; return go("item"); }
  if ((x = q("[data-aitem]")) && session.admin) {
    const [id, a] = x.dataset.aitem.split(":"), it = cache.items[id]; if (!it) return;
    if (a === "del") { if (confirm("Delete this post and its chats permanently?")) { del("items", id); L("msgs").filter(m => m.item == id).forEach(m => del("msgs", m.id)); } }
    else put("items", id, {...it, status:{hide:"hidden", ret:"returned", open:"open"}[a]});
    return render();
  }
  if ((x = q("[data-aflag]")) && session.admin) {
    const [id, a] = x.dataset.aflag.split(":"), f = cache.flags[id]; if (!f) return;
    if (a === "hide" && cache.items[f.item]) put("items", f.item, {...cache.items[f.item], status:"hidden"});
    put("flags", id, {...f, status:"done"}); return render();
  }
  if ((x = q("[data-ablock]")) && session.admin) {
    const em = x.dataset.ablock; if (isBlocked(em)) del("blocked", ekey(em)); else put("blocked", ekey(em), {email:em, t:Date.now()}); return render();
  }
  if ((x = q("[data-athread]")) && session.admin) { if (confirm("Delete this whole chat?")) L("msgs").filter(m => m.thread === x.dataset.athread).forEach(m => del("msgs", m.id)); return render(); }
  if (q("#asave")) { put("settings", "main", {archiveDays: Math.max(1, +$("#sd").value || 60), notice: $("#sn").value.trim().slice(0,160)}); return toast("Settings saved ✓"); }
  if (q("#aexp")) return exportData();
  if (q("#areset")) { if (confirm("Erase ALL local demo data?")) { Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k)); location.reload(); } return; }
  if ((x = q("[data-act]"))) {
    const it = cache.items[openId], a = x.dataset.act; if (!it) return;
    if (a === "ret") { put("items", it.id, {...it, status: it.status === "returned" ? "open" : "returned"}); toast(it.status === "returned" ? "Reopened" : "Marked as returned 🎉"); return render(); }
    if (a === "del") { if (confirm("Delete your report?")) { del("items", it.id); L("msgs").filter(m => m.item == it.id).forEach(m => del("msgs", m.id)); toast("Report deleted"); chatWith = null; go("db"); } return; }
    if (a === "flag" || a === "flagchat") {
      const r = prompt("Why are you reporting this? (spam, inappropriate, private info, other)"); if (!r || !r.trim()) return;
      const id = "f" + Date.now(); put("flags", id, {id, item:it.id, thread: a === "flagchat" ? threadKey(it) : "", by:session.email, reason:r.trim().slice(0,200), t:Date.now(), status:"open"});
      return toast("Thanks – an admin will review this ⚑");
    }
  }
  if ((x = q("[data-x]"))) {
    const k = x.dataset.x;
    if (k === "all") filter = FRESH(); else if (k === "type") filter.types = {lost:true, found:true}; else if (k === "mine") filter.mine = false; else if (k === "when") { filter.when = "all"; filter.from = filter.to = ""; } else filter.q = "";
    filter.page = 1; return render();
  }
  if ((x = q("[data-p]")) && !x.disabled) { filter.page = +x.dataset.p; drawGrid(); return window.scrollTo({top:0, behavior:"smooth"}); }
  if ((x = q(".pcard[data-id]"))) { openId = +x.dataset.id; chatWith = null; return go("item"); }
  if (q("#bell")) return $("#dd").classList.toggle("hide");
  if (q("#out")) return logout();
  if (q("#cap")) { captcha = !captcha; $("#cap").classList.toggle("ok", captcha); $("#cap .box").textContent = captcha ? "✓" : ""; return; }
  if (q("#cont")) {
    const em = (ME.email || "").toLowerCase();
    if (!em) return fail("Your account's email isn't visible to this page.");
    if (!validEmail(em) && !ME.canEdit) return fail("Only @" + DOMAIN + " accounts can use Lostly.");
    return startSession(em, false, true);
  }
  if (q("#adm")) {
    if (CB) { if (!ME.canEdit) return fail("This account is not an admin of this site."); return startSession(ME.email || ADMIN_EMAIL, true, false); }
    const em = prompt("Admin email:"); if (em === null) return; const pw = prompt("Admin password:"); if (pw === null) return;
    if (em.trim().toLowerCase() !== ADMIN_EMAIL || pw !== ADMIN_PASS) return fail("Wrong admin credentials.");
    return startSession(em, true, false);
  }
  if (q("#go")) {
    const em = $("#em").value, pw = $("#pw").value;
    if (!validEmail(em)) return fail("Invalid email-id. Use your institution email (@" + DOMAIN + ").");
    if (pw.length < 6) return fail("Please enter your password (min 6 characters).");
    if (!captcha) return fail("Please confirm you're not a robot.");
    return startSession(em, false, $("#rm").checked);
  }
  if (q("#goog")) {
    const em = prompt("Demo Google sign-in. Enter your Google email:"); if (em === null) return;
    if (!validEmail(em)) return fail("Invalid email-id. Only @" + DOMAIN + " accounts are allowed.");
    return startSession(em, false, $("#rm").checked);
  }
  if (q("#drop")) return $("#file").click();
  if (q("#sub")) {
    const nmv = $("#nm").value.trim(), dt = $("#dt").value, pl = $("#pl").value.trim(), qq = $("#qq") ? $("#qq").value.trim() : "";
    if (isBlocked(session.email)) return fail("Your account is restricted by an admin.");
    if (!imgData || !nmv || !dt || !pl || (view === "found" && !qq)) return fail("Please fill every field marked * (including the photo).");
    const id = Date.now(); put("items", id, {id, type:view, name:nmv, date:dt, place:pl, img:imgData, by:session.email, status:"open", t:id, q:qq});
    imgData = ""; filter = FRESH(); toast("Posted! Thank you 🎉"); return go("db");
  }
  if (q("#chatbtn")) { if (isBlocked(session.email)) return toast("Your account is restricted by an admin."); chatWith = session.email; render(); const i = $("#mi"); if (i) i.focus(); return; }
  if (q("#ms")) return sendMsg();
});
document.addEventListener("input", e => { if (e.target.id === "q") { filter.q = e.target.value; filter.page = 1; drawGrid(); } });
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.t) { filter.types[el.dataset.t] = el.checked; filter.page = 1; drawGrid(); }
  if ("m" in el.dataset) { filter.mine = el.checked; filter.page = 1; drawGrid(); }
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
  if ((e.target.id === "pw" || e.target.id === "em") && $("#go")) $("#go").click();
});
init();