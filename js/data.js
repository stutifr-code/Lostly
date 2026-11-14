/* ---------- Data layer: shared database when published, localStorage in VS Code ---------- */
const cache = { items: {}, msgs: {}, conversations: {}, flags: {}, blocked: {}, settings: {} };
const L = k => Object.values(cache[k]);

function persist(k, id, o) {
  if (CB) {
    const ref = CB.collection(k).doc(String(id));
    (o ? ref.set(JSON.parse(JSON.stringify(o))) : ref.delete()).catch(() => toast("Could not save – you may only have view access."));
  } else {
    store.set("c_" + k, cache[k]);
  }
}

function put(k, id, o) {
  cache[k][id] = o;
  persist(k, id, o);
}

function del(k, id) {
  delete cache[k][id];
  persist(k, id, null);
}

const setting = (k, d) => (cache.settings.main && cache.settings.main[k] !== undefined ? cache.settings.main[k] : d);
const isBlocked = e => !!cache.blocked[ekey(e)];
const archived = it => it.status === "open" && Date.now() - new Date(it.date + "T00:00:00") > setting("archiveDays", 60) * DAY;
const live = it => it.status === "open" && !archived(it);

/* The other student in a conversation */
const peerOf = c => (c.participant_one === authUserId ? c.participant_two : c.participant_one);

/* Groups conversations and their messages into threads keyed by conversation id */
function threads() {
  const t = {};

  for (const c of Object.values(cache.conversations || {})) {
    t[c.id] = { key: c.id, item: c.item_id, asker: peerOf(c), msgs: [] };
  }

  for (const m of Object.values(cache.msgs || {})) {
    if (!m.thread) continue;
    if (!t[m.thread]) t[m.thread] = { key: m.thread, item: m.item, asker: m.asker || "", msgs: [] };
    t[m.thread].msgs.push(m);
  }

  for (const k in t) t[k].msgs.sort((a, b) => a.t - b.t);

  return t;
}

/* Loads local data and seeds demo posts on first run */
function loadLocal() {
  KINDS.forEach(k => cache[k] = store.get("c_" + k, {}));
  if (store.get("seeded4", 0)) return;

  const d = n => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
  const u = n => n + "@" + DOMAIN;
  const seed = [
    { id: 1, type: "lost", name: "Blue water bottle", date: d(0), place: "Library, 2nd floor", emo: "💧", by: u("riya") },
    { id: 2, type: "found", name: "Black calculator", date: d(1), place: "Canteen counter", emo: "🧮", by: u("arjun"), q: "Which brand is it?" },
    { id: 3, type: "lost", name: "Hostel room keys", date: d(3), place: "Main ground", emo: "🔑", by: u("sana") },
    { id: 4, type: "found", name: "Wireless earbuds", date: d(5), place: "Lecture hall B", emo: "🎧", by: u("kabir"), q: "What colour is the case?" },
    { id: 5, type: "lost", name: "Physics notebook", date: d(8), place: "Block C corridor", emo: "📚", by: u("meera") },
    { id: 6, type: "found", name: "Grey hoodie", date: d(12), place: "Sports complex", emo: "🧥", by: u("dev"), q: "Any logo on it?" },
    { id: 7, type: "lost", name: "Student ID card", date: d(2), place: "Bus stop", emo: "💳", by: u("ana") },
    { id: 8, type: "found", name: "Spectacles in case", date: d(4), place: "Seminar hall", emo: "👓", by: u("ishaan"), q: "What is the frame colour?" }
  ];
  seed.forEach((x, i) => put("items", x.id, { ...x, status: "open", t: Date.now() - i * 36e5 }));

  put("msgs", "1_arjun_seed", {
    id: "1_arjun_seed",
    thread: "1_" + u("arjun"),
    item: 1,
    asker: u("arjun"),
    from: u("arjun"),
    text: "Hi! I think I saw a blue bottle near the library desk.",
    t: Date.now()
  });
  store.set("seeded4", 1);
}
