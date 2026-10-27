// =====================================================================
//  Eras da Luísa · app
// =====================================================================
import { CONFIG, AREAS, ERAS, REWARDS } from "./config.js";
import { SESSIONS } from "./data.js";
import * as store from "./store.js";

// ---------- utilidades ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayISO = () => new Date().toLocaleDateString("sv-SE");
const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MES = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto"];
const MES_C = ["", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO"];
const dt = (iso) => new Date(iso + "T12:00:00");
const dLabel = (iso) => `${WD[dt(iso).getDay()]} ${iso.slice(8)}/${iso.slice(5, 7)}`;
const monthOf = (iso) => +iso.slice(5, 7);

const REAL = SESSIONS.filter((s) => !s.off);
const BY_DATE = Object.fromEntries(REAL.map((s) => [s.d, s]));
const BY_MONTH = {};
SESSIONS.forEach((s) => { (BY_MONTH[monthOf(s.d)] ||= []).push(s); });

const st = () => store.getState();
const enc = (d) => st().encontros[d] || {};
const isDone = (d) => Boolean(enc(d).feito);
const isPai = () => ["pai", "pai-local"].includes(store.getRole());
const ap = (d) => st().aprovacoes[d];
// Estado da miçanga: ok (aprovada) · aguardando (mapa enviado) · semmapa · refazer · none
function beadState(d) {
  const e = enc(d); if (!e.feito) return "none";
  const a = ap(d);
  if (a && a.status === "aprovado") return "ok";
  if (!e.mapa) return "semmapa";
  if (a && a.status === "refazer" && (!e.mapaEm || e.mapaEm <= a.decididoEm)) return "refazer";
  return "aguardando";
}
const isApproved = (d) => beadState(d) === "ok";
const isPhone = () => matchMedia("(pointer: coarse)").matches;

function horario(iso) {
  const w = dt(iso).getDay();
  return (st().ajustes.horario || {})[w] || CONFIG.horarioPadrao[w] || "17:00";
}
function trilhaUrl(m) { return (st().ajustes.trilhas || {})[m] || ERAS[m].trilha || ""; }
function spotifyEmbed(url) {
  const x = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(album|playlist)\/([A-Za-z0-9]+)/.exec(url || "");
  return x ? `https://open.spotify.com/embed/${x[1]}/${x[2]}?theme=0` : "";
}
// Link que abre o aplicativo do Spotify instalado no computador (pergunta "Abrir Spotify?").
function spotifyApp(m) {
  const x = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(album|playlist)\/([A-Za-z0-9]+)/.exec(trilhaUrl(m) || "");
  return x ? `spotify:${x[1]}:${x[2]}` : `spotify:search:${encodeURIComponent("Taylor Swift " + ERAS[m].nome)}`;
}
function spotifySearch(m) { return `https://open.spotify.com/search/${encodeURIComponent("Taylor Swift " + ERAS[m].nome)}`; }
function phetEmbed(url) {
  const x = /phet\.colorado\.edu\/[a-zA-Z_]+\/simulations\/([a-z0-9-]+)/.exec(url || "");
  return x ? `https://phet.colorado.edu/sims/html/${x[1]}/latest/${x[1]}_all.html?locale=pt_BR` : "";
}

// ---------- métricas ----------
function weekKey(iso) { const d = dt(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toLocaleDateString("sv-SE"); }
function metrics() {
  const n = REAL.filter((s) => isApproved(s.d)).length;
  const feitos = REAL.filter((s) => isDone(s.d)).length;
  const aguardando = REAL.filter((s) => beadState(s.d) === "aguardando").length;
  const pendentes = REAL.filter((s) => ["semmapa", "refazer"].includes(beadState(s.d)));
  const weeks = {};
  REAL.forEach((s) => { (weeks[weekKey(s.d)] ||= []).push(s); });
  const today = todayISO();
  let thisWeek = weekKey(today);
  if (today < REAL[0].d) { const lastDone = REAL.filter((s) => isDone(s.d)).pop(); thisWeek = lastDone ? weekKey(lastDone.d) : weekKey(REAL[0].d); }
  const eraTotal = (m) => (BY_MONTH[m] || []).filter((s) => !s.off).length;
  const eraDoneN = (m) => (BY_MONTH[m] || []).filter((s) => !s.off && isDone(s.d)).length;
  const eraApproved = (m) => (BY_MONTH[m] || []).filter((s) => !s.off).every((s) => isApproved(s.d));
  const eraDone = (m) => eraDoneN(m) === eraTotal(m);
  const thisWeekSessions = (weeks[thisWeek] || []);
  return { n, feitos, aguardando, pendentes, eraTotal, eraDoneN, eraDone, eraApproved, weekDone: thisWeekSessions.filter((s) => isDone(s.d)).length, weekTotal: thisWeekSessions.length || 3 };
}
const rewardProgress = (r, m) => [m.n, r.alvo];
const unlocked = (m) => REWARDS.filter((r) => m.n >= r.alvo).map((r) => r.id);
const nextReward = (m) => REWARDS.find((r) => m.n < r.alvo);
function nextSession() {
  const t = todayISO();
  return REAL.find((s) => !isDone(s.d) && s.d >= t) || REAL.find((s) => !isDone(s.d)) || null;
}
const daysToOnc = () => Math.max(0, Math.ceil((dt(CONFIG.oncDate) - dt(todayISO())) / 864e5));
const currentEra = () => { const nx = nextSession(); return nx ? monthOf(nx.d) : 8; };

// ---------- feedback ----------
function toast(msg) {
  const el = $("#toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 2800);
}
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = $("#confetti"), x = c.getContext("2d");
  c.width = innerWidth; c.height = innerHeight;
  const cols = Object.values(ERAS).map((e) => e.cor);
  const P = Array.from({ length: 160 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.4, v: 2 + Math.random() * 4, r: 4 + Math.random() * 5, c: cols[(Math.random() * cols.length) | 0], a: Math.random() * 6 }));
  let f = 0;
  (function loop() {
    x.clearRect(0, 0, c.width, c.height);
    P.forEach((p) => { p.y += p.v; p.a += 0.1; x.fillStyle = p.c; x.beginPath(); x.arc(p.x + Math.sin(p.a) * 8, p.y, p.r, 0, 7); x.fill(); });
    if (++f < 160) requestAnimationFrame(loop); else x.clearRect(0, 0, c.width, c.height);
  })();
}
let audioCtx = null;
function beep() {
  try {
    audioCtx ||= new AudioContext();
    [0, 0.25].forEach((t) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; g.gain.value = 0.08;
      o.connect(g); g.connect(audioCtx.destination);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.15);
    });
  } catch (e) { /* sem áudio */ }
}

// ---------- ícones ----------
const I = {
  play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  skip: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l9 7-9 7zM19 5v14"/></svg>',
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  ext: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>',
  music: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M4 4l16 16"/></svg>',
  chev: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  hoje: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  turne: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  pulseira: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="12" cy="20" r="2"/><circle cx="4" cy="12" r="2"/></svg>',
  ingressos: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/></svg>',
  bastidores: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  check: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>',
  mapas: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="4" cy="5" r="2"/><circle cx="20" cy="5" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><path d="M6 6l4 4M18 6l-4 4M6 18l4-4M18 18l-4-4"/></svg>',
  camera: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  circle: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>',
};

