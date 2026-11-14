/* ---------- Admin panel ---------- */
function usersList() {
  const u = {};
  const add = (e, k) => {
    if (!e) return;
    (u[e] = u[e] || { email: e, posts: 0, msgs: 0, flags: 0 })[k]++;
  };

  L("items").forEach(i => add(i.by, "posts"));
  L("msgs").forEach(m => add(m.from, "msgs"));
  L("flags").forEach(f => add(f.by, "flags"));
  L("blocked").forEach(b => {
    if (!u[b.email]) u[b.email] = { email: b.email, posts: 0, msgs: 0, flags: 0 };
  });

  return Object.values(u).sort((a, b) => a.email.localeCompare(b.email));
}

const adminStat = (label, n) => `<div class="ast"><b>${n}</b>${label}</div>`;

/* One renderer per admin tab */
const ADMIN_TABS = {
  over: ({ its, open }) => `<div class="astats">${adminStat("Reports posted", its.length)}${adminStat("Open now", its.filter(live).length)}${adminStat("Returned", its.filter(i => i.status === "returned").length)}${adminStat("Auto-archived", its.filter(archived).length)}${adminStat("Hidden by admin", its.filter(i => i.status === "hidden").length)}${adminStat("Messages", L("msgs").length)}${adminStat("Open flags", open.length)}${adminStat("Users seen", usersList().length)}</div>`,

  flags: ({ open }) => `<div class="alist">${open.map(f => {
    const it = cache.items[f.item];
    return `<div class="arow"><span>⚑ <b>${esc(it ? it.name : "(deleted item)")}</b>${f.thread ? " · chat" : ""}<br><small>${esc(f.reason)} — by ${esc(f.by)}</small></span>${it ? `<button class="sm" data-aview="${it.id}">View</button><button class="sm d" data-aflag="${f.id}:hide">Hide post</button>` : ""}<button class="sm" data-aflag="${f.id}:done">Dismiss</button></div>`;
  }).join("") || `<p class="empty">No open reports 🎉</p>`}</div>`,

  items: ({ its }) => `<div class="alist">${its.sort((a, b) => (b.t || 0) - (a.t || 0)).map(i => `<div class="arow"><span><span class="stag">${i.type}</span> <b>${esc(i.name)}</b> <span class="stag">${archived(i) ? "archived" : i.status}</span><br><small>${esc(i.by)} · ${esc(i.date)} · ${esc(i.place)}</small></span>
    <button class="sm" data-aitem="${i.id}:${i.status === "hidden" ? "open" : "hide"}">${i.status === "hidden" ? "Unhide" : "Hide"}</button><button class="sm" data-aitem="${i.id}:${i.status === "returned" ? "open" : "ret"}">${i.status === "returned" ? "Reopen" : "Returned"}</button><button class="sm d" data-aitem="${i.id}:del">Delete</button></div>`).join("") || `<p class="empty">No reports yet.</p>`}</div>`,

  chats: ({ th }) => `<div class="alist">${Object.values(th).map(t => {
    const it = cache.items[t.item];
    return `<details class="arow"><summary><b>${esc(it ? it.name : "(deleted item)")}</b> · ${esc(nm(t.asker))} ↔ ${esc(it ? nm(it.by) : "?")} · ${t.msgs.length} msgs</summary>${t.msgs.map(m => `<div class="hint"><b>${esc(nm(m.from))}:</b> ${esc(m.text)}</div>`).join("")}<button class="sm d" data-athread="${esc(t.key)}">Delete chat</button></details>`;
  }).join("") || `<p class="empty">No chats yet.</p>`}</div>`,

  users: () => `<div class="alist">${usersList().map(u => `<div class="arow"><span><b>${esc(u.email)}</b><br><small>${u.posts} posts · ${u.msgs} messages · ${u.flags} flags filed</small></span>${isBlocked(u.email) ? `<span class="stag">blocked</span>` : ""}<button class="sm ${isBlocked(u.email) ? "" : "d"}" data-ablock="${esc(u.email)}">${isBlocked(u.email) ? "Unblock" : "Block"}</button></div>`).join("") || `<p class="empty">No users yet.</p>`}</div>`,

  set: () => `<div class="card setf"><div class="field"><label for="sd">Auto-archive reports after (days)</label><input type="text" id="sd" value="${setting("archiveDays", 60)}"></div>
    <div class="field"><label for="sn">Notice shown on the home page</label><input type="text" id="sn" maxlength="160" value="${esc(setting("notice", ""))}" placeholder="e.g. Lost &amp; found desk: Admin block, 10am–4pm"></div>
    <div class="acts"><button class="sm" id="asave">Save settings</button><button class="sm" id="aexp">⬇ Export all data</button>${CB ? "" : `<button class="sm d" id="areset">Reset demo data</button>`}</div></div>`
};

