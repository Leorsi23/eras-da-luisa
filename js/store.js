// =====================================================================
//  Armazenamento: navegador (localStorage) e, se configurado, Supabase.
//  O app sempre lê e escreve no estado em memória; este módulo cuida
//  de guardar localmente e sincronizar com a nuvem.
// =====================================================================
import { CONFIG } from "./config.js";

const LOCAL_KEY = "eras-luisa-v1";
const SUPABASE_ESM = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";

const empty = () => ({ encontros: {}, ingressos: {}, ajustes: {}, aprovacoes: {} });

let sb = null;          // cliente Supabase (null = modo local)
let user = null;        // usuário logado
let role = "estudante"; // "estudante" | "pai"
let state = empty();

function readLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null");
    if (v && typeof v === "object") return Object.assign(empty(), v);
  } catch (e) { /* armazenamento indisponível */ }
  return empty();
}
function writeLocal() {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch (e) { /* ignora */ }
}

export const cloudEnabled = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
export const getState = () => state;
export const getRole = () => role;
export const getUser = () => user;
export const isCloud = () => Boolean(sb && user);

// Inicia. Retorna "ok" ou "login" (precisa entrar).
export async function init() {
  state = readLocal();
  if (!cloudEnabled()) { role = "pai-local"; return "ok"; }
  const { createClient } = await import(SUPABASE_ESM);
  sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  const { data } = await sb.auth.getSession();
  if (!data.session) return "login";
  user = data.session.user;
  await loadCloud();
  return "ok";
}

export async function login(email, senha) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error("E-mail ou senha não conferem.");
  user = data.user;
  await loadCloud();
}

export async function logout() {
  if (sb) await sb.auth.signOut();
  user = null;
}

async function loadCloud() {
  const [m, e, i, a, ap] = await Promise.all([
    sb.from("members").select("role").eq("user_id", user.id).maybeSingle(),
    sb.from("encontros").select("*"),
    sb.from("ingressos").select("*"),
    sb.from("ajustes").select("*"),
    sb.from("aprovacoes").select("*"),
  ]);
  if (m.error || !m.data) throw new Error("Este usuário ainda não foi liberado no app. Peça ao pai para cadastrar.");
  role = m.data.role;
  const next = empty();
  (e.data || []).forEach((r) => {
    next.encontros[r.data] = { humor: r.humor, lembranca: r.lembranca || {}, roteiro: r.roteiro || {}, pontos: r.pontos || "", feitoEm: r.feito_em, feito: r.feito, mapa: r.mapa || "", mapaEm: r.mapa_em || null };
  });
  (i.data || []).forEach((r) => { next.ingressos[r.id] = { resgatadoEm: r.resgatado_em }; });
  (a.data || []).forEach((r) => { next.ajustes[r.chave] = r.valor; });
  (ap.data || []).forEach((r) => { next.aprovacoes[r.data] = { status: r.status, comentario: r.comentario || "", decididoEm: r.decidido_em }; });
  // Rascunhos locais ainda não enviados (ex.: roteiro marcado offline) entram por cima.
  const local = readLocal();
  Object.entries(local.encontros).forEach(([d, v]) => {
    if (!next.encontros[d]) next.encontros[d] = { ...v, feito: false };
  });
  state = next;
  writeLocal();
}

async function push(table, row, conflict) {
  if (!isCloud()) return;
  const { error } = await sb.from(table).upsert(row, { onConflict: conflict });
  if (error) console.warn("Falha ao salvar na nuvem:", error.message);
}

// Atualiza um encontro (mescla). feito=true marca a miçanga.
export async function saveEncontro(date, patch) {
  const cur = state.encontros[date] || { lembranca: {}, roteiro: {}, pontos: "", feito: false };
  const next = { ...cur, ...patch };
  if (patch.feito && !cur.feito) next.feitoEm = new Date().toISOString();
  state.encontros[date] = next;
  writeLocal();
  if (isCloud() && next.feito) {
    await push("encontros", {
      data: date, feito: true, feito_em: next.feitoEm, humor: next.humor || null,
      lembranca: next.lembranca || {}, roteiro: next.roteiro || {}, pontos: next.pontos || "",
      mapa: next.mapa || null, mapa_em: next.mapaEm || null,
    }, "data");
  }
}

export async function undoEncontro(date) {
  const cur = state.encontros[date];
  if (!cur) return;
  cur.feito = false;
  delete state.aprovacoes[date];
  writeLocal();
  if (isCloud()) {
    const r1 = await sb.from("aprovacoes").delete().eq("data", date);
    const r2 = await sb.from("encontros").delete().eq("data", date);
    if (r1.error || r2.error) console.warn((r1.error || r2.error).message);
  }
}

export async function claimIngresso(id) {
  state.ingressos[id] = { resgatadoEm: new Date().toISOString() };
  writeLocal();
  await push("ingressos", { id, resgatado_em: state.ingressos[id].resgatadoEm }, "id");
}

export async function setAjuste(chave, valor) {
  state.ajustes[chave] = valor;
  writeLocal();
  await push("ajustes", { chave, valor }, "chave");
}

// Recarrega da nuvem (quando o app volta para a tela). Retorna true se mudou algo.
export async function refresh() {
  if (!isCloud()) return false;
  const before = JSON.stringify(state);
  try { await loadCloud(); } catch (e) { return false; }
  return JSON.stringify(state) !== before;
}

// ---------- mapas mentais (fotos) ----------
// Reduz a foto no próprio aparelho antes de enviar (máx. 1600 px, JPEG).
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.82));
  } finally { URL.revokeObjectURL(url); }
}

const urlCache = {};
export async function uploadMapa(date, file) {
  const blob = await shrink(file);
  const now = new Date().toISOString();
  if (isCloud()) {
    const path = `${date}-${Date.now()}.jpg`;
    const { error } = await sb.storage.from("mapas").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error("Não consegui enviar a foto. Confira a internet e tente de novo.");
    await saveEncontro(date, { mapa: path, mapaEm: now });
  } else {
    const dataUrl = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
    await saveEncontro(date, { mapa: dataUrl, mapaEm: now });
  }
}

// Endereço temporário para mostrar a foto (a pasta é privada).
export async function mapaUrl(path) {
  if (!path) return "";
  if (path.startsWith("data:")) return path;
  const hit = urlCache[path];
  if (hit && hit.exp > Date.now()) return hit.url;
  if (!isCloud()) return "";
  const { data, error } = await sb.storage.from("mapas").createSignedUrl(path, 3600);
  if (error || !data) return "";
  urlCache[path] = { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 };
  return data.signedUrl;
}

// O pai aprova ou pede para completar.
export async function decide(date, status, comentario = "") {
  const decididoEm = new Date().toISOString();
  state.aprovacoes[date] = { status, comentario, decididoEm };
  writeLocal();
  await push("aprovacoes", { data: date, status, comentario, decidido_em: decididoEm }, "data");
}