const tx = (c) => `color-mix(in srgb, ${c} 62%, #2d1f3d)`;
const chip = (a) => `<span class="chip" style="--c:${AREAS[a].cor}">${esc(AREAS[a].nome)}</span>`;
const steps = (i) => `<ol class="steps" aria-label="Passo ${i} de 3">${["Aquecimento", "Foco", "Miçanga"].map((n, k) => `<li class="${k + 1 < i ? "ok" : k + 1 === i ? "on" : ""}">${k + 1} · ${n}${k + 1 < i ? " ✓" : ""}</li>`).join("")}</ol>`;

function beadHtml(s, nxd) {
  const b = beadState(s.d), c = AREAS[s.a].cor;
  if (b === "ok") return `<span class="bead" style="--c:${c}" title="${esc(dLabel(s.d))}: aprovada"></span>`;
  if (b === "aguardando") return `<span class="bead wait" style="--c:${c}" title="${esc(dLabel(s.d))}: aguardando o pai"></span>`;
  if (b === "semmapa" || b === "refazer") return `<span class="bead todo" style="--c:${c}" title="${esc(dLabel(s.d))}: falta o mapa"></span>`;
  if (s.d === nxd) return `<span class="bead next" title="Próximo encontro"></span>`;
  return `<span class="bead empty"></span>`;
}
const STATUS = {
  ok: ["Aprovada", "ok"], aguardando: ["Aguardando o pai", "wait"], semmapa: ["Falta o mapa", "todo"], refazer: ["Pai pediu para completar", "todo"], none: ["Não feito", "none"],
};
const statusPill = (d) => { const [t, k] = STATUS[beadState(d)]; return `<span class="pill ${k}">${t}</span>`; };
const uploadBtn = (d, label = "Enviar foto do mapa") => `<label class="btn primary upl">${I.camera} ${label}<input type="file" accept="image/*" capture="environment" data-act="upload" data-d="${d}"></label>`;
const mapaImg = (path, alt, cls = "mapa-img") => path ? `<img class="${cls}" data-mapa="${esc(path)}" alt="${esc(alt)}">` : "";
function hydrate() {
  document.querySelectorAll("img[data-mapa]").forEach(async (img) => {
    const u = await store.mapaUrl(img.dataset.mapa);
    if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement("p"), { className: "muted small", textContent: "Não consegui carregar a foto agora." }));
  });
}
function seenUnlock() { try { return JSON.parse(localStorage.getItem("eras-visto") || "null"); } catch (e) { return null; } }
function setSeenUnlock(v) { try { localStorage.setItem("eras-visto", JSON.stringify(v)); } catch (e) { /* ignora */ } }

