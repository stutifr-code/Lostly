/* ---------- Chat and notifications ---------- */
function closeChat() {
  chatWith = null;
  activeConversationId = null;
}

function drawChat(force) {
  const it = cache.items[openId];
  const box = $("#msgs");
  if (!it || !box || !chatWith) return;

  const k = activeConversationId;
  const th = threads()[k];
  const m = th ? th.msgs : [];

  if (force || box.dataset.n != m.length) {
    box.innerHTML =
      `<div class="m sys">Private chat · only you two can see this</div>` +
      m.map(x =>
        `<div class="m ${x.from === session.email ? "me" : "them"}">${esc(x.text)}<small>${new Date(x.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div>`
      ).join("");

    box.dataset.n = m.length;
    box.scrollTop = 1e9;
  }

  if (m.length) {
    const reads = store.get("reads_" + session.email, {});
    const lastT = m[m.length - 1].t;
    if (reads[k] !== lastT) {
      reads[k] = lastT;
      store.set("reads_" + session.email, reads);
    }
  }
}

async function startChat() {
  if (isBlocked(session.email)) return toast("Your account is restricted by an admin.");

  try {
    const conversation = await getOrCreateConversation(cache.items[openId]);

    cache.conversations[conversation.id] = conversation;
    activeConversationId = conversation.id;
    chatWith = "Student";

    await loadConversationMessages(conversation.id);
    render();

    const input = $("#mi");
    if (input) input.focus();
  } catch (error) {
    toast(error.message || "Could not start the conversation.");
  }
}

async function openThread(conversationId) {
  try {
    activeConversationId = conversationId;
    chatWith = "Student";

    const { data, error } = await supabaseClient
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (error) throw error;

    cache.conversations[conversationId] = data;
    openId = data.item_id;

    if (!cache.items[openId]) await loadCloudItems();
    await loadConversationMessages(conversationId);

    go("item");
    drawChat(true);
  } catch (error) {
    toast(error.message || "Could not open conversation.");
  }
}

/* Saves a message to the open conversation */
async function postMessage(body) {
  const { error } = await supabaseClient
    .from("messages")
    .insert({ conversation_id: activeConversationId, sender_id: authUserId, body });

  if (error) throw error;
}

/* Reloads the open conversation and redraws it */
async function refreshChat() {
  await loadConversationMessages(activeConversationId);
  drawChat(true);
  notif();
}

async function sendMsg() {
  const it = cache.items[openId];
  const input = $("#mi");
  if (!it || !input || !chatWith || !activeConversationId) return;

  const text = input.value.trim();
  if (!text) return;
  if (isBlocked(session.email)) return toast("Your account is restricted by an admin.");

  input.disabled = true;

  try {
    await postMessage(text);
    input.value = "";
    await refreshChat();
  } catch (error) {
    toast(error.message || "Message could not be sent.");
  } finally {
    input.disabled = false;
    input.focus();
  }
}

async function sendVerificationQuestion() {
  const it = cache.items[openId];
  if (!it || it.type !== "found" || it.ownerId !== authUserId || !it.q || !activeConversationId) {
    return toast("The verification question is not available for this chat.");
  }
  if (isBlocked(session.email)) return toast("Your account is restricted by an admin.");

  const button = $("[data-send-verification]");
  if (button) button.disabled = true;

  try {
    await postMessage("Verification question: " + it.q);
    await refreshChat();
    toast("Verification question sent.");
  } catch (error) {
    toast(error.message || "Could not send the verification question.");
  } finally {
    if (button) button.disabled = false;
  }
}

/* Conversations with messages from others that were not read yet, newest first */
function unreadList() {
  if (!session || !authUserId) return [];

  const t = threads();
  const reads = store.get("reads_" + session.email, {});
  const out = [];

  for (const k in t) {
    const th = t[k];
    const it = cache.items[th.item];
    if (!it) continue;

    const unread = th.msgs.filter(m => m.senderId !== authUserId && m.t > (reads[k] || 0));
    if (!unread.length) continue;

    const last = unread[unread.length - 1];
    out.push({ k, from: "Student", text: last.text, item: it.name, n: unread.length, t: last.t });
  }

  return out.sort((a, b) => b.t - a.t);
}

/* Updates the bell badge, the dropdown panel, the new-message bar and the tab title */
function notif() {
  const bar = $("#nbar");
  const unread = unreadList();
  const total = unread.reduce((s, x) => s + x.n, 0);

  const badge = $("#badge");
  if (badge) {
    badge.textContent = total;
    badge.classList.toggle("hide", !total);
  }

  if (!session || view === "login" || !total) {
    bar.classList.add("hide");
  } else {
    const x = unread[0];
    bar.classList.remove("hide");
    bar.innerHTML = `<span class="pulse"></span><span><b>${total} new chat message${total > 1 ? "s" : ""}</b> · ${esc(nm(x.from))} on “${esc(x.item)}”: ${esc(x.text.slice(0, 50))}</span><button class="btn" data-open="${esc(x.k)}">Open</button>`;
    if (total > lastTotal) {
      bar.classList.remove("pop");
      void bar.offsetWidth;
      bar.classList.add("pop");
    }
  }

  if (total !== lastTotal && view === "home") homeLive();
  lastTotal = total;
  document.title = (total ? "(" + total + ") " : "") + APP_TITLE;

  const dd = $("#dd");
  if (dd) {
    dd.innerHTML = unread.length
      ? unread.map(x => `<button class="ddi" data-open="${esc(x.k)}"><b>${esc(nm(x.from))}</b> · ${esc(x.item)}<br><small>${esc(x.text.slice(0, 60))}</small><i class="badge">${x.n}</i></button>`).join("")
      : `<p class="hint" style="padding:8px">No new messages.</p>`;
  }
}
