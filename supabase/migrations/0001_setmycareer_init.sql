-- Setmycareer — cloud backbone (v1)
-- Isolated in its own `setmycareer` schema so it can live in a dedicated project
-- OR alongside another app without colliding. RLS is enabled everywhere; the
-- stateless API reaches it with the service role. Per-user auth.uid() policies
-- activate when Supabase Auth is wired in the UI phase (deny-all until then).

create schema if not exists setmycareer;
set search_path = setmycareer, public;

create extension if not exists "pgcrypto";

-- ── identity / profile ────────────────────────────────────────────────────
create table if not exists setmycareer.profiles (
  id          uuid primary key default gen_random_uuid(),
  auth_uid    uuid,                       -- links to auth.users once auth lands
  name        text,
  role        text not null default 'me',
  intake      jsonb not null default '{}'::jsonb,   -- {wellbeing:[..], at}
  skipped     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists setmycareer.career_profiles (
  user_id     uuid primary key references setmycareer.profiles(id) on delete cascade,
  current     text,
  target      text,
  goal        text,
  skills      jsonb not null default '[]'::jsonb,
  riasec      jsonb not null default '[]'::jsonb,
  big_five    jsonb,                      -- IPIP scores when administered
  momentum    int,
  updated_at  timestamptz not null default now()
);

-- ── captured conversations / meetings ─────────────────────────────────────
create table if not exists setmycareer.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references setmycareer.profiles(id) on delete cascade,
  source      text not null default 'manual',   -- voice|google_meet|zoom|teams|zoho|import|manual
  started_at  timestamptz not null default now(),
  duration    int not null default 0,
  modality    text default 'general',
  verified    boolean not null default false,
  peer        jsonb,                       -- {name, role}
  transcript  text,
  status      text not null default 'recorded', -- recorded|transcribed|analyzed
  created_at  timestamptz not null default now()
);
create index if not exists sessions_user_idx on setmycareer.sessions(user_id, started_at desc);

-- ── the Blueprint (career analysis output) ────────────────────────────────
create table if not exists setmycareer.blueprints (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references setmycareer.profiles(id) on delete cascade,
  session_id   uuid references setmycareer.sessions(id) on delete set null,
  career_index int,
  confidence   text,                       -- none|low|tentative|moderate|high
  scores       jsonb not null default '{}'::jsonb,   -- pc.* → {score, confidence, evidence[]}
  composites   jsonb not null default '{}'::jsonb,   -- cx.* → {score, confidence}
  outlook      jsonb,                       -- {growth, wage, label, soc, live}
  moves        jsonb not null default '[]'::jsonb,   -- [{title, why}]
  citations    jsonb not null default '[]'::jsonb,
  source_weights jsonb,                     -- audit trail of resolved per-source weights
  created_at   timestamptz not null default now()
);
create index if not exists blueprints_user_idx on setmycareer.blueprints(user_id, created_at desc);

-- ── append-only index timeline (the scrubbable terminal line) ─────────────
create table if not exists setmycareer.index_history (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references setmycareer.profiles(id) on delete cascade,
  ts            timestamptz not null default now(),
  career_index  int,
  wellbeing_index int,
  master_index  int,
  dims          jsonb not null default '{}'::jsonb,
  session_id    uuid references setmycareer.sessions(id) on delete set null
);
create index if not exists index_history_user_idx on setmycareer.index_history(user_id, ts);

-- ── mental-health bridge (read from bloo) ─────────────────────────────────
create table if not exists setmycareer.mental_health_context (
  user_id        uuid primary key references setmycareer.profiles(id) on delete cascade,
  wellbeing_index int,
  band           text,
  emotion        text,
  dimensions     jsonb not null default '{}'::jsonb,
  recent_emotions jsonb not null default '[]'::jsonb,
  notes          jsonb not null default '[]'::jsonb,
  n_sessions     int default 0,
  sessions_since date,
  updated_at     timestamptz not null default now()
);

-- ── meeting integrations + bot runs (fireflies-grade connector) ───────────
create table if not exists setmycareer.integrations (
  user_id      uuid not null references setmycareer.profiles(id) on delete cascade,
  provider     text not null,              -- google|zoho|recall|zoom|teams
  status       text not null default 'connected',
  access_token text,
  refresh_token text,
  expires_at   timestamptz,
  meta         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  primary key (user_id, provider)
);

create table if not exists setmycareer.meeting_bots (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references setmycareer.profiles(id) on delete cascade,
  provider     text not null default 'recall',
  meeting_url  text not null,
  platform     text,                        -- google_meet|zoom|teams
  bot_id       text,                        -- provider's bot/run id
  status       text not null default 'requested', -- requested|joining|in_call|recording|done|failed
  transcript   text,
  recording_url text,
  session_id   uuid references setmycareer.sessions(id) on delete set null,
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists meeting_bots_user_idx on setmycareer.meeting_bots(user_id, created_at desc);

-- ── generated reports ─────────────────────────────────────────────────────
create table if not exists setmycareer.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references setmycareer.profiles(id) on delete cascade,
  blueprint_id uuid references setmycareer.blueprints(id) on delete cascade,
  kind         text not null default 'career_blueprint',
  storage_path text,
  created_at   timestamptz not null default now()
);

-- ── RLS: locked down by default (service-role only until Auth lands) ───────
do $$
declare t text;
begin
  foreach t in array array['profiles','career_profiles','sessions','blueprints',
                           'index_history','mental_health_context','integrations',
                           'meeting_bots','reports']
  loop
    execute format('alter table setmycareer.%I enable row level security;', t);
  end loop;
end $$;
-- NOTE: no anon/authenticated policies yet → only the service role can read/write.
-- When Auth is wired, add: create policy "own rows" on <table>
--   using (auth.uid() = (select auth_uid from setmycareer.profiles p where p.id = user_id));