function adminView() {
  if (!session.admin) return "";

  const its = L("items");
  const flags = L("flags").sort((a, b) => b.t - a.t);
  const open = flags.filter(f => f.status === "open");
  const th = threads();

  const tab = (k, label) => `<button class="pill ${atab === k ? "on" : ""}" data-atab="${k}">${label}</button>`;
  const renderTab = ADMIN_TABS[atab];
  const body = renderTab ? renderTab({ its, open, th }) : "";

  return `<button class="back" data-go="home">← Back to site</button><section class="band"><h1>Admin panel</h1><div class="crumb">Full control · ${CB ? "shared database" : "local demo data"}</div></section>
  <div class="atabs">${tab("over", "Overview")}${tab("flags", "Reports" + (open.length ? " (" + open.length + ")" : ""))}${tab("items", "All posts")}${tab("chats", "Chats")}${tab("users", "Users")}${tab("set", "Settings")}</div><div class="abody">${body}</div>`;
}

async function exportData() {
  const json = JSON.stringify({ exported: new Date().toISOString(), ...cache }, null, 1);

  try {
    const d = window.claude ? await claude.use("downloads") : null;
    if (d) return await d.save({ filename: "lostly-export.json", data: json });
  } catch (e) {}

  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  a.download = "lostly-export.json";
  a.click();
}

/* ----- Admin click actions ----- */
function adminItemAction(btn) {
  const [id, action] = btn.dataset.aitem.split(":");
  const it = cache.items[id];
  if (!it) return;

  if (action === "del") {
    if (confirm("Delete this post and its chats permanently?")) {
      del("items", id);
      L("msgs").filter(m => m.item == id).forEach(m => del("msgs", m.id));
    }
  } else {
    put("items", id, { ...it, status: { hide: "hidden", ret: "returned", open: "open" }[action] });
  }
  render();
}

function adminFlagAction(btn) {
  const [id, action] = btn.dataset.aflag.split(":");
  const f = cache.flags[id];
  if (!f) return;

  if (action === "hide" && cache.items[f.item]) put("items", f.item, { ...cache.items[f.item], status: "hidden" });
  put("flags", id, { ...f, status: "done" });
  render();
}

function adminToggleBlock(btn) {
  const email = btn.dataset.ablock;
  if (isBlocked(email)) del("blocked", ekey(email));
  else put("blocked", ekey(email), { email, t: Date.now() });
  render();
}

function adminDeleteThread(btn) {
  if (confirm("Delete this whole chat?")) {
    L("msgs").filter(m => m.thread === btn.dataset.athread).forEach(m => del("msgs", m.id));
  }
  render();
}

function saveSettings() {
  put("settings", "main", { archiveDays: Math.max(1, +$("#sd").value || 60), notice: $("#sn").value.trim().slice(0, 160) });
  toast("Settings saved ✓");
}

function resetDemoData() {
  if (!confirm("Erase ALL local demo data?")) return;
  Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k));
  location.reload();
}
