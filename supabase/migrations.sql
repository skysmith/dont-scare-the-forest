-- Drop old tables if they exist (safe when empty)
drop table if exists public.picks cascade;
drop table if exists public.players cascade;
drop table if exists public.rooms cascade;

-- Rooms table
create table public.rooms (
  code text primary key,
  name text not null,
  host_id text not null,
  phase text not null default 'lobby',
  round integer not null default 0,
  dice jsonb,
  limit_total integer,
  created_at timestamptz not null default now()
);

-- Players table
create table public.players (
  id text primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  name text not null,
  is_host boolean not null default false,
  score integer not null default 0,
  created_at timestamptz not null default now()
);
create index players_room_idx on public.players(room_code);

-- Picks table
create table public.picks (
  id text primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  round integer not null,
  player_id text not null references public.players(id) on delete cascade,
  choice text not null,
  result text,
  created_at timestamptz not null default now()
);
create unique index picks_unique_per_round on public.picks(room_code, round, player_id);

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
