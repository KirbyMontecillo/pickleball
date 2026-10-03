-- Run once in the Supabase SQL Editor. Safe to re-run. Skip 002 if you haven't run it.
alter table sessions drop constraint if exists sessions_status_check;
update sessions set status = 'completed' where status = 'ended';
alter table sessions alter column status set default 'setup';
alter table sessions add constraint sessions_status_check check (status in ('setup','active','completed'));
alter table sessions add column if not exists queue_kind text not null default 'standard'
  check (queue_kind in ('standard','winlose'));
alter table sessions add column if not exists started_at timestamptz;
alter table sessions add column if not exists state jsonb not null default '{}'::jsonb;