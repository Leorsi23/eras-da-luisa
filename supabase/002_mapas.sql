-- =====================================================================
--  Eras da Luísa · mapas mentais e aprovação do pai
--  Rode uma vez em: Supabase > SQL Editor > New query > Run
--  (depois do schema.sql)
-- =====================================================================

-- Foto do mapa mental de cada encontro
alter table public.encontros add column if not exists mapa text;
alter table public.encontros add column if not exists mapa_em timestamptz;

-- Decisão do pai. Tabela separada para que só o pai consiga gravar.
create table if not exists public.aprovacoes (
  data date primary key,
  status text not null check (status in ('aprovado', 'refazer')),
  comentario text default '',
  decidido_em timestamptz not null default now()
);
alter table public.aprovacoes enable row level security;

drop policy if exists "membros leem aprovacoes" on public.aprovacoes;
drop policy if exists "pai grava aprovacoes" on public.aprovacoes;
drop policy if exists "pai atualiza aprovacoes" on public.aprovacoes;
drop policy if exists "pai apaga aprovacoes" on public.aprovacoes;
create policy "membros leem aprovacoes" on public.aprovacoes for select using (public.is_member());
create policy "pai grava aprovacoes" on public.aprovacoes for insert with check (public.is_pai());
create policy "pai atualiza aprovacoes" on public.aprovacoes for update using (public.is_pai()) with check (public.is_pai());
create policy "pai apaga aprovacoes" on public.aprovacoes for delete using (public.is_pai());

-- Pasta privada para as fotos
insert into storage.buckets (id, name, public)
values ('mapas', 'mapas', false)
on conflict (id) do nothing;

drop policy if exists "membros veem mapas" on storage.objects;
drop policy if exists "membros enviam mapas" on storage.objects;
create policy "membros veem mapas" on storage.objects for select
  using (bucket_id = 'mapas' and public.is_member());
create policy "membros enviam mapas" on storage.objects for insert
  with check (bucket_id = 'mapas' and public.is_member());
