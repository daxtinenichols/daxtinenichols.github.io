/* Church Finder. Static data from OpenStreetMap (data/), details from visitors (Supabase), map by Leaflet. */
(() => {
  "use strict";

  // All links and data paths are relative to the finder's folder, even after the address changes to c/<id>.html.
  if (!document.querySelector("base")) {
    const b = document.createElement("base");
    b.href = new URL(".", document.currentScript.src).href;
    document.head.prepend(b);
  }

  const CFG = {
    supabaseUrl: "https://gnooccdpghgnveuhnjwv.supabase.co",
    supabaseKey: "sb_publishable_W6J5oJkZsWHwUC_ANjXPyQ_yCNq7vl9",
    firstMass: "/first-mass/",
    tree: "/",
    studio: "/parish-studio/",
  };

  /* ---------- small helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const getJSON = async (url, opts) => { const r = await fetch(url, opts); if (!r.ok) throw new Error(r.status); return r.json(); };
  const ICON = {
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    dir: '<svg viewBox="0 0 24 24"><path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M9.5 14v-2.5a1.5 1.5 0 0 1 1.5-1.5h4.5M13.5 8l2 2-2 2"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 5.1 5.1l1.4-2.3L19 14.5V18a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    access: '<svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="1.8"/><path d="M12 7.5v6h5l2 5M12 10.5h5"/><path d="M9.5 10.8a5.5 5.5 0 1 0 6.6 8.2"/></svg>',
    lang: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H11l-5 4v-4H4z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    mitre: '<svg viewBox="0 0 24 24"><path d="M7 20V10l5-6 5 6v10z"/><path d="M12 9v7M9.5 11.5h5"/></svg>',
    candle: '<svg viewBox="0 0 24 24"><path d="M9 21V11h6v10z"/><path d="M12 8.5c-1.2 0-1.8-.9-1.8-1.9 0-1.4 1.8-3.1 1.8-3.1s1.8 1.7 1.8 3.1c0 1-.6 1.9-1.8 1.9z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  };
  const MASS_ICON = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3v6M17 5.6h6" stroke="#a87f33" stroke-width="2" stroke-linecap="round"/><path d="M8 37V22a12 12 0 0 1 24 0v15z" fill="#d9ccb4"/><path d="M13 37V23a7 7 0 0 1 14 0v14z" fill="#f1d59c"/><path d="M18.6 37l.8-10h1.2l.8 10z" fill="#fff7e2"/></svg>';
  const TREE_ICON = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 30V14" stroke="#8c7a66" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M16 19c-5 0-8-3-9-8 5 0 8 3 9 8z" fill="#6f9a6c"/><path d="M16 15c5 0 8-3 9-8-5 0-8 3-9 8z" fill="#4b7651"/><circle cx="16" cy="7" r="3.2" fill="#d6a546"/></svg>';
  const STUDIO_ICON = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="8" width="30" height="24" rx="4" fill="#d9ccb4"/><rect x="5" y="8" width="30" height="6" rx="3" fill="#b99572"/><path d="M12 22h16M12 26h10" stroke="#fff7e2" stroke-width="2.2" stroke-linecap="round"/></svg>';

  const KIND = {
    church: "Parish church", cathedral: "Cathedral", basilica: "Basilica", chapel: "Chapel",
    shrine: "Shrine", mission: "Mission church", monastery: "Monastery or convent church",
  };

  /* ---------- units and distance ---------- */
  const MILES = /-(US|GB|LR|MM)$/i.test(navigator.language || "en-US") || navigator.language === "en";
  function km(a, b) {
    const R = 6371, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmtDist(d) {
    const v = MILES ? d * 0.621371 : d;
    const u = MILES ? "mi" : "km";
    return v < 0.1 ? `nearby` : `${v < 10 ? v.toFixed(1) : Math.round(v)} ${u}`;
  }

  /* ---------- Mass and confession times ---------- */
  // The shared parish shape (also used by the parish website studio): {day, time, note}
  const DAY_ORDER = ["Saturday vigil", "Sunday", "Monday to Friday", "Monday to Saturday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Holy days"];
  const DAY_NUMS = { "Saturday vigil": [6], Sunday: [0], "Monday to Friday": [1, 2, 3, 4, 5], "Monday to Saturday": [1, 2, 3, 4, 5, 6], Monday: [1], Tuesday: [2], Wednesday: [3], Thursday: [4], Friday: [5], Saturday: [6] };
  const OSM_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // OpenStreetMap's service_times, e.g. "Sa 17:00; Su 08:00,10:00 (Spanish); Mo-Fr 07:30".
  // Mappers write it many ways, so anything we can't read with confidence is also shown as written.
  const DAYTOK = "(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)";
  function parseOsmTimes(str) {
    const out = [], conf = [];
    let ok = true;
    const parts = String(str || "").split(new RegExp(`;|\\|\\||\\||(?<=[\\d")]),\\s*(?=${DAYTOK}\\b)`));
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      let note = "";
      part = part.replace(/"([^"]*)"|\(([^)]*)\)/g, (_, a, b) => { note = (a || b || "").trim(); return " "; }).trim();
      const isConf = /reconcil|confess|penance/i.test(note);
      const holyNote = /holy ?day/i.test(note);
      if (/^(mass|masses|messe|misa|msza|service|vigil|vigil mass)$/i.test(note) || isConf || holyNote) note = "";
      const m = part.match(new RegExp(`^((?:${DAYTOK}(?:\\s*-\\s*${DAYTOK})?\\s*,?\\s*)*)\\s*(.*)$`));
      if (!m || (!m[1].trim() && !holyNote)) { ok = false; continue; }
      const starts = [];
      for (const t of m[2].matchAll(/(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?/g)) {
        if (t[3] && (t[3] * 60 + +t[4]) - (t[1] * 60 + +t[2]) > 90 && !isConf) { ok = false; continue; } // opening hours, not a Mass
        starts.push(`${t[1].padStart(2, "0")}:${t[2]}`);
      }
      if (!starts.length || /[a-z]{3,}/i.test(m[2].replace(/\d{1,2}:\d{2}/g, ""))) { ok = false; if (!starts.length) continue; }
      const days = new Set();
      let holy = holyNote;
      for (const spec of m[1].split(",").map((x) => x.trim()).filter(Boolean)) {
        if (spec === "PH") { holy = true; continue; }
        const [a, b] = spec.split("-").map((x) => OSM_DAYS.indexOf(x.trim()));
        if (b === undefined) days.add(a);
        else for (let i = a; ; i = (i + 1) % 7) { days.add(i); if (i === b) break; }
      }
      const into = isConf ? conf : out;
      for (const time of starts) {
        if (holy && !days.size) { into.push({ day: "Holy days", time, note }); continue; }
        if (holy) into.push({ day: "Holy days", time, note });
        const d = [...days].sort();
        const key = d.join("");
        if (key === "12345") into.push({ day: "Monday to Friday", time, note });
        else if (key === "123456") into.push({ day: "Monday to Saturday", time, note });
        else for (const n of d) into.push({ day: n === 6 && time >= "14:00" && days.size === 1 && !isConf ? "Saturday vigil" : FULL[n], time, note });
      }
    }
    return { items: out, confessions: conf, ok };
  }

  function fmtTime(t) {
    const [h, m] = t.split(":").map(Number);
    const d = new Date(2000, 0, 1, h, m);
    return d.toLocaleTimeString(undefined, m ? { hour: "numeric", minute: "2-digit" } : { hour: "numeric" }).replace(/\s?([AP])M/i, (_, x) => ` ${x.toLowerCase()}m`);
  }

  function nextOf(items, now = new Date()) {
    let best = null;
    for (const it of items) {
      const nums = DAY_NUMS[it.day];
      if (!nums || !/^\d\d:\d\d$/.test(it.time)) continue;
      const [h, m] = it.time.split(":").map(Number);
      for (let add = 0; add < 8; add++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + add, h, m);
        if (d > now && nums.includes(d.getDay())) { if (!best || d < best.at) best = { at: d, it }; break; }
      }
    }
    if (!best) return "";
    const days = Math.round((new Date(best.at).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 864e5);
    const when = days === 0 ? "Today" : days === 1 ? "Tomorrow" : FULL[best.at.getDay()];
    return `${when} at ${fmtTime(best.it.time)}`;
  }

  const DAY_SORT = {};
  function scheduleTable(items) {
    const groups = new Map();
    for (const it of items) {
      if (!groups.has(it.day)) groups.set(it.day, []);
      groups.get(it.day).push(it);
    }
    // single weekdays with the same times read better as one line: "Wednesday to Friday"
    const sig = (d) => groups.get(d).map((it) => `${it.time}|${it.note}`).sort().join(",");
    const single = FULL.slice(1).filter((d) => groups.has(d));
    for (let i = 0; i < single.length; ) {
      let j = i;
      while (j + 1 < single.length && FULL.indexOf(single[j + 1]) === FULL.indexOf(single[j]) + 1 && sig(single[j + 1]) === sig(single[i])) j++;
      if (j - i >= 1) {
        const name = `${single[i]} to ${single[j]}`;
        groups.set(name, groups.get(single[i]));
        for (let k = i; k <= j; k++) groups.delete(single[k]);
        DAY_SORT[name] = DAY_ORDER.indexOf(single[i]) - 0.5;
      }
      i = j + 1;
    }
    const rank = (d) => (d in DAY_SORT ? DAY_SORT[d] : DAY_ORDER.indexOf(d));
    const days = [...groups.keys()].sort((a, b) => rank(a) - rank(b));
    const label = { "Monday to Friday": "Weekdays", "Monday to Saturday": "Monday to Saturday", "Holy days": "Holy days of obligation" };
    return `<table class="sched"><tbody>${days.map((d) => {
      const list = groups.get(d).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      return `<tr><th scope="row">${esc(label[d] || d)}${d === "Monday to Friday" ? '<div class="note">Monday to Friday</div>' : ""}</th><td>${list.map((it) =>
        `<div>${it.time ? esc(fmtTime(it.time)) : ""}${it.note ? ` <span class="note">${esc(it.note)}</span>` : ""}${it.by ? `<span class="by">${esc(it.by)}</span>` : ""}</div>`).join("")}</td></tr>`;
    }).join("")}</tbody></table>`;
  }

  /* ---------- static data ---------- */
  const data = { index: null, tiles: new Map(), shards: new Map() };
  const fnv = (s) => { let h = 0x811c9dc5; for (const b of new TextEncoder().encode(s)) h = Math.imul(h ^ b, 0x01000193) >>> 0; return h; };
  const loadIndex = () => data.index || (data.index = getJSON("data/index.json"));
  async function loadTile(key) {
    const idx = await loadIndex();
    if (!idx.tiles[key]) return [];
    if (!data.tiles.has(key)) {
      data.tiles.set(key, getJSON(`data/t/${key}.json`).then((rows) => rows.map(([id, name, lat, lon, kind, city, flags, rite, mass]) =>
        ({ id, name, lat, lon, kind, city, flags, rite, mass }))).catch(() => { data.tiles.delete(key); return []; }));
    }
    return data.tiles.get(key);
  }
  async function loadChurch(id) {
    const idx = await loadIndex();
    const s = fnv(id) % idx.shards;
    if (!data.shards.has(s)) data.shards.set(s, getJSON(`data/c/${s}.json`).catch(() => { data.shards.delete(s); return {}; }));
    return (await data.shards.get(s))[id] || null;
  }
  async function churchesAround(lat, lon, radius = 1) {
    const keys = [];
    for (let a = Math.floor(lat) - radius; a <= Math.floor(lat) + radius; a++)
      for (let b = Math.floor(lon) - radius; b <= Math.floor(lon) + radius; b++) keys.push(`${a}_${b}`);
    return (await Promise.all(keys.map(loadTile))).flat();
  }

  /* ---------- visitor details (Supabase) ---------- */
  const DB = !!(CFG.supabaseUrl && CFG.supabaseKey);
  const dbHeaders = () => ({ apikey: CFG.supabaseKey, ...(CFG.supabaseKey.startsWith("eyJ") ? { Authorization: `Bearer ${CFG.supabaseKey}` } : {}) });
  const updCache = new Map();
  async function fetchUpdates(ids) {
    if (!DB) return {};
    const need = ids.filter((id) => !updCache.has(id));
    if (need.length) {
      try {
        const rows = await getJSON(`${CFG.supabaseUrl}/rest/v1/church_updates?select=church,kind,value,created_at&church=in.(${need.join(",")})&order=created_at.asc&limit=1000`, { headers: dbHeaders() });
        for (const id of need) updCache.set(id, []);
        for (const r of rows) updCache.get(r.church)?.push(r);
      } catch { for (const id of need) updCache.set(id, []); }
    }
    return Object.fromEntries(ids.map((id) => [id, updCache.get(id) || []]));
  }
  async function addUpdate(church, kind, value, email) {
    const r = await fetch(`${CFG.supabaseUrl}/rest/v1/church_updates`, {
      method: "POST",
      headers: { ...dbHeaders(), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ church, kind, value, email: email || null }),
    });
    if (!r.ok) {
      const t = await r.text();
      const reason = /blocked_words/.test(t) ? "Please leave out rude words." : /too_many_links/.test(t) ? "Please include at most one link." : /duplicate/.test(t) ? "Someone has already added exactly that. Thank you!" : /busy/.test(t) ? "Lots of people are adding details right now. Please try again in a minute." : "Sorry, that didn't save. Please try again later.";
      throw new Error(reason);
    }
    updCache.delete(church);
  }
  const visitorTimes = (ups, kind) => ups.filter((u) => u.kind === kind).map((u) => {
    try { const v = JSON.parse(u.value); return { day: v.day, time: v.time || "", note: v.note || "", by: "added by a visitor" }; } catch { return null; }
  }).filter((v) => v && DAY_ORDER.includes(v.day));

  /* ---------- map ---------- */
  // Base map: OpenFreeMap's free vector tiles in a warm tint; plain OpenStreetMap tiles if WebGL is missing.
  const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  let warmStyle;
  const getStyle = () => warmStyle || (warmStyle = getJSON("https://tiles.openfreemap.org/styles/positron").then((st) => {
    for (const l of st.layers) {
      const id = l.id, p = (l.paint = l.paint || {});
      if (l.type === "background") p["background-color"] = "#f5efe4";
      else if (l.type === "fill" && /water/.test(id)) p["fill-color"] = "#d8e2e0";
      else if (l.type === "line" && /waterway/.test(id)) p["line-color"] = "#d8e2e0";
      else if (l.type === "fill" && /park|landcover|wood|grass/.test(id)) p["fill-color"] = "#e4e9d8";
      else if (l.type === "fill" && /building/.test(id)) p["fill-color"] = "#ebe3d5";
      else if (l.type === "fill" && /landuse|residential/.test(id)) p["fill-color"] = "#f2ece1";
      else if (l.type === "symbol" && l.layout?.["text-field"]) { p["text-color"] = /place|city|town/.test(id) ? "#5f554a" : "#8a7f71"; p["text-halo-color"] = "#f5efe4"; }
    }
    return st;
  }));
  function baseLayer(m) {
    const gl = (() => { try { return !!document.createElement("canvas").getContext("webgl2") && window.maplibregl && L.maplibreGL; } catch { return false; } })();
    if (!gl) return L.tileLayer(TILES, { maxZoom: 19, attribution: OSM_ATTR }).addTo(m);
    const raster = () => L.tileLayer(TILES, { maxZoom: 19, attribution: OSM_ATTR }).addTo(m);
    getStyle().then((style) => L.maplibreGL({ style, attribution: `<a href="https://openfreemap.org">OpenFreeMap</a> ${OSM_ATTR}` }).addTo(m)).catch(raster);
  }
  let map, layer, meMarker, miniMap;
  const markers = new Map();
  const view = { here: null, label: "", filters: new Set(), rows: [], church: null };
  function pinIcon(row, cls = "") {
    return L.divIcon({
      className: `pin${row.flags & 1 ? " has-times" : ""}${cls}`, iconSize: [26, 26], iconAnchor: [13, 24],
      html: '<svg viewBox="0 0 26 26"><path class="body" d="M13 25s-9-7.4-9-14a9 9 0 0 1 18 0c0 6.6-9 14-9 14z"/><path class="cross" d="M13 6.2v8.6M9.6 9.4h6.8"/></svg>',
    });
  }
  function initMap() {
    if (map) return;
    map = L.map("map", { zoomControl: true, minZoom: 3, maxZoom: 19, worldCopyJump: true, maxBounds: [[-85, -400], [85, 400]] });
    baseLayer(map);
    layer = L.layerGroup().addTo(map);
    map.on("moveend", debounce(onMove, 120));
  }
  function setMe(lat, lon) {
    if (meMarker) meMarker.remove();
    meMarker = L.marker([lat, lon], { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [18, 18] }), interactive: false, keyboard: false }).addTo(map);
  }
  function onMove() {
    if (view.church) return;
    const c = map.getCenter();
    const z = map.getZoom();
    const url = new URL(location.href);
    url.searchParams.set("at", `${c.lat.toFixed(4)},${c.lng.toFixed(4)},${z}`);
    if (view.here && km(view.here, { lat: c.lat, lon: c.lng }) > 4) { url.searchParams.delete("q"); view.label = ""; }
    history.replaceState(history.state, "", url);
    refreshList();
  }

  async function refreshList() {
    const z = map.getZoom();
    const hint = $("#map-hint");
    const list = $("#list");
    if (z < 8) {
      hint.hidden = false;
      layer.clearLayers(); markers.clear();
      $("#list-title").textContent = "Churches near you";
      $("#list-sub").textContent = "";
      list.innerHTML = `<li class="empty"><b>Zoom in a little</b>Search for a town or zoom the map in to see the churches there.</li>`;
      $("#list-more").hidden = true;
      return;
    }
    hint.hidden = true;
    const b = map.getBounds().pad(0.05);
    const keys = [];
    for (let a = Math.floor(b.getSouth()); a <= Math.floor(b.getNorth()); a++)
      for (let o = Math.floor(b.getWest()); o <= Math.floor(b.getEast()); o++) keys.push(`${a}_${((o + 180) % 360 + 360) % 360 - 180}`);
    const rows = (await Promise.all(keys.slice(0, 30).map(loadTile))).flat();
    const c = map.getCenter();
    const ref = view.here && b.contains([view.here.lat, view.here.lon]) ? view.here : { lat: c.lat, lon: c.lng };
    let inView = rows.filter((r) => b.contains([r.lat, r.lon]));
    if (view.filters.has("times")) inView = inView.filter((r) => r.flags & 1 || (updCache.get(r.id) || []).some((u) => u.kind === "mass"));
    if (view.filters.has("access")) inView = inView.filter((r) => r.flags & 2);
    if (view.filters.has("eastern")) inView = inView.filter((r) => r.rite);
    for (const r of inView) r.d = km(ref, r);
    inView.sort((a, b) => a.d - b.d);
    view.rows = inView;

    // markers: only what is on screen
    layer.clearLayers(); markers.clear();
    for (const r of inView.slice(0, 700)) {
      const m = L.marker([r.lat, r.lon], { icon: pinIcon(r), title: r.name, riseOnHover: true }).addTo(layer);
      m.on("click", () => go(churchURL(r.id, r.flags)));
      markers.set(r.id, m);
    }

    const near = view.label ? `Churches near ${view.label}` : view.here && ref === view.here ? "Churches near you" : "Churches in this area";
    $("#list-title").textContent = near;
    $("#list-sub").textContent = inView.length ? `${inView.length.toLocaleString()} on the map, nearest first` : "";
    const top = inView.slice(0, 60);
    if (!top.length) {
      const idx = await loadIndex();
      const anyHere = keys.some((k) => idx.tiles[k]);
      list.innerHTML = view.filters.size
        ? `<li class="empty"><b>Nothing matches those filters here</b>Try turning a filter off, or zoom out a little.</li>`
        : anyHere ? `<li class="empty"><b>No churches on this part of the map</b>Zoom out a little to see the nearest ones.</li>`
        : `<li class="empty"><b>No churches listed here yet</b>We're adding more of the world as we go. Zoom out to see the nearest ones we have.</li>`;
    } else {
      list.innerHTML = top.map(itemHTML).join("");
    }
    $("#list-more").hidden = inView.length <= 60;
    $("#list-more").textContent = `Showing the nearest 60. Zoom in to see the rest.`;
    // visitor-added Mass times for what's listed
    fetchUpdates(top.map((r) => r.id)).then((ups) => {
      for (const r of top) {
        const extra = visitorTimes(ups[r.id] || [], "mass");
        if (!extra.length) continue;
        const el = $(`[data-id="${r.id}"] .tags`);
        if (el && !el.querySelector(".next")) {
          const n = nextOf(extra);
          if (n) el.insertAdjacentHTML("afterbegin", `<span class="tag next">Next Mass ${esc(n.toLowerCase().replace(/^(today|tomorrow)/, (x) => x))}</span>`);
        }
      }
    });
  }

  function itemHTML(r) {
    const next = r.mass ? nextOf(parseOsmTimes(r.mass).items) : "";
    const tags = [];
    if (next) tags.push(`<span class="tag next">Next Mass ${esc(next.charAt(0).toLowerCase() + next.slice(1))}</span>`);
    else if (r.mass) tags.push(`<span class="tag">Mass times listed</span>`);
    if (r.kind !== "church") tags.push(`<span class="tag">${esc(KIND[r.kind] || r.kind)}</span>`);
    if (r.rite) tags.push(`<span class="tag rite">${esc(r.rite)}</span>`);
    if (r.flags & 2) tags.push(`<span class="tag">Wheelchair access</span>`);
    return `<li class="item" data-id="${r.id}"><a href="${churchURL(r.id, r.flags)}" data-go>
      <h3>${esc(r.name)}</h3><span class="dist">${fmtDist(r.d)}</span>
      ${r.city ? `<span class="where">${esc(r.city)}</span>` : ""}
      ${tags.length ? `<span class="tags">${tags.join("")}</span>` : '<span class="tags"></span>'}</a></li>`;
  }

  /* ---------- church page ---------- */
  // US churches have their own page at c/<id>.html (made by build_pages.py); every church also opens at ?c=<id>.
  const churchURL = (id, flags = 0) => (flags & 8 ? `c/${id}.html` : `?c=${id}`);
  const churchFromURL = () => new URLSearchParams(location.search).get("c") || (location.pathname.match(/\/c\/([nwr]\d+)\.html$/) || [])[1];
  const fullAddress = (c) => [c.street, c.city, [c.state, c.post].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const isApple = /iPhone|iPad|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;
  const dirURL = (c) => isApple
    ? `https://maps.apple.com/?daddr=${c.lat},${c.lon}&q=${encodeURIComponent(c.name)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`;
  const webURL = (w) => (/^https?:\/\//i.test(w) ? w : `https://${w}`);
  const osmURL = (id) => `https://www.openstreetmap.org/${{ n: "node", w: "way", r: "relation" }[id[0]]}/${id.slice(1)}`;

  async function showChurch(id) {
    const el = $("#church");
    const c = await loadChurch(id);
    view.church = c;
    if (!c) {
      el.innerHTML = `<button class="btn ghost small back" data-back>${ICON.back} Back</button><div class="empty"><b>We couldn't find that church</b>It may have moved or closed. <a href="./">Search again</a>.</div>`;
      return;
    }
    if (c.page && !location.pathname.endsWith(`/c/${id}.html`)) history.replaceState(history.state, "", churchURL(id, 8));
    if (c.name === "Catholic church" && c.city) c.name = `Catholic church in ${c.city}`;
    document.title = `${c.name}${c.city ? `, ${c.city}` : ""}: Mass times and directions`;
    const ups = (await fetchUpdates([id]))[id] || [];
    render(el, c, ups);
    // map: center on the church and highlight it
    initMap();
    map.invalidateSize();
    map.setView([c.lat, c.lon], Math.max(map._loaded ? map.getZoom() : 0, 16), { animate: false });
    await refreshAround(c);
    loadPhoto(c);
  }

  async function refreshAround(c) {
    layer.clearLayers(); markers.clear();
    const rows = await churchesAround(c.lat, c.lon, 0);
    for (const r of rows) {
      const m = L.marker([r.lat, r.lon], { icon: pinIcon(r, r.id === c.id ? " sel" : ""), title: r.name, zIndexOffset: r.id === c.id ? 1000 : 0 }).addTo(layer);
      m.on("click", () => r.id !== c.id && go(churchURL(r.id, r.flags)));
      markers.set(r.id, m);
    }
    const near = (await churchesAround(c.lat, c.lon, 1)).filter((r) => r.id !== c.id).map((r) => ({ ...r, d: km(c, r) })).sort((a, b) => a.d - b.d).slice(0, 5);
    const ul = $("#nearby");
    if (ul) ul.innerHTML = near.map((r) => `<li><a href="${churchURL(r.id, r.flags)}" data-go><b>${esc(r.name)}</b><span>${fmtDist(r.d)}</span></a></li>`).join("") || "<li class='muted'>None listed nearby yet.</li>";
    const mm = $("#mini-map");
    if (mm && getComputedStyle(mm).display !== "none") {
      if (miniMap) miniMap.remove();
      miniMap = L.map(mm, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false, attributionControl: false }).setView([c.lat, c.lon], 16);
      baseLayer(miniMap);
      L.marker([c.lat, c.lon], { icon: pinIcon({ flags: c.mass ? 1 : 0 }, " sel"), interactive: false }).addTo(miniMap);
    }
  }

  function render(el, c, ups) {
    const osm = c.mass ? parseOsmTimes(c.mass) : { items: [], confessions: [], ok: true };
    const masses = [...osm.items.map((x) => ({ ...x, by: "" })), ...visitorTimes(ups, "mass")];
    const confessions = [...osm.confessions, ...visitorTimes(ups, "confession")];
    const adoration = visitorTimes(ups, "adoration");
    const next = nextOf(masses);
    const addr = fullAddress(c);
    const kind = c.rite ? `${KIND[c.kind] || "Church"} · ${c.rite}` : `${KIND[c.kind] || "Church"} · Roman Catholic`;
    const notes = ups.filter((u) => ["note", "language", "access", "contact"].includes(u.kind));
    const monthYear = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });

    const facts = [];
    if (c.rite) facts.push([ICON.info, `<b>An Eastern Catholic church.</b> It belongs to the ${esc(c.rite)} Church, in full communion with the Pope. Any Catholic may attend and receive Communion here; the liturgy will look and sound different from a Roman Mass.`]);
    if (c.wheelchair) facts.push([ICON.access, { yes: "Wheelchair accessible", limited: "Partly wheelchair accessible", no: "Not wheelchair accessible, according to OpenStreetMap" }[c.wheelchair] || `Wheelchair access: ${esc(c.wheelchair)}`]);
    if (c.langs?.length) facts.push([ICON.lang, `Services in ${esc(c.langs.map(langName).join(", "))}`]);
    if (c.open) facts.push([ICON.clock, `Open for prayer: <span class="muted">${esc(c.open)}</span>`]);
    if (c.diocese) facts.push([ICON.mitre, `${/diocese|archdiocese|eparchy/i.test(c.diocese) ? "" : "Diocese: "}${esc(c.diocese)}`]);
    if (c.email) facts.push([ICON.mail, `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`]);
    for (const u of notes) {
      const icon = { language: ICON.lang, access: ICON.access, contact: ICON.phone }[u.kind] || ICON.info;
      facts.push([icon, `${esc(u.value)} <span class="by">added by a visitor, ${monthYear(u.created_at)}</span>`]);
    }
    if (adoration.length) facts.push([ICON.candle, `<b>Adoration</b>${scheduleTable(adoration)}`]);
    if (c.desc) facts.push([ICON.info, esc(c.desc)]);

    el.innerHTML = `
      <button class="btn ghost small back" type="button" data-back>${ICON.back} All churches</button>
      <p class="kind">${esc(kind)}</p>
      <h1>${esc(c.name)}</h1>
      ${c.name_en ? `<p class="name-en">${esc(c.name_en)}</p>` : ""}
      ${addr ? `<p class="addr">${esc(addr)}</p>` : `<p class="addr muted">Street address not listed yet</p>`}
      <div class="actions">
        <a class="btn primary" href="${dirURL(c)}" target="_blank" rel="noopener">${ICON.dir} Directions</a>
        ${c.phone ? `<a class="btn ghost" href="tel:${esc(c.phone.split(/[;,]/)[0].replace(/[^\d+]/g, ""))}">${ICON.phone} Call</a>` : ""}
        ${c.web ? `<a class="btn ghost" href="${esc(webURL(c.web))}" target="_blank" rel="noopener">${ICON.web} Website</a>` : ""}
        <button class="btn ghost" type="button" data-share>${ICON.share} Share</button>
      </div>
      <figure class="hero-photo" id="photo" hidden></figure>

      <section class="block" aria-labelledby="h-mass">
        <h2 id="h-mass">Mass times</h2>
        ${masses.length ? `
          ${next ? `<p class="next-mass">Next Mass: ${esc(next)}</p>` : ""}
          ${scheduleTable(masses)}
          ${!osm.ok ? `<p class="muted" style="margin-top:14px">As written on OpenStreetMap:</p><p class="raw-times">${esc(c.mass)}</p>` : ""}
          <p class="muted">Times can change on holidays and in summer.${c.web ? ` The <a href="${esc(webURL(c.web))}" target="_blank" rel="noopener">parish website</a> has the latest bulletin.` : c.phone ? " A quick call to the parish will confirm." : ""}</p>
          <div class="help-row"><button class="btn soft small" type="button" data-add="mass">${ICON.plus} Add or correct a time</button></div>`
        : `<div class="missing">
            <p><b>We don't have Mass times for this church yet.</b> If you know them, adding them takes a minute and helps the next person who comes looking.</p>
            <div class="help-row" style="margin-top:0">
              <button class="btn primary small" type="button" data-add="mass">${ICON.plus} Add Mass times</button>
              ${c.web ? `<a class="btn ghost small" href="${esc(webURL(c.web))}" target="_blank" rel="noopener">Check the parish website</a>` : c.phone ? `<a class="btn ghost small" href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">Call the parish</a>` : ""}
            </div>
          </div>`}
      </section>

      <section class="block" aria-labelledby="h-conf">
        <h2 id="h-conf">Confession</h2>
        ${confessions.length ? scheduleTable(confessions) : `<p class="muted">Times not listed yet. Many parishes hear confessions on Saturday afternoons or by appointment, so the parish office can tell you.</p>`}
        <div class="help-row"><button class="btn soft small" type="button" data-add="confession">${ICON.plus} ${confessions.length ? "Add a time" : "Add confession times"}</button></div>
      </section>

      ${facts.length ? `<section class="block" aria-labelledby="h-know"><h2 id="h-know">Good to know</h2><ul class="facts">${facts.map(([i, t]) => `<li>${i}<div>${t}</div></li>`).join("")}</ul></section>` : ""}

      <section class="block mini-block" aria-labelledby="h-where">
        <h2 id="h-where">Where it is</h2>
        ${addr ? `<p>${esc(addr)}</p>` : ""}
        <div class="mini-map" id="mini-map"></div>
        <div class="help-row"><a class="btn soft small" href="${dirURL(c)}" target="_blank" rel="noopener">${ICON.dir} Open in maps</a></div>
      </section>

      <div class="invite">
        <a href="${CFG.firstMass}">${MASS_ICON}<div><b>Going to Mass for the first time?</b><span>A gentle walkthrough: when to sit, stand and kneel, and what to do at Communion.</span></div></a>
        <a class="sage" href="${CFG.tree}">${TREE_ICON}<div><b>Questions about faith?</b><span>The Tree of Life takes the big ones one at a time, with honest answers.</span></div></a>
        ${!c.web ? `<a href="${CFG.studio}">${STUDIO_ICON}<div><b>Is this your parish?</b><span>Make it a free, simple website in a few minutes. No account needed.</span></div></a>` : ""}
      </div>

      <section class="block" aria-labelledby="h-near">
        <h2 id="h-near">Other churches nearby</h2>
        <ul class="nearby" id="nearby"><li class="muted">Looking…</li></ul>
      </section>

      <section class="block" aria-labelledby="h-help">
        <h2 id="h-help">Help keep this page right</h2>
        <p class="muted">Know something we don't, or spotted a mistake? Every detail you add helps someone find their way to Mass.</p>
        <div class="help-row">
          <button class="btn soft small" type="button" data-add="note">Add a detail</button>
          <button class="btn soft small" type="button" data-add="problem">Report a problem</button>
          <a class="btn ghost small" href="${osmURL(c.id)}" target="_blank" rel="noopener">Edit on OpenStreetMap</a>
        </div>
        <p class="source">Location and details from <a href="${osmURL(c.id)}" target="_blank" rel="noopener">OpenStreetMap</a>${c.inferred ? ", listed here as Catholic because of its name" : ""}. Anything marked “added by a visitor” came from someone like you.</p>
      </section>`;
  }

  const LANGS = { en: "English", es: "Spanish", pl: "Polish", it: "Italian", fr: "French", de: "German", pt: "Portuguese", vi: "Vietnamese", ko: "Korean", tl: "Tagalog", la: "Latin", uk: "Ukrainian", zh: "Chinese", ar: "Arabic", ht: "Haitian Creole", ga: "Irish", lt: "Lithuanian", sk: "Slovak", hu: "Hungarian", hr: "Croatian", cs: "Czech", sl: "Slovenian", ml: "Malayalam", ja: "Japanese", ru: "Russian", sw: "Swahili", igb: "Igbo", ig: "Igbo", asl: "American Sign Language", sgn: "Sign language" };
  const langName = (code) => LANGS[code] || code;

  async function loadPhoto(c) {
    const fig = $("#photo");
    if (!fig) return;
    let file = c.commons && /^File:/i.test(c.commons) ? c.commons.replace(/^File:/i, "") : "";
    if (!file && c.wikidata && /^Q\d+$/.test(c.wikidata)) {
      try {
        const j = await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${c.wikidata}&property=P18&format=json&origin=*`);
        file = j.claims?.P18?.[0]?.mainsnak?.datavalue?.value || "";
      } catch { /* no photo */ }
    }
    if (!file || view.church !== c) return;
    const src = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=960`;
    const img = new Image();
    img.alt = `${c.name}`;
    img.decoding = "async";
    img.onload = () => {
      if (view.church !== c) return;
      fig.hidden = false;
      fig.replaceChildren(img);
      fig.insertAdjacentHTML("afterend", `<p class="photo-credit" id="photo-credit">Photo from <a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}" target="_blank" rel="noopener">Wikimedia Commons</a></p>`);
    };
    img.src = src;
  }

  /* ---------- add details sheet ---------- */
  const DAY_CHOICES = ["Sunday", "Saturday vigil", "Monday to Friday", "Monday to Saturday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Holy days"];
  function openSheet(kind) {
    const c = view.church;
    if (!c) return;
    const timed = ["mass", "confession", "adoration"].includes(kind);
    const titles = { mass: "Add Mass times", confession: "Add confession times", adoration: "Add adoration times", note: "Add a detail", problem: "Report a problem" };
    const sheet = $("#sheet");
    const row = () => `<div class="time-row">
        <select aria-label="Day">${DAY_CHOICES.map((d) => `<option>${d}</option>`).join("")}</select>
        <input type="time" aria-label="Time" required>
        <input class="note-in" type="text" maxlength="80" placeholder="Note (e.g. in Spanish)" aria-label="Note">
        <button class="icon-btn" type="button" data-del-row aria-label="Remove this time">${ICON.x}</button></div>`;
    sheet.innerHTML = `<form>
      <h2 id="sheet-title">${titles[kind]}</h2>
      <p class="intro">${kind === "problem" ? `Tell us what's wrong with the page for <b>${esc(c.name)}</b>. Only we will see this.` : `For <b>${esc(c.name)}</b>. It will show on the page right away, marked as added by a visitor.`}</p>
      ${timed ? `<div class="seg" role="group" aria-label="What kind of times">
          ${["mass", "confession", "adoration"].map((k) => `<button class="chip" type="button" data-kind="${k}" aria-pressed="${k === kind}">${{ mass: "Mass", confession: "Confession", adoration: "Adoration" }[k]}</button>`).join("")}
        </div>
        <label>Times <small>one line per time</small></label>
        <div class="time-rows">${row()}</div>
        <button class="btn ghost small" type="button" data-add-row style="margin-top:10px">${ICON.plus} Another time</button>`
      : kind === "note" ? `<div class="seg" role="group" aria-label="What kind of detail">
          ${[["note", "Something helpful"], ["language", "Languages"], ["access", "Accessibility"], ["contact", "Contact"]].map(([k, l], i) => `<button class="chip" type="button" data-kind="${k}" aria-pressed="${i === 0}">${l}</button>`).join("")}
        </div>
        <label for="sheet-text">Your note</label>
        <textarea id="sheet-text" maxlength="600" required placeholder="For example: parking behind the school, Mass in Spanish on Sundays at noon, step-free entrance on the side street"></textarea>`
      : `<label for="sheet-text">What's wrong?</label>
        <textarea id="sheet-text" maxlength="600" required placeholder="For example: this church closed in 2024, or the address is wrong"></textarea>`}
      <label for="sheet-email">Your email <small>(optional, only so we can ask a question; never shown)</small></label>
      <input id="sheet-email" type="email" maxlength="200" autocomplete="email">
      <p class="err" hidden></p>
      <div class="foot-row">
        <button class="btn ghost" type="button" data-close>Cancel</button>
        <button class="btn primary" type="submit">${kind === "problem" ? "Send" : "Add to the page"}</button>
      </div></form>`;
    $("#sheet-backdrop").hidden = false;
    sheet.hidden = false;
    let kindNow = kind === "note" ? "note" : kind;
    sheet.onclick = (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.dataset.kind) {
        kindNow = t.dataset.kind;
        $$("[data-kind]", sheet).forEach((b) => b.setAttribute("aria-pressed", b === t));
        if (timed) $("#sheet-title").textContent = titles[kindNow];
      } else if (t.hasAttribute("data-add-row")) {
        $(".time-rows", sheet).insertAdjacentHTML("beforeend", row());
      } else if (t.hasAttribute("data-del-row")) {
        if ($$(".time-row", sheet).length > 1) t.closest(".time-row").remove();
      } else if (t.hasAttribute("data-close")) closeSheet();
    };
    sheet.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const err = $(".err", sheet);
      const btn = $("button[type=submit]", sheet);
      const email = $("#sheet-email").value.trim();
      const values = timed
        ? $$(".time-row", sheet).map((r) => ({ day: $("select", r).value, time: $("input[type=time]", r).value, note: $(".note-in", r).value.trim() })).filter((v) => v.time).map((v) => JSON.stringify(v))
        : [$("#sheet-text").value.trim()].filter(Boolean);
      if (!values.length) { err.hidden = false; err.textContent = timed ? "Please add at least one time." : "Please write a few words first."; return; }
      btn.disabled = true;
      try {
        for (const v of values) await addUpdate(c.id, kindNow, v, email);
        closeSheet();
        toast(kind === "problem" ? "Thank you. We'll take a look." : "Thank you! It's on the page now.");
        if (view.church === c) render($("#church"), c, (await fetchUpdates([c.id]))[c.id]), refreshAround(c), loadPhoto(c);
      } catch (x) {
        err.hidden = false; err.textContent = x.message; btn.disabled = false;
      }
    };
    setTimeout(() => (timed ? $("select", sheet) : $("#sheet-text"))?.focus(), 50);
  }
  function closeSheet() { $("#sheet").hidden = true; $("#sheet-backdrop").hidden = true; }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3500);
  }

  /* ---------- search ---------- */
  function placeZoom(p) {
    const t = p.type || p.osm_value;
    return { house: 17, street: 16, district: 14, locality: 14, city: 13, town: 13, village: 14, hamlet: 14, postcode: 13, county: 10, state: 8, country: 5 }[t] || 13;
  }
  async function geocode(q, limit = 6) {
    const bias = map && map.getZoom() >= 8 ? `&lat=${map.getCenter().lat.toFixed(3)}&lon=${map.getCenter().lng.toFixed(3)}` : "";
    try {
      const j = await getJSON(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limit}&lang=en${bias}`);
      return j.features.map((f) => {
        const p = f.properties;
        const church = ["place_of_worship", "church", "cathedral", "chapel", "monastery"].includes(p.osm_value) && !/house|shop|office|school|hall/i.test(p.name || "");
        const sub = [p.street && p.housenumber ? `${p.housenumber} ${p.street}` : p.street, p.city || p.county, p.state, p.country].filter((x, i, a) => x && x !== p.name && a.indexOf(x) === i).join(", ");
        return {
          name: p.osm_value === "postcode" && p.city ? `${p.city} ${p.name}` : p.name || [p.housenumber, p.street].filter(Boolean).join(" ") || p.postcode || q, sub, church,
          id: church ? `${p.osm_type.toLowerCase()}${p.osm_id}` : null,
          lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], zoom: placeZoom(p),
          extent: p.extent, // [west, north, east, south]
        };
      });
    } catch {
      const j = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&q=${encodeURIComponent(q)}`).catch(() => []);
      return j.map((r) => ({ name: r.name || r.display_name.split(",")[0], sub: r.display_name.split(",").slice(1, 4).join(","), lat: +r.lat, lon: +r.lon, zoom: 13 }));
    }
  }
  function localMatches(q) {
    const n = q.toLowerCase();
    if (n.length < 3) return [];
    const out = [];
    for (const p of data.tiles.values()) {
      if (!p.done) continue;
      for (const r of p.rows) if (r.name.toLowerCase().includes(n)) out.push(r);
    }
    return out.slice(0, 3).map((r) => ({ name: r.name, sub: r.city, church: true, id: r.id, lat: r.lat, lon: r.lon, local: true }));
  }
  function wireSearch(form) {
    const input = $("input", form);
    const box = $(".suggest", form);
    let items = [], sel = -1, seq = 0;
    const show = () => {
      box.hidden = !items.length;
      box.innerHTML = items.map((it, i) => `<li role="option" aria-selected="${i === sel}" data-i="${i}"><span class="s-name${it.church ? " s-church" : ""}">${esc(it.name)}</span><span class="s-sub">${esc(it.sub || "")}</span></li>`).join("");
    };
    const suggest = debounce(async () => {
      const q = input.value.trim();
      const my = ++seq;
      if (q.length < 3) { items = []; show(); return; }
      const res = await geocode(q).catch(() => []);
      if (my !== seq) return;
      const local = localMatches(q);
      items = [...local, ...res.filter((r) => !local.some((l) => l.id === r.id))].slice(0, 7);
      sel = -1; show();
    }, 250);
    input.addEventListener("input", suggest);
    input.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "ArrowDown") { sel = Math.min(items.length - 1, sel + 1); show(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(-1, sel - 1); show(); e.preventDefault(); }
      else if (e.key === "Escape") { items = []; show(); }
    });
    input.addEventListener("blur", () => setTimeout(() => { box.hidden = true; }, 200));
    input.addEventListener("focus", () => items.length && show());
    box.addEventListener("mousedown", (e) => {
      const li = e.target.closest("li");
      if (li) { e.preventDefault(); pick(items[+li.dataset.i]); }
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return input.focus();
      if (sel >= 0 && items[sel]) return pick(items[sel]);
      const res = items.length ? items : await geocode(q, 1).catch(() => []);
      if (res[0]) pick(res[0]); else toast("We couldn't find that place. Try a town or zip code.");
    });
    async function pick(it) {
      box.hidden = true; items = [];
      input.value = it.name;
      $$(".search input").forEach((i) => (i.value = it.name));
      input.blur();
      const rec = it.church && it.id ? await loadChurch(it.id) : null;
      if (rec) return go(churchURL(it.id, rec.page ? 8 : 0));
      const z = it.extent ? zoomForExtent(it.extent) : it.zoom || 13;
      go(`?at=${it.lat.toFixed(4)},${it.lon.toFixed(4)},${z}&q=${encodeURIComponent(it.name)}`);
    }
  }
  function zoomForExtent([w, n, e, s]) {
    const span = Math.max(Math.abs(n - s), Math.abs(e - w));
    return Math.max(8, Math.min(15, Math.round(Math.log2(360 / Math.max(span, 0.005))) + 1));
  }

  /* ---------- near me ---------- */
  function nearMe(btn) {
    if (!navigator.geolocation) return toast("Your browser can't share your location. Try searching a town.");
    btn && (btn.disabled = true);
    navigator.geolocation.getCurrentPosition((p) => {
      btn && (btn.disabled = false);
      go(`?at=${p.coords.latitude.toFixed(4)},${p.coords.longitude.toFixed(4)},14&me=1`);
    }, () => {
      btn && (btn.disabled = false);
      toast("We couldn't get your location. Try searching a town or zip code.");
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  /* ---------- routing ---------- */
  function go(url, replace = false) {
    history[replace ? "replaceState" : "pushState"]({ list: !churchFromURL() && !!new URLSearchParams(location.search).get("at") }, "", url);
    route();
  }
  let lastList = "";
  async function route() {
    const p = new URLSearchParams(location.search);
    const id = churchFromURL();
    const at = p.get("at");
    const body = document.body;
    closeSheet();
    if (!id && !at) {
      if (!$("#home")) return location.reload(); // a church's own page has no front page in it
      body.className = "at-home";
      $("#home").hidden = false; $("#results").hidden = true; $(".search-top").hidden = true;
      view.church = null;
      document.title = "Catholic Church Finder";
      return;
    }
    if ($("#home")) $("#home").hidden = true;
    $("#results").hidden = false; $(".search-top").hidden = false;
    initMap();
    if (id) {
      body.className = "in-results in-church";
      $("#list-view").hidden = true; $("#church").hidden = false;
      $("#church").innerHTML = '<p class="muted" style="padding:24px 0">Opening…</p>';
      $("#panel").scrollTop = 0; window.scrollTo(0, 0);
      await showChurch(id);
      return;
    }
    body.className = "in-results";
    view.church = null;
    $("#list-view").hidden = false; $("#church").hidden = true;
    document.title = "Catholic Church Finder";
    const [lat, lon, z] = at.split(",").map(Number);
    view.label = p.get("q") || "";
    if (p.get("me")) { view.here = { lat, lon }; setMe(lat, lon); view.label = ""; }
    else if (view.label) view.here = { lat, lon };
    map.invalidateSize();
    const same = lastList === location.search;
    lastList = location.search;
    if (!same || !map._loaded) map.setView([lat, lon], z || 13, { animate: false });
    refreshList();
  }

  /* ---------- wiring ---------- */
  // remember which tiles finished loading, for instant name matches in search
  data.tiles.set = function (k, p) { p.then((rows) => { p.rows = rows; p.done = true; }); return Map.prototype.set.call(this, k, p); };

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-go], a[data-home]");
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      return go(a.getAttribute("href"));
    }
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-near-me")) nearMe(b);
    else if (b.hasAttribute("data-back")) {
      if (history.state && history.state.list) history.back();
      else { const c = view.church; go(c ? `?at=${c.lat.toFixed(4)},${c.lon.toFixed(4)},14` : "./"); }
    } else if (b.dataset.add) openSheet(b.dataset.add);
    else if (b.hasAttribute("data-share")) {
      const c = view.church;
      const url = location.href;
      if (navigator.share) navigator.share({ title: c.name, text: `${c.name}: Mass times and directions`, url }).catch(() => {});
      else navigator.clipboard?.writeText(url).then(() => toast("Link copied"), () => toast(url));
    } else if (b.dataset.filter) {
      const f = b.dataset.filter;
      view.filters.has(f) ? view.filters.delete(f) : view.filters.add(f);
      b.setAttribute("aria-pressed", view.filters.has(f));
      refreshList();
    }
  });
  $("#sheet-backdrop").addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });
  // list hover lights up the marker
  $("#list").addEventListener("mouseover", (e) => {
    const li = e.target.closest(".item");
    $$(".pin.hot").forEach((p) => p.classList.remove("hot"));
    if (li) markers.get(li.dataset.id)?.getElement()?.classList.add("hot");
  });
  $$("form.search").forEach(wireSearch);
  window.addEventListener("popstate", route);

  loadIndex().then((idx) => {
    const el = $("[data-count]");
    if (el) el.textContent = idx.note || `${idx.count.toLocaleString()} Catholic churches listed so far, and growing.`;
  }).catch(() => {});
  route();
})();
