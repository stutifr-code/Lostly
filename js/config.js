/* ---------- Supabase ---------- */
const SUPABASE_URL = "https://yobisgphafhmuqkduvay.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3pSf4xEZ9QEIDU2dvosM1Q_RBYjyOeG";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const PHOTO_BUCKET = "item-photos";

/* ---------- Config ---------- */
const DOMAIN = "college.edu"; // your institution's email domain
const STUDENT_DOMAIN = "modyuniversity.ac.in";
const ADMIN_EMAIL = "admin@" + DOMAIN; // LOCAL (VS Code) mode only – change these!
const ADMIN_PASS = "admin123";
const KEY = "lostly_";
const DAY = 864e5;
const PER = 9;
const KINDS = ["items", "msgs", "flags", "blocked", "settings"];
const APP_TITLE = "Lostly – From missing to managed";

/* ---------- App state ---------- */
let CB = null;
let ME = null;
let session = null;
let authUserId = null;
let activeConversationId = null;
let view = "login";
let openId = null;
let chatWith = null;
let captcha = false;
let imgData = "";
let lastTotal = 0;
let slide = 0;
let atab = "over";

const FRESH = () => ({ types: { lost: true, found: true }, when: "all", from: "", to: "", q: "", sort: "new", page: 1, mine: false });
let filter = FRESH();