// ---------- timer do modo foco ----------
const TKEY = "eras-timer";
const TOTAL = CONFIG.blocos.reduce((a, b) => a + b.min * 60, 0);
function timerGet() { try { return JSON.parse(localStorage.getItem(TKEY) || "null"); } catch (e) { return null; } }
function timerSet(v) { try { localStorage.setItem(TKEY, JSON.stringify(v)); } catch (e) { /* ignora */ } }
function timerElapsed(t) { if (!t) return 0; return Math.min(TOTAL, (t.acc || 0) + (t.running ? (Date.now() - t.startedAt) / 1000 : 0)); }
function timerBlock(el) {
  let s = 0;
  for (let i = 0; i < CONFIG.blocos.length; i++) {
    const b = CONFIG.blocos[i], len = b.min * 60;
    if (el < s + len || i === CONFIG.blocos.length - 1) return { i, b, left: Math.max(0, s + len - el), len };
    s += len;
  }
}
const fmt = (sec) => { sec = Math.ceil(sec); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
let lastBlock = -1;
setInterval(() => {
  const t = timerGet();
  if (!t || !t.running) return;
  const el = timerElapsed(t), blk = timerBlock(el);
  if (lastBlock !== -1 && blk.i !== lastBlock) { beep(); toast(blk.b.pausa ? "Pausa! Levanta, bebe água." : `${blk.b.nome}: bora!`); }
  lastBlock = blk.i;
  if (el >= TOTAL) { timerSet({ ...t, running: false, acc: TOTAL }); beep(); toast("Tempo cumprido. Hora de concluir o encontro!"); }
  paintTimer();
}, 1000);
function paintTimer() {
  const box = $("#timer"); if (!box) return;
  const t = timerGet(), el = timerElapsed(t), blk = timerBlock(el);
  $("#t-time").textContent = fmt(blk.left);
  $("#t-label").textContent = blk.b.nome.toUpperCase();
  const ring = $("#t-ring"); const C = 2 * Math.PI * 50;
  ring.setAttribute("stroke-dashoffset", String(C * (1 - blk.left / blk.len)));
  $("#t-toggle").innerHTML = t && t.running ? I.pause : I.play;
  $("#t-toggle").setAttribute("aria-label", t && t.running ? "Pausar" : "Começar");
}

// ---------- views ----------
let route = { name: "hoje", args: [] };
let foco = { tab: 0 };

function viewLogin(msg = "") {
  return `<section class="login card">
    <h1 class="display">Eras da Luísa</h1>
    <p class="muted">Entre com o e-mail e a senha que o pai cadastrou.</p>
    <form id="login-form" class="stack">
      <label for="l-email">E-mail</label><input id="l-email" type="email" autocomplete="username" required>
      <label for="l-senha">Senha</label><input id="l-senha" type="password" autocomplete="current-password" required>
      ${msg ? `<p class="error">${esc(msg)}</p>` : ""}
      <button class="btn primary" type="submit">Entrar</button>
    </form></section>`;
}

function weekLabel(iso) {
  const ref = todayISO() < REAL[0].d ? REAL[0].d : todayISO();
  const diff = Math.round((dt(weekKey(iso)) - dt(weekKey(ref))) / (7 * 864e5));
  if (diff <= 0) return "Esta semana";
  if (diff === 1) return "Semana que vem";
  return `Semana de ${weekKey(iso).slice(8)}/${weekKey(iso).slice(5, 7)}`;
}
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const WD_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function dateTile(iso) {
  return `<span class="dtile"><span>${WD[dt(iso).getDay()]}</span><b>${+iso.slice(8)}</b><span>${MES_C[monthOf(iso)].toLowerCase()}</span></span>`;
}
function howtoOpen() { try { return localStorage.getItem("eras-howto") !== "fechado"; } catch (e) { return true; } }

function pendHtml(m) {
  if (isPai()) {
    return m.aguardando ? `<a class="card pend-card row" href="#/bastidores"><span class="pend-ic">${I.mapas}</span><span class="stack-xs grow"><b>${m.aguardando} ${m.aguardando === 1 ? "mapa esperando" : "mapas esperando"} sua aprovação</b><span class="small muted">Aprove em Bastidores para a miçanga ganhar cor.</span></span>${I.chev}</a>` : "";
  }
  const items = m.pendentes.map((s) => {
    const a = ap(s.d), ref = beadState(s.d) === "refazer";
    return `<li class="pend-item">${dateTile(s.d)}<span class="stack-xs grow"><b>${esc(s.t)}</b>
      ${ref ? `<span class="small pai-msg"><b>Pai:</b> ${esc(a.comentario || "complete o mapa e envie de novo.")}</span>` : `<span class="small muted">Falta enviar a foto do mapa mental.</span>`}
      ${isPhone() ? uploadBtn(s.d, ref ? "Enviar mapa de novo" : "Enviar foto do mapa") : `<span class="small b accent">Envie pelo celular: abra o app lá, na tela Hoje.</span>`}</span></li>`;
  }).join("");
  if (!items && !m.aguardando) return "";
  return `<section class="card pend-card stack-s">
    <div class="row between"><h2 class="display md">Mapas mentais</h2><a href="#/mapas" class="small">ver todos</a></div>
    ${items ? `<ol class="pend-list">${items}</ol>` : ""}
    ${m.aguardando ? `<p class="small wait-msg">${I.clock} ${m.aguardando} ${m.aguardando === 1 ? "mapa esperando" : "mapas esperando"} o pai aprovar. Quando ele aprovar, a miçanga ganha cor.</p>` : ""}
  </section>`;
}

function viewHoje() {
  const m = metrics(), nx = nextSession(), era = currentEra(), E = ERAS[era];
  const lastIdx = REAL.reduce((k, s, i) => (isDone(s.d) ? i : k), -1);
  const start = Math.max(0, lastIdx - 6);
  const beads = REAL.slice(start, start + 12).map((s) => beadHtml(s, nx?.d)).join("");
  const nrw = nextReward(m);
  const upcoming = REAL.filter((s) => !isDone(s.d) && s.d >= todayISO() && s.d !== nx?.d).slice(0, 6);
  const tr = trilhaUrl(era);
  const preStart = todayISO() < REAL[0].d;
  const daysToStart = Math.ceil((dt(REAL[0].d) - dt(todayISO())) / 864e5);
  let lastWeek = "";
  const agenda = upcoming.map((s) => {
    const wl = weekLabel(s.d), head = wl !== lastWeek ? `<li class="wk">${wl}</li>` : "";
    lastWeek = wl;
    return `${head}<li class="up">${dateTile(s.d)}<span class="stack-xs grow"><span class="up-time">${cap(WD_LONG[dt(s.d).getDay()])} · ${horario(s.d)}</span><span class="up-t">${esc(s.t)}</span><span>${chip(s.a)}</span></span></li>`;
  }).join("");
  const nav = [["hoje", "Hoje", "o próximo encontro e o que vem pela frente"], ["turne", "Turnê", "o calendário completo, mês a mês"], ["pulseira", "Pulseira", "suas miçangas e os pingentes dos prêmios"], ["mapas", "Mapas", "todos os seus mapas mentais, para consultar quando quiser"], ["ingressos", "Ingressos", "os prêmios e quantas miçangas faltam"]];
  const newly = REWARDS.filter((r) => (hoje.fresh || []).includes(r.id));
  return `<div class="hoje">
    <div class="hello row between">
      <div class="stack-xs"><span class="eyebrow" style="color:${tx(E.cor)}">Era ${esc(E.nome)}</span><h1 class="display xl">Oi, Luísa!</h1></div>
      <div class="count"><b>${daysToOnc()}</b><span>dias para a ONC</span></div>
    </div>
    ${newly.map((r) => `<a class="ticket-mini open full" href="#/ingressos"><span class="stack-xs grow"><span class="mono pink">INGRESSO DESTRAVADO</span><b class="display md">${esc(r.titulo)}</b><span class="small">Miçanga ${r.alvo} aprovada. Combine com o pai!</span></span>${I.chev}</a>`).join("")}
    ${pendHtml(m)}
    ${nx ? `<article class="card hero">
      <span class="eyebrow">${preStart ? `A turnê começa em ${daysToStart} dias` : "Próximo encontro"}</span>
      <div class="hero-when">${dateTile(nx.d)}<span class="stack-xs"><b class="hero-day">${cap(WD_LONG[dt(nx.d).getDay()])}, ${+nx.d.slice(8)} de ${MES[monthOf(nx.d)]}</b><span class="hero-time">às ${horario(nx.d)} · 1h30</span></span></div>
      <div class="row">${chip(nx.a)}</div>
      <h2 class="display lg">${esc(nx.t)}</h2>
      <a class="btn primary big" href="#/encontro/${nx.d}/aquecimento">${I.play} Começar encontro</a>
    </article>` : `<article class="card hero"><h2 class="display lg">Turnê completa!</h2><p>Todos os encontros feitos. Agora é o grande show.</p></article>`}
    <section class="card stack-s up-card">
      <div class="row between"><h2 class="display md">Próximas sessões</h2><a href="#/turne" class="small">calendário completo</a></div>
      <p class="small muted">Segunda, quarta e sexta. Para mudar um horário, fale com o pai.</p>
      <ol class="uplist">${agenda || '<li class="muted">Nenhuma outra sessão marcada.</li>'}</ol>
    </section>
    <details class="card howto" ${howtoOpen() ? "open" : ""}>
      <summary><span class="display md">Como funciona</span><span class="small muted howto-hint">toque para ${howtoOpen() ? "recolher" : "abrir"}</span></summary>
      <ol class="howto-steps">
        <li><b>Aquecimento · 15 min.</b> Aparecem temas de semanas atrás. Escreva no papel o que lembra, sem olhar nada, e depois confira no seu mapa mental daquele dia.</li>
        <li><b>Foco · 70 min.</b> Vídeo, simulação ou exercício do dia, com timer de 35 + 5 + 30 minutos e a trilha da era tocando.</li>
        <li><b>Mapa mental · 10 min.</b> No papel e sem olhar o material: o tema no meio e ramos com o que você aprendeu. Depois tire uma foto pelo celular e envie no app.</li>
        <li><b>Miçanga.</b> Quando o pai aprova o mapa, a miçanga ganha cor na pulseira.</li>
      </ol>
      <p class="small b">Os prêmios</p>
      <p class="small">Cada miçanga aprovada conta. Os prêmios caem nas miçangas ${REWARDS.map((r) => r.alvo).join(", ").replace(/, (\d+)$/, " e $1")}. Na pulseira, cada prêmio é um pingente: dá para ver quanto falta. Encontro perdido pode ser feito depois e vale igual.</p>
      <p class="small b">No menu</p>
      <ul class="howto-nav">${nav.map(([k, n, d]) => `<li>${I[k]}<span><b>${n}:</b> ${d}</span></li>`).join("")}</ul>
      <p class="small muted">Celular fora do quarto durante o encontro; ele só volta no fim, para a foto do mapa. Os prêmios valem pelo esforço, nunca pela nota.</p>
    </details>
    <section class="card stack-s">
      <div class="row between"><h2 class="display md">Sua pulseira</h2><a href="#/pulseira" class="small">${m.n} de ${REAL.length} · ver</a></div>
      <div class="strip">${beads}</div>
      <span class="muted small">Esta semana: ${m.weekDone} de ${m.weekTotal} encontros · contorno = esperando o pai aprovar</span>
    </section>
    ${nrw ? `<a class="ticket-mini" href="#/ingressos"><span class="stack-xs grow"><span class="mono pink">PRÓXIMO PRÊMIO · MIÇANGA ${nrw.alvo}</span><b>${esc(nrw.titulo)} · faltam ${nrw.alvo - m.n}</b><span class="bar"><i style="width:${(100 * m.n) / nrw.alvo}%"></i></span></span>${I.chev}</a>` : ""}
    <a class="card row tune" href="${esc(isPhone() ? tr || spotifySearch(era) : spotifyApp(era))}" ${isPhone() ? 'target="_blank" rel="noopener"' : ""}>
      <span class="tune-ic" style="--c:${E.cor}">${I.music}</span>
      <span class="stack-xs grow"><b>Trilha da era: ${esc(E.nome)}</b><span class="muted small">Abre o app do Spotify · no modo foco toca aqui dentro, se o pai colar o link</span></span>${I.ext}
    </a>
  </div>`;
}
const hoje = { fresh: [] };

function viewAquecimento(d) {
  const s = BY_DATE[d]; if (!s) return viewNotFound();
  const e = enc(d), revs = s.r || [];
  const shown = viewAquecimento.shown ||= {};
  const cards = revs.map(([lbl, t, src]) => {
    const srcS = BY_DATE[src], area = srcS ? srcS.a : "rev", val = (e.lembranca || {})[src] || "";
    const pontos = src && enc(src).pontos, mapa = src && enc(src).mapa;
    const open = shown[d + src];
    return `<article class="card recall">
      <div class="row between"><span class="mono muted">DE ${esc(lbl.toUpperCase())} ATRÁS</span>${chip(area)}</div>
      <h3 class="display md">${esc(t)}</h3>
      ${open ? `<div class="keys"><span class="mono accent">${mapa ? "SEU MAPA MENTAL DESSE DIA" : "PONTOS-CHAVE"}</span>${mapa ? `<a href="#/mapa/${src}">${mapaImg(mapa, "Mapa mental: " + t)}</a>` : pontos ? `<p class="pre">${esc(pontos)}</p>` : `<p class="muted">Sem mapa enviado para este tema. Confira no caderno.</p>`}</div>
        <div class="grid3">${[["esqueci", "Esqueci"], ["parte", "Lembrei parte"], ["tudo", "Lembrei tudo"]].map(([k, n]) => `<button type="button" class="opt ${val === k ? "sel" : ""}" data-act="lembra" data-d="${d}" data-src="${src}" data-v="${k}">${n}</button>`).join("")}</div>`
      : `<div class="hidden-keys">Escreva no papel primeiro.<br>Seu mapa mental desse dia abre depois.</div>
         <button type="button" class="btn ghost" data-act="revela" data-k="${d + src}">Já escrevi · conferir</button>`}
    </article>`;
  }).join("");
  return `<div class="encontro">
    <div class="topbar">${back("#/hoje")}${steps(1)}<span class="phone-off">${I.phone} Celular fora do quarto</span></div>
    <header class="stack-xs"><span class="eyebrow">${dLabel(d).toUpperCase()} · ANTES DE: ${esc(s.t.toUpperCase())}</span>
      <h1 class="display xl">O que você lembra?</h1>
      <p class="muted lead">Escreva no papel, sem consultar nada, tudo o que lembra de cada tema. Depois abra o seu mapa mental daquele dia e confira. Errar aqui é o que faz lembrar em agosto.</p></header>
    ${revs.length ? `<div class="recalls">${cards}</div>` : `<div class="card"><p>Hoje não tem revisão marcada. Pode ir direto para o foco.</p></div>`}
    <div class="row end"><a class="btn primary big" href="#/encontro/${d}/foco">Ir para o foco ${I.arrow}</a></div>
  </div>`;
}

function viewFoco(d) {
  const s = BY_DATE[d]; if (!s) return viewNotFound();
  const e = enc(d), m = monthOf(d), E = ERAS[m];
  const mats = s.m || [];
  if (foco.date !== d) foco = { date: d, tab: Math.max(0, mats.findIndex((x) => x[0] === "Simulação")) };
  if (foco.tab >= mats.length) foco.tab = 0;
  const cur = mats[foco.tab];
  let stage = "";
  if (cur) {
    const ph = cur[0] === "Simulação" ? phetEmbed(cur[2]) : "";
    stage = ph
      ? `<div class="stage"><iframe src="${esc(ph)}" title="${esc(cur[1])}" allowfullscreen loading="lazy"></iframe></div>`
      : `<div class="stage placeholder"><div class="stack-s center">
          <span class="mono accent">${esc(cur[0].toUpperCase())}</span><b class="big-t">${esc(cur[1])}</b>
          ${cur[2] ? `<a class="btn primary" href="${esc(cur[2])}" target="_blank" rel="noopener">Abrir ${I.ext}</a><span class="muted small">${cur[0] === "Aula" ? "Abre a busca no YouTube já filtrada pelo canal e pelo tema. Escolha o vídeo mais recente e com boa avaliação." : "Abre em outra aba. Volte aqui quando terminar."}</span>` : `<span class="muted">Atividade fora da tela. Faça e marque no roteiro.</span>`}
        </div></div>`;
  }
  const rk = (k) => (e.roteiro || {})[k];
  const items = [["aquec", "Aquecimento"], ...mats.map((x, i) => ["m" + i, `${x[0]}: ${x[1]}`]), ["mapa", "Mapa mental no papel, sem olhar o material"]];
  const emb = spotifyEmbed(trilhaUrl(m));
  return `<div class="encontro">
    <div class="topbar">${back(`#/encontro/${d}/aquecimento`)}${steps(2)}<span class="phone-off">${I.phone} Celular fora do quarto</span></div>
    <div class="split">
      <main class="stack">
        <header class="stack-xs"><span class="eyebrow" style="color:${tx(AREAS[s.a].cor)}">ERA ${esc(E.nome.toUpperCase())} · ${esc(AREAS[s.a].nome.toUpperCase())} · ${dLabel(d).toUpperCase()}</span><h1 class="display xl">${esc(s.t)}</h1></header>
        ${stage}
        <div class="tabs" role="tablist" aria-label="Material de hoje">${mats.map((x, i) => `<button type="button" role="tab" aria-selected="${i === foco.tab}" class="tab ${i === foco.tab ? "sel" : ""}" data-act="tab" data-i="${i}"><span class="mono">${esc(x[0].toUpperCase())}</span><span>${esc(x[1])}</span></button>`).join("")}</div>
      </main>
      <aside class="stack">
        <div class="card timer" id="timer">
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" stroke-width="10"/><circle id="t-ring" cx="60" cy="60" r="50" fill="none" stroke="${AREAS[s.a].cor}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 50}" stroke-dashoffset="0" transform="rotate(-90 60 60)"/></svg>
          <div class="stack-xs"><span class="mono muted" id="t-label"></span><span class="display timer-n" id="t-time">0:00</span>
            <div class="row"><button type="button" class="round light" id="t-toggle" data-act="t-toggle" aria-label="Começar">${I.play}</button><button type="button" class="round" data-act="t-skip" aria-label="Pular bloco">${I.skip}</button></div></div>
        </div>
        <div class="card stack-s">
          <span class="muted small">Trilha da era · ${esc(E.nome)}</span>
          ${emb ? `<iframe class="spotify" src="${esc(emb)}" title="Trilha da era ${esc(E.nome)} no Spotify" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`
            : `<a class="btn primary" href="${esc(spotifyApp(m))}">${I.music} Abrir no app do Spotify</a><a class="small" href="${esc(spotifySearch(m))}" target="_blank" rel="noopener">ou abrir no navegador</a><span class="muted small">Para tocar aqui dentro, o pai cola o link do álbum ou da playlist em Bastidores.</span>`}
          ${emb ? `<a class="small" href="${esc(spotifyApp(m))}">abrir no app do Spotify</a>` : ""}
        </div>
        <div class="card stack-s"><b>Roteiro de hoje</b>
          ${items.map(([k, n]) => `<label class="check"><input type="checkbox" data-act="rot" data-d="${d}" data-k="${k}" ${rk(k) ? "checked" : ""}> <span>${esc(n)}</span></label>`).join("")}
        </div>
        <button type="button" class="btn outline big" data-act="concluir" data-d="${d}">Concluir encontro</button>
      </aside>
    </div>
  </div>`;
}

function viewConcluido(d) {
  const s = BY_DATE[d]; if (!s) return viewNotFound();
  const e = enc(d), m = metrics(), idx = REAL.filter((x) => isDone(x.d) && x.d <= d).length;
  const nrw = nextReward(m), b = beadState(d);
  const c = AREAS[s.a].cor;
  const a = ap(d);
  return `<div class="encontro">
    <div class="topbar">${back("#/hoje")}${steps(3)}<span></span></div>
    <div class="split done">
      <div class="drop" aria-hidden="true">
        <svg viewBox="0 0 520 360" width="100%"><path d="M40 220 Q260 380 480 220" fill="none" stroke="var(--line2)" stroke-width="2"/>
        ${[58, 96, 136, 178, 220].map((x, i) => `<circle cx="${x}" cy="${[240, 266, 285, 297, 303][i]}" r="15" fill="${c}" opacity="${0.45 + i * 0.1}"/>`).join("")}
        <circle class="falling" cx="262" cy="305" r="16" fill="${b === "ok" ? c : "#fff"}" stroke="${c}" stroke-width="4" ${b === "ok" ? "" : 'stroke-dasharray="6 5"'}/>
        ${[304, 346, 388, 428, 464].map((x, i) => `<circle cx="${x}" cy="${[303, 297, 285, 266, 240][i]}" r="15" fill="var(--line)"/>`).join("")}</svg>
      </div>
      <div class="stack">
        <span class="eyebrow" style="color:${tx(c)}">MIÇANGA Nº ${idx} DE ${REAL.length} · ${statusPill(d)}</span>
        <h1 class="display xxl">${b === "ok" ? "Miçanga aprovada!" : "Encontro feito!"}</h1>
        ${b === "ok" ? `<p class="muted lead">${esc(s.t)} está na pulseira e já conta para os prêmios.</p>`
          : `<div class="card stack-s mapa-steps"><b class="display md">Agora, o mapa mental</b>
          <ol class="howto-steps">
            <li><b>No papel, sem olhar o material.</b> O tema no centro e ramos com tudo o que você aprendeu hoje. Uns 10 minutos.</li>
            <li><b>Foto pelo celular.</b> Abra o app no celular: o pedido aparece na tela Hoje.</li>
            <li><b>O pai aprova</b> e a miçanga ganha cor. Ela conta para os prêmios.</li>
          </ol>
          ${b === "refazer" ? `<p class="small pai-msg"><b>Pai:</b> ${esc(a.comentario || "complete o mapa e envie de novo.")}</p>` : ""}
          ${isPhone() && b !== "aguardando" ? uploadBtn(d, b === "refazer" ? "Enviar mapa de novo" : "Enviar foto do mapa") : ""}
          ${b === "aguardando" ? `<p class="small wait-msg">${I.clock} Mapa enviado. Agora é com o pai.</p>` : ""}
        </div>`}
        ${e.mapa ? `<a href="#/mapa/${d}">${mapaImg(e.mapa, "Mapa mental: " + s.t, "mapa-img small-img")}</a>` : ""}
        ${nrw ? `<a class="ticket-mini" href="#/ingressos"><span class="stack-xs grow"><span class="mono pink">PRÓXIMO PRÊMIO · MIÇANGA ${nrw.alvo}</span><b>${esc(nrw.titulo)} · faltam ${nrw.alvo - m.n} aprovadas</b><span class="bar"><i style="width:${(100 * m.n) / nrw.alvo}%"></i></span></span>${I.chev}</a>` : ""}
        <fieldset class="stack-s"><legend class="b">Como foi hoje?</legend>
          <div class="grid3">${[["facil", "Fácil"], ["medida", "Na medida"], ["puxado", "Puxado"]].map(([k, n]) => `<button type="button" class="opt ${e.humor === k ? "sel" : ""}" data-act="humor" data-d="${d}" data-v="${k}">${n}</button>`).join("")}</div>
        </fieldset>
        <a class="btn ghost big" href="#/hoje">Voltar para Hoje</a>
      </div>
    </div>
  </div>`;
}

function viewPulseira() {
  const m = metrics(), N = REAL.length, slots = N + 8, cx = 175, cy = 175, R = 136, RC = 160;
  const ang = (i) => -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / slots;
  const P = (r, a) => [(cx + r * Math.cos(a)).toFixed(1), (cy + r * Math.sin(a)).toFixed(1)];
  let slot = 0, k = 0, svg = "";
  const beadSlot = {};
  for (let mo = 1; mo <= 8; mo++) {
    (BY_MONTH[mo] || []).filter((s) => !s.off).forEach((s) => {
      const a = ang(slot); k++; beadSlot[k] = slot++;
      const [x, y] = P(R, a), b = beadState(s.d), c = AREAS[s.a].cor;
      const fill = b === "ok" ? c : b === "none" ? "var(--line)" : "#fff";
      const stroke = b === "ok" || b === "none" ? "none" : c;
      svg += `<circle cx="${x}" cy="${y}" r="5.4" fill="${fill}" stroke="${stroke}" stroke-width="2" ${b === "semmapa" || b === "refazer" ? 'stroke-dasharray="2 2"' : ""}><title>${esc(dLabel(s.d) + " · " + s.t + " · " + STATUS[b][0])}</title></circle>`;
    });
    const [x, y] = P(R, ang(slot++));
    svg += `<rect x="${(+x - 7).toFixed(1)}" y="${(+y - 7).toFixed(1)}" width="14" height="14" rx="4" fill="${m.eraApproved(mo) ? "#f2b705" : "var(--line)"}" stroke="#fff" stroke-width="2"><title>Era ${esc(ERAS[mo].nome)}</title></rect>`;
  }
  REWARDS.forEach((r) => {
    const a = ang(beadSlot[r.alvo]), [x1, y1] = P(R + 7, a), [x, y] = P(RC, a), got = m.n >= r.alvo;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x}" y2="${y}" stroke="var(--pink-line)" stroke-width="1.5"/>
      <g transform="translate(${x} ${y}) rotate(45)"><rect x="-7" y="-7" width="14" height="14" rx="3" fill="${got ? "var(--pink)" : "#fff"}" stroke="var(--pink)" stroke-width="2"/></g>
      <title>Miçanga ${r.alvo}: ${esc(r.titulo)}</title>`;
  });
  const nrw = nextReward(m);
  return `<div class="page">
    <h1 class="display xl">A pulseira</h1>
    <div class="bracelet"><svg viewBox="0 0 350 350" role="img" aria-label="Pulseira com ${m.n} de ${N} miçangas aprovadas"><circle cx="175" cy="175" r="${R}" fill="none" stroke="var(--line)" stroke-width="2"/>${svg}</svg>
      <div class="bracelet-c"><span class="display huge">${m.n}</span><span class="small muted">de ${N} miçangas aprovadas</span>${nrw ? `<span class="small pink b">faltam ${nrw.alvo - m.n} para: ${esc(nrw.titulo)}</span>` : ""}</div></div>
    <div class="grid3">
      <div class="mini"><b class="n">${m.n}</b><span class="muted small">aprovadas</span></div>
      <div class="mini"><b class="n">${m.aguardando}</b><span class="muted small">esperando o pai</span></div>
      <div class="mini"><b class="n">${m.pendentes.length}</b><span class="muted small">falta o mapa</span></div>
    </div>
    <section class="card stack-s"><h2 class="display md">Os pingentes</h2>
      <ol class="ladder">${REWARDS.map((r) => `<li class="${m.n >= r.alvo ? "got" : ""}"><span class="lad-n">${r.alvo}</span><span class="grow">${esc(r.titulo)}</span><span class="small ${m.n >= r.alvo ? "ok-t" : "muted"}">${m.n >= r.alvo ? "liberado" : `faltam ${r.alvo - m.n}`}</span></li>`).join("")}</ol>
    </section>
    <div class="legend">${Object.entries(AREAS).map(([kk, a]) => `<span><i style="background:${a.cor}"></i>${esc(a.nome)}</span>`).join("")}
      <span><i class="ring"></i>Esperando o pai</span><span><i class="ring dash"></i>Falta o mapa</span><span><i class="dia"></i>Pingente = prêmio</span><span><i class="sq"></i>Era toda aprovada</span></div>
  </div>`;
}

function viewIngressos() {
  const m = metrics();
  const env = st().ajustes.envelope;
  const rows = REWARDS.map((r, i) => {
    const [a, t] = rewardProgress(r, m), got = st().ingressos[r.id], open = a >= t;
    const k = got ? "got" : open ? "open" : a > 0 ? "going" : "lock";
    const tag = { got: "RESGATADO", open: "DESTRAVADO · MOSTRE AO PAI", going: "EM ANDAMENTO", lock: "BLOQUEADO" }[k];
    return `<article class="ticket ${k}">
      <div class="t-main stack-xs"><span class="mono t-tag">${tag}</span><b class="display md">${esc(r.titulo)}</b><span class="small t-sub">${esc(r.desc)}</span><span class="small t-sub">Miçanga ${r.alvo}${open ? "" : ` · faltam ${t - a}`}</span>
        ${!open ? `<span class="bar"><i style="width:${(100 * Math.min(a, t)) / t}%"></i></span>` : ""}
        ${got && r.id === "envelope" && env ? `<span class="small"><b>Dentro do envelope:</b> ${esc(env)}</span>` : ""}
        ${open && !got && isPai() ? `<button type="button" class="btn pink small-btn" data-act="claim" data-id="${r.id}">Marcar como resgatado</button>` : ""}
      </div>
      <div class="t-stub"><span class="mono small">Nº</span><b class="display md">${String(i + 1).padStart(2, "0")}</b><span class="small">${got ? "Usado" : open ? "Pedir" : `${Math.min(a, t)}/${t}`}</span></div>
    </article>`;
  }).join("");
  return `<div class="page"><h1 class="display xl">Seus ingressos</h1><p class="muted">Cada miçanga aprovada pelo pai te aproxima do próximo. Valem pelo esforço, nunca pela nota.</p><div class="tickets">${rows}</div></div>`;
}

function viewMapas() {
  const done = REAL.filter((s) => isDone(s.d)).reverse();
  const cards = done.map((s) => {
    const e = enc(s.d), b = beadState(s.d);
    return `<li class="mapa-card card">
      <a href="#/mapa/${s.d}" class="mapa-thumb">${e.mapa ? mapaImg(e.mapa, "Mapa mental: " + s.t, "thumb") : `<span class="thumb empty">${I.mapas}<span class="small">sem foto</span></span>`}</a>
      <span class="stack-xs"><span class="row"><span class="mono muted">${dLabel(s.d).toUpperCase()}</span>${statusPill(s.d)}</span>
        <a href="#/mapa/${s.d}" class="mapa-t">${esc(s.t)}</a>${chip(s.a)}
        ${isPhone() && (b === "semmapa" || b === "refazer") ? uploadBtn(s.d) : ""}</span>
    </li>`;
  }).join("");
  return `<div class="page"><h1 class="display xl">Seus mapas</h1><p class="muted">Todos os mapas mentais da turnê, do mais recente para o mais antigo. Toque num mapa para ver grande.</p>
    ${cards ? `<ol class="mapas">${cards}</ol>` : `<div class="card"><p>Os mapas aparecem aqui depois do primeiro encontro.</p></div>`}</div>`;
}

function viewMapa(d) {
  const s = BY_DATE[d]; if (!s || !isDone(d)) return viewNotFound();
  const e = enc(d), b = beadState(d), a = ap(d);
  return `<div class="page">${back("#/mapas")}
    <span class="eyebrow" style="color:${tx(AREAS[s.a].cor)}">${dLabel(d).toUpperCase()} · ${esc(AREAS[s.a].nome.toUpperCase())}</span>
    <h1 class="display lg">${esc(s.t)}</h1>
    <div class="row">${statusPill(d)}</div>
    ${b === "refazer" ? `<p class="pai-msg"><b>Pai:</b> ${esc(a.comentario || "complete o mapa e envie de novo.")}</p>` : ""}
    ${e.mapa ? mapaImg(e.mapa, "Mapa mental: " + s.t, "mapa-img big") : `<div class="card"><p>Ainda não tem foto deste mapa.</p></div>`}
    ${isPhone() && b !== "ok" && !isPai() ? uploadBtn(d, e.mapa ? "Trocar a foto" : "Enviar foto do mapa") : ""}
    ${isPai() && b === "aguardando" ? decideHtml(d) : ""}
  </div>`;
}

function decideHtml(d) {
  return `<div class="decide stack-s">
    <button type="button" class="btn primary" data-act="aprovar" data-d="${d}">Aprovar</button>
    <details><summary class="small b">Pedir para completar</summary>
      <div class="stack-s"><textarea id="c-${d}" rows="2" placeholder="Ex.: faltou a parte dos eclipses"></textarea>
      <button type="button" class="btn ghost" data-act="refazer" data-d="${d}">Enviar pedido</button></div></details>
  </div>`;
}

function viewTurne() {
  const m = metrics(), now = currentEra();
  const rows = Object.entries(ERAS).map(([k, E]) => {
    const mo = +k, done = m.eraDone(mo), stt = done ? "done" : mo === now ? "now" : mo < now ? "late" : "next";
    const badge = { done: "ESGOTADO", now: "EM CARTAZ", late: "PENDENTE", next: "EM BREVE" }[stt];
    return `<li><a class="stop ${stt}" href="#/era/${mo}"><span class="mono muted">${MES_C[mo]}</span><span class="stack-xs grow"><b class="display md" style="color:${tx(E.cor)}">${esc(E.nome)}</b><span class="small muted">${esc(E.sub)} · ${m.eraDoneN(mo)}/${m.eraTotal(mo)}</span></span><span class="badge">${badge}</span></a></li>`;
  }).join("");
  return `<div class="page"><header class="tour-h"><span class="mono muted">LUÍSA · 2027</span><h1 class="display xxl">THE STUDY TOUR</h1><span class="mono muted">8 ERAS · ${REAL.length} ENCONTROS · 1 GRANDE SHOW</span></header>
    <ol class="tour">${rows}</ol>
    <div class="finale"><span class="stack-xs center"><span class="mono muted">${MES_C[monthOf(CONFIG.oncDate)]}</span><b class="display lg">${CONFIG.oncDate.slice(8)}*</b></span><span class="stack-xs"><b class="display md">O GRANDE SHOW: ONC</b><span class="small muted">1ª fase · *data a confirmar</span></span></div></div>`;
}

function viewEra(mo) {
  const E = ERAS[mo]; if (!E) return viewNotFound();
  const rows = (BY_MONTH[mo] || []).map((s) => {
    if (s.off) return `<li class="ses off"><span class="mono muted">${dLabel(s.d)}</span><span class="muted">Sem estudo · ${esc(s.off)}</span></li>`;
    const done = isDone(s.d);
    return `<li class="ses ${done ? "ok" : ""}"><span class="mono muted">${dLabel(s.d)}</span>
      <a class="grow" href="#/encontro/${s.d}/${done ? "concluido" : "aquecimento"}"><span class="area-dot" style="--c:${AREAS[s.a].cor}"></span>${esc(s.t)}</a>
      ${done ? `${beadState(s.d) === "ok" ? `<span class="ok-ic">${I.check}</span>` : statusPill(s.d)}${isPai() ? `<button type="button" class="link" data-act="undo" data-d="${s.d}">desfazer</button>` : ""}` : ""}</li>`;
  }).join("");
  return `<div class="page">${back("#/turne")}<span class="eyebrow">${MES[mo].toUpperCase()} 2027</span><h1 class="display xl" style="color:${tx(E.cor)}">Era ${esc(E.nome)}</h1><p class="muted">${esc(E.sub)}</p>
    <a class="btn ghost" href="${esc(isPhone() ? trilhaUrl(mo) || spotifySearch(mo) : spotifyApp(mo))}" ${isPhone() ? 'target="_blank" rel="noopener"' : ""}>${I.music} Trilha da era</a>
    <ol class="sessions">${rows}</ol></div>`;
}

function viewBastidores() {
  if (!isPai()) return `<div class="page"><h1 class="display xl">Bastidores</h1><p class="muted">Esta área é do pai.</p></div>`;
  const m = metrics(), E = st().encontros, aj = st().ajustes;
  const vals = Object.values(E).flatMap((e) => Object.values(e.lembranca || {}));
  const pct = vals.length ? Math.round((100 * vals.reduce((a, v) => a + (v === "tudo" ? 1 : v === "parte" ? 0.5 : 0), 0)) / vals.length) : null;
  const since = new Date(Date.now() - 30 * 864e5).toLocaleDateString("sv-SE");
  const hard = {};
  Object.entries(E).forEach(([d, e]) => { if (e.feito && e.humor === "puxado" && d >= since && BY_DATE[d]) (hard[BY_DATE[d].a] ||= []).push(BY_DATE[d].t); });
  const alerts = Object.entries(hard).filter(([, l]) => l.length >= 2);
  const pend = REWARDS.filter((r) => m.n >= r.alvo && !st().ingressos[r.id]);
  const fila = REAL.filter((s) => beadState(s.d) === "aguardando");
  const semMapa = m.pendentes;
  const recent = REAL.filter((s) => s.d <= todayISO()).slice(-6).reverse();
  const hor = aj.horario || {}, tr = aj.trilhas || {};
  return `<div class="page">
    <span class="eyebrow">SÓ PARA O PAI</span><h1 class="display xl">Bastidores</h1>
    ${store.isCloud() ? "" : `<p class="note">Modo local: estes dados são só deste aparelho. Com o Supabase configurado, você vê o progresso dela do seu celular.</p>`}
    <section class="stack-s"><h2 class="display md">Mapas para aprovar ${fila.length ? `(${fila.length})` : ""}</h2>
      ${fila.length ? fila.map((s) => `<article class="card approve">
        <span class="mono muted">${dLabel(s.d).toUpperCase()}</span><b>${esc(s.t)}</b>
        <a href="#/mapa/${s.d}">${mapaImg(enc(s.d).mapa, "Mapa mental: " + s.t, "mapa-img")}</a>
        ${decideHtml(s.d)}</article>`).join("") : `<p class="small muted">Nada esperando. Quando ela enviar um mapa, ele aparece aqui.</p>`}
      ${semMapa.length ? `<p class="small">Feitos sem mapa enviado: ${semMapa.map((s) => dLabel(s.d)).join(", ")}${semMapa.some((s) => beadState(s.d) === "refazer") ? " (inclui pedidos para completar)" : ""}.</p>` : ""}
    </section>
    <div class="grid3">
      <div class="mini"><b class="mono n">${m.weekDone} de ${m.weekTotal}</b><span class="muted small">nesta semana</span></div>
      <div class="mini"><b class="mono n">${m.n}/${REAL.length}</b><span class="muted small">aprovadas no ano</span></div>
      <div class="mini"><b class="mono n">${pct === null ? "—" : pct + "%"}</b><span class="muted small">lembrou no aquecimento</span></div>
    </div>
    ${alerts.map(([a, l]) => `<div class="alert"><b>${esc(AREAS[a].nome)} marcada como "puxado" ${l.length} vezes no último mês</b><span class="small">${esc(l.join(" · "))}. Vale uma conversa ou levar ao professor.</span></div>`).join("")}
    ${pend.length ? `<section class="stack-s"><b>Ingressos para combinar</b>${pend.map((r) => `<div class="row between card"><span class="stack-xs"><b>${esc(r.titulo)}</b><span class="small muted">Miçanga ${r.alvo}</span></span><button type="button" class="btn pink" data-act="claim" data-id="${r.id}">Resgatado</button></div>`).join("")}</section>` : ""}
    <section class="stack-s"><b>Últimos encontros</b>${recent.map((s) => { const e = E[s.d] || {}; const h = { facil: "Fácil", medida: "Na medida", puxado: "Puxado" }[e.humor] || (e.feito ? "Feito" : "Não feito"); return `<div class="agenda"><span class="mono muted">${dLabel(s.d)}</span><span class="grow">${esc(s.t)}</span><span class="hum ${e.humor || (e.feito ? "" : "no")}">${h}</span></div>`; }).join("")}</section>
    <section class="card stack-s"><b>Ajustes</b>
      <span class="small muted">Horário de cada dia</span>
      <div class="grid3">${[[1, "Segunda"], [3, "Quarta"], [5, "Sexta"]].map(([w, n]) => `<label class="stack-xs small">${n}<input type="time" data-act="hor" data-w="${w}" value="${esc(hor[w] || CONFIG.horarioPadrao[w])}"></label>`).join("")}</div>
      <label class="stack-xs small" for="env">O que vai dentro do envelope surpresa (ela só vê depois de resgatado)<input id="env" type="text" data-act="env" value="${esc(aj.envelope || "")}" placeholder="Ex.: ingresso de cinema com uma amiga"></label>
      <span class="small muted">Trilhas: no Spotify, abra o álbum (ou playlist), toque em ··· → Compartilhar → Copiar link e cole aqui. Com o link, a música toca dentro do modo foco.</span>
      ${Object.entries(ERAS).map(([k, Er]) => `<label class="stack-xs small">${esc(Er.nome)}<input type="url" data-act="trilha" data-m="${k}" value="${esc(tr[k] || Er.trilha || "")}" placeholder="https://open.spotify.com/album/..."></label>`).join("")}
    </section>
    ${store.isCloud() ? `<button type="button" class="btn ghost" data-act="logout">Sair</button>` : ""}
  </div>`;
}

const viewNotFound = () => `<div class="page"><h1 class="display xl">Ops</h1><p>Não achei essa página.</p><a class="btn primary" href="#/hoje">Ir para Hoje</a></div>`;
const back = (href) => `<a class="round" href="${href}" aria-label="Voltar">${I.back}</a>`;

// ---------- roteamento e render ----------
function parseRoute() {
  const p = (location.hash.replace(/^#\/?/, "") || "hoje").split("/");
  if (p[0] === "encontro") return { name: p[2] || "aquecimento", args: [p[1]] };
  return { name: p[0], args: p.slice(1) };
}
const NAV = [["hoje", "Hoje"], ["turne", "Turnê"], ["pulseira", "Pulseira"], ["mapas", "Mapas"], ["ingressos", "Ingressos"]];
function navHtml() {
  const items = [...NAV, ...(isPai() ?[["bastidores", "Bastidores"]] : [])];
  const active = ["aquecimento", "foco", "concluido"].includes(route.name) ? "hoje" : route.name === "era" ? "turne" : route.name === "mapa" ? "mapas" : route.name;
  return items.map(([k, n]) => `<a href="#/${k}" class="${active === k ? "on" : ""}" ${active === k ? 'aria-current="page"' : ""}>${I[k]}<span>${n}</span></a>`).join("");
}
let keepScroll = false;
function render() {
  route = parseRoute();
  // Prêmio novo desde a última visita? Comemora na tela Hoje.
  if (route.name === "hoje") hoje.fresh = [];
  if (route.name === "hoje" && !isPai()) {
    const now = unlocked(metrics()), seen = seenUnlock();
    if (seen === null) setSeenUnlock(now);
    else { const fresh = now.filter((x) => !seen.includes(x)); if (fresh.length) { hoje.fresh = fresh; setSeenUnlock(now); setTimeout(() => { confetti(); toast("Ingresso destravado!"); }, 300); } }
  }
  const V = {
    hoje: viewHoje, aquecimento: () => viewAquecimento(route.args[0]), foco: () => viewFoco(route.args[0]), concluido: () => viewConcluido(route.args[0]),
    pulseira: viewPulseira, ingressos: viewIngressos, turne: viewTurne, era: () => viewEra(+route.args[0]), bastidores: viewBastidores, mapas: viewMapas, mapa: () => viewMapa(route.args[0]),
  }[route.name] || viewNotFound;
  $("#view").innerHTML = V();
  $("#view").dataset.route = route.name;
  $("#nav-top").innerHTML = navHtml();
  $("#nav-bottom").innerHTML = navHtml();
  document.body.classList.toggle("in-session", ["aquecimento", "foco", "concluido"].includes(route.name));
  if (route.name === "foco") paintTimer();
  hydrate();
  if (!keepScroll) window.scrollTo(0, 0);
  keepScroll = false;
}

// ---------- ações ----------
let saveT = null;
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act, d = b.dataset.d;
  if (a === "revela") { viewAquecimento.shown[b.dataset.k] = true; render(); }
  else if (a === "lembra") { const e = enc(d); await store.saveEncontro(d, { lembranca: { ...(e.lembranca || {}), [b.dataset.src]: b.dataset.v } }); render(); }
  else if (a === "tab") { foco.tab = +b.dataset.i; render(); }
  else if (a === "t-toggle") {
    const t = timerGet() || { acc: 0, running: false };
    if (t.running) timerSet({ acc: timerElapsed(t), running: false });
    else { lastBlock = timerBlock(t.acc || 0).i; timerSet({ acc: (t.acc || 0) >= TOTAL ? 0 : t.acc || 0, running: true, startedAt: Date.now() }); beep(); }
    paintTimer();
  } else if (a === "t-skip") {
    const t = timerGet() || { acc: 0 }, el = timerElapsed(t), blk = timerBlock(el);
    const acc = Math.min(TOTAL, el + blk.left);
    timerSet({ acc, running: Boolean(t.running), startedAt: Date.now() }); paintTimer();
  } else if (a === "concluir") {
    await store.saveEncontro(d, { feito: true });
    timerSet(null); lastBlock = -1;
    location.hash = `#/encontro/${d}/concluido`;
    toast("Encontro feito! Agora o mapa mental.");
    confetti();
  } else if (a === "aprovar") {
    const before = unlocked(metrics());
    await store.decide(d, "aprovado");
    const fresh = REWARDS.filter((r) => unlocked(metrics()).includes(r.id) && !before.includes(r.id));
    toast(fresh.length ? `Aprovado! Ela destravou: ${fresh.map((r) => r.titulo).join(", ")}` : "Aprovado! A miçanga ganhou cor.");
    keepScroll = route.name === "bastidores"; render();
  } else if (a === "refazer") {
    const txt = ($("#c-" + d) || {}).value || "";
    await store.decide(d, "refazer", txt.trim());
    toast("Pedido enviado para ela."); keepScroll = route.name === "bastidores"; render();
  } else if (a === "humor") { await store.saveEncontro(d, { humor: b.dataset.v }); render(); }
  else if (a === "claim") { await store.claimIngresso(b.dataset.id); toast("Aproveitem!"); render(); }
  else if (a === "undo") { await store.undoEncontro(d); render(); }
  else if (a === "logout") { await store.logout(); location.reload(); }
});
document.addEventListener("change", async (ev) => {
  const b = ev.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act;
  if (a === "upload") {
    const f = b.files && b.files[0]; if (!f) return;
    toast("Enviando o mapa…");
    try { await store.uploadMapa(b.dataset.d, f); toast("Mapa enviado! Agora é com o pai."); confetti(); }
    catch (e) { toast(e.message || "Não consegui enviar. Tente de novo."); }
    keepScroll = true; render(); return;
  }
  if (a === "rot") { const e = enc(b.dataset.d); await store.saveEncontro(b.dataset.d, { roteiro: { ...(e.roteiro || {}), [b.dataset.k]: b.checked } }); }
  else if (a === "hor") { await store.setAjuste("horario", { ...(st().ajustes.horario || {}), [b.dataset.w]: b.value }); toast("Horário salvo"); }
  else if (a === "env") { await store.setAjuste("envelope", b.value); toast("Envelope salvo"); }
  else if (a === "trilha") { await store.setAjuste("trilhas", { ...(st().ajustes.trilhas || {}), [b.dataset.m]: b.value.trim() }); toast("Trilha salva"); }
});
document.addEventListener("input", (ev) => {
  const b = ev.target.closest("[data-act='pontos']"); if (!b) return;
  clearTimeout(saveT);
  saveT = setTimeout(() => store.saveEncontro(b.dataset.d, { pontos: b.value }), 600);
});
document.addEventListener("submit", async (ev) => {
  if (ev.target.id !== "login-form") return;
  ev.preventDefault();
  try { await store.login($("#l-email").value.trim(), $("#l-senha").value); boot(); }
  catch (e) { $("#view").innerHTML = viewLogin(e.message); }
});
document.addEventListener("toggle", (ev) => {
  if (!ev.target.classList || !ev.target.classList.contains("howto")) return;
  try { localStorage.setItem("eras-howto", ev.target.open ? "aberto" : "fechado"); } catch (e) { /* ignora */ }
  const h = ev.target.querySelector(".howto-hint"); if (h) h.textContent = `toque para ${ev.target.open ? "recolher" : "abrir"}`;
}, true);
window.addEventListener("hashchange", render);
// Quando o app volta para a tela, busca novidades (mapa novo, aprovação do pai).
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  const changed = await store.refresh();
  const typing = document.activeElement && ["TEXTAREA", "INPUT"].includes(document.activeElement.tagName);
  if (changed && !typing && !document.body.classList.contains("in-session")) { keepScroll = true; render(); }
});

// ---------- início ----------
async function boot() {
  try {
    const r = await store.init();
    if (r === "login") { $("#view").innerHTML = viewLogin(); document.body.classList.add("logged-out"); return; }
  } catch (e) {
    $("#view").innerHTML = viewLogin(e.message); document.body.classList.add("logged-out"); return;
  }
  document.body.classList.remove("logged-out");
  render();
}
boot();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
