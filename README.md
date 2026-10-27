# Eras da Luísa

Site de estudos da Luísa para a ONC 2027: 88 encontros de janeiro a agosto, organizados em 8 "eras" da Taylor Swift. Cada encontro tem aquecimento com revisão espaçada, modo foco com timer, material e trilha, e uma miçanga para a pulseira. Os ingressos (recompensas) são liberados pelo esforço.

É um site estático, sem etapa de build. Roda no GitHub Pages.

## Estrutura

| Arquivo | O que é |
|---|---|
| `js/config.js` | **O que você vai editar**: chaves do Supabase, data da ONC, horários, blocos do timer, eras, trilhas e recompensas |
| `js/data.js` | Os 88 encontros com materiais e revisões (gerado a partir do plano) |
| `js/store.js` | Salva no navegador e sincroniza com o Supabase |
| `js/app.js` | As telas |
| `css/app.css` | O visual |
| `supabase/schema.sql` | Tabelas e permissões do banco |

## 1. Publicar no GitHub Pages (10 min)

1. No GitHub, crie um repositório novo, por exemplo `eras-da-luisa`. Pode ser **público** (o código não tem nada pessoal; os dados ficam no Supabase, protegidos por login).
2. Na página do repositório, clique em **Add file > Upload files**, arraste **o conteúdo** desta pasta (não a pasta em si) e clique em **Commit changes**.
3. Vá em **Settings > Pages**. Em *Source* escolha **Deploy from a branch**, branch **main**, pasta **/ (root)**, e salve.
4. Em 1 ou 2 minutos o site estará em `https://SEU-USUARIO.github.io/eras-da-luisa/`.

Neste ponto o site já funciona em **modo local**: o progresso fica salvo só no navegador onde ela usa, e a aba Bastidores aparece para todo mundo. Serve para testar.

## 2. Ligar o Supabase (15 min, para você acompanhar do seu celular)

1. Crie uma conta grátis em supabase.com e um projeto novo (região *South America (São Paulo)*).
2. Em **SQL Editor > New query**, cole todo o `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication > Users > Add user > Create new user**, crie dois usuários com e-mail e senha: o seu e o da Luísa. Marque *Auto Confirm User*.
4. Volte ao **SQL Editor** e rode, trocando os e-mails:
   ```sql
   insert into public.members (user_id, role, nome)
   select id, 'pai', 'Leo' from auth.users where email = 'SEU-EMAIL';
   insert into public.members (user_id, role, nome)
   select id, 'estudante', 'Luísa' from auth.users where email = 'EMAIL-DA-LUISA';
   ```
5. Em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up**. Assim ninguém mais cria conta.
6. Em **Project Settings > API Keys**, copie a **Publishable key** (`sb_publishable_...`); a **Project URL** fica em **Project Settings > Data API** (ou no botão *Connect* do topo). Cole em `js/config.js`:
   ```js
   supabaseUrl: "https://xxxx.supabase.co",
   supabaseAnonKey: "sb_publishable_...",
   ```
   A chave *publishable* pode ficar no código público: o que protege os dados são as regras do `schema.sql` (só os dois usuários cadastrados leem e gravam). **Nunca** cole a chave *secret* (`sb_secret_...`) nem a antiga *service_role*.
7. Faça commit. Agora o site pede login. Você vê tudo em Bastidores; ela não vê Bastidores e não consegue marcar ingresso como resgatado.

> Projetos grátis do Supabase pausam depois de 7 dias sem uso. Com 3 encontros por semana isso não acontece; nas férias, se pausar, basta entrar no painel e clicar em *Restore*.

## 3. Instalar como app

- **Computador dela (Chrome ou Edge):** abrir o site e clicar no ícone de instalar na barra de endereço.
- **Seu celular:** abrir o site; no iPhone, *Compartilhar > Adicionar à Tela de Início*; no Android, menu *> Instalar app*.

## Ajustes do dia a dia

- **Horário de natação / mudar a hora de um dia:** Bastidores > Ajustes. Vale para as duas pessoas.
- **Trilhas:** Bastidores > Ajustes, cole o link do álbum ou da playlist do Spotify (`open.spotify.com/album/...` ou `/playlist/...`). Se ela montar as próprias playlists por era, é só colar os links. Para ouvir a música inteira no player embutido, ela precisa estar logada no Spotify naquele navegador.
- **Envelope surpresa:** escreva o que vai dentro em Bastidores; ela só vê depois que você marcar como resgatado.
- **Recompensas, metas, cores e nomes das eras:** em `js/config.js`.
- **Data da ONC:** `oncDate` em `js/config.js`, quando sair o edital de 2027.
- **Desfazer um encontro marcado por engano:** Turnê > a era > "desfazer" (só o pai).

Depois de editar arquivos, se o site parecer não atualizar, recarregue a página duas vezes (o app guarda uma cópia para funcionar offline). Se mudar muita coisa, aumente a versão em `sw.js` (`eras-v1` para `eras-v2`).

## Mapas mentais e aprovação

No fim de cada encontro ela faz um mapa mental no papel, sem olhar o material, e envia a foto **pelo celular** (o pedido aparece na tela Hoje do app no celular). A miçanga fica contornada até o pai aprovar em **Bastidores**; aprovada, ganha cor e conta para os prêmios. O pai também pode "pedir para completar" com um comentário. Todos os mapas ficam na aba **Mapas** e voltam no aquecimento das revisões.

Para isso funcionar, rode também o `supabase/002_mapas.sql` no SQL Editor (uma vez).

Os prêmios caem nas miçangas aprovadas 6, 12, 20, 30, 44, 60, 75 e 88 (editável em `js/config.js`).

## Como funciona a revisão

Uma semana, um mês e três meses depois de cada encontro, o tema volta no aquecimento: ela escreve no papel o que lembra, depois abre o próprio mapa mental daquele dia para conferir e marca se lembrou. A taxa de "lembrou" aparece em Bastidores. Se uma matéria for marcada como "puxado" duas vezes ou mais no último mês, aparece um alerta.

## Direitos autorais

O site só tem links para o Spotify, sem letras nem capas de álbum. Os nomes das eras são referência de fã para uso privado da família.
