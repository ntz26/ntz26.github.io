-- Sum: one owner, their saved links, their custom topics.
-- RLS is on with no policies: only the edge function (service role) can read or write.
create table public.owner (
  id boolean primary key default true check (id),
  key_hash text not null,
  created_at timestamptz not null default now()
);
create table public.items (
  id text primary key,
  url text not null unique,
  host text not null default '',
  platform text not null default 'web',
  kind text not null default 'link',
  author text not null default '',
  title text not null default '',
  shared text not null default '',
  note text not null default '',
  summary text not null default '',
  thumb text not null default '',
  topics text[] not null default '{}',
  manual boolean not null default false,
  resent integer not null default 0,
  at bigint not null
);
create index items_at_idx on public.items (at desc);
create table public.topics (
  id text primary key,
  label text not null,
  emoji text not null default '✳️',
  kw text not null default ''
);
alter table public.owner enable row level security;
alter table public.items enable row level security;
alter table public.topics enable row level security;
revoke all on public.owner, public.items, public.topics from anon, authenticated;
