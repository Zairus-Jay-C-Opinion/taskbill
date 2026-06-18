-- Requires 009_workspaces.sql and 011_fix_rls_recursion.sql to be run first
-- (the my_workspace_ids / my_member_workspace_ids functions must exist)

-- Add workspace_id to data tables
alter table clients  add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table tasks    add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table invoices add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

-- Drop old single-user policies
drop policy if exists "user owns their clients"  on clients;
drop policy if exists "user owns their tasks"    on tasks;
drop policy if exists "user owns their invoices" on invoices;

create policy "workspace access on clients"
on clients for all
using (
  user_id = auth.uid()
  or workspace_id in (select my_workspace_ids())
  or workspace_id in (select my_member_workspace_ids())
)
with check (
  user_id = auth.uid()
  or workspace_id in (select my_workspace_ids())
  or workspace_id in (select my_member_workspace_ids())
);

create policy "workspace access on tasks"
on tasks for all
using (
  user_id = auth.uid()
  or workspace_id in (select my_workspace_ids())
  or workspace_id in (select my_member_workspace_ids())
)
with check (
  user_id = auth.uid()
  or workspace_id in (select my_workspace_ids())
  or workspace_id in (select my_member_workspace_ids())
);

create policy "workspace access on invoices"
on invoices for all
using (
  user_id = auth.uid()
  or workspace_id in (select my_workspace_ids())
  or workspace_id in (select my_member_workspace_ids())
)
with check (
  user_id = auth.uid()
  or workspace_id in (select my_workspace_ids())
  or workspace_id in (select my_member_workspace_ids())
);
