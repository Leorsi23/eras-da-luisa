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

function horario(iso) {
  const w = dt(iso).getDay();
  return (st().ajustes.horario || {})[w] || CONFIG.horarioPadrao[w] || "17:00";
}
function trilhaUrl(m) { return (st().ajustes.trilhas || {})[m] || ERAS[m].trilha || ""; }
function spotifyEmbed(url) {
  const x = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(album|playlist)\/([A-Za-z0-9]+)/.exec(url || "");
  return x ? `https://open.spotify.com/embed/${x[1]}/${x[2]}?theme=0` : "";
}
function spotifySearch(m) { return `https://open.spotify.com/search/${encodeURIComponent("Taylor Swift " + ERAS[m].nome)}`; }
function phetEmbed(url) {
  const x = /phet\.colorado\.edu\/[a-zA-Z_]+\/simulations\/([a-z0-9-]+)/.exec(url || "");
  return x ? `https://phet.colorado.edu/sims/html/${x[1]}/latest/${x[1]}_all.html?locale=pt_BR` : "";
}

// ---------- métricas ----------
function weekKey(iso) { const d = dt(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toLocaleDateString("sv-SE"); }
function metrics() {
  const n = REAL.filter((s) => isDone(s.d)).length;
  const weeks = {};
  REAL.forEach((s) => { (weeks[weekKey(s.d)] ||= []).push(s); });
  const keys = Object.keys(weeks).sort();
  let full = 0, best = 0, run = 0;
  keys.forEach((k) => { if (weeks[k].every((s) => isDone(s.d))) { full++; run++; best = Math.max(best, run); } else run = 0; });
  const today = todayISO();
  let thisWeek = weekKey(today);
  if (today < REAL[0].d) { const lastDone = REAL.filter((s) => isDone(s.d)).pop(); thisWeek = lastDone ? weekKey(lastDone.d) : thisWeek; }
  let cur = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] > thisWeek) continue;
    if (weeks[keys[i]].every((s) => isDone(s.d))) cur++;
    else if (keys[i] !== thisWeek) break;
  }
  const eraTotal = (m) => (BY_MONTH[m] || []).filter((s) => !s.off).length;
  const eraDoneN = (m) => (BY_MONTH[m] || []).filter((s) => !s.off && isDone(s.d)).length;
  const eraDone = (m) => eraDoneN(m) === eraTotal(m);
  const sims = REAL.filter((s) => s.t.startsWith("Simulado") && isDone(s.d)).length;
  const thisWeekSessions = (weeks[thisWeek] || []);
  return { n, full, cur, best, eraTotal, eraDoneN, eraDone, sims, weekDone: thisWeekSessions.filter((s) => isDone(s.d)).length, weekTotal: thisWeekSessions.length || 3 };
}
function rewardProgress(r, m) {
  if (r.tipo === "contagem") return [m.n, r.alvo];
  if (r.tipo === "sequencia") return [m.best, r.alvo];
  if (r.tipo === "simulados") return [m.sims, r.alvo];
  if (r.tipo === "era") return [m.eraDoneN(r.mes), m.eraTotal(r.mes)];
  return [0, 1];
}
const unlocked = (m) => REWARDS.filter((r) => { const [a, t] = rewardProgress(r, m); return a >= t; }).map((r) => r.id);
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
  circle: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>',
};

const chip = (a) => `<span class="chip" style="--c:${AREAS[a].cor}">${esc(AREAS[a].nome)}</span>`;
const steps = (i) => `<ol class="steps" aria-label="Passo ${i} de 3">${["Aquecimento", "Foco", "Miçanga"].map((n, k) => `<li class="${k + 1 < i ? "ok" : k + 1 === i ? "on" : ""}">${k + 1} · ${n}${k + 1 < i ? " ✓" : ""}</li>`).join("")}</ol>`;

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
let lastUnlock = [];
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

