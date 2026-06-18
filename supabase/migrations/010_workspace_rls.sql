-- Add workspace_id to data tables
alter table clients  add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table tasks    add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table invoices add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

-- Drop old single-user policies
drop policy if exists "user owns their clients"  on clients;
drop policy if exists "user owns their tasks"    on tasks;
drop policy if exists "user owns their invoices" on invoices;

-- Shared helper: is the current user allowed to access a record in this workspace?
-- user_id = auth.uid()          → the record belongs to this user (pre-workspace data)
-- workspace_id in owner set      → user owns the workspace
-- workspace_id in member set     → user is an accepted member of the workspace

create policy "workspace access on clients"
on clients for all
using (
  user_id = auth.uid()
  or workspace_id in (select id from workspaces where owner_id = auth.uid())
  or workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and status = 'accepted'
  )
)
with check (
  user_id = auth.uid()
  or workspace_id in (select id from workspaces where owner_id = auth.uid())
  or workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and status = 'accepted'
  )
);

create policy "workspace access on tasks"
on tasks for all
using (
  user_id = auth.uid()
  or workspace_id in (select id from workspaces where owner_id = auth.uid())
  or workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and status = 'accepted'
  )
)
with check (
  user_id = auth.uid()
  or workspace_id in (select id from workspaces where owner_id = auth.uid())
  or workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and status = 'accepted'
  )
);

create policy "workspace access on invoices"
on invoices for all
using (
  user_id = auth.uid()
  or workspace_id in (select id from workspaces where owner_id = auth.uid())
  or workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and status = 'accepted'
  )
)
with check (
  user_id = auth.uid()
  or workspace_id in (select id from workspaces where owner_id = auth.uid())
  or workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and status = 'accepted'
  )
);
