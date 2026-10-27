-- =====================================================================
--  Eras da Luísa · banco no Supabase
--  Rode tudo isto uma vez em: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- Quem pode usar o app (só os 2 usuários cadastrados por você)
create table if not exists public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('estudante', 'pai')),
  nome text
);

-- Um registro por encontro concluído
create table if not exists public.encontros (
  data date primary key,
  feito boolean not null default true,
  feito_em timestamptz default now(),
  humor text check (humor in ('facil', 'medida', 'puxado')),
  lembranca jsonb not null default '{}'::jsonb,
  roteiro jsonb not null default '{}'::jsonb,
  pontos text default ''
);

-- Ingressos (recompensas) já resgatados
create table if not exists public.ingressos (
  id text primary key,
  resgatado_em timestamptz not null default now()
);

-- Ajustes: horários, links das trilhas, texto do envelope
create table if not exists public.ajustes (
  chave text primary key,
  valor jsonb
);

-- Função auxiliar: o usuário logado é membro?
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;
create or replace function public.is_pai() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where user_id = auth.uid() and role = 'pai');
$$;

alter table public.members   enable row level security;
alter table public.encontros enable row level security;
alter table public.ingressos enable row level security;
alter table public.ajustes   enable row level security;

-- members: cada um lê a própria linha (o cadastro é feito por você no painel)
drop policy if exists "membro le a si" on public.members;
create policy "membro le a si" on public.members for select using (user_id = auth.uid());

-- encontros: os dois leem e gravam
drop policy if exists "membros leem encontros" on public.encontros;
drop policy if exists "membros gravam encontros" on public.encontros;
drop policy if exists "membros atualizam encontros" on public.encontros;
drop policy if exists "pai apaga encontros" on public.encontros;
create policy "membros leem encontros" on public.encontros for select using (public.is_member());
create policy "membros gravam encontros" on public.encontros for insert with check (public.is_member());
create policy "membros atualizam encontros" on public.encontros for update using (public.is_member()) with check (public.is_member());
create policy "pai apaga encontros" on public.encontros for delete using (public.is_pai());

-- ingressos: os dois leem; só o pai marca como resgatado
drop policy if exists "membros leem ingressos" on public.ingressos;
drop policy if exists "pai resgata ingressos" on public.ingressos;
drop policy if exists "pai atualiza ingressos" on public.ingressos;
create policy "membros leem ingressos" on public.ingressos for select using (public.is_member());
create policy "pai resgata ingressos" on public.ingressos for insert with check (public.is_pai());
create policy "pai atualiza ingressos" on public.ingressos for update using (public.is_pai()) with check (public.is_pai());

-- ajustes: os dois leem; só o pai muda
drop policy if exists "membros leem ajustes" on public.ajustes;
drop policy if exists "pai grava ajustes" on public.ajustes;
drop policy if exists "pai atualiza ajustes" on public.ajustes;
create policy "membros leem ajustes" on public.ajustes for select using (public.is_member());
create policy "pai grava ajustes" on public.ajustes for insert with check (public.is_pai());
create policy "pai atualiza ajustes" on public.ajustes for update using (public.is_pai()) with check (public.is_pai());

-- ---------------------------------------------------------------------
--  DEPOIS de criar os 2 usuários em Authentication > Users, rode
--  (troque os e-mails):
--
--  insert into public.members (user_id, role, nome)
--  select id, 'pai', 'Leo' from auth.users where email = 'SEU-EMAIL';
--  insert into public.members (user_id, role, nome)
--  select id, 'estudante', 'Luísa' from auth.users where email = 'EMAIL-DA-LUISA';
-- ---------------------------------------------------------------------
