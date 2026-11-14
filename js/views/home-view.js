/* ---------- Home screen ---------- */
function homeView() {
  const col = (t, i, letter, title, p, em, sm) => `<button class="col ${t}" data-go="${t}" style="--i:${i}"><span class="bigl">${letter}</span><b>${title}</b><p>${p}</p><small>${sm}</small><span class="ill">${em}</span></button>`;

  return `<div class="bento">
  <section class="bh">${fl("🔑", 74, 10, 0)}${fl("🎧", 88, 44, .7)}${fl("📚", 64, 62, 1.2)}${fl("🧥", 52, 6, .4)}
    <span class="label">CAMPUS LOST &amp; FOUND</span>
    <h1>Lost something?<br>Found something?<br><i>Let's</i> get it <mark>home.</mark></h1><p class="script">+ reporting &nbsp;+ matching &nbsp;+ returning</p></section>
  <section class="bs"><div class="stat l"><b id="nl">0</b><span>missing now</span></div><div class="stat f"><b id="nf">0</b><span>found, waiting</span></div><div class="stat r"><b id="nr">0</b><span>returned ✓</span></div><p id="notice"></p></section>
  ${col("lost", 0, "M", "Missing", "Lost something? Post it in 30 seconds.", "🔍", "Report →")}${col("found", 1, "F", "Found", "Found something? Help it get home.", "🎒", "Report →")}${col("db", 2, "B", "Browse", "See everything reported so far.", "📋", "Search &amp; filter →")}
  <section class="recent"><h4>Recently reported</h4><div class="rs" id="rs"></div></section>
  <section class="mine"><h4>My activity</h4><div id="mine"></div></section>
  <footer class="ft"><div><small>REMINDER</small> Be kind. Never share ID numbers or OTPs.</div><div class="y"><span class="logo">Lost<span>ly</span></span> · From missing to managed</div><div>Only @${DOMAIN} accounts</div></footer></div>`;
}

/* Fills in the live parts of the home screen: counters, notice, recent items, my activity */
function homeLive() {
  if (view !== "home" || !$("#rs")) return;

  const all = L("items");
  const liveItems = all.filter(live);
  const mine = all.filter(i => i.by === session.email);
  const unread = unreadList().reduce((s, x) => s + x.n, 0);

  count($("#nl"), liveItems.filter(i => i.type === "lost").length);
  count($("#nf"), liveItems.filter(i => i.type === "found").length);
  count($("#nr"), all.filter(i => i.status === "returned").length);

  const notice = setting("notice", "");
  $("#notice").innerHTML = notice ? "📢 " + esc(notice) : `Only @${DOMAIN} students see posts. Chat privately when you spot a match.`;

  const recent = liveItems.sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 6);
  $("#rs").innerHTML = recent.length
    ? recent.map(i => `<button class="mini ${i.type}" data-item="${i.id}" title="${esc(i.name)}"><span class="mt">${i.img ? `<img src="${i.img}" alt="">` : (i.emo || "📦")}</span><b>${esc(i.name)}</b></button>`).join("")
    : `<span class="hint">Nothing reported yet – be the first!</span>`;

  $("#mine").innerHTML = `<div class="mrow"><span><b>${mine.filter(i => i.status === "open").length}</b> open</span><span><b>${mine.filter(i => i.status === "returned").length}</b> returned</span><button class="chipb" id="mchat"><b>${unread}</b> unread chats</button></div><button class="sm" data-mine>My reports →</button>`;
}
