/* ---------- App startup and background refresh ---------- */
let pollBusy = false;

/* Connects to the shared Claude database when the page is published */
async function connectClaude() {
  if (!window.claude) return;

  try {
    const [d, u] = await Promise.all([claude.use("db"), claude.use("user")]);
    if (d && u) {
      CB = d;
      ME = await u.me();
    }
  } catch (e) {}
}

/* Restores a student login from Supabase */
async function restoreStudentSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) return;

  const email = data.session.user.email || "";
  authUserId = data.session.user.id;

  if (email.toLowerCase().endsWith("@" + STUDENT_DOMAIN)) {
    session = {
      email: email.toLowerCase(),
      admin: false,
      exp: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + 3600000
    };
  } else {
    await supabaseClient.auth.signOut();
  }
}

async function init() {
  $("#app").innerHTML = `<div class="empty" style="padding:40vh 0">Loading…</div>`;

  await connectClaude();

  if (CB) {
    KINDS.forEach(k => CB.collection(k).onSnapshot(
      sn => {
        cache[k] = Object.fromEntries(sn.docs.map(d => [d.id, d.data()]));
        onData();
      },
      () => toast("Database unavailable")
    ));
  } else {
    loadLocal();

    // Restore the existing admin session only; students sign in through Supabase.
    const saved = store.get("session", null);
    if (saved && saved.admin && saved.exp > Date.now()) {
      session = saved;
    } else {
      store.del("session");
      await restoreStudentSession();
    }
  }

  if (session && !session.admin) {
    await loadCloudItems();
    try {
      await loadCloudConversations();
    } catch (error) {
      console.error("Could not load conversations:", error);
      toast("Chats could not be loaded. Please refresh.");
    }
  }

  view = session ? (session.admin ? "admin" : "home") : "login";
  render();

  setInterval(poll, 5000);
  setInterval(() => {
    if ($("#cph")) {
      slide = (slide + 1) % SLIDES.length;
      drawSlide();
    }
  }, 3500);
}

/* Called whenever the shared database changes */
function onData() {
  if (!session) return;

  if (view === "db") drawGrid();
  else if (view === "home") homeLive();
  else if (view === "admin" && atab !== "set") render();
  else if (view === "item") {
    if (!cache.items[openId]) return go("db");
    drawChat();
  }
  notif();
}

/* Refreshes chats every few seconds and signs out expired sessions */
async function poll() {
  if (!session) return;
  if (session.exp < Date.now()) return logout();

  if (session.admin || !authUserId || pollBusy) {
    if (view === "item") drawChat();
    notif();
    return;
  }

  pollBusy = true;
  try {
    await loadCloudConversations();
    if (view === "item") drawChat();
    notif();
  } catch (error) {
    console.error("Chat refresh failed:", error);
  } finally {
    pollBusy = false;
  }
}

// Keeps several tabs in sync in local mode
window.addEventListener("storage", e => {
  if (!CB && e.key && e.key.startsWith(KEY + "c_")) {
    KINDS.forEach(k => cache[k] = store.get("c_" + k, {}));
    onData();
  }
  poll();
});

init();
