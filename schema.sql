-- =========================================================
-- BID FBFV - Schema PostgreSQL + Row Level Security (Supabase)
-- =========================================================

create extension if not exists "pgcrypto";

-- Perfis de acesso (para identificar administradores)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  created_at timestamptz not null default now()
);

-- Clubes filiados
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  city_state text,
  logo_url text,
  created_at timestamptz not null default now()
);

-- Atletas / Jogadores
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text,
  position text not null check (position in ('GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA')),
  age int check (age between 14 and 55),
  current_club_id uuid references public.clubs(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Registros do BID (Transferências, Empréstimos, Renovações, Rescisões)
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  protocol_code text not null unique,
  player_id uuid not null references public.players(id) on delete cascade,
  from_club_id uuid references public.clubs(id) on delete set null,
  to_club_id uuid references public.clubs(id) on delete set null,
  movement_type text not null check (movement_type in ('TRANSFERENCIA', 'EMPRESTIMO', 'RENOVACAO', 'RESCISAO')),
  fee_label text default 'Sem custo',
  contract_until date,
  status text not null default 'PUBLICADO' check (status in ('PUBLICADO', 'PENDENTE', 'CANCELADO')),
  published_at timestamptz not null default now()
);

-- Trigger automático para criar profile quando um usuário se cadastrar no Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Função auxiliar para checar se o usuário logado é admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Ativar RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.players enable row level security;
alter table public.transfers enable row level security;

-- Políticas de leitura pública (consulta do BID)
drop policy if exists "Public read clubs" on public.clubs;
create policy "Public read clubs" on public.clubs for select using (true);

drop policy if exists "Public read players" on public.players;
create policy "Public read players" on public.players for select using (true);

drop policy if exists "Public read transfers" on public.transfers;
create policy "Public read transfers" on public.transfers for select using (true);

-- Políticas de leitura/escrita em profiles
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- Políticas de escrita restritas a administradores (role = 'admin')
drop policy if exists "Admin insert clubs" on public.clubs;
create policy "Admin insert clubs" on public.clubs for insert with check (public.is_admin());
drop policy if exists "Admin update clubs" on public.clubs;
create policy "Admin update clubs" on public.clubs for update using (public.is_admin());
drop policy if exists "Admin delete clubs" on public.clubs;
create policy "Admin delete clubs" on public.clubs for delete using (public.is_admin());

drop policy if exists "Admin insert players" on public.players;
create policy "Admin insert players" on public.players for insert with check (public.is_admin());
drop policy if exists "Admin update players" on public.players;
create policy "Admin update players" on public.players for update using (public.is_admin());
drop policy if exists "Admin delete players" on public.players;
create policy "Admin delete players" on public.players for delete using (public.is_admin());

drop policy if exists "Admin insert transfers" on public.transfers;
create policy "Admin insert transfers" on public.transfers for insert with check (public.is_admin());
drop policy if exists "Admin update transfers" on public.transfers;
create policy "Admin update transfers" on public.transfers for update using (public.is_admin());
drop policy if exists "Admin delete transfers" on public.transfers;
create policy "Admin delete transfers" on public.transfers for delete using (public.is_admin());
