-- Adapts the existing schema. Nothing is dropped except the old status check.
alter table sessions drop constraint if exists sessions_status_check;
update sessions set status = 'completed' where status = 'ended';
alter table sessions alter column status set default 'setup';
alter table sessions add constraint sessions_status_check check (status in ('setup','active','completed'));
alter table sessions add column if not exists queue_kind text not null default 'standard'
  check (queue_kind in ('standard','winlose'));
alter table sessions add column if not exists started_at timestamptz;

alter table matches add column if not exists game_number int;

-- Win/Lose game tree (one row per game, including pending ones)
create table if not exists session_games (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  number int not null,
  source_a int, source_b int,
  take text check (take in ('winners','losers')),
  team_a uuid[] not null default '{}',
  team_b uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','ready','playing','completed')),
  court int,
  winner text check (winner in ('A','B')),
  unique (session_id, number)
);
alter table session_games enable row level security;
create policy own_session_games on session_games for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
alter publication supabase_realtime add table session_games;