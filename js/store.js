// =====================================================================
//  Armazenamento: navegador (localStorage) e, se configurado, Supabase.
//  O app sempre lê e escreve no estado em memória; este módulo cuida
//  de guardar localmente e sincronizar com a nuvem.
// =====================================================================
import { CONFIG } from "./config.js";

const LOCAL_KEY = "eras-luisa-v1";
const SUPABASE_ESM = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";

const empty = () => ({ encontros: {}, ingressos: {}, ajustes: {} });

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
  const [m, e, i, a] = await Promise.all([
    sb.from("members").select("role").eq("user_id", user.id).maybeSingle(),
    sb.from("encontros").select("*"),
    sb.from("ingressos").select("*"),
    sb.from("ajustes").select("*"),
  ]);
  if (m.error || !m.data) throw new Error("Este usuário ainda não foi liberado no app. Peça ao pai para cadastrar.");
  role = m.data.role;
  const next = empty();
  (e.data || []).forEach((r) => {
    next.encontros[r.data] = { humor: r.humor, lembranca: r.lembranca || {}, roteiro: r.roteiro || {}, pontos: r.pontos || "", feitoEm: r.feito_em, feito: r.feito };
  });
  (i.data || []).forEach((r) => { next.ingressos[r.id] = { resgatadoEm: r.resgatado_em }; });
  (a.data || []).forEach((r) => { next.ajustes[r.chave] = r.valor; });
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
    }, "data");
  }
}

export async function undoEncontro(date) {
  const cur = state.encontros[date];
  if (!cur) return;
  cur.feito = false;
  writeLocal();
  if (isCloud()) {
    const { error } = await sb.from("encontros").delete().eq("data", date);
    if (error) console.warn(error.message);
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
