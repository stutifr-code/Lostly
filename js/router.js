/* ---------- Rendering and navigation ---------- */
const views = {
  login: loginView,
  home: homeView,
  lost: () => formView("lost"),
  found: () => formView("found"),
  db: dbView,
  item: itemView,
  admin: adminView
};

function render() {
  renderTop();

  const app = $("#app");
  app.className = view === "login" ? "bare" : "pad";
  document.body.classList.toggle("onepage", view === "home");
  app.innerHTML = `<div class="page">${views[view] ? views[view]() : ""}</div>`;

  if (view === "db") drawGrid();
  if (view === "login") drawSlide();
  if (view === "home") homeLive();
  if (view === "item" && chatWith) drawChat(true);
  notif();
}

function renderTop() {
  const top = $("#top");
  if (!session || view === "login") {
    top.innerHTML = "";
    return;
  }

  top.innerHTML = `<header class="hdr"><div class="logo" data-go="home">Lost<span>ly</span></div><div class="cell">From missing<br>to managed</div><div class="cell">${esc(session.email)}</div>
  ${session.admin ? `<div class="cell"><button class="pill on" data-go="admin">⚙ Admin panel</button></div>` : ""}
  <div class="tools"><button class="round" id="out" title="Log out" aria-label="Log out">⎋</button>
  <div class="bellw"><button class="round" id="bell" aria-label="Chat notifications">🔔<i id="badge" class="badge hide">0</i></button><div class="dd hide" id="dd"></div></div></div></header>`;
}

function go(v) {
  view = v;
  render();
  window.scrollTo({ top: 0 });
}
