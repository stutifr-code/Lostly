/* ---------- Login screen ---------- */
const SLIDES = [
  ["Lost something on campus?", "Post it in 30 seconds and let your campus help you find it."],
  ["Found something?", "Report it and chat privately with the person who lost it."],
  ["From missing to managed.", "One simple place for every lost and found item."]
];

function drawSlide() {
  const h = $("#cph");
  if (!h) return;
  h.textContent = SLIDES[slide][0];
  $("#cpp").textContent = SLIDES[slide][1];
  document.querySelectorAll(".dots i").forEach((d, i) => d.classList.toggle("on", i === slide));
}

/* Floating emoji doodle */
const fl = (e, l, t, d) => `<span class="fl" style="left:${l}%;top:${t}%;--d:${d}s">${e}</span>`;

function loginView() {
  const form = CB
    ? `<p class="hint" style="text-align:center;margin:18px 0">Verified sign-in through your Claude account – no password or captcha needed.</p>
    <button class="pillbtn" id="cont">Continue as ${esc(ME.name || "you")}<br><small>${esc(ME.email || "")}</small></button><div class="err" id="err" style="text-align:center"></div>`
    : `<div class="field"><label for="fullName">Full name ${REQ}</label><input type="text" id="fullName" autocomplete="name" placeholder="Your full name"></div>
  <div class="field"><label for="em">Institution email ${REQ}</label><input type="email" id="em" autocomplete="email" placeholder="you@${STUDENT_DOMAIN}"></div>
  <div class="field"><label for="pw">Password ${REQ}</label><input type="password" id="pw" autocomplete="current-password"></div>
  <div class="capt ${captcha ? "ok" : ""}" id="cap"><div class="box">${captcha ? "✓" : ""}</div><span>I'm not a robot ${REQ}</span></div>
  <label class="rem"><input type="checkbox" id="rm"> Remember me</label>
  <div class="err" id="err"></div>
  <button class="pillbtn" id="go">Sign in</button>
  <button class="gbtn" id="register" style="margin-top:10px">Create student account</button>
  <p class="hint" style="text-align:center"><i class="req">*</i> Required field</p>`;

  return `<div class="split"><div class="lside">${fl("🔑", 10, 12, 0)}${fl("🎧", 78, 10, .6)}${fl("📚", 14, 52, 1.1)}${fl("🧥", 80, 48, .3)}${fl("🎒", 46, 6, .9)}${fl("💳", 24, 30, 1.6)}${fl("🔦", 68, 30, 1.3)}
    <div class="orb"><span>🔍</span></div><h2 id="cph"></h2><p id="cpp"></p><div class="dots"><i></i><i></i><i></i></div></div>
  <div class="rside"><div class="fwrap"><div style="text-align:center"><div class="logo biglogo">Lost<span>ly</span></div><p class="tagline">From missing to managed</p></div>
  <h2 class="wel">Welcome to Lostly</h2>${form}
  <button class="gbtn" id="adm" style="margin-top:6px">🔐 Admin sign in</button></div></div></div>`;
}
