/* ---------- Item detail + private chat ---------- */
function itemView() {
  const it = cache.items[openId];
  if (!it) return `<button class="back" data-go="db">← Back</button><p class="empty">This report is no longer available.</p>`;

  const lost = it.type === "lost";
  const own = it.ownerId ? it.ownerId === authUserId : it.by === session.email;
  const th = threads();

  let side;
  if (own) {
    const ks = Object.keys(th).filter(k => th[k].item === it.id);
    side = `<div class="prompt ${it.type}">This is your report${it.status !== "open" ? " · " + it.status : ""}</div>
      <div class="acts"><button class="sm" data-act="ret">${it.status === "returned" ? "Reopen" : "✓ Mark as returned"}</button><button class="sm d" data-act="del">🗑 Delete</button></div>` +
      (ks.length
        ? `<div class="convs">${ks.map(k => `<button class="pill ${activeConversationId === k ? "on" : ""}" data-open="${esc(k)}">Student · ${th[k].msgs.length} messages</button>`).join("")}</div>`
        : `<p class="hint">No one has messaged you about this yet.</p>`);
  } else {
    side = `<div class="prompt ${it.type}">${lost ? "Seen it? Please tell me 💬" : "Is it yours? Prove it 💬"}<div><button class="btn white" id="chatbtn">${lost ? "Found my item? Chat" : "Yes, chat now"}</button></div></div>
      <button class="flag" data-act="flag">⚑ Report this post</button>`;
  }

  const peer = own ? chatWith : it.by;
  const verification = own && !lost && it.q
    ? `<div class="safe"><button class="btn white" data-send-verification>Send verification question</button><small style="display:block;margin-top:6px">This sends your saved question to the student in this chat.</small></div>`
    : "";
  const chat = chatWith
    ? `<div class="chat"><div class="chead"><span>Private chat with <b>${esc(nm(peer || ""))}</b></span><button class="flag" data-act="flagchat">⚑ Report chat</button></div>${verification}<div class="safe">🔒 Never share ID numbers, passwords or OTPs. Meet in a public campus spot.</div><div class="msgs" id="msgs"></div>
    <div class="send"><input type="text" id="mi" placeholder="Type a message…" maxlength="300"><button class="btn" id="ms">Send</button></div></div>`
    : "";

  return `<button class="back" data-go="db">← Back to list</button><div class="detail ${it.type}"><div class="art">${art(it)}<span class="tag">${lost ? "Missing" : "Found"}</span></div>
  <div><h2>${esc(it.name)}</h2><div class="meta">${lost ? "Last seen on" : "Found on"} <b>${esc(it.date)}</b></div><div class="meta">${lost ? "Could be near" : "Found at"} <b>${esc(it.place)}</b></div>${side}${chat}</div></div>`;
}
