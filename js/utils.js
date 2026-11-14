/* ---------- Small helpers ---------- */
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(KEY + k);
      return v ? JSON.parse(v) : d;
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) {}
  },
  del(k) {
    try { localStorage.removeItem(KEY + k); } catch (e) {}
  }
};

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const validEmail = e => new RegExp("^[^\\s@]+@" + STUDENT_DOMAIN.replace(/\./g, "\\.") + "$", "i").test(String(e).trim());
const nm = e => {
  const n = String(e).split("@")[0];
  return n.charAt(0).toUpperCase() + n.slice(1);
};
const ekey = e => String(e).toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
const REQ = `<i class="req" title="Required">*</i>`;

function setBusy(btn, busy, label) {
  btn.disabled = busy;
  btn.textContent = label;
}

function fail(m) {
  const e = $("#err");
  if (e) e.textContent = m;
}

function toast(t) {
  const e = $("#toast");
  e.textContent = t;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 2600);
}

/* Animates a number element from its current value to n */
function count(el, n) {
  if (!el) return;
  const start = +el.textContent || 0;
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / 600);
    el.textContent = Math.round(start + (n - start) * k);
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}