function viewHoje() {
  const m = metrics(), nx = nextSession(), era = currentEra(), E = ERAS[era];
  const beads = REAL.slice(Math.max(0, m.n - 4), Math.max(0, m.n - 4) + 12).map((s) => isDone(s.d) ? `<span class="bead" style="--c:${AREAS[s.a].cor}"></span>` : s.d === nx?.d ? `<span class="bead next"></span>` : `<span class="bead empty"></span>`).join("");
  const nr = REWARDS.map((r) => ({ r, p: rewardProgress(r, m) })).find(({ p }) => p[0] < p[1]);
  const agenda = REAL.filter((s) => !isDone(s.d) && s.d >= todayISO()).slice(1, 4);
  const tr = trilhaUrl(era);
  return `<div class="hoje">
    <div class="row between">
      <div class="stack-xs"><span class="eyebrow" style="color:${E.cor}">Era ${esc(E.nome)}</span><h1 class="display xl">Oi, Luísa</h1></div>
      <div class="count"><b>${daysToOnc()}</b><span>dias p/ ONC</span></div>
    </div>
    ${nx ? `<article class="card hero">
      <div class="row between"><span class="mono muted">${dLabel(nx.d).toUpperCase()} · ${horario(nx.d)}</span>${chip(nx.a)}</div>
      <h2 class="display lg">${esc(nx.t)}</h2>
      <div class="grid3">
        <div class="mini"><span class="mono">1 · 15 MIN</span><b>Aquecimento</b></div>
        <div class="mini"><span class="mono">2 · ${CONFIG.blocos.reduce((a, b) => a + b.min, 0)} MIN</span><b>Foco + trilha</b></div>
        <div class="mini"><span class="mono">3 · FIM</span><b>Miçanga</b></div>
      </div>
      <a class="btn primary big" href="#/encontro/${nx.d}/aquecimento">${I.play} Começar encontro</a>
    </article>` : `<article class="card hero"><h2 class="display lg">Turnê completa!</h2><p>Todos os encontros feitos. Agora é o grande show.</p></article>`}
    <section class="stack-s">
      <div class="row between"><b>Sua pulseira</b><a href="#/pulseira">${m.n} de ${REAL.length} · ver tudo</a></div>
      <div class="strip">${beads}</div>
      <span class="muted small">Semana: ${m.weekDone} de ${m.weekTotal}${nx ? " · a pontilhada é a próxima" : ""}</span>
    </section>
    <a class="card row tune" href="${esc(tr || spotifySearch(era))}" target="_blank" rel="noopener">
      <span class="tune-ic" style="--c:${E.cor}">${I.music}</span>
      <span class="stack-xs grow"><b>Trilha da era: ${esc(E.nome)}</b><span class="muted small">Abre no Spotify · no computador toca dentro do modo foco</span></span>${I.ext}
    </a>
    ${nr ? `<a class="ticket-mini" href="#/ingressos"><span class="stack-xs grow"><span class="mono pink">PRÓXIMO INGRESSO</span><b>${esc(nr.r.titulo)} · faltam ${nr.p[1] - nr.p[0]}</b><span class="bar"><i style="width:${(100 * nr.p[0]) / nr.p[1]}%"></i></span></span>${I.chev}</a>` : ""}
    ${agenda.length ? `<section class="stack-s"><b>Próximos encontros</b>${agenda.map((s) => `<div class="agenda"><span class="mono muted">${dLabel(s.d)} · ${horario(s.d)}</span><span>${esc(s.t)}</span></div>`).join("")}</section>` : ""}
  </div>`;
}

