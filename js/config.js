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

  // Horário padrão de cada dia de estudo (1 = segunda, só nas férias de janeiro; 2 = terça, 3 = quarta, 5 = sexta).
  // O pai pode mudar pela tela Bastidores; isto é só o valor inicial.
  horarioPadrao: { 1: "14:00", 2: "15:30", 3: "14:00", 5: "14:00" },

  // Blocos do modo foco, em minutos.
  // 10 de aquecimento + 40 aqui + 10 de mapa mental = 1h.
  // Diagnóstico e simulados são prova inteira e passam disso.
  blocos: [
    { nome: "Bloco 1 · foco", min: 20 },
    { nome: "Pausa", min: 5, pausa: true },
    { nome: "Bloco 2 · foco", min: 15 },
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
  2: { nome: "Fearless", sub: "Biologia e História I", cor: "#e0a400", trilha: "" },
  3: { nome: "Red", sub: "Biologia e História II", cor: "#e0364e", trilha: "" },
  4: { nome: "1989", sub: "Matemática da Física · Paris · OBA", cor: "#2b9bd8", trilha: "" },
  5: { nome: "Reputation", sub: "OBA e Física II", cor: "#55556b", trilha: "" },
  6: { nome: "Folklore", sub: "Química I", cor: "#7d9466", trilha: "" },
  7: { nome: "Evermore", sub: "Química II e simulados", cor: "#b8723a", trilha: "" },
  8: { nome: "The Life of a Showgirl", sub: "Reta final", cor: "#f2662f", trilha: "" },
};

// Recompensas: cada prêmio é liberado numa miçanga (encontro com mapa
// mental aprovado pelo pai). "alvo" = número da miçanga.
export const REWARDS = [
  { id: "cinema", titulo: "Noite de cinema", desc: "Ela escolhe o filme e a pizza.", alvo: 6 },
  { id: "japones", titulo: "Jantar japonês", desc: "No restaurante que ela escolher.", alvo: 12 },
  { id: "envelope", titulo: "Envelope surpresa", desc: "O pai decide o que vai dentro.", alvo: 20 },
  { id: "livro", titulo: "Livro à escolha dela", desc: "Qualquer livro, sem palpite dos pais.", alvo: 30 },
  { id: "planetario", titulo: "Planetário", desc: "Metade do caminho! Uma sessão de planetário em São Paulo.", alvo: 44 },
  { id: "rodizio", titulo: "Rodízio japonês com uma amiga", desc: "Ela e uma amiga, por conta do pai.", alvo: 60 },
  { id: "taylor", titulo: "Noite Taylor", desc: "Karaokê e o filme do show em casa, com quem ela quiser.", alvo: 75 },
  { id: "grande", titulo: "A grande recompensa", desc: "Fez a turnê inteira, qualquer que seja o resultado da ONC.", alvo: 90 },
];
