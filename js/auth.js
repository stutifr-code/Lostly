/* ---------- Sessions and sign-in ---------- */
function startSession(email, admin, remember) {
  if (!admin && isBlocked(email)) return fail("This account has been restricted by an admin.");

  session = { email: email.trim().toLowerCase(), admin, exp: Date.now() + (remember ? DAY : 2 * 36e5) };
  if (!CB) store.set("session", session);
  lastTotal = 0;
  go(admin ? "admin" : "home");
}

function logout() {
  if (session && !session.admin) supabaseClient.auth.signOut();

  session = null;
  authUserId = null;
  activeConversationId = null;
  cache.conversations = {};
  cache.msgs = {};
  store.del("session");
  captcha = false;
  chatWith = null;
  lastTotal = 0;
  document.title = APP_TITLE;
  go("login");
}

function toggleCaptcha() {
  captcha = !captcha;
  $("#cap").classList.toggle("ok", captcha);
  $("#cap .box").textContent = captcha ? "✓" : "";
}

function continueAsClaude() {
  const em = (ME.email || "").toLowerCase();
  if (!em) return fail("Your account's email isn't visible to this page.");
  if (!validEmail(em) && !ME.canEdit) return fail("Only @" + DOMAIN + " accounts can use Lostly.");
  return startSession(em, false, true);
}

function adminSignIn() {
  if (CB) {
    if (!ME.canEdit) return fail("This account is not an admin of this site.");
    return startSession(ME.email || ADMIN_EMAIL, true, false);
  }

  const em = prompt("Admin email:");
  if (em === null) return;
  const pw = prompt("Admin password:");
  if (pw === null) return;

  if (em.trim().toLowerCase() !== ADMIN_EMAIL || pw !== ADMIN_PASS) return fail("Wrong admin credentials.");
  return startSession(em, true, false);
}

async function register() {
  const fullName = $("#fullName").value.trim();
  const em = $("#em").value.trim().toLowerCase();
  const pw = $("#pw").value;

  if (!fullName) return fail("Please enter your full name.");
  if (!validEmail(em)) return fail("Use your @modyuniversity.ac.in email.");
  if (pw.length < 6) return fail("Password must be at least 6 characters.");
  if (!captcha) return fail("Please confirm you're not a robot.");

  const btn = $("#register");
  setBusy(btn, true, "Creating account...");

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: em,
      password: pw,
      options: { data: { full_name: fullName } }
    });

    setBusy(btn, false, "Create student account");
    if (error) return fail(error.message);
    if (!data.session) return fail("Account created! Please check your college email for a confirmation link.");

    authUserId = data.user.id;
    startSession(em, false, $("#rm").checked);

    try {
      await loadCloudItems();
      await loadCloudConversations();
    } catch (loadError) {
      console.error("Could not load new account data:", loadError);
    }
  } catch (error) {
    setBusy(btn, false, "Create student account");
    fail(error.message || "Registration failed.");
  }
}

async function signIn() {
  const em = $("#em").value.trim().toLowerCase();
  const pw = $("#pw").value;

  if (!validEmail(em)) return fail("Use your @modyuniversity.ac.in email.");
  if (pw.length < 6) return fail("Please enter your password (min 6 characters).");
  if (!captcha) return fail("Please confirm you're not a robot.");

  const btn = $("#go");
  setBusy(btn, true, "Signing in...");

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: em, password: pw });
    if (error) throw error;

    authUserId = data.user.id;
    setBusy(btn, false, "Sign in");

    startSession(data.user.email, false, $("#rm").checked);
    await loadCloudItems();

    try {
      await loadCloudConversations();
      if (view === "home") homeLive();
      notif();
    } catch (loadError) {
      console.error("Could not load conversations:", loadError);
      toast("Chats could not be loaded. Please refresh.");
    }
  } catch (error) {
    setBusy(btn, false, "Sign in");
    fail(error.message || "Sign-in failed.");
  }
}
