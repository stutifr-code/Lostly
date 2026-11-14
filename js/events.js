/* ---------- Event handling ---------- */
document.addEventListener("click", async e => {
  const t = e.target;
  const q = s => t.closest(s);
  let x;

  // Clicking anywhere outside the notification panel closes it
  if (!q("#dd") && !q("#bell")) $("#dd")?.classList.add("hide");

  // Navigation and chats
  if ((x = q("[data-open]"))) return openThread(x.dataset.open);
  if ((x = q("[data-go]"))) {
    closeChat();
    return go(x.dataset.go);
  }
  if ((x = q("[data-item]"))) {
    openId = x.dataset.item;
    closeChat();
    return go("item");
  }
  if (q("[data-mine]")) {
    filter = FRESH();
    filter.mine = true;
    return go("db");
  }
  if (q("#mchat")) {
    const u = unreadList()[0];
    return u ? openThread(u.k) : toast("No unread chats 🎉");
  }

  // Admin
  if ((x = q("[data-atab]"))) {
    atab = x.dataset.atab;
    return render();
  }
  if ((x = q("[data-aview]"))) {
    openId = +x.dataset.aview;
    chatWith = null;
    return go("item");
  }
  if ((x = q("[data-aitem]")) && session.admin) return adminItemAction(x);
  if ((x = q("[data-aflag]")) && session.admin) return adminFlagAction(x);
  if ((x = q("[data-ablock]")) && session.admin) return adminToggleBlock(x);
  if ((x = q("[data-athread]")) && session.admin) return adminDeleteThread(x);
  if (q("#asave")) return saveSettings();
  if (q("#aexp")) return exportData();
  if (q("#areset")) return resetDemoData();

  // Item page
  if (q("[data-send-verification]")) return sendVerificationQuestion();
  if ((x = q("[data-act]"))) return itemAction(x);

  // Browse filters and pager
  if ((x = q("[data-x]"))) {
    clearFilter(x.dataset.x);
    return render();
  }
  if ((x = q("[data-p]")) && !x.disabled) {
    filter.page = +x.dataset.p;
    drawGrid();
    return window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if ((x = q(".pcard[data-id]"))) {
    openId = x.dataset.id;
    closeChat();
    return go("item");
  }

  // Header
  if (q("#bell")) return $("#dd").classList.toggle("hide");
  if (q("#out")) return logout();

  // Login
  if (q("#cap")) return toggleCaptcha();
  if (q("#cont")) return continueAsClaude();
  if (q("#adm")) return adminSignIn();
  if (q("#register")) return register();
  if (q("#go")) return signIn();

  // Posting and chatting
  if (q("#drop")) return $("#file").click();
  if (q("#sub")) return submitPost();
  if (q("#chatbtn")) return startChat();
  if (q("#ms")) return sendMsg();
});

document.addEventListener("input", e => {
  if (e.target.id !== "q") return;
  filter.q = e.target.value;
  filter.page = 1;
  drawGrid();
});

document.addEventListener("change", e => {
  const el = e.target;

  if (el.dataset.t) {
    filter.types[el.dataset.t] = el.checked;
    filter.page = 1;
    drawGrid();
  }
  if ("m" in el.dataset) {
    filter.mine = el.checked;
    filter.page = 1;
    drawGrid();
  }
  if (el.name === "when") {
    filter.when = el.value;
    filter.page = 1;
    render();
  }
  if (el.id === "sort") {
    filter.sort = el.value;
    drawGrid();
  }
  if (el.id === "from") {
    filter.from = el.value;
    drawGrid();
  }
  if (el.id === "to") {
    filter.to = el.value;
    drawGrid();
  }
  if (el.id === "file" && el.files[0]) handleImageFile(el.files[0]);
});

document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;

  if (e.target.id === "mi") {
    e.preventDefault();
    sendMsg();
  }
  if ((e.target.id === "pw" || e.target.id === "em") && $("#go")) $("#go").click();
});
