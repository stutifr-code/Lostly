/* ---------- Browse: filters, grid, pager ---------- */
function dbView() {
  const f = filter;
  const radio = (v, label) => `<label class="chk"><input type="radio" name="when" value="${v}" ${f.when === v ? "checked" : ""}> ${label}</label>`;

  return `<section class="band"><h1>Lost &amp; Found</h1><div class="crumb"><a data-go="home">Home</a> / Browse</div></section>
  <div class="shop"><aside class="side"><h3>Filter Options</h3>
  <div class="grp"><h4>Show items</h4><label class="chk"><input type="checkbox" data-t="lost" ${f.types.lost ? "checked" : ""}> Missing items</label><label class="chk"><input type="checkbox" data-t="found" ${f.types.found ? "checked" : ""}> Found items</label><label class="chk"><input type="checkbox" data-m ${f.mine ? "checked" : ""}> Only my reports</label></div>
  <div class="grp"><h4>Date</h4>${radio("all", "Any date")}${radio("today", "Today")}${radio("week", "This week")}${radio("month", "This month")}${radio("custom", "Custom range 📅")}
  ${f.when === "custom" ? `<input type="date" id="from" value="${f.from}" aria-label="From"><input type="date" id="to" value="${f.to}" aria-label="To">` : ""}</div>
  <div class="grp"><h4>Search</h4><input id="q" type="text" placeholder="Name or place" value="${esc(f.q)}"></div></aside>
  <section><div class="resbar"><span id="showing"></span><label>Sort by <select id="sort"><option value="new" ${f.sort === "new" ? "selected" : ""}>Newest first</option><option value="old" ${f.sort === "old" ? "selected" : ""}>Oldest first</option></select></label></div>
  <div class="active" id="active"></div><div class="grid" id="grid"></div><div class="pager" id="pager"></div></section></div>`;
}

/* Does this item pass the current filters? */
function inRange(it) {
  if (!live(it) || !filter.types[it.type]) return false;
  if (filter.mine && it.by !== session.email) return false;
  if (filter.q && !(it.name + " " + it.place).toLowerCase().includes(filter.q.toLowerCase())) return false;

  const d = new Date(it.date + "T00:00:00");
  const n = new Date();
  n.setHours(0, 0, 0, 0);

  if (filter.when === "today") return d.getTime() === n.getTime();
  if (filter.when === "week") return n - d <= 6 * DAY && d <= n;
  if (filter.when === "month") return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  if (filter.when === "custom") {
    if (filter.from && it.date < filter.from) return false;
    if (filter.to && it.date > filter.to) return false;
  }
  return true;
}

/* Photo, or an emoji when there is no photo */
const art = it => it.img
  ? `<img src="${it.img}" alt="${esc(it.name)}">`
  : `<span class="emo">${it.emo || (it.type === "lost" ? "🔍" : "🎒")}</span>`;

function tile(it, i) {
  return `<article class="pcard ${it.type}" data-id="${it.id}" style="--i:${i}"><div class="art">${art(it)}<span class="tag">${it.type === "lost" ? "Missing" : "Found"}</span></div>
  <small>${it.type === "lost" ? "Last seen at" : "Found at"} ${esc(it.place)}</small><h3>${esc(it.name)}</h3><span class="d">${esc(it.date)}</span></article>`;
}

function drawGrid() {
  if (!$("#grid")) return;

  const dir = filter.sort === "old" ? -1 : 1;
  const list = L("items").filter(inRange).sort((a, b) => dir * (b.date.localeCompare(a.date) || b.t - a.t));
  const pages = Math.max(1, Math.ceil(list.length / PER));
  filter.page = Math.min(filter.page, pages);

  const start = (filter.page - 1) * PER;
  const pageItems = list.slice(start, start + PER);

  $("#grid").innerHTML = pageItems.map(tile).join("") || `<div class="empty">Nothing here yet.</div>`;
  $("#showing").textContent = list.length ? `Showing ${start + 1}-${start + pageItems.length} of ${list.length} results` : "No results";

  drawActiveFilters();
  drawPager(pages);
}

/* Chips for the filters that are switched on */
function drawActiveFilters() {
  const chips = [];
  if (!(filter.types.lost && filter.types.found)) {
    chips.push(["type", filter.types.lost ? "Missing only" : filter.types.found ? "Found only" : "Nothing selected"]);
  }
  if (filter.mine) chips.push(["mine", "My reports"]);
  if (filter.when !== "all") chips.push(["when", { today: "Today", week: "This week", month: "This month", custom: "Custom range" }[filter.when]]);
  if (filter.q) chips.push(["q", "“" + esc(filter.q) + "”"]);

  $("#active").innerHTML = chips.length
    ? `Active filter ${chips.map(c => `<button class="achip" data-x="${c[0]}">${c[1]} ✕</button>`).join("")}<button class="clr" data-x="all">Clear All</button>`
    : "";
}

function drawPager(pages) {
  const btn = (label, page, disabled) => `<button class="pg" ${disabled ? "disabled" : ""} data-p="${page}">${label}</button>`;

  $("#pager").innerHTML = pages > 1
    ? btn("‹", filter.page - 1, filter.page === 1)
      + Array.from({ length: pages }, (_, i) => `<button class="pg ${i + 1 === filter.page ? "on" : ""}" data-p="${i + 1}">${i + 1}</button>`).join("")
      + btn("›", filter.page + 1, filter.page === pages)
    : "";
}

/* Removes one filter (or all of them) when its chip is clicked */
function clearFilter(k) {
  if (k === "all") filter = FRESH();
  else if (k === "type") filter.types = { lost: true, found: true };
  else if (k === "mine") filter.mine = false;
  else if (k === "when") {
    filter.when = "all";
    filter.from = filter.to = "";
  } else filter.q = "";

  filter.page = 1;
}
