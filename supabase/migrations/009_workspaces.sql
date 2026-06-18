-- ─── workspaces ─────────────────────────────────────────────────────────────
create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table workspaces enable row level security;

create policy "owner manages workspace"
on workspaces for all
using  (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "members view workspace"
on workspaces for select
using (
  id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and status = 'accepted'
  )
);

-- ─── workspace_members ───────────────────────────────────────────────────────
create table workspace_members (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete cascade,
  invited_email  text not null,
  role           text not null default 'member' check (role in ('owner', 'member')),
  status         text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at     timestamptz not null default now(),
  unique (workspace_id, invited_email)
);

alter table workspace_members enable row level security;

-- Owner can do everything with their workspace's members
create policy "owner manages members"
on workspace_members for all
using  (workspace_id in (select id from workspaces where owner_id = auth.uid()))
with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));

-- Invitees can see their own invite row (by email or by user_id after accepting)
create policy "invitee views own invite"
on workspace_members for select
using (user_id = auth.uid() or invited_email = auth.email());

-- Invitees can accept their invite
create policy "invitee accepts invite"
on workspace_members for update
using  (invited_email = auth.email())
with check (invited_email = auth.email());
