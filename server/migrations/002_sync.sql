-- Per-user calendar and Lumi snapshots for stages 2–3. Last-write-wins revision for now.

create table calendar_sync_state (
  user_id uuid primary key references users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  snapshot jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table lumi_sync_state (
  user_id uuid primary key references users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index calendar_sync_state_updated on calendar_sync_state(updated_at);
create index lumi_sync_state_updated on lumi_sync_state(updated_at);