function viewAquecimento(d) {
  const s = BY_DATE[d]; if (!s) return viewNotFound();
  const e = enc(d), revs = s.r || [];
  const shown = viewAquecimento.shown ||= {};
  const cards = revs.map(([lbl, t, src]) => {
    const srcS = BY_DATE[src], area = srcS ? srcS.a : "rev", val = (e.lembranca || {})[src] || "";
    const pontos = src && enc(src).pontos;
    const open = shown[d + src];
    return `<article class="card recall">
      <div class="row between"><span class="mono muted">DE ${esc(lbl.toUpperCase())} ATRÁS</span>${chip(area)}</div>
      <h3 class="display md">${esc(t)}</h3>
      ${open ? `<div class="keys"><span class="mono accent">PONTOS-CHAVE</span>${pontos ? `<p class="pre">${esc(pontos)}</p>` : `<p class="muted">Sem frases anotadas para este tema. Confira no caderno.</p>`}</div>
        <div class="grid3">${[["esqueci", "Esqueci"], ["parte", "Lembrei parte"], ["tudo", "Lembrei tudo"]].map(([k, n]) => `<button type="button" class="opt ${val === k ? "sel" : ""}" data-act="lembra" data-d="${d}" data-src="${src}" data-v="${k}">${n}</button>`).join("")}</div>`
      : `<div class="hidden-keys">Escreva no papel primeiro.<br>Os pontos-chave abrem depois.</div>
         <button type="button" class="btn ghost" data-act="revela" data-k="${d + src}">Já escrevi · conferir</button>`}
    </article>`;
  }).join("");
  return `<div class="encontro">
    <div class="topbar">${back("#/hoje")}${steps(1)}<span class="phone-off">${I.phone} Celular fora do quarto</span></div>
    <header class="stack-xs"><span class="eyebrow">${dLabel(d).toUpperCase()} · ANTES DE: ${esc(s.t.toUpperCase())}</span>
      <h1 class="display xl">O que você lembra?</h1>
      <p class="muted lead">Escreva no papel, sem consultar nada, tudo o que lembra de cada tema. Depois abra os pontos-chave e confira. Errar aqui é o que faz lembrar em agosto.</p></header>
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
  const items = [["aquec", "Aquecimento"], ...mats.map((x, i) => ["m" + i, `${x[0]}: ${x[1]}`]), ["pontos", "3 frases no caderno sobre o tema"]];
  const emb = spotifyEmbed(trilhaUrl(m));
  return `<div class="encontro">
    <div class="topbar">${back(`#/encontro/${d}/aquecimento`)}${steps(2)}<span class="phone-off">${I.phone} Celular fora do quarto</span></div>
    <div class="split">
      <main class="stack">
        <header class="stack-xs"><span class="eyebrow" style="color:${AREAS[s.a].cor}">ERA ${esc(E.nome.toUpperCase())} · ${esc(AREAS[s.a].nome.toUpperCase())} · ${dLabel(d).toUpperCase()}</span><h1 class="display xl">${esc(s.t)}</h1></header>
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
            : `<a class="btn ghost" href="${esc(spotifySearch(m))}" target="_blank" rel="noopener">${I.music} Abrir no Spotify</a><span class="muted small">Para tocar aqui dentro, o pai cola o link do álbum ou da playlist em Bastidores.</span>`}
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
  const nr = REWARDS.map((r) => ({ r, p: rewardProgress(r, m) })).find(({ p }) => p[0] < p[1]);
  const fresh = REWARDS.filter((r) => lastUnlock.includes(r.id));
  const c = AREAS[s.a].cor;
  return `<div class="encontro">
    <div class="topbar">${back("#/hoje")}${steps(3)}<span></span></div>
    <div class="split done">
      <div class="drop" aria-hidden="true">
        <svg viewBox="0 0 520 360" width="100%"><path d="M40 220 Q260 380 480 220" fill="none" stroke="var(--line2)" stroke-width="2"/>
        ${[58, 96, 136, 178, 220].map((x, i) => `<circle cx="${x}" cy="${[240, 266, 285, 297, 303][i]}" r="15" fill="${c}" opacity="${0.45 + i * 0.1}"/>`).join("")}
        <circle class="falling" cx="262" cy="305" r="17" fill="${c}"/>
        ${[304, 346, 388, 428, 464].map((x, i) => `<circle cx="${x}" cy="${[303, 297, 285, 266, 240][i]}" r="15" fill="var(--line)"/>`).join("")}</svg>
      </div>
      <div class="stack">
        <span class="eyebrow" style="color:${c}">MIÇANGA Nº ${idx} DE ${REAL.length}</span>
        <h1 class="display xxl">Encontro feito!</h1>
        <p class="muted lead">${esc(s.t)} entra para a pulseira. Volta no aquecimento daqui a 1 semana, 1 mês e 3 meses.</p>
        ${fresh.map((r) => `<a class="ticket-mini open" href="#/ingressos"><span class="stack-xs grow"><span class="mono pink">INGRESSO DESTRAVADO</span><b>${esc(r.titulo)}</b><span class="small">Mostre ao pai para combinar.</span></span>${I.chev}</a>`).join("")}
        ${!fresh.length && nr ? `<a class="ticket-mini" href="#/ingressos"><span class="stack-xs grow"><span class="mono pink">PRÓXIMO INGRESSO · FALTAM ${nr.p[1] - nr.p[0]}</span><b>${esc(nr.r.titulo)}</b><span class="bar"><i style="width:${(100 * nr.p[0]) / nr.p[1]}%"></i></span></span>${I.chev}</a>` : ""}
        <label for="pontos" class="b">As 3 frases do caderno sobre o tema</label>
        <textarea id="pontos" rows="4" data-act="pontos" data-d="${d}" placeholder="Elas aparecem no aquecimento das próximas semanas.">${esc(e.pontos || "")}</textarea>
        <fieldset class="stack-s"><legend class="b">Como foi hoje?</legend>
          <div class="grid3">${[["facil", "Fácil"], ["medida", "Na medida"], ["puxado", "Puxado"]].map(([k, n]) => `<button type="button" class="opt ${e.humor === k ? "sel" : ""}" data-act="humor" data-d="${d}" data-v="${k}">${n}</button>`).join("")}</div>
        </fieldset>
        <a class="btn primary big" href="#/hoje">Voltar para Hoje</a>
      </div>
    </div>
  </div>`;
}

function viewPulseira() {
  const m = metrics(), N = REAL.length, slots = N + 8, cx = 175, cy = 175, R = 150;
  const ang = (i) => -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / slots;
  let slot = 0, svg = "";
  for (let mo = 1; mo <= 8; mo++) {
    (BY_MONTH[mo] || []).filter((s) => !s.off).forEach((s) => {
      const a = ang(slot++);
      svg += `<circle cx="${(cx + R * Math.cos(a)).toFixed(1)}" cy="${(cy + R * Math.sin(a)).toFixed(1)}" r="5.4" fill="${isDone(s.d) ? AREAS[s.a].cor : "var(--line)"}"><title>${esc(dLabel(s.d) + " · " + s.t)}</title></circle>`;
    });
    const a = ang(slot++);
    svg += `<rect x="${(cx + R * Math.cos(a) - 8).toFixed(1)}" y="${(cy + R * Math.sin(a) - 8).toFixed(1)}" width="16" height="16" rx="4" fill="${m.eraDone(mo) ? "var(--ink)" : "var(--line)"}" stroke="var(--bg)" stroke-width="2"><title>Era ${esc(ERAS[mo].nome)}</title></rect>`;
  }
  const erasDone = [1, 2, 3, 4, 5, 6, 7, 8].filter((x) => m.eraDone(x)).length;
  return `<div class="page">
    <h1 class="display xl">A pulseira</h1>
    <div class="bracelet"><svg viewBox="0 0 350 350" role="img" aria-label="Pulseira com ${m.n} de ${N} miçangas"><circle cx="175" cy="175" r="150" fill="none" stroke="var(--line)" stroke-width="2"/>${svg}</svg>
      <div class="bracelet-c"><span class="display huge">${m.n}</span><span class="mono muted">de ${N} miçangas</span></div></div>
    <div class="grid3">
      <div class="mini"><b class="mono n">${erasDone}</b><span class="muted small">eras completas</span></div>
      <div class="mini"><b class="mono n">${m.full}</b><span class="muted small">semanas cheias</span></div>
      <div class="mini"><b class="mono n">${m.cur}</b><span class="muted small">em sequência</span></div>
    </div>
    <div class="legend">${Object.entries(AREAS).map(([k, a]) => `<span><i style="background:${a.cor}"></i>${esc(a.nome)}</span>`).join("")}<span><i class="sq"></i>Era completa</span></div>
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
      <div class="t-main stack-xs"><span class="mono t-tag">${tag}</span><b class="display md">${esc(r.titulo)}</b><span class="small t-sub">${esc(r.desc)}</span><span class="small t-sub">Meta: ${esc(r.meta)}</span>
        ${!open ? `<span class="bar"><i style="width:${(100 * Math.min(a, t)) / t}%"></i></span>` : ""}
        ${got && r.id === "envelope" && env ? `<span class="small"><b>Dentro do envelope:</b> ${esc(env)}</span>` : ""}
        ${open && !got && isPai() ? `<button type="button" class="btn pink small-btn" data-act="claim" data-id="${r.id}">Marcar como resgatado</button>` : ""}
      </div>
      <div class="t-stub"><span class="mono small">Nº</span><b class="display md">${String(i + 1).padStart(2, "0")}</b><span class="small">${got ? "Usado" : open ? "Pedir" : `${Math.min(a, t)}/${t}`}</span></div>
    </article>`;
  }).join("");
  return `<div class="page"><h1 class="display xl">Seus ingressos</h1><p class="muted">Valem pelo esforço, nunca pela nota.</p><div class="tickets">${rows}</div></div>`;
}

function viewTurne() {
  const m = metrics(), now = currentEra();
  const rows = Object.entries(ERAS).map(([k, E]) => {
    const mo = +k, done = m.eraDone(mo), stt = done ? "done" : mo === now ? "now" : mo < now ? "late" : "next";
    const badge = { done: "ESGOTADO", now: "EM CARTAZ", late: "PENDENTE", next: "EM BREVE" }[stt];
    return `<li><a class="stop ${stt}" href="#/era/${mo}"><span class="mono muted">${MES_C[mo]}</span><span class="stack-xs grow"><b class="display md" style="color:${E.cor}">${esc(E.nome)}</b><span class="small muted">${esc(E.sub)} · ${m.eraDoneN(mo)}/${m.eraTotal(mo)}</span></span><span class="badge">${badge}</span></a></li>`;
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
      ${done ? `<span class="ok-ic">${I.check}</span>${isPai() ? `<button type="button" class="link" data-act="undo" data-d="${s.d}">desfazer</button>` : ""}` : ""}</li>`;
  }).join("");
  return `<div class="page">${back("#/turne")}<span class="eyebrow">${MES[mo].toUpperCase()} 2027</span><h1 class="display xl" style="color:${E.cor}">Era ${esc(E.nome)}</h1><p class="muted">${esc(E.sub)}</p>
    <a class="btn ghost" href="${esc(trilhaUrl(mo) || spotifySearch(mo))}" target="_blank" rel="noopener">${I.music} Trilha da era</a>
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
  const pend = REWARDS.filter((r) => { const [a, t] = rewardProgress(r, m); return a >= t && !st().ingressos[r.id]; });
  const recent = REAL.filter((s) => s.d <= todayISO()).slice(-6).reverse();
  const hor = aj.horario || {}, tr = aj.trilhas || {};
  return `<div class="page">
    <span class="eyebrow">SÓ PARA O PAI</span><h1 class="display xl">Bastidores</h1>
    ${store.isCloud() ? "" : `<p class="note">Modo local: estes dados são só deste aparelho. Com o Supabase configurado, você vê o progresso dela do seu celular.</p>`}
    <div class="grid3">
      <div class="mini"><b class="mono n">${m.weekDone} de ${m.weekTotal}</b><span class="muted small">nesta semana</span></div>
      <div class="mini"><b class="mono n">${m.n}/${REAL.length}</b><span class="muted small">no ano</span></div>
      <div class="mini"><b class="mono n">${pct === null ? "—" : pct + "%"}</b><span class="muted small">lembrou no aquecimento</span></div>
    </div>
    ${alerts.map(([a, l]) => `<div class="alert"><b>${esc(AREAS[a].nome)} marcada como "puxado" ${l.length} vezes no último mês</b><span class="small">${esc(l.join(" · "))}. Vale uma conversa ou levar ao professor.</span></div>`).join("")}
    ${pend.length ? `<section class="stack-s"><b>Ingressos para combinar</b>${pend.map((r) => `<div class="row between card"><span class="stack-xs"><b>${esc(r.titulo)}</b><span class="small muted">${esc(r.meta)}</span></span><button type="button" class="btn pink" data-act="claim" data-id="${r.id}">Resgatado</button></div>`).join("")}</section>` : ""}
    <section class="stack-s"><b>Últimos encontros</b>${recent.map((s) => { const e = E[s.d] || {}; const h = { facil: "Fácil", medida: "Na medida", puxado: "Puxado" }[e.humor] || (e.feito ? "Feito" : "Não feito"); return `<div class="agenda"><span class="mono muted">${dLabel(s.d)}</span><span class="grow">${esc(s.t)}</span><span class="hum ${e.humor || (e.feito ? "" : "no")}">${h}</span></div>`; }).join("")}</section>
    <section class="card stack-s"><b>Ajustes</b>
      <span class="small muted">Horário de cada dia</span>
      <div class="grid3">${[[1, "Segunda"], [3, "Quarta"], [5, "Sexta"]].map(([w, n]) => `<label class="stack-xs small">${n}<input type="time" data-act="hor" data-w="${w}" value="${esc(hor[w] || CONFIG.horarioPadrao[w])}"></label>`).join("")}</div>
      <label class="stack-xs small" for="env">O que vai dentro do envelope surpresa (ela só vê depois de resgatado)<input id="env" type="text" data-act="env" value="${esc(aj.envelope || "")}" placeholder="Ex.: ingresso de cinema com uma amiga"></label>
      <span class="small muted">Trilhas: cole o link do álbum ou da playlist do Spotify de cada era</span>
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
const NAV = [["hoje", "Hoje"], ["turne", "Turnê"], ["pulseira", "Pulseira"], ["ingressos", "Ingressos"]];
function navHtml() {
  const items = [...NAV, ...(isPai() ?[["bastidores", "Bastidores"]] : [])];
  const active = ["aquecimento", "foco", "concluido"].includes(route.name) ? "hoje" : route.name === "era" ? "turne" : route.name;
  return items.map(([k, n]) => `<a href="#/${k}" class="${active === k ? "on" : ""}" ${active === k ? 'aria-current="page"' : ""}>${I[k]}<span>${n}</span></a>`).join("");
}
function render() {
  route = parseRoute();
  const V = {
    hoje: viewHoje, aquecimento: () => viewAquecimento(route.args[0]), foco: () => viewFoco(route.args[0]), concluido: () => viewConcluido(route.args[0]),
    pulseira: viewPulseira, ingressos: viewIngressos, turne: viewTurne, era: () => viewEra(+route.args[0]), bastidores: viewBastidores,
  }[route.name] || viewNotFound;
  $("#view").innerHTML = V();
  $("#view").dataset.route = route.name;
  $("#nav-top").innerHTML = navHtml();
  $("#nav-bottom").innerHTML = navHtml();
  document.body.classList.toggle("in-session", ["aquecimento", "foco", "concluido"].includes(route.name));
  if (route.name === "foco") paintTimer();
  if (route.name === "concluido" && lastUnlock.length) { confetti(); lastUnlock = []; }
  window.scrollTo(0, 0);
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
    const before = unlocked(metrics());
    await store.saveEncontro(d, { feito: true });
    lastUnlock = unlocked(metrics()).filter((x) => !before.includes(x));
    timerSet(null); lastBlock = -1;
    location.hash = `#/encontro/${d}/concluido`;
    toast(lastUnlock.length ? "Ingresso destravado!" : "Mais uma miçanga!");
    if (!lastUnlock.length) confetti();
  } else if (a === "humor") { await store.saveEncontro(d, { humor: b.dataset.v }); render(); }
  else if (a === "claim") { await store.claimIngresso(b.dataset.id); toast("Aproveitem!"); render(); }
  else if (a === "undo") { await store.undoEncontro(d); render(); }
  else if (a === "logout") { await store.logout(); location.reload(); }
});
document.addEventListener("change", async (ev) => {
  const b = ev.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act;
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
window.addEventListener("hashchange", render);

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
