-- Rooms table
create table if not exists public.rooms (
  code text primary key,
  name text not null,
  host_id uuid not null,
  phase text not null default 'lobby',
  round integer not null default 0,
  dice jsonb,
  limit_total integer,
  created_at timestamptz not null default now()
);

-- Players table
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  name text not null,
  is_host boolean not null default false,
  score integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists players_room_idx on public.players(room_code);

-- Picks table
create table if not exists public.picks (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  round integer not null,
  player_id uuid not null references public.players(id) on delete cascade,
  choice text not null,
  result text,
  created_at timestamptz not null default now()
);
create unique index if not exists picks_unique_per_round on public.picks(room_code, round, player_id);

-- Enable RLS and basic policies (tighten later)
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.picks enable row level security;

create policy "rooms_select" on public.rooms for select using (true);
create policy "players_select" on public.players for select using (true);
create policy "picks_select" on public.picks for select using (true);

create policy "rooms_insert" on public.rooms for insert with check (true);
create policy "players_all" on public.players for all using (true) with check (true);
create policy "picks_all" on public.picks for all using (true) with check (true);

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.picks;
