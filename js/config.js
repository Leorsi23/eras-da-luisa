// =====================================================================
//  Eras da Luísa · configuração
//  Tudo o que muda com frequência fica aqui. Edite e faça commit.
// =====================================================================

export const CONFIG = {
  // Supabase: deixe vazio para funcionar só no navegador (sem login).
  // Preencha com a Project URL e a Publishable key (sb_publishable_...) de Project Settings > API Keys.
  supabaseUrl: "https://ivpvthbfusvotpobmhnl.supabase.co",
  supabaseAnonKey: "sb_publishable_QV1gfUcjB9H4x2SnNfhPNA_EHQor4RU",

  // Data prevista da 1ª fase da ONC 2027 (ajuste quando sair o edital).
  oncDate: "2027-08-13",

  // Horário padrão de cada dia de estudo (1 = segunda, 3 = quarta, 5 = sexta).
  // O pai pode mudar pela tela Bastidores; isto é só o valor inicial.
  horarioPadrao: { 1: "17:00", 3: "17:00", 5: "17:00" },

  // Blocos do modo foco, em minutos (15 de aquecimento + 75 aqui = 1h30).
  blocos: [
    { nome: "Bloco 1 · foco", min: 35 },
    { nome: "Pausa", min: 5, pausa: true },
    { nome: "Bloco 2 · foco", min: 35 },
  ],
};

export const AREAS = {
  ast: { nome: "Astronomia", cor: "#7b61ff" },
  qui: { nome: "Química", cor: "#17a884" },
  fis: { nome: "Física", cor: "#f07a2a" },
  bio: { nome: "Biologia", cor: "#5aa832" },
  his: { nome: "História", cor: "#e8508a" },
  rev: { nome: "Revisão", cor: "#8a94b0" },
};

// Uma era por mês. "trilha": link de álbum ou playlist do Spotify
// (open.spotify.com/album/... ou /playlist/...). Vazio = botão de busca.
// O pai também pode colar os links pela tela Bastidores.
export const ERAS = {
  1: { nome: "Midnights", sub: "Astronomia: o céu à noite", cor: "#6c4cf0", trilha: "" },
  2: { nome: "Fearless", sub: "Química I: matéria e misturas", cor: "#e0a400", trilha: "" },
  3: { nome: "Red", sub: "Química II: átomo e reações", cor: "#e0364e", trilha: "" },
  4: { nome: "1989", sub: "Matemática da Física · Paris", cor: "#2b9bd8", trilha: "" },
  5: { nome: "Reputation", sub: "Física e OBA", cor: "#55556b", trilha: "" },
  6: { nome: "Folklore", sub: "Biologia", cor: "#7d9466", trilha: "" },
  7: { nome: "Evermore", sub: "História e simulados", cor: "#b8723a", trilha: "" },
  8: { nome: "The Life of a Showgirl", sub: "Reta final", cor: "#f2662f", trilha: "" },
};

// Recompensas. tipo:
//   "contagem"  -> alvo = número de encontros feitos
//   "era"       -> mes = mês que precisa estar completo
//   "sequencia" -> alvo = semanas completas seguidas (a maior sequência)
//   "simulados" -> alvo = encontros de simulado feitos
export const REWARDS = [
  { id: "cinema", titulo: "Noite de cinema", desc: "Ela escolhe o filme e a pizza.", meta: "6 encontros", tipo: "contagem", alvo: 6 },
  { id: "japones", titulo: "Jantar japonês", desc: "Fechou a era Midnights.", meta: "Completar janeiro", tipo: "era", mes: 1 },
  { id: "envelope", titulo: "Envelope surpresa", desc: "O pai decide o que vai dentro.", meta: "4 semanas cheias seguidas", tipo: "sequencia", alvo: 4 },
  { id: "livro", titulo: "Livro à escolha dela", desc: "Qualquer livro, sem palpite dos pais.", meta: "25 encontros", tipo: "contagem", alvo: 25 },
  { id: "planetario", titulo: "Planetário", desc: "Uma sessão de planetário em São Paulo.", meta: "Metade do caminho: 44 encontros", tipo: "contagem", alvo: 44 },
  { id: "rodizio", titulo: "Rodízio japonês com uma amiga", desc: "Fechou a era Folklore.", meta: "Completar junho", tipo: "era", mes: 6 },
  { id: "taylor", titulo: "Noite Taylor", desc: "Karaokê e o filme do show em casa, com quem ela quiser.", meta: "Os 3 simulados de julho e agosto", tipo: "simulados", alvo: 3 },
  { id: "grande", titulo: "A grande recompensa", desc: "Fez a ONC, qualquer que seja o resultado.", meta: "Completar agosto", tipo: "era", mes: 8 },
];
