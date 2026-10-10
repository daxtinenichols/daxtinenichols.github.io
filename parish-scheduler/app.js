/* Parish Volunteer Scheduler. Static front end; all data goes through the sched_ functions in setup.sql. */
(() => {
  "use strict";

  // ------------------------------------------------------------------ config
  const CFG = {
    url: "https://gnooccdpghgnveuhnjwv.supabase.co",
    key: "sb_publishable_W6J5oJkZsWHwUC_ANjXPyQ_yCNq7vl9", // public key, safe to publish
  };
  const QS = new URLSearchParams(location.search);
  if (QS.get("api") && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) CFG.url = QS.get("api"); // local testing only
  const BASE = location.origin + location.pathname;
  const QR_LIB = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
  const QR_SRI = "sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1"; // pinned: the page holds sign-in keys

  const DEFAULT_ROLES = ["Lector", "Eucharistic minister", "Altar server", "Usher", "Greeter", "Cantor", "Musician", "Sacristan", "Adoration monitor", "Adorer"];
  const EXTRA_ROLES = ["Gift bearers", "Livestream", "Hospitality", "Nursery"];
  // how many of each role a new Mass needs, by role name (Sunday, weekday)
  const NEEDS = {
    "lector": [2, 1], "eucharistic minister": [4, 1], "altar server": [2, 1], "usher": [2, 0], "greeter": [2, 0],
    "cantor": [1, 0], "musician": [0, 0], "sacristan": [1, 1], "gift bearers": [1, 0], "livestream": [1, 0],
  };
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // ------------------------------------------------------------------ small helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const dow = (s) => parse(s).getDay();
  const fmtDay = (s, o = { weekday: "long", month: "long", day: "numeric" }) => parse(s).toLocaleDateString(undefined, o);
  const fmtShort = (s) => fmtDay(s, { weekday: "short", month: "short", day: "numeric" });
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmtTime = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };
  const first = (name) => String(name || "").trim().split(/\s+/)[0];
  const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
  const store = {
    mem: {},
    get(k) { try { return localStorage.getItem(k); } catch { return this.mem[k] ?? null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { this.mem[k] = v; } },
  };
  const ICON = {
    day: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
    mine: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/></svg>',
    open: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3 2"/></svg>',
    people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c.9-3.3 3.3-5 6.5-5s5.6 1.7 6.5 5"/><circle cx="17" cy="9.5" r="2.7"/><path d="M17.5 14.5c2.2.3 3.6 1.9 4.2 4.5"/></svg>',
    setup: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.3"/><circle cx="10" cy="17" r="2.3"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg>',
    text: '<svg viewBox="0 0 24 24"><path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4.5 3.5v-3.5h0a1 1 0 0 1-1-1z"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>',
    qr: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2M20 14v6h-4M14 18v2"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 12.5v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
    print: '<svg viewBox="0 0 24 24"><path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  };

  // ------------------------------------------------------------------ server
  const ERRORS = {
    "signed-out": "This sign-in link doesn't work any more. Ask your parish coordinator to send you a new one.",
    "coordinators-only": "Only a coordinator can do that.",
    "not-your-spot": "That spot isn't yours any more. The schedule has been refreshed.",
    "no-such-spot": "That spot isn't on the schedule any more.",
    "too-many": "That's more than this free tool allows. Please remove a few first.",
    "cannot-remove-yourself": "You can't remove yourself. Ask another coordinator to do it.",
    "bad-dates": "Please check the dates.",
    "in-the-past": "That day has already passed.",
    "busy": "A lot of parishes are being set up right now. Please try again in an hour.",
    "confirm-name": "The name you typed doesn't match your parish's name, so nothing was deleted.",
  };
  async function rpc(fn, args) {
    let r;
    try {
      r = await fetch(`${CFG.url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { apikey: CFG.key, ...(CFG.key.startsWith("eyJ") ? { Authorization: `Bearer ${CFG.key}` } : {}), "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
    } catch {
      throw new Error("We couldn't reach the scheduler. Check your internet connection and try again.");
    }
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = text; }
    if (!r.ok) {
      const msg = (body && body.message) || "";
      const e = new Error(ERRORS[msg] || "Something went wrong. Please try again.");
      e.code = msg;
      throw e;
    }
    return body;
  }

  // ------------------------------------------------------------------ state
  const S = { key: store.get("sched.key"), data: null, from: null, view: store.get("sched.view") || "day", day: today(), wizard: null, busy: false };
  const LOAD_DAYS = 70;
  let D = null; // indexed copy of S.data

  async function load(from) {
    S.from = from || S.from || addDays(today(), -7);
    S.data = await rpc("sched_load", { p_key: S.key, p_from: S.from, p_days: LOAD_DAYS });
    index();
  }
  async function reload() {
    try { await load(); render(); } catch (e) { handleError(e); }
  }
  function index() {
    const d = S.data;
    D = { ...d, role: {}, person: {}, slot: {}, assign: new Map(), req: new Map() };
    d.roles.forEach((r) => (D.role[r.id] = r));
    d.people.forEach((p) => (D.person[p.id] = p));
    d.events.forEach((e) => e.slots.forEach((s) => { s.event = e; D.slot[s.id] = s; }));
    d.assign.forEach((a) => D.assign.set(`${a.slot}|${a.day}|${a.seat}`, a.person));
    d.requests.forEach((q) => D.req.set(`${q.slot}|${q.day}|${q.seat}`, q));
    D.me = d.me;
    D.coord = !!d.me.is_coordinator;
    const pn = $("#parish-name");
    if (pn) pn.textContent = d.parish.name;
  }
  const inRange = (day) => day >= S.from && day < addDays(S.from, LOAD_DAYS);
  async function ensureDay(day) {
    if (!inRange(day)) await load(addDays(day, -14));
  }

  // ------------------------------------------------------------------ schedule maths
  const occurs = (e, day) => day >= e.starts_on && (!e.ends_on || day <= e.ends_on) && (e.on_date ? day === e.on_date : e.days.includes(dow(day)));
  function personAt(slot, day, seat, overlay) {
    const k = `${slot.id}|${day}|${seat}`;
    if (overlay && overlay.has(k)) return overlay.get(k);
    if (D.assign.has(k)) return D.assign.get(k);
    return slot.standing[seat] || null;
  }
  const eventsOn = (day) => D.events.filter((e) => occurs(e, day));
  function seatsOn(day, overlay) {
    const out = [];
    for (const e of eventsOn(day)) for (const s of e.slots) for (let i = 0; i < s.seats; i++) {
      out.push({ slot: s, event: e, day, seat: i, person: personAt(s, day, i, overlay), req: D.req.get(`${s.id}|${day}|${i}`) });
    }
    return out;
  }
  const hasRole = (pid, roleId) => !!D.person[pid] && D.person[pid].roles.includes(roleId);
  const isAway = (pid, day) => D.away.some((w) => w.person === pid && w.from <= day && day <= w.to);
  // Why a person can't take a seat on this day, or null when they are free.
  function busyReason(pid, day, event, overlay) {
    if (isAway(pid, day)) return "Away that day";
    const a = toMin(event.start_time), b = a + event.minutes;
    for (const e of eventsOn(day)) {
      const c = toMin(e.start_time), d = c + e.minutes;
      if (c >= b || d <= a) continue;
      for (const s of e.slots) for (let i = 0; i < s.seats; i++) {
        if (personAt(s, day, i, overlay) === pid) {
          return e.id === event.id ? `Already serving at this ${e.title.match(/mass/i) ? "Mass" : "time"} (${D.role[s.role_id].name})` : `Serving ${fmtTime(e.start_time)} ${e.title}`;
        }
      }
    }
    return null;
  }
  const spotLabel = (seat) => `${D.role[seat.slot.role_id].name}, ${seat.event.title}, ${fmtShort(seat.day)} at ${fmtTime(seat.event.start_time)}`;
  // Requests waiting for my answer.
  function asksForMe() {
    const t = addDays(today(), -1);
    return D.requests.filter((q) => {
      const s = D.slot[q.slot];
      if (!s || q.day < t || q.from === D.me.id || q.declined.includes(D.me.id)) return false;
      if (personAt(s, q.day, q.seat) === D.me.id) return false;
      return q.asked.length ? q.asked.includes(D.me.id) : hasRole(D.me.id, s.role_id);
    }).sort((a, b) => (a.day + D.slot[a.slot].event.start_time).localeCompare(b.day + D.slot[b.slot].event.start_time));
  }
  function openSeats(days, mineOnly) {
    const out = [];
    for (let i = 0; i < days; i++) {
      const day = addDays(today(), i);
      if (!inRange(day)) break;
      for (const st of seatsOn(day)) {
        if (st.person) continue;
        if (mineOnly && !hasRole(D.me.id, st.slot.role_id)) continue;
        out.push(st);
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ links and sharing
  const personalLink = (p) => `${BASE}#join=${p.key}`;
  const smsHref = (phone, body) => `sms:${encodeURIComponent(phone.replace(/[^\d+]/g, ""))}?&body=${encodeURIComponent(body)}`;
  const mailHref = (email, subject, body) => `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const inviteText = (p) => `Hi ${first(p.name)}! Here is your link to the ${D.parish.name} volunteer schedule. Tap it once and you're signed in, no password needed:\n${personalLink(p)}`;
  function shareButtons(p, text, subject) {
    const b = [];
    if (p.phone) b.push(`<a class="btn ghost small" href="${esc(smsHref(p.phone, text))}">${ICON.text} Text</a>`);
    if (p.email) b.push(`<a class="btn ghost small" href="${esc(mailHref(p.email, subject, text))}">${ICON.mail} Email</a>`);
    b.push(`<button class="btn ghost small" type="button" data-act="copy" data-text="${esc(text)}">${ICON.copy} Copy</button>`);
    return b.join("");
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast("Copied. You can paste it into a text or email."); }
    catch { window.prompt("Copy this:", text); }
  }
  async function share(text) {
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e.name === "AbortError") return; } }
    copy(text);
  }
  let qrLoading = null;
  function qrSvg(text, size = 4) {
    if (!window.qrcode) return "";
    const q = window.qrcode(0, "M"); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: size, margin: 2, scalable: true });
  }
  function needQr() {
    if (window.qrcode) return Promise.resolve();
    return (qrLoading ||= new Promise((ok, fail) => {
      const s = document.createElement("script"); s.src = QR_LIB; s.integrity = QR_SRI; s.crossOrigin = "anonymous"; s.onload = ok; s.onerror = () => { qrLoading = null; fail(new Error("We couldn't load the QR code maker. Check your connection.")); };
      document.head.appendChild(s);
    }));
  }

  // ------------------------------------------------------------------ toast and sheets
  let toastTimer;
  function toast(msg) {
    $(".toast")?.remove();
    const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 4200);
  }
  let sheetCtx = null;
  function sheet(title, sub, body, ctx = {}) {
    sheetCtx = ctx;
    $("#sheet-root").innerHTML = `<div class="sheet-back" data-act="close-back"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div class="grab"></div><div class="sheet-head"><div style="flex:1"><h2 id="sheet-title">${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>
      <button class="close" type="button" data-act="close" aria-label="Close">×</button></div>${body}</div></div>`;
    document.body.style.overflow = "hidden";
    setTimeout(() => ($(".sheet input:not([type=checkbox]), .sheet textarea") || $(".sheet .btn"))?.focus({ preventScroll: true }), 60);
  }
  function closeSheet() { $("#sheet-root").innerHTML = ""; sheetCtx = null; document.body.style.overflow = ""; }
  function handleError(e) {
    if (e.code === "signed-out") {
      S.key = null; store.set("sched.key", null); closeSheet();
      renderWelcome(ERRORS["signed-out"]);
      return;
    }
    toast(e.message || "Something went wrong.");
  }
  // Runs an action with the button disabled; reloads afterwards.
  async function act(btn, fn, done) {
    if (S.busy) return;
    S.busy = true; if (btn) btn.disabled = true;
    try { const r = await fn(); if (done) await done(r); }
    catch (e) { handleError(e); }
    finally { S.busy = false; if (btn && btn.isConnected) btn.disabled = false; }
  }

  // ------------------------------------------------------------------ top-level render
  function setChrome(signedIn) {
    document.body.classList.toggle("signed-in", signedIn);
    $("#tabs").hidden = !signedIn;
    $("#me-btn").hidden = !signedIn;
    $("#top-links").hidden = signedIn;
    if (!signedIn) $("#parish-name").textContent = "Free for every parish";
  }
  function render() {
    if (!S.key || !D) return renderWelcome();
    if (S.wizard != null) return renderWizard();
    setChrome(true);
    $("#me-btn").textContent = initials(D.me.name);
    const tabs = [["day", "Schedule"], ["mine", "My spots"], ["open", "Open spots"]];
    if (D.coord) tabs.push(["people", "People"], ["setup", "Setup"]);
    if (!tabs.some((t) => t[0] === S.view)) S.view = "day";
    const openCount = openSeats(14, !D.coord).length + (D.coord ? 0 : asksForMe().filter((q) => personAt(D.slot[q.slot], q.day, q.seat)).length);
    $("#tabs").innerHTML = tabs.map(([id, label]) => `<button class="tab" type="button" data-act="tab" data-view="${id}" ${S.view === id ? 'aria-current="page"' : ""}>
      ${ICON[id]}<span>${label}</span>${id === "open" && openCount ? `<span class="badge" aria-label="${openCount} open">${openCount > 99 ? "99+" : openCount}</span>` : ""}</button>`).join("");
    const main = $("#main");
    main.innerHTML = ({ day: viewDay, mine: viewMine, open: viewOpen, people: viewPeople, setup: viewSetup }[S.view])();
    const cur = $(".strip [aria-current]");
    if (cur) cur.scrollIntoView({ block: "nearest", inline: "center" });
  }

  // ------------------------------------------------------------------ welcome (signed out)
  const TOOLS = [
    ["/church-finder/", "Church Finder", "Find a Catholic church near you, with Mass times and directions.", '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 30s-9-8.6-9-16a9 9 0 0 1 18 0c0 7.4-9 16-9 16z" fill="#e1e9da" stroke="#4d6d51" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 8.2v9.6M12.4 11.6h7.2" stroke="#a87f33" stroke-width="2" stroke-linecap="round"/></svg>'],
    ["/parish-studio/", "Parish Website Studio", "Help your parish get a free, warm website in an afternoon.", '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 1.8v5.4M13.7 4h4.6" stroke="#a87f33" stroke-width="1.7" stroke-linecap="round"/><path d="M7 15.2V29h18V15.2L16 9.6z" fill="#e1e9da"/><path d="M4.5 16.2L16 9.2l11.5 7" fill="none" stroke="#4d6d51" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="16.8" r="2.1" fill="#f1d59c"/><path d="M13.2 29v-5.2a2.8 2.8 0 0 1 5.6 0V29z" fill="#f1d59c"/><rect x="4" y="28.2" width="24" height="2.6" rx="1.2" fill="#b99572"/></svg>'],
    ["/first-mass/", "Your First Mass", "A gentle walkthrough for anyone going to Mass for the first time.", '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 1.6v5.2M13.6 3.8h4.8" stroke="#a87f33" stroke-width="1.7" stroke-linecap="round"/><path d="M6.5 29V17.5a9.5 9.5 0 0 1 19 0V29z" fill="#d9ccb4"/><path d="M10.5 29V18a5.5 5.5 0 0 1 11 0v11z" fill="#f1d59c"/><path d="M14.6 29l.7-8h1.4l.7 8z" fill="#fff7e2"/><rect x="4" y="28.2" width="24" height="2.6" rx="1.2" fill="#b99572"/></svg>'],
    ["/", "Tree of Life", "Big questions about God, one at a time, with honest answers and sources.", '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 30V14" stroke="#8c7a66" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M16 19c-5 0-8-3-9-8 5 0 8 3 9 8z" fill="#6f9a6c"/><path d="M16 15c5 0 8-3 9-8-5 0-8 3-9 8z" fill="#4b7651"/><circle cx="16" cy="7" r="3.2" fill="#d6a546"/></svg>'],
  ];
  const toolsHtml = (title = "More free tools for your parish") => `<section class="tools"><h3>${title}</h3><div class="tool-list">${TOOLS.map(([href, name, blurb, icon]) =>
    `<a href="${href}">${icon}<span><b>${name}</b><small>${blurb}</small></span></a>`).join("")}</div></section>`;
  const HERO_ART = `<svg class="hero-art" viewBox="0 0 760 150" aria-hidden="true">
    <defs><linearGradient id="hw" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f6e9c8" stop-opacity=".9"/><stop offset="1" stop-color="#faf6ee" stop-opacity="0"/></linearGradient></defs>
    <path d="M0 130 C 160 100, 300 140, 420 118 S 640 96, 760 124 V150 H0z" fill="#e4ecdf" opacity=".7"/>
    <ellipse cx="380" cy="70" rx="300" ry="62" fill="url(#hw)"/>
    ${[["9:00", "Lector", "Rose"], ["10:30", "Usher", "Tom"], ["12:00", "Cantor", "Grace"]].map(([t, r, n], i) => `
      <g transform="translate(${118 + i * 190} ${30 + (i % 2) * 10})"><rect width="164" height="78" rx="14" fill="#fffdf8" stroke="#e6dccb"/>
      <text x="16" y="30" font-family="Cormorant Garamond, Georgia, serif" font-weight="600" font-size="22" fill="#2b2622">${t}</text>
      <text x="16" y="56" font-family="Source Sans 3, system-ui, sans-serif" font-size="15" fill="#6b5f55">${r}</text>
      <rect x="86" y="40" width="64" height="24" rx="12" fill="${i === 1 ? "#f7e4dc" : "#f6e9c8"}"/>
      <text x="118" y="57" text-anchor="middle" font-family="Source Sans 3, system-ui, sans-serif" font-size="14" font-weight="600" fill="${i === 1 ? "#8a3b29" : "#7a5a1d"}">${i === 1 ? "Open" : n}</text></g>`).join("")}
    <path d="M380 12v14M373 19h14" stroke="#a87f33" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;
  function renderWelcome(warning) {
    setChrome(false);
    S.wizard = null;
    $("#main").innerHTML = `
      <section class="hero">
        <p class="eyebrow">Free for every parish · no passwords</p>
        <h1>A simple volunteer schedule for your parish</h1>
        <p class="lede">See who is serving at every Mass, swap in one tap, and find a replacement fast when someone is sick.</p>
        ${warning ? `<div class="card ask-card"><p>${esc(warning)}</p></div>` : ""}
        ${HERO_ART}
        <div class="choices">
          <div class="card choice"><h3>I organize volunteers</h3><p class="muted">Set up your parish in a few minutes: your Masses, your ministries and your people.</p>
            <button class="btn primary" type="button" data-act="start-setup">Set up my parish</button></div>
          <div class="card choice"><h3>I'm a volunteer</h3><p class="muted">Your coordinator sends you a personal link by text or email. Tap it once and you're in.</p>
            <button class="btn ghost" type="button" data-act="volunteer-help">How do I sign in?</button></div>
        </div>
      </section>
      <section class="features">
        <div class="feature">${featureIcon("day")}<h3>Today at a glance</h3><p>Every Mass and every hour of adoration, with who is doing what, in large, clear type.</p></div>
        <div class="feature">${featureIcon("swap")}<h3>Sick? Two taps.</h3><p>Tap your name, tap "I can't make it". The app asks the people who are free, and the first to say yes takes it.</p></div>
        <div class="feature">${featureIcon("heart")}<h3>Free, and stays free</h3><p>No ads, no fees, no passwords to forget. Volunteers only see names, never each other's phone numbers.</p></div>
      </section>
      ${toolsHtml()}
      <footer class="foot">Made with care for the Church. Part of the <a href="/">Tree of Life</a> family of free tools.<br>A one-person project, built with the help of Claude, an AI model. <a href="/about/">About</a> &middot; <a href="/about/#privacy">Privacy</a></footer>`;
  }
  function featureIcon(kind) {
    const p = {
      day: '<rect x="6" y="9" width="28" height="25" rx="5" fill="#e4ecdf" stroke="#4d6d51" stroke-width="2"/><path d="M6 16h28M13 5v7M27 5v7" stroke="#4d6d51" stroke-width="2" stroke-linecap="round"/><path d="M13 23h8M13 28h12" stroke="#a87f33" stroke-width="2.2" stroke-linecap="round"/>',
      swap: '<path d="M8 14h22l-5-5M32 26H10l5 5" fill="none" stroke="#4d6d51" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="20" r="3" fill="#a87f33"/>',
      heart: '<path d="M20 33s-12-7.4-12-16a6.5 6.5 0 0 1 12-3.4A6.5 6.5 0 0 1 32 17c0 8.6-12 16-12 16z" fill="#f6e9c8" stroke="#a87f33" stroke-width="2" stroke-linejoin="round"/><path d="M20 15v10M16 19h8" stroke="#4d6d51" stroke-width="2" stroke-linecap="round"/>',
    }[kind];
    return `<svg viewBox="0 0 40 40" aria-hidden="true">${p}</svg>`;
  }

  // ------------------------------------------------------------------ setup wizard
  const W = { step: 0, parish: "", place: "", you: "", email: "", phone: "", roles: [...DEFAULT_ROLES], extra: [] };
  const STEP_COUNT = 5;
  function renderWizard() {
    setChrome(!!D);
    if (D) { $("#tabs").hidden = true; $("#me-btn").hidden = true; }
    const st = S.wizard;
    const bar = `<div class="steps" aria-label="Step ${st + 1} of ${STEP_COUNT}">${Array.from({ length: STEP_COUNT }, (_, i) => `<i class="${i <= st ? "on" : ""}"></i>`).join("")}</div>`;
    let body = "";
    if (st === 0) {
      body = `<p class="eyebrow">Step 1 of 5</p><h2>Your parish</h2><p class="lede">This takes about five minutes. You can change anything later.</p>
        <div class="stack">
          <label class="field"><span>Parish name</span><input type="text" id="w-parish" maxlength="120" value="${esc(W.parish)}" placeholder="St. Brigid Catholic Church" autocomplete="organization"></label>
          <label class="field"><span>Town or city</span><input type="text" id="w-place" maxlength="120" value="${esc(W.place)}" placeholder="Springfield"></label>
          <label class="field"><span>Your name</span><input type="text" id="w-you" maxlength="80" value="${esc(W.you)}" autocomplete="name"></label>
          <div class="grid2">
            <label class="field"><span>Your email <span class="muted">(optional)</span></span><input type="email" id="w-email" maxlength="200" value="${esc(W.email)}" autocomplete="email"></label>
            <label class="field"><span>Your mobile <span class="muted">(optional)</span></span><input type="tel" id="w-phone" maxlength="40" value="${esc(W.phone)}" autocomplete="tel"></label>
          </div>
        </div>
        <div class="wiz-nav"><button class="btn quiet" type="button" data-act="home">Cancel</button><button class="btn primary" type="button" data-act="wiz-next">Next</button></div>`;
    } else if (st === 1) {
      const all = [...DEFAULT_ROLES, ...EXTRA_ROLES, ...W.extra.filter((r) => !DEFAULT_ROLES.includes(r) && !EXTRA_ROLES.includes(r))];
      body = `<p class="eyebrow">Step 2 of 5</p><h2>Which ministries do you schedule?</h2><p class="lede">Tap to choose. Add any others your parish has.</p>
        <div class="chips" id="w-roles">${all.map((r) => `<button class="chip" type="button" data-act="chip" data-role="${esc(r)}" aria-pressed="${W.roles.includes(r)}">${esc(r)}</button>`).join("")}</div>
        <div class="row" style="margin-top:20px"><input type="text" id="w-custom" maxlength="60" placeholder="Another ministry, e.g. Bereavement team" style="flex:1;min-width:220px"><button class="btn ghost" type="button" data-act="wiz-add-role">Add</button></div>
        <div class="wiz-nav"><button class="btn quiet" type="button" data-act="wiz-back">Back</button><button class="btn primary" type="button" data-act="wiz-create">Create my parish</button></div>`;
    } else if (st === 2) {
      const evs = sortedEvents();
      body = `<p class="eyebrow">Step 3 of 5</p><h2>When are your Masses?</h2><p class="lede">Add each weekly Mass once. It repeats every week on its own, so you never enter days by hand.</p>
        ${evs.length ? `<div class="card" style="margin-bottom:16px">${evs.map(evLine).join("")}</div>` : ""}
        <p class="muted small" style="margin-bottom:10px">Quick add:</p>
        <div class="chips">
          ${[["Saturday Vigil Mass", "17:00", [6]], ["Sunday Mass", "08:00", [0]], ["Sunday Mass", "10:30", [0]], ["Sunday Mass", "12:00", [0]], ["Weekday Mass", "08:00", [1, 2, 3, 4, 5]]]
            .map(([t, h, d]) => `<button class="chip" type="button" data-act="quick-event" data-title="${t}" data-time="${h}" data-days="${d.join(",")}">+ ${d.length > 1 ? "Weekdays" : DAYS_LONG[d[0]]} ${fmtTime(h)}</button>`).join("")}
        </div>
        <div class="row" style="margin-top:16px"><button class="btn ghost" type="button" data-act="edit-event">Add another Mass or event</button><button class="btn ghost" type="button" data-act="adoration">Add adoration hours</button></div>
        <div class="wiz-nav"><span></span><button class="btn primary" type="button" data-act="wiz-next">${evs.length ? "Next" : "Skip for now"}</button></div>`;
    } else if (st === 3) {
      const ppl = D.people.filter((p) => p.id !== D.me.id);
      body = `<p class="eyebrow">Step 4 of 5</p><h2>Add your volunteers</h2><p class="lede">Type or paste names, one per line. Add an email or mobile number after a comma if you have it.</p>
        ${addPeopleForm()}
        ${ppl.length ? `<div class="section-head"><h3>${plural(ppl.length, "person", "people")} so far</h3><span class="muted small">Tap a name to change their ministries</span></div><div class="card flush">${ppl.map(personRow).join("")}</div>` : ""}
        <div class="wiz-nav"><button class="btn quiet" type="button" data-act="wiz-back">Back</button><button class="btn primary" type="button" data-act="wiz-next">${ppl.length ? "Next" : "Skip for now"}</button></div>`;
    } else {
      body = `<p class="eyebrow">Step 5 of 5</p><h2>Your parish is ready</h2>
        <p class="lede">One last thing: this device is now signed in as you. Save your own link so you can sign in on another phone or computer.</p>
        <div class="card stack"><b>Your coordinator link</b><p class="muted small">Keep it private. Anyone with it can manage your schedule.</p>
          <div class="row">${shareButtons({ ...D.me, key: S.key, phone: "" }, `Your link to the ${D.parish.name} volunteer schedule:\n${BASE}#join=${S.key}`, "My parish scheduler link")}</div></div>
        <div class="card stack" style="margin-top:16px"><b>Send everyone their link</b><p class="muted small">Each volunteer has their own link. Send it by text or email, or print cards with a code they can scan with their phone camera.</p>
          <div class="row"><button class="btn ghost" type="button" data-act="send-links">${ICON.share} Send links</button><button class="btn ghost" type="button" data-act="print-cards">${ICON.print} Print sign-in cards</button></div></div>
        <div class="wiz-nav"><span></span><button class="btn primary" type="button" data-act="wiz-done">Go to the schedule</button></div>`;
    }
    $("#main").innerHTML = `<section class="wizard">${bar}${body}</section>`;
  }
  function readWizard0() {
    W.parish = $("#w-parish").value.trim(); W.place = $("#w-place").value.trim(); W.you = $("#w-you").value.trim();
    W.email = $("#w-email").value.trim(); W.phone = $("#w-phone").value.trim();
  }

  // ------------------------------------------------------------------ Schedule (day) view
  function viewDay() {
    const day = S.day, t = today();
    const strip = Array.from({ length: 21 }, (_, i) => addDays(t, i - 3)).filter(inRange).map((d) => {
      const seats = seatsOn(d);
      const open = seats.some((s) => !s.person), mine = seats.some((s) => s.person === D.me.id);
      return `<button type="button" data-act="go-day" data-day="${d}" class="${d === t ? "today" : ""}" ${d === day ? 'aria-current="date"' : ""} aria-label="${fmtDay(d)}">
        <small>${DAYS[dow(d)]}</small><b>${parse(d).getDate()}</b><i class="${mine ? "mine" : open ? "open" : ""}"></i></button>`;
    }).join("");
    const asks = asksForMe();
    const evs = eventsOn(day);
    const cards = evs.map((e) => {
      const rows = e.slots.map((s) => {
        const seats = Array.from({ length: s.seats }, (_, i) => seatButton({ slot: s, event: e, day, seat: i, person: personAt(s, day, i), req: D.req.get(`${s.id}|${day}|${i}`) })).join("");
        return `<div class="role-row"><div class="role">${esc(D.role[s.role_id].name)}</div><div class="seats">${seats}</div></div>`;
      }).join("");
      const open = e.slots.reduce((n, s) => n + Array.from({ length: s.seats }, (_, i) => personAt(s, day, i)).filter((p) => !p).length, 0);
      const status = !e.slots.length ? "" : open ? `<span class="status open">${plural(open, "spot")} open</span>` : `<span class="status">${ICON.check.replace("<svg", '<svg width="18" height="18" style="fill:none;stroke:currentColor;stroke-width:2.4"')} All covered</span>`;
      return `<article class="card event"><div class="event-head"><span class="time">${fmtTime(e.start_time)}</span><span class="title">${esc(e.title)}</span>${status}</div>
        ${e.note ? `<p class="event-note">${esc(e.note)}</p>` : ""}
        ${rows || `<p class="event-note">No ministries added to this ${D.coord ? `yet. <a href="#" data-act="edit-event" data-id="${e.id}">Add some</a>` : "one yet"}.</p>`}</article>`;
    }).join("");
    const label = day === t ? "Today" : day === addDays(t, 1) ? "Tomorrow" : day === addDays(t, -1) ? "Yesterday" : DAYS_LONG[dow(day)];
    return `
      ${asks.length ? `<div class="stack" style="margin-bottom:24px">${asks.slice(0, 3).map(askCard).join("")}${asks.length > 3 ? `<button class="btn quiet" type="button" data-act="tab" data-view="open">See ${asks.length - 3} more</button>` : ""}</div>` : ""}
      <div class="day-head">
        <h1>${label}<span class="sub">${fmtDay(day, { weekday: day === t || Math.abs(parse(day) - parse(t)) <= 864e5 ? "long" : undefined, month: "long", day: "numeric", year: "numeric" })}</span></h1>
        <button class="round" type="button" data-act="go-day" data-day="${addDays(day, -1)}" aria-label="Previous day">${ICON.left}</button>
        <button class="round" type="button" data-act="go-day" data-day="${addDays(day, 1)}" aria-label="Next day">${ICON.right}</button>
      </div>
      <div class="strip" aria-label="Choose a day">${strip}</div>
      ${day !== t ? `<p style="margin:4px 0 8px"><button class="btn quiet small" type="button" data-act="go-day" data-day="${t}">Back to today</button></p>` : ""}
      <div class="stack" style="margin-top:12px">${cards || `<div class="card empty-note">${D.events.length ? "Nothing on the schedule this day." : D.coord ? `No Masses or events yet. <a href="#" data-act="tab" data-view="setup">Add your Masses</a> and they will repeat every week.` : "Your coordinator hasn't added any Masses yet."}</div>`}</div>`;
  }
  function seatButton(st) {
    const p = st.person && D.person[st.person];
    const mine = st.person === D.me.id;
    const data = `data-act="seat" data-slot="${st.slot.id}" data-day="${st.day}" data-seat="${st.seat}"`;
    if (!st.person) {
      const asked = st.req ? (st.req.asked.length ? `Asking ${plural(st.req.asked.length, "person", "people")}` : "Asking everyone") : canDo(st) ? "Tap if you can do it" : "Needs someone";
      return `<button class="seat empty ${st.req ? "asking" : ""}" type="button" ${data}><span>Open<em>${asked}</em></span></button>`;
    }
    const looking = st.req && st.req.kept ? `<em>Looking for cover</em>` : "";
    return `<button class="seat ${mine ? "mine" : ""}" type="button" ${data}><span>${mine ? "You" : esc(p ? p.name : "Someone")}${looking}</span></button>`;
  }
  const canDo = (st) => hasRole(D.me.id, st.slot.role_id);
  function askCard(q) {
    const s = D.slot[q.slot]; const st = { slot: s, event: s.event, day: q.day, seat: q.seat };
    const who = q.from && D.person[q.from] ? D.person[q.from].name : "Someone";
    const role = D.role[s.role_id].name;
    return `<div class="card ask-card"><p><b>${esc(first(who))}</b> needs someone for <b>${esc(role)}</b> at ${esc(s.event.title)}, <b>${fmtDay(q.day, { weekday: "long", month: "short", day: "numeric" })} at ${fmtTime(s.event.start_time)}</b>. Can you do it?${q.note ? `<br><span class="muted">“${esc(q.note)}”</span>` : ""}</p>
      <div class="row"><button class="btn primary" type="button" data-act="accept" data-id="${q.id}">Yes, I can do it</button><button class="btn ghost" type="button" data-act="decline" data-id="${q.id}">Not this time</button></div>
      ${busyReason(D.me.id, q.day, s.event) ? `<p class="muted small" style="margin:10px 0 0">Heads up: you are ${esc(busyReason(D.me.id, q.day, s.event).replace(/^./, (c) => c.toLowerCase()))}.</p>` : ""}</div>`;
  }

  // ------------------------------------------------------------------ seat actions
  function seatFrom(el) {
    const slot = D.slot[el.dataset.slot]; if (!slot) return null;
    const day = el.dataset.day, seat = +el.dataset.seat;
    return { slot, event: slot.event, day, seat, person: personAt(slot, day, seat), req: D.req.get(`${slot.id}|${day}|${seat}`) };
  }
  const seatData = (st) => `data-slot="${st.slot.id}" data-day="${st.day}" data-seat="${st.seat}"`;
  function openSeat(st) {
    const role = D.role[st.slot.role_id].name;
    const title = `${esc(role)}`;
    const sub = `${esc(st.event.title)} · ${fmtDay(st.day, { weekday: "long", month: "long", day: "numeric" })} at ${fmtTime(st.event.start_time)}`;
    const d = seatData(st);
    const past = st.day < today();
    const a = [];
    let lead = "";
    const standing = st.slot.standing[st.seat];
    if (st.person === D.me.id) {
      lead = `<p style="margin-bottom:16px">You're on the schedule. Thank you!</p>`;
      if (!past) {
        a.push(`<button class="btn warn" type="button" data-act="pick-ask" data-release="1" ${d}>I can't make it <small>Sick, away or busy</small></button>`);
        if (!(st.req && st.req.kept)) a.push(`<button class="btn ghost" type="button" data-act="pick-ask" data-release="0" ${d}>Find someone to swap with <small>You stay on until someone says yes</small></button>`);
      }
    } else if (st.person) {
      const p = D.person[st.person];
      lead = `<p style="margin-bottom:16px"><b>${esc(p ? p.name : "Someone")}</b> is serving.${st.req && st.req.kept ? " They're looking for someone to take their place." : ""}</p>`;
      if (st.req && st.req.kept && !past && (canDo(st) || D.coord)) a.push(`<button class="btn primary" type="button" data-act="accept" data-id="${st.req.id}">I can do it instead</button>`);
      if (D.coord && !past) {
        a.push(`<button class="btn warn" type="button" data-act="pick-ask" data-release="1" ${d}>${esc(first(p?.name))} can't make it <small>Find a replacement</small></button>`);
        a.push(`<button class="btn ghost" type="button" data-act="pick-assign" ${d}>Put someone else in</button>`);
      }
    } else {
      lead = `<p style="margin-bottom:16px">${st.req ? `This spot is open. ${st.req.asked.length ? `We've asked ${esc(st.req.asked.map((id) => first(D.person[id]?.name)).filter(Boolean).join(", "))}.` : "Everyone who does this ministry has been asked."} The first to say yes gets it.` : "Nobody is down for this spot yet."}</p>`;
      if (!past && canDo(st)) a.push(`<button class="btn primary" type="button" data-act="take" ${d}>I can do it</button>`);
      if (D.coord && !past) {
        a.push(`<button class="btn ${canDo(st) ? "ghost" : "primary"}" type="button" data-act="pick-assign" ${d}>Choose someone</button>`);
        a.push(`<button class="btn ghost" type="button" data-act="pick-ask" data-release="0" ${d}>${st.req ? "Ask more people" : "Ask people if they can"} <small>First yes gets it</small></button>`);
      }
      if (!canDo(st) && !D.coord) lead += `<p class="muted small">This spot needs a ${esc(role.toLowerCase())}. If you'd like to help with this ministry, let your coordinator know.</p>`;
    }
    if (st.req && (D.coord || st.req.from === D.me.id) && !past) a.push(`<button class="btn quiet" type="button" data-act="cancel-req" data-id="${st.req.id}">Stop asking for cover</button>`);
    if (D.coord) {
      if (st.person && st.person !== standing) a.push(`<button class="btn quiet" type="button" data-act="standing" data-person="${st.person}" ${d}>Make ${esc(first(D.person[st.person]?.name))} the regular ${esc(role.toLowerCase())} here every week</button>`);
      if (standing) a.push(`<button class="btn quiet" type="button" data-act="standing" data-person="" ${d}>Stop scheduling ${esc(first(D.person[standing]?.name))} here every week</button>`);
      if (st.person && !past) a.push(`<button class="btn quiet" type="button" data-act="assign" data-person="" ${d}>Leave this spot empty this day</button>`);
    }
    sheet(title, sub, `${lead}<div class="actions">${a.join("") || `<p class="muted">Nothing to change here.</p>`}</div>`);
  }
  // Choose people to ask (mode ask), or one person to put in (mode assign).
  function openPicker(st, mode, release) {
    const role = D.role[st.slot.role_id];
    const all = D.people.filter((p) => p.id !== st.person);
    const showAll = sheetCtx && sheetCtx.showAll;
    const list = all.filter((p) => showAll || p.roles.includes(role.id));
    const rows = list.map((p) => ({ p, why: busyReason(p.id, st.day, st.event) || (st.req && st.req.declined.includes(p.id) ? "Said not this time" : null), asked: st.req && st.req.asked.includes(p.id) }))
      .sort((a, b) => (!!a.why - !!b.why) || a.p.name.localeCompare(b.p.name));
    const freeCount = rows.filter((r) => !r.why).length;
    const sub = `${esc(role.name)} · ${esc(st.event.title)} · ${fmtShort(st.day)} at ${fmtTime(st.event.start_time)}`;
    const body = mode === "assign"
      ? `<div>${rows.map((r) => `<div class="pick ${r.why ? "busy" : ""}"><div class="info" style="flex:1"><b>${esc(r.p.name)}</b><small class="${r.why ? "" : "free"}">${esc(r.why || "Free")}</small></div>
          <button class="btn ${r.why ? "ghost" : "primary"} small" type="button" data-act="assign" data-person="${r.p.id}" ${seatData(st)}>Choose</button></div>`).join("") || `<p class="muted">Nobody does this ministry yet.</p>`}</div>
         ${!showAll ? `<p style="margin-top:12px"><button class="btn quiet small" type="button" data-act="picker-all">Show everyone, not just ${esc(role.name.toLowerCase())}s</button></p>` : ""}`
      : `${release ? `<p style="margin-bottom:12px">${st.person === D.me.id ? "No problem." : ""} We'll take ${st.person === D.me.id ? "you" : esc(first(D.person[st.person]?.name))} off and ask the people you pick. The first to say yes gets the spot.</p>` : `<p style="margin-bottom:12px">${st.person ? (st.person === D.me.id ? "You stay on the schedule until someone says yes." : `${esc(first(D.person[st.person]?.name))} stays on until someone says yes.`) : ""} The first to say yes gets it.</p>`}
         <p class="muted small" style="margin-bottom:6px">${freeCount ? `${plural(freeCount, "person is", "people are")} free. We've ticked them for you.` : "Nobody looks free, but you can still ask."}</p>
         <div id="pick-list">${rows.map((r) => `<div class="pick ${r.why ? "busy" : ""}"><label><input type="checkbox" value="${r.p.id}" ${!r.why && !r.asked ? "checked" : ""}>
           <span class="info"><b>${esc(r.p.name)}</b><small class="${r.why ? "" : "free"}">${esc(r.asked ? "Already asked" : r.why || "Free")}</small></span></label></div>`).join("") || `<p class="muted">Nobody else does this ministry yet. ${D.coord ? "" : "Your coordinator will be told this spot is open."}</p>`}</div>
         ${!showAll && D.coord ? `<p style="margin-top:8px"><button class="btn quiet small" type="button" data-act="picker-all">Show everyone, not just ${esc(role.name.toLowerCase())}s</button></p>` : ""}
         <label class="field" style="margin-top:16px"><span>Add a note <span class="muted">(optional)</span></span><input type="text" id="pick-note" maxlength="300" placeholder="e.g. I'm sick, sorry!"></label>
         <div class="sticky-foot"><button class="btn primary wide" type="button" data-act="send-ask" data-release="${release ? 1 : 0}" ${seatData(st)} data-everyone="${esc(role.name.toLowerCase())}">${askLabel(release && st.person === D.me.id, rows.filter((r) => !r.why && !r.asked).length, role.name)}</button></div>`;
    sheet(mode === "assign" ? "Who should do it?" : release ? "Find a replacement" : "Who can cover?", sub, body, { st, mode, release, showAll });
  }
  function askLabel(off, n, role) {
    const who = n ? (n === 1 ? "this person" : `these ${n} people`) : `every ${role.toLowerCase()}`;
    return `${off ? "Take me off and ask" : "Ask"} ${who}`;
  }
  function afterAsk(st, askedIds) {
    const role = D.role[st.slot.role_id].name;
    const msg = (p) => `Hi${p ? " " + first(p.name) : ""}! Can you cover ${role} at ${st.event.title} on ${fmtDay(st.day, { weekday: "long", month: "long", day: "numeric" })} at ${fmtTime(st.event.start_time)}? Tap to say yes: ${p && p.key ? personalLink(p) : BASE}`;
    const people = askedIds.map((id) => D.person[id]).filter(Boolean);
    const direct = D.coord ? people.filter((p) => p.phone || p.email) : [];
    sheet("You've asked", `${esc(role)} · ${fmtShort(st.day)} at ${fmtTime(st.event.start_time)}`, `
      <p>They'll see your request as soon as they open the scheduler, and the first to say yes gets the spot. Everyone can see whether it's covered.</p>
      <p class="muted small" style="margin:10px 0 18px">Automatic emails and texts aren't switched on yet, so a quick message helps:</p>
      ${direct.length ? `<div>${direct.map((p) => `<div class="share-row"><b>${esc(p.name)}</b>${shareButtons(p, msg(p), `Can you cover ${role}?`)}</div>`).join("")}</div>` : ""}
      <div class="actions" style="margin-top:12px">
        <button class="btn ghost" type="button" data-act="share" data-text="${esc(msg(null))}">${ICON.share} Share in a group text or email</button>
        <button class="btn primary" type="button" data-act="close">Done</button></div>`);
  }

  // ------------------------------------------------------------------ My spots
  function viewMine() {
    const t = today();
    const items = [];
    for (let i = 0; i < 63; i++) {
      const day = addDays(t, i); if (!inRange(day)) break;
      for (const st of seatsOn(day)) if (st.person === D.me.id) items.push(st);
    }
    const asks = asksForMe();
    const away = D.away.filter((w) => w.person === D.me.id && w.to >= t);
    let lastDay = "";
    const list = items.map((st) => {
      const head = st.day !== lastDay ? `${lastDay ? "</div>" : ""}<h3 class="list-day">${st.day === t ? "Today" : fmtDay(st.day)}</h3><div class="card flush">` : "";
      lastDay = st.day;
      const looking = st.req && st.req.kept;
      return `${head}<div class="line-item"><div class="info"><b>${fmtTime(st.event.start_time)} · ${esc(D.role[st.slot.role_id].name)}</b><small>${esc(st.event.title)}${looking ? ' · <span class="pill gold">Looking for someone to swap</span>' : ""}</small></div>
        <button class="btn warn small" type="button" data-act="pick-ask" data-release="1" ${seatData(st)}>Can't make it</button></div>`;
    }).join("") + (lastDay ? "</div>" : "");
    return `
      ${asks.length ? `<div class="section-head"><h2>Can you help?</h2></div><div class="stack">${asks.map(askCard).join("")}</div>` : ""}
      <div class="section-head" ${asks.length ? "" : 'style="margin-top:0"'}><h2>Your next spots</h2><span class="muted small">Next nine weeks</span></div>
      ${list || `<div class="card empty-note">You aren't on the schedule in the next nine weeks.${openSeats(42, true).length ? ` <a href="#" data-act="tab" data-view="open">See open spots you could take</a>.` : ""}</div>`}
      <div class="section-head"><h2>Days I'm away</h2></div>
      <div class="card stack">
        <p class="muted small">Add holidays or busy days, and nobody will ask you to cover then.</p>
        ${away.map((w) => `<div class="line-item" style="padding:8px 0"><div class="info"><b>${w.from === w.to ? fmtDay(w.from) : `${fmtShort(w.from)} to ${fmtShort(w.to)}`}</b></div><button class="btn quiet small" type="button" data-act="del-away" data-id="${w.id}">Remove</button></div>`).join("")}
        <div class="grid2"><label class="field"><span>From</span><input type="date" id="away-from" min="${t}" value="${t}"></label><label class="field"><span>To</span><input type="date" id="away-to" min="${t}" value="${t}"></label></div>
        <div><button class="btn ghost" type="button" data-act="add-away">Add these dates</button></div>
      </div>`;
  }

  // ------------------------------------------------------------------ Open spots
  function viewOpen() {
    const seats = openSeats(42, !D.coord);
    const kept = D.coord ? [] : D.requests.filter((q) => q.kept && D.slot[q.slot] && hasRole(D.me.id, D.slot[q.slot].role_id) && personAt(D.slot[q.slot], q.day, q.seat) !== D.me.id && q.day >= today());
    let lastDay = "";
    const list = seats.map((st) => {
      const head = st.day !== lastDay ? `${lastDay ? "</div>" : ""}<h3 class="list-day">${st.day === today() ? "Today" : fmtDay(st.day)}</h3><div class="card flush">` : "";
      lastDay = st.day;
      const asking = st.req ? (st.req.asked.length ? `Asked ${plural(st.req.asked.length, "person", "people")}` : "Asked everyone") : "Nobody asked yet";
      return `${head}<div class="line-item"><div class="info"><b>${fmtTime(st.event.start_time)} · ${esc(D.role[st.slot.role_id].name)}</b><small>${esc(st.event.title)} · ${asking}</small></div>
        ${canDo(st) ? `<button class="btn primary small" type="button" data-act="take" ${seatData(st)}>I can do it</button>` : ""}
        ${D.coord ? `<button class="btn ghost small" type="button" data-act="seat" ${seatData(st)}>Fill</button>` : ""}</div>`;
    }).join("") + (lastDay ? "</div>" : "");
    return `
      <div class="section-head" style="margin-top:0"><h2>Open spots</h2><span class="muted small">Next six weeks${D.coord ? "" : ", for your ministries"}</span></div>
      ${D.coord && seats.length ? `<div class="card stack" style="margin-bottom:8px"><p><b>Let the app fill them for you.</b> It picks people who do that ministry and are free, sharing the spots out fairly. You see the plan before anything changes.</p><div><button class="btn primary" type="button" data-act="autofill">Fill open spots</button></div></div>` : ""}
      ${kept.length ? `<div class="stack" style="margin-bottom:8px">${kept.map(askCard).join("")}</div>` : ""}
      ${list || `<div class="card empty-note">Every spot is covered for the next six weeks. Thanks be to God!</div>`}`;
  }
  function planAutofill(days) {
    const overlay = new Map(), plan = [], count = {}, lastDay = {}, onDay = {};
    const t = today(), end = addDays(t, days);
    for (let d = t; d < end && inRange(d); d = addDays(d, 1)) for (const st of seatsOn(d)) if (st.person) { count[st.person] = (count[st.person] || 0) + 1; onDay[st.person + d] = 1; }
    let open = 0;
    for (let d = t; d < end && inRange(d); d = addDays(d, 1)) {
      for (const st of seatsOn(d, overlay)) {
        if (st.person || (st.req && st.req.kept)) continue;
        open++;
        const cands = D.people.filter((p) => p.roles.includes(st.slot.role_id) && !(st.req && st.req.declined.includes(p.id)) && !busyReason(p.id, d, st.event, overlay))
          .sort((a, b) => (onDay[a.id + d] || 0) - (onDay[b.id + d] || 0) || (count[a.id] || 0) - (count[b.id] || 0) || (lastDay[a.id] || "").localeCompare(lastDay[b.id] || "") || a.name.localeCompare(b.name));
        const p = cands[0];
        if (!p) continue;
        overlay.set(`${st.slot.id}|${d}|${st.seat}`, p.id);
        count[p.id] = (count[p.id] || 0) + 1; lastDay[p.id] = d; onDay[p.id + d] = 1;
        plan.push({ slot: st.slot.id, day: d, seat: st.seat, person: p.id, st });
      }
    }
    return { plan, open };
  }
  function openAutofill(days = 28) {
    const { plan, open } = planAutofill(days);
    sheetCtx = { plan };
    const preview = plan.slice(0, 40).map((x) => `<div class="pick"><div class="info"><b>${esc(D.person[x.person].name)}</b><small>${esc(D.role[x.st.slot.role_id].name)} · ${fmtShort(x.day)} ${fmtTime(x.st.event.start_time)}</small></div></div>`).join("");
    sheet("Fill open spots", "", `
      <div class="chips" style="margin-bottom:16px">${[[14, "Next 2 weeks"], [28, "Next 4 weeks"], [56, "Next 8 weeks"]].map(([n, l]) => `<button class="chip" type="button" data-act="autofill" data-days="${n}" aria-pressed="${n === days}">${l}</button>`).join("")}</div>
      <p style="margin-bottom:12px">${open ? `We found people for <b>${plan.length} of ${open}</b> open spots.` : "There are no open spots in this time."}${open > plan.length ? ` The other ${open - plan.length} have nobody free who does that ministry.` : ""}</p>
      ${preview}${plan.length > 40 ? `<p class="muted small" style="margin-top:8px">…and ${plan.length - 40} more.</p>` : ""}
      ${plan.length ? `<div class="sticky-foot"><button class="btn primary wide" type="button" data-act="autofill-go">Put them on the schedule</button></div>` : ""}`, { plan, days });
  }

  // ------------------------------------------------------------------ People (coordinators)
  function personRow(p) {
    const roles = p.roles.map((r) => D.role[r]?.name).filter(Boolean);
    const pill = p.is_coordinator ? '<span class="pill gold">Coordinator</span>' : !p.last_seen ? '<span class="pill warn">Not signed in yet</span>' : "";
    return `<div class="person-row" data-act="person" data-id="${p.id}" role="button" tabindex="0" data-name="${esc(p.name.toLowerCase())}">
      <span class="avatar">${esc(initials(p.name))}</span><span class="info"><b>${esc(p.name)}${p.id === D.me.id ? " (you)" : ""}</b><small>${roles.length ? esc(roles.join(", ")) : "No ministries yet"}</small></span>${pill}</div>`;
  }
  function viewPeople() {
    const notIn = D.people.filter((p) => !p.last_seen && p.id !== D.me.id).length;
    return `
      <div class="section-head" style="margin-top:0"><h2>People</h2>
        <div class="row"><button class="btn ghost small" type="button" data-act="print-cards">${ICON.print} Print cards</button><button class="btn primary small" type="button" data-act="add-people">Add people</button></div></div>
      ${notIn ? `<div class="card ask-card" style="margin-bottom:16px"><p>${plural(notIn, "person hasn't", "people haven't")} opened their sign-in link yet.</p><button class="btn ghost small" type="button" data-act="send-links">${ICON.share} Send their links</button></div>` : ""}
      ${D.people.length > 8 ? `<input type="search" id="people-q" placeholder="Search by name" aria-label="Search people" style="margin-bottom:12px">` : ""}
      <div class="card flush" id="people-list">${D.people.map(personRow).join("")}</div>`;
  }
  function addPeopleForm() {
    return `<div class="stack">
      <label class="field"><span class="sr">Names</span><textarea id="add-names" placeholder="Rose Martinez, rose@example.com\nTom Byrne, 555-201-3344\nGrace Okafor"></textarea></label>
      <div><p style="font-weight:600;margin-bottom:8px">Their ministries <span class="muted" style="font-weight:400">(you can change each person later)</span></p>
        <div class="chips" id="add-roles">${D.roles.map((r) => `<button class="chip" type="button" data-act="chip" data-role="${r.id}" aria-pressed="false">${esc(r.name)}</button>`).join("")}</div></div>
      <div><button class="btn primary" type="button" data-act="add-people-go">Add them</button></div></div>`;
  }
  function parsePeople(text) {
    return text.split(/\n+/).map((line) => {
      const parts = line.split(/[,;\t]+/).map((s) => s.trim()).filter(Boolean);
      if (!parts.length) return null;
      const out = { name: "", email: "", phone: "" };
      for (const part of parts) {
        if (/@/.test(part) && !out.email) out.email = part;
        else if (/^[+()\d][\d\s().+-]{6,}$/.test(part) && !out.phone) out.phone = part;
        else out.name = out.name ? `${out.name} ${part}` : part;
      }
      return out.name ? { ...out, name: out.name.slice(0, 80) } : null;
    }).filter(Boolean);
  }
  function openPerson(p) {
    const isMe = p.id === D.me.id;
    const away = D.away.filter((w) => w.person === p.id && w.to >= today());
    sheet(esc(p.name), p.last_seen ? `Last opened the scheduler ${new Date(p.last_seen).toLocaleDateString(undefined, { month: "long", day: "numeric" })}` : "Hasn't opened their link yet", `
      <div class="stack">
        <label class="field"><span>Name</span><input type="text" id="p-name" maxlength="80" value="${esc(p.name)}"></label>
        <div class="grid2"><label class="field"><span>Email</span><input type="email" id="p-email" maxlength="200" value="${esc(p.email || "")}"></label>
          <label class="field"><span>Mobile</span><input type="tel" id="p-phone" maxlength="40" value="${esc(p.phone || "")}"></label></div>
        <div><p style="font-weight:600;margin-bottom:8px">Ministries</p><div class="chips" id="p-roles">${D.roles.map((r) => `<button class="chip" type="button" data-act="chip" data-role="${r.id}" aria-pressed="${p.roles.includes(r.id)}">${esc(r.name)}</button>`).join("")}</div></div>
        ${isMe ? "" : `<label class="check"><input type="checkbox" id="p-coord" ${p.is_coordinator ? "checked" : ""}> Coordinator (can change the schedule and people)</label>`}
        <div><button class="btn primary" type="button" data-act="save-person" data-id="${p.id}">Save</button></div>
      </div>
      <div class="section-head"><h3>Their sign-in link</h3></div>
      <div class="row">${shareButtons(p, inviteText(p), `Your ${D.parish.name} volunteer schedule`)}<button class="btn ghost small" type="button" data-act="show-qr" data-id="${p.id}">${ICON.qr} Show code</button></div>
      <div id="qr-box" style="margin-top:12px"></div>
      <p class="muted small" style="margin-top:8px">They can also scan the code with their phone camera. Lost or shared by mistake? <a href="#" data-act="reset-key" data-id="${p.id}">Make a new link</a> (the old one stops working).</p>
      <div class="section-head"><h3>Away</h3></div>
      ${away.map((w) => `<div class="line-item" style="padding:6px 0"><div class="info"><b>${w.from === w.to ? fmtDay(w.from) : `${fmtShort(w.from)} to ${fmtShort(w.to)}`}</b></div><button class="btn quiet small" type="button" data-act="del-away" data-id="${w.id}">Remove</button></div>`).join("") || `<p class="muted small">No days away.</p>`}
      ${isMe ? "" : `<div class="section-head"><span></span><button class="btn quiet small" type="button" data-act="remove-person" data-id="${p.id}" style="color:var(--rose)">Remove from the parish</button></div>`}`);
  }
  function openSendLinks() {
    const ppl = D.people.filter((p) => p.id !== D.me.id).sort((a, b) => (!!a.last_seen - !!b.last_seen) || a.name.localeCompare(b.name));
    sheet("Send sign-in links", "Each person has their own link. Tap Text or Email to send it from your own phone or email.", `
      ${ppl.map((p) => `<div class="share-row"><b>${esc(p.name)} ${p.last_seen ? '<span class="pill ok">Signed in</span>' : ""}</b>${shareButtons(p, inviteText(p), `Your ${D.parish.name} volunteer schedule`)}</div>`).join("") || `<p class="muted">Add some people first.</p>`}
      <div class="actions" style="margin-top:16px"><button class="btn ghost" type="button" data-act="print-cards">${ICON.print} Print sign-in cards instead</button></div>`);
  }
  async function printCards() {
    await needQr();
    const ppl = D.people.filter((p) => p.id !== D.me.id);
    $("#print-root").innerHTML = `<h2 style="margin:0 0 12px">${esc(D.parish.name)}: volunteer sign-in cards</h2><div class="print-cards">${ppl.map((p) => `
      <div class="print-card">${qrSvg(personalLink(p))}<div><h3>${esc(p.name)}</h3><p>Point your phone camera at the square and tap the link. You'll see the ${esc(D.parish.name)} volunteer schedule. No password needed. Please keep this card to yourself.</p></div></div>`).join("")}</div>`;
    window.print();
  }

  // ------------------------------------------------------------------ Setup (coordinators)
  function needsSummary(e) {
    return e.slots.map((s) => `${s.seats} ${D.role[s.role_id].name.toLowerCase()}${s.seats > 1 && !/s$/.test(D.role[s.role_id].name) ? "s" : ""}`).join(" · ") || "No ministries yet";
  }
  function repeatText(e) {
    if (e.on_date) return `Once, on ${fmtDay(e.on_date)}`;
    const d = [...e.days].sort();
    if (d.length === 7) return "Every day";
    if (d.join() === "1,2,3,4,5") return "Every weekday";
    return "Every " + d.map((x) => DAYS_LONG[x]).join(", ");
  }
  function evLine(e) {
    return `<div class="ev-line"><span class="when">${fmtTime(e.start_time)}</span><span class="what"><b>${esc(e.title)}</b><small>${repeatText(e)}</small><small>${esc(needsSummary(e))}</small></span>
      <button class="btn ghost small" type="button" data-act="edit-event" data-id="${e.id}">Edit</button></div>`;
  }
  const sortedEvents = () => [...D.events].filter((e) => !e.on_date || e.on_date >= today()).sort((a, b) => (Math.min(...(a.days.length ? a.days : [7])) - Math.min(...(b.days.length ? b.days : [7]))) || a.start_time.localeCompare(b.start_time));
  function viewSetup() {
    const evs = sortedEvents();
    return `
      <div class="section-head" style="margin-top:0"><h2>Masses and events</h2><div class="row"><button class="btn ghost small" type="button" data-act="adoration">Add adoration hours</button><button class="btn primary small" type="button" data-act="edit-event">Add</button></div></div>
      <p class="muted small" style="margin-bottom:12px">Each one repeats every week on its own. You only set it up once.</p>
      <div class="card">${evs.map(evLine).join("") || `<p class="muted">Nothing yet. Add your Sunday Masses first.</p>`}</div>
      <div class="section-head"><h2>Ministries</h2></div>
      <div class="card stack">
        <div class="chips">${D.roles.map((r) => `<button class="chip" type="button" data-act="edit-role" data-id="${r.id}">${esc(r.name)}</button>`).join("")}</div>
        <div class="row"><input type="text" id="new-role" maxlength="60" placeholder="Add a ministry" style="flex:1;min-width:200px"><button class="btn ghost" type="button" data-act="add-role">Add</button></div>
        <p class="muted small">Tap a ministry to rename or remove it.</p>
      </div>
      <div class="section-head"><h2>Your parish</h2></div>
      <div class="card stack">
        <div class="grid2"><label class="field"><span>Parish name</span><input type="text" id="s-name" maxlength="120" value="${esc(D.parish.name)}"></label>
          <label class="field"><span>Town or city</span><input type="text" id="s-place" maxlength="120" value="${esc(D.parish.place)}"></label></div>
        <div><button class="btn ghost" type="button" data-act="save-parish">Save</button></div>
      </div>
      <div class="section-head"><h2>Emails and texts</h2></div>
      <div class="card stack">
        <p>Right now volunteers see requests when they open the scheduler, and you can send any request or sign-in link from your own phone with one tap.</p>
        <p class="muted small">Automatic emails and texts are not switched on yet. When they are, people who added an email or mobile number will get them without you doing anything.</p>
      </div>
      <div class="section-head"><h2>Privacy</h2></div>
      <div class="card stack">
        <p>Only people with a link to this parish can see it. Volunteers see names only; coordinators also see emails and mobile numbers. Remove a person to delete their details.</p>
        <p class="muted small">Closing the scheduler for good? Deleting the parish removes every person, Mass, ministry and schedule in it at once, and it can't be undone. <a href="/about/#privacy">How we handle your data</a></p>
        <div><button class="btn quiet" type="button" data-act="delete-parish" style="color:var(--rose)">Delete this parish</button></div>
      </div>
      ${toolsHtml("Other free tools")}
      <footer class="foot">A one-person project, built with the help of Claude, an AI model. <a href="/about/">About</a> &middot; <a href="/about/#privacy">Privacy</a></footer>`;
  }
  function openEventEditor(e, preset) {
    const ev = e || { id: "", title: preset?.title || "Sunday Mass", start_time: preset?.time || "10:00", minutes: 60, days: preset?.days || [0], on_date: null, note: "", slots: null };
    const sunday = ev.days.includes(0) || ev.days.includes(6) || !!ev.on_date;
    const seatsFor = (r) => {
      if (ev.slots) return ev.slots.find((s) => s.role_id === r.id)?.seats || 0;
      const n = NEEDS[r.name.toLowerCase()]; return n ? n[sunday ? 0 : 1] : 0;
    };
    const once = !!ev.on_date;
    const timeOpts = [30, 45, 60, 75, 90, 120, 180].map((m) => `<option value="${m}" ${ev.minutes === m ? "selected" : ""}>${m < 60 ? `${m} minutes` : m === 60 ? "1 hour" : `${m / 60} hours`.replace(".5", "½")}</option>`).join("");
    sheet(e ? "Edit Mass or event" : "Add a Mass or event", "", `
      <div class="stack">
        <label class="field"><span>Name</span><input type="text" id="e-title" maxlength="80" value="${esc(ev.title)}" placeholder="Sunday Mass"></label>
        <div class="grid2"><label class="field"><span>Starts at</span><input type="time" id="e-time" value="${ev.start_time}"></label>
          <label class="field"><span>Lasts about</span><select id="e-min">${timeOpts}</select></label></div>
        <div><p style="font-weight:600;margin-bottom:8px">Repeats</p>
          <div class="chips" style="margin-bottom:10px"><button class="chip" type="button" data-act="repeat" data-mode="weekly" aria-pressed="${!once}">Every week</button><button class="chip" type="button" data-act="repeat" data-mode="once" aria-pressed="${once}">Just once</button></div>
          <div id="e-weekly" ${once ? "hidden" : ""}><div class="chips" id="e-days">${DAYS.map((d, i) => `<button class="chip day" type="button" data-act="chip" data-day="${i}" aria-pressed="${ev.days.includes(i)}">${d}</button>`).join("")}</div></div>
          <div id="e-once" ${once ? "" : "hidden"}><input type="date" id="e-date" value="${ev.on_date || today()}" min="${today()}" aria-label="Date"></div></div>
        <div><p style="font-weight:600;margin-bottom:4px">Who is needed</p><p class="muted small" style="margin-bottom:6px">Set how many people of each ministry. Zero means not needed.</p>
          <div id="e-needs">${D.roles.map((r) => { const n = seatsFor(r); return `<div class="need-row ${n ? "" : "off"}" data-role="${r.id}"><span>${esc(r.name)}</span>
            <span class="stepper"><button type="button" data-act="step" data-d="-1" aria-label="Fewer ${esc(r.name)}">−</button><output>${n}</output><button type="button" data-act="step" data-d="1" aria-label="More ${esc(r.name)}">+</button></span></div>`; }).join("")}</div></div>
        ${e && e.slots.length ? `<div><p style="font-weight:600;margin-bottom:4px">Regular people every week <span class="muted" style="font-weight:400">(optional)</span></p><p class="muted small" style="margin-bottom:8px">If the same person always serves at this Mass, choose them here. You can still change single days on the schedule.</p>
          ${e.slots.map((s) => Array.from({ length: s.seats }, (_, i) => `<label class="field" style="margin-bottom:8px"><span class="small">${esc(D.role[s.role_id].name)}${s.seats > 1 ? ` ${i + 1}` : ""}</span>
            <select data-standing="${s.role_id}" data-seat="${i}"><option value="">Nobody regular</option>${D.people.filter((p) => p.roles.includes(s.role_id) || p.id === s.standing[i]).map((p) => `<option value="${p.id}" ${s.standing[i] === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>`).join("")).join("")}</div>` : ""}
        <label class="field"><span>Note <span class="muted">(optional)</span></span><input type="text" id="e-note" maxlength="300" value="${esc(ev.note)}" placeholder="e.g. Spanish Mass, arrive 15 minutes early"></label>
      </div>
      <div class="sticky-foot row"><button class="btn primary" type="button" data-act="save-event" data-id="${ev.id}" style="flex:1">Save</button>${e ? `<button class="btn quiet" type="button" data-act="delete-event" data-id="${ev.id}" style="color:var(--rose)">Delete</button>` : ""}</div>`, { editing: e });
  }
  function readEvent(id) {
    const title = $("#e-title").value.trim(); const time = $("#e-time").value;
    const once = $('[data-act="repeat"][data-mode="once"]').getAttribute("aria-pressed") === "true";
    const days = $$("#e-days .chip").filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => +c.dataset.day);
    if (!title) throw new Error("Please give it a name.");
    if (!time) throw new Error("Please choose a start time.");
    if (!once && !days.length) throw new Error("Choose at least one day of the week.");
    const slots = $$("#e-needs .need-row").map((r) => ({ role_id: r.dataset.role, seats: +$("output", r).textContent })).filter((s) => s.seats > 0);
    $$("[data-standing]").forEach((sel) => {
      const s = slots.find((x) => x.role_id === sel.dataset.standing); if (!s) return;
      s.standing = s.standing || {};
      if (sel.value && +sel.dataset.seat < s.seats) s.standing[sel.dataset.seat] = sel.value;
    });
    return { id: id || undefined, title, start_time: time, minutes: +$("#e-min").value, days: once ? [] : days, on_date: once ? $("#e-date").value : null, note: $("#e-note").value.trim(), slots };
  }
  function openAdoration() {
    const roleOpts = D.roles.map((r) => `<option value="${r.id}" ${/adorer|adoration/i.test(r.name) ? "selected" : ""}>${esc(r.name)}</option>`).join("");
    const hours = Array.from({ length: 24 }, (_, h) => h);
    const hourOpt = (sel) => hours.map((h) => `<option value="${h}" ${h === sel ? "selected" : ""}>${fmtTime(`${pad(h)}:00`)}</option>`).join("");
    sheet("Add adoration hours", "One hour at a time, repeating every week, so each hour has its own people.", `
      <div class="stack">
        <div class="grid2"><label class="field"><span>First hour starts</span><select id="a-from">${hourOpt(8)}</select></label><label class="field"><span>Last hour ends</span><select id="a-to">${hourOpt(20)}</select></label></div>
        <div><p style="font-weight:600;margin-bottom:8px">Days</p><div class="chips" id="a-days">${DAYS.map((d, i) => `<button class="chip day" type="button" data-act="chip" data-day="${i}" aria-pressed="${i !== 0}">${d}</button>`).join("")}</div></div>
        <div class="grid2"><label class="field"><span>Ministry</span><select id="a-role">${roleOpts}</select></label><label class="field"><span>People each hour</span><select id="a-n">${[1, 2, 3, 4].map((n) => `<option ${n === 2 ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
        <p class="muted small">Tip: for perpetual adoration choose 12:00 AM to 12:00 AM and every day.</p>
      </div>
      <div class="sticky-foot"><button class="btn primary wide" type="button" data-act="adoration-go">Add these hours</button></div>`);
  }
  function openMe() {
    const me = D.people.find((p) => p.id === D.me.id) || D.me;
    sheet("Your details", esc(D.parish.name), `
      <div class="stack">
        <label class="field"><span>Your name</span><input type="text" id="m-name" maxlength="80" value="${esc(me.name)}"></label>
        <div class="grid2"><label class="field"><span>Email</span><input type="email" id="m-email" maxlength="200" value="${esc(me.email || "")}"></label>
          <label class="field"><span>Mobile</span><input type="tel" id="m-phone" maxlength="40" value="${esc(me.phone || "")}"></label></div>
        <label class="check"><input type="checkbox" id="m-ne" ${me.notify_email ? "checked" : ""}> Email me when someone needs cover</label>
        <label class="check"><input type="checkbox" id="m-nt" ${me.notify_text ? "checked" : ""}> Text me too</label>
        <p class="muted small">Automatic emails and texts are coming. Until then, requests show up here whenever you open the scheduler. Only coordinators can see your email and number.</p>
        <div><button class="btn primary" type="button" data-act="save-me">Save</button></div>
      </div>
      <div class="section-head"><h3>Use another phone or computer</h3></div>
      <p class="muted small" style="margin-bottom:10px">Send yourself your personal link and open it there.</p>
      <div class="row">${shareButtons({ ...me, key: S.key, phone: "" }, `My link to the ${D.parish.name} volunteer schedule:\n${BASE}#join=${S.key}`, "My parish scheduler link")}</div>
      <div class="section-head"><span></span><button class="btn quiet small" type="button" data-act="sign-out">Sign out of this device</button></div>`);
  }

  // ------------------------------------------------------------------ click handling
  const A = {
    async home(el, ev) { ev.preventDefault(); if (S.key && D) { S.wizard = null; S.view = "day"; S.day = today(); render(); } else renderWelcome(); window.scrollTo(0, 0); },
    "start-setup"() { S.wizard = 0; renderWizard(); window.scrollTo(0, 0); },
    "volunteer-help"() {
      sheet("Signing in as a volunteer", "", `<p>Your parish coordinator sends you a personal link by text or email, or gives you a card with a square code on it.</p>
        <p style="margin-top:12px">Tap the link, or point your phone camera at the code. That's it: you're signed in on that phone and stay signed in.</p>
        <p class="muted small" style="margin-top:12px">Don't have one yet? Ask the person who organizes your ministry. If they've already sent you the link, you can paste it here:</p>
        <div class="row" style="margin-top:10px"><input type="text" id="paste-link" placeholder="Paste your link" style="flex:1;min-width:200px"><button class="btn primary" type="button" data-act="paste-go">Sign in</button></div>`);
    },
    async "paste-go"(el) {
      const m = $("#paste-link").value.match(/join=([A-Za-z0-9_-]{24,64})/);
      if (!m) return toast("That doesn't look like a scheduler link. Please check it and try again.");
      closeSheet(); await signIn(m[1]);
    },
    close() { closeSheet(); },
    "close-back"(el, ev) { if (ev.target === el) closeSheet(); },
    tab(el, ev) { ev.preventDefault(); closeSheet(); S.view = el.dataset.view; store.set("sched.view", S.view); render(); window.scrollTo(0, 0); },
    async "go-day"(el) {
      S.day = el.dataset.day;
      if (!inRange(S.day)) await act(el, () => ensureDay(S.day));
      render();
    },
    chip(el) {
      el.setAttribute("aria-pressed", el.getAttribute("aria-pressed") !== "true");
      if (el.dataset.role && $("#w-roles")) { const r = el.dataset.role; W.roles = W.roles.includes(r) ? W.roles.filter((x) => x !== r) : [...W.roles, r]; }
    },
    step(el) {
      const row = el.closest(".need-row"); const out = $("output", row);
      const n = Math.max(0, Math.min(30, +out.textContent + +el.dataset.d)); out.textContent = n; row.classList.toggle("off", !n);
    },
    repeat(el) {
      $$('[data-act="repeat"]').forEach((c) => c.setAttribute("aria-pressed", c === el));
      $("#e-weekly").hidden = el.dataset.mode !== "weekly"; $("#e-once").hidden = el.dataset.mode !== "once";
    },
    copy(el) { copy(el.dataset.text); },
    share(el) { share(el.dataset.text); },

    // wizard
    "wiz-back"() { S.wizard--; renderWizard(); },
    async "wiz-next"() {
      if (S.wizard === 0) {
        readWizard0();
        if (W.parish.length < 2) return toast("Please enter your parish's name.");
        if (!W.you) return toast("Please enter your name.");
      }
      S.wizard++; renderWizard(); window.scrollTo(0, 0);
    },
    "wiz-add-role"() {
      const v = $("#w-custom").value.trim(); if (!v) return;
      if (!W.extra.includes(v)) W.extra.push(v); if (!W.roles.includes(v)) W.roles.push(v); renderWizard();
    },
    async "wiz-create"(el) {
      const all = [...DEFAULT_ROLES, ...EXTRA_ROLES, ...W.extra];
      const roles = all.filter((r) => W.roles.includes(r));
      if (!roles.length) return toast("Choose at least one ministry.");
      await act(el, () => rpc("sched_create_parish", { p_name: W.parish, p_place: W.place, p_you: W.you, p_email: W.email, p_phone: W.phone, p_roles: roles }), async (key) => {
        S.key = key; store.set("sched.key", key); await load(); S.wizard = 2; renderWizard(); window.scrollTo(0, 0);
      });
    },
    "quick-event"(el) { openEventEditor(null, { title: el.dataset.title, time: el.dataset.time, days: el.dataset.days.split(",").map(Number) }); },
    "wiz-done"() { S.wizard = null; S.view = "day"; S.day = today(); render(); window.scrollTo(0, 0); },

    // schedule
    seat(el, ev) { ev.preventDefault(); const st = seatFrom(el); if (st) openSeat(st); },
    "pick-ask"(el) { const st = seatFrom(el); if (st) { sheetCtx = null; openPicker(st, "ask", el.dataset.release === "1"); } },
    "pick-assign"(el) { const st = seatFrom(el); if (st) { sheetCtx = null; openPicker(st, "assign"); } },
    "picker-all"() { const c = sheetCtx; c.showAll = true; openPicker(c.st, c.mode, c.release); },
    async "send-ask"(el) {
      const st = seatFrom(el); const ids = $$("#pick-list input:checked").map((i) => i.value);
      const note = $("#pick-note").value.trim();
      await act(el, () => rpc("sched_ask", { p_key: S.key, p_slot: st.slot.id, p_day: st.day, p_seat: st.seat, p_release: el.dataset.release === "1", p_ask: ids, p_note: note }), async () => {
        await load(); render();
        const asked = ids.length ? ids : D.people.filter((p) => p.roles.includes(st.slot.role_id) && p.id !== st.person).map((p) => p.id);
        afterAsk(st, asked);
      });
    },
    async assign(el) {
      const st = seatFrom(el);
      await act(el, () => rpc("sched_set_many", { p_key: S.key, p_items: [{ slot: st.slot.id, day: st.day, seat: st.seat, person: el.dataset.person || null }] }), async () => {
        closeSheet(); await load(); render(); toast(el.dataset.person ? `${first(D.person[el.dataset.person]?.name)} is on the schedule.` : "The spot is now open.");
      });
    },
    async standing(el) {
      const st = seatFrom(el);
      await act(el, () => rpc("sched_set_standing", { p_key: S.key, p_slot: st.slot.id, p_seat: st.seat, p_person: el.dataset.person || null }), async () => {
        closeSheet(); await load(); render(); toast(el.dataset.person ? "Done. They'll be on every week." : "Done. This spot is no longer theirs every week.");
      });
    },
    async take(el) {
      const st = seatFrom(el);
      await act(el, () => rpc("sched_take", { p_key: S.key, p_slot: st.slot.id, p_day: st.day, p_seat: st.seat }), async (r) => {
        closeSheet(); await load(); render();
        toast(r.ok ? "Thank you! You're on the schedule." : r.reason === "taken" ? "Someone just took that spot. Thank you anyway!" : "You can't take that spot.");
      });
    },
    async accept(el) {
      await act(el, () => rpc("sched_accept", { p_key: S.key, p_request: el.dataset.id }), async (r) => {
        closeSheet(); await load(); render();
        toast(r.ok ? "Thank you! You're on the schedule." : r.reason === "taken" ? "Someone else already said yes. Thank you anyway!" : r.reason === "yours" ? "That spot is already yours." : "That request is no longer open.");
      });
    },
    async decline(el) {
      await act(el, () => rpc("sched_decline", { p_key: S.key, p_request: el.dataset.id }), async () => { await load(); render(); toast("No problem. We won't ask you about that one again."); });
    },
    async "cancel-req"(el) {
      await act(el, () => rpc("sched_cancel_request", { p_key: S.key, p_request: el.dataset.id }), async () => { closeSheet(); await load(); render(); toast("Stopped asking."); });
    },
    autofill(el) { openAutofill(+(el.dataset.days || 28)); },
    async "autofill-go"(el) {
      const items = sheetCtx.plan.map(({ slot, day, seat, person }) => ({ slot, day, seat, person }));
      await act(el, async () => { for (let i = 0; i < items.length; i += 400) await rpc("sched_set_many", { p_key: S.key, p_items: items.slice(i, i + 400) }); }, async () => {
        closeSheet(); await load(); render(); toast(`Done. ${plural(items.length, "spot")} filled.`);
      });
    },

    // my spots
    async "add-away"(el) {
      const f = $("#away-from").value, t = $("#away-to").value || f;
      if (!f) return toast("Choose a date.");
      await act(el, () => rpc("sched_set_away", { p_key: S.key, p_person: null, p_from: f, p_to: t < f ? f : t }), async () => { await load(); render(); toast("Saved. Nobody will ask you to cover those days."); });
    },
    async "del-away"(el) {
      await act(el, () => rpc("sched_delete_away", { p_key: S.key, p_id: el.dataset.id }), async () => {
        await load(); render(); if (sheetCtx && sheetCtx.person) openPerson(D.person[sheetCtx.person]);
      });
    },

    // people
    person(el) { const p = D.person[el.dataset.id]; if (p) { openPerson(p); sheetCtx = { person: p.id }; } },
    "add-people"() { sheet("Add people", "Type or paste names, one per line. Add an email or mobile number after a comma if you have it.", addPeopleForm()); },
    async "add-people-go"(el) {
      const list = parsePeople($("#add-names").value);
      if (!list.length) return toast("Type at least one name.");
      const roles = $$("#add-roles .chip").filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.dataset.role);
      await act(el, async () => { for (const p of list) await rpc("sched_save_person", { p_key: S.key, p_id: null, p_name: p.name, p_email: p.email, p_phone: p.phone, p_roles: roles, p_is_coordinator: false }); }, async () => {
        await load(); closeSheet();
        if (S.wizard != null) renderWizard(); else render();
        toast(`Added ${plural(list.length, "person", "people")}.`);
      });
    },
    async "save-person"(el) {
      const name = $("#p-name").value.trim(); if (!name) return toast("Please enter a name.");
      const roles = $$("#p-roles .chip").filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.dataset.role);
      const coord = $("#p-coord") ? $("#p-coord").checked : true;
      await act(el, () => rpc("sched_save_person", { p_key: S.key, p_id: el.dataset.id, p_name: name, p_email: $("#p-email").value.trim(), p_phone: $("#p-phone").value.trim(), p_roles: roles, p_is_coordinator: coord }), async () => {
        closeSheet(); await load(); if (S.wizard != null) renderWizard(); else render(); toast("Saved.");
      });
    },
    async "show-qr"(el) {
      await act(el, needQr, () => { $("#qr-box").innerHTML = `<div style="width:220px;background:#fff;padding:8px;border-radius:12px;border:1px solid var(--line)">${qrSvg(personalLink(D.person[el.dataset.id]), 5)}</div>`; });
    },
    async "reset-key"(el, ev) {
      ev.preventDefault();
      if (!confirm("Make a new link? The old link will stop working, so you'll need to send them the new one.")) return;
      await act(null, () => rpc("sched_reset_key", { p_key: S.key, p_id: el.dataset.id }), async () => { await load(); openPerson(D.person[el.dataset.id]); toast("New link made. Send it to them now."); });
    },
    async "remove-person"(el) {
      const p = D.person[el.dataset.id];
      if (!confirm(`Remove ${p.name} from the parish? Their spots on the schedule will become open.`)) return;
      await act(el, () => rpc("sched_remove_person", { p_key: S.key, p_id: p.id }), async () => { closeSheet(); await load(); render(); toast(`${p.name} was removed.`); });
    },
    "send-links"() { openSendLinks(); },
    async "print-cards"(el) { await act(el, printCards); },

    // setup
    "edit-event"(el, ev) { ev.preventDefault(); openEventEditor(el.dataset.id ? D.events.find((e) => e.id === el.dataset.id) : null); },
    async "save-event"(el) {
      let e; try { e = readEvent(el.dataset.id); } catch (err) { return toast(err.message); }
      await act(el, () => rpc("sched_save_event", { p_key: S.key, p_event: e }), async () => {
        closeSheet(); await load(); if (S.wizard != null) renderWizard(); else render(); toast("Saved. It repeats on its own.");
      });
    },
    async "delete-event"(el) {
      if (!confirm("Delete this Mass or event and everyone's spots in it?")) return;
      await act(el, () => rpc("sched_delete_event", { p_key: S.key, p_id: el.dataset.id }), async () => { closeSheet(); await load(); if (S.wizard != null) renderWizard(); else render(); });
    },
    adoration() { openAdoration(); },
    async "adoration-go"(el) {
      const from = +$("#a-from").value; let to = +$("#a-to").value; if (to <= from) to += 24;
      const days = $$("#a-days .chip").filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => +c.dataset.day);
      if (!days.length) return toast("Choose at least one day.");
      if (!$("#a-role").value) return toast("Add an adoration ministry first.");
      const n = +$("#a-n").value;
      const hours = []; for (let h = from; h < to; h++) hours.push(h % 24);
      await act(el, async () => {
        for (const h of hours) await rpc("sched_save_event", { p_key: S.key, p_event: { title: "Adoration", start_time: `${pad(h)}:00`, minutes: 60, days, note: "", slots: [{ role_id: $("#a-role").value, seats: n }] } });
      }, async () => { closeSheet(); await load(); if (S.wizard != null) renderWizard(); else render(); toast(`Added ${plural(hours.length, "hour")} of adoration.`); });
    },
    async "add-role"(el) {
      const v = $("#new-role").value.trim(); if (!v) return;
      await act(el, () => rpc("sched_save_role", { p_key: S.key, p_id: null, p_name: v }), async () => { await load(); render(); });
    },
    "edit-role"(el) {
      const r = D.role[el.dataset.id];
      sheet("Ministry", "", `<label class="field"><span>Name</span><input type="text" id="r-name" maxlength="60" value="${esc(r.name)}"></label>
        <div class="row" style="margin-top:16px"><button class="btn primary" type="button" data-act="save-role" data-id="${r.id}">Save</button>
        <button class="btn quiet" type="button" data-act="delete-role" data-id="${r.id}" style="color:var(--rose)">Remove this ministry</button></div>`);
    },
    async "save-role"(el) {
      const v = $("#r-name").value.trim(); if (!v) return;
      await act(el, () => rpc("sched_save_role", { p_key: S.key, p_id: el.dataset.id, p_name: v }), async () => { closeSheet(); await load(); render(); });
    },
    async "delete-role"(el) {
      if (!confirm("Remove this ministry? It will be taken off every Mass and every person.")) return;
      await act(el, () => rpc("sched_delete_role", { p_key: S.key, p_id: el.dataset.id }), async () => { closeSheet(); await load(); render(); });
    },
    async "delete-parish"(el) {
      const typed = prompt(`This deletes ${D.parish.name} and everyone and everything in it, for good. To confirm, type the parish's name:`);
      if (typed === null) return;
      await act(el, () => rpc("sched_delete_parish", { p_key: S.key, p_confirm: typed }), async () => {
        S.key = null; D = null; S.data = null; store.set("sched.key", null); renderWelcome(); toast("The parish was deleted.");
      });
    },
    async "save-parish"(el) {
      const n = $("#s-name").value.trim(); if (n.length < 2) return toast("Please enter your parish's name.");
      await act(el, () => rpc("sched_save_parish", { p_key: S.key, p_name: n, p_place: $("#s-place").value.trim() }), async () => { await load(); render(); toast("Saved."); });
    },

    // me
    me() { openMe(); },
    async "save-me"(el) {
      const name = $("#m-name").value.trim(); if (!name) return toast("Please enter your name.");
      await act(el, () => rpc("sched_save_me", { p_key: S.key, p_name: name, p_email: $("#m-email").value.trim(), p_phone: $("#m-phone").value.trim(), p_notify_email: $("#m-ne").checked, p_notify_text: $("#m-nt").checked }), async () => {
        closeSheet(); await load(); render(); toast("Saved.");
      });
    },
    "sign-out"() {
      if (!confirm("Sign out of this device? You'll need your link to sign back in.")) return;
      S.key = null; D = null; S.data = null; store.set("sched.key", null); closeSheet(); renderWelcome();
    },
  };

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-act]");
    if (!el || !A[el.dataset.act]) return;
    if (el.tagName === "A" && el.getAttribute("href") === "#") ev.preventDefault();
    A[el.dataset.act](el, ev);
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && sheetCtx !== null && $("#sheet-root").innerHTML) closeSheet();
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches('[role="button"][data-act]')) { ev.preventDefault(); ev.target.click(); }
  });
  document.addEventListener("change", (ev) => {
    if (ev.target.closest("#pick-list")) {
      const b = $('[data-act="send-ask"]'); if (!b) return;
      b.textContent = askLabel(b.dataset.release === "1" && sheetCtx.st.person === D.me.id, $$("#pick-list input:checked").length, b.dataset.everyone);
    }
  });
  document.addEventListener("input", (ev) => {
    if (ev.target.id === "people-q") {
      const q = ev.target.value.trim().toLowerCase();
      $$("#people-list .person-row").forEach((r) => (r.hidden = q && !r.dataset.name.includes(q)));
    }
  });

  // ------------------------------------------------------------------ start
  async function signIn(key) {
    S.key = key; store.set("sched.key", key);
    $("#main").innerHTML = '<p class="loading">Opening your schedule…</p>';
    try { await load(); render(); toast(`Welcome, ${first(D.me.name)}! You're signed in on this device.`); }
    catch (e) { handleError(e); }
  }
  async function start() {
    const m = location.hash.match(/join=([A-Za-z0-9_-]{24,64})/);
    if (m) { history.replaceState(null, "", location.pathname + location.search); return signIn(m[1]); }
    if (!S.key) return renderWelcome();
    try { await load(); render(); } catch (e) { handleError(e); if (!D) renderWelcome(); }
  }
  // keep everyone's view fresh
  setInterval(() => { if (S.key && D && S.wizard == null && !$("#sheet-root").innerHTML && document.visibilityState === "visible" && !S.busy) reload(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.key && D && S.wizard == null && !$("#sheet-root").innerHTML) reload(); });
  window.addEventListener("hashchange", () => { if (/join=/.test(location.hash)) start(); });
  start();
})();
