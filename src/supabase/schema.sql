-- Pickleball Queue Manager schema
create table players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  name text not null,
  created_at timestamptz not null default now()
);
create unique index players_user_name_uq on players (user_id, lower(name));

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  name text not null,
  status text not null default 'active' check (status in ('active','ended')),
  queue_mode text not null default 'four_off_four_on',
  game_format text not null default 'doubles' check (game_format in ('singles','doubles')),
  points_to_win int not null default 11,
  win_by_two boolean not null default true,
  court_count int not null default 1,
  time_limit_min int,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  status text not null default 'active' check (status in ('active','unavailable')),
  queue_position int,            -- null while on a court or unavailable
  games_played int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  waiting_count int not null default 0,
  consecutive_games int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  unique (session_id, player_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  court_number int not null,
  team_a_score int,
  team_b_score int,
  winner text not null check (winner in ('A','B')),
  voided_at timestamptz,         -- set by "undo"
  created_at timestamptz not null default now()
);

create table match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id),
  team text not null check (team in ('A','B')),
  result text not null check (result in ('win','loss'))
);

-- Simple RLS: you only see your own data
alter table players enable row level security;
alter table sessions enable row level security;
alter table session_players enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;

create policy own_players on players for all using (user_id = auth.uid());
create policy own_sessions on sessions for all using (user_id = auth.uid());
create policy own_session_players on session_players for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy own_matches on matches for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy own_match_players on match_players for all
  using (exists (select 1 from matches m join sessions s on s.id = m.session_id
                 where m.id = match_id and s.user_id = auth.uid()));

-- Realtime
alter publication supabase_realtime add table sessions, session_players, matches;z