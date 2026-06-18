-- Security-definer functions bypass RLS, breaking the circular dependency
-- between workspaces ↔ workspace_members policies.

create or replace function my_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from workspaces where owner_id = auth.uid()
$$;

create or replace function my_member_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id from workspace_members
  where user_id = auth.uid() and status = 'accepted'
$$;

-- ─── Recreate workspaces policies ────────────────────────────────────────────
drop policy if exists "owner manages workspace" on workspaces;
drop policy if exists "members view workspace"  on workspaces;

create policy "owner manages workspace"
on workspaces for all
using  (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "members view workspace"
on workspaces for select
using (id in (select my_member_workspace_ids()));

-- ─── Recreate workspace_members policies ─────────────────────────────────────
drop policy if exists "owner manages members"   on workspace_members;
drop policy if exists "invitee views own invite" on workspace_members;
drop policy if exists "invitee accepts invite"   on workspace_members;

create policy "owner manages members"
on workspace_members for all
using  (workspace_id in (select my_workspace_ids()))
with check (workspace_id in (select my_workspace_ids()));

create policy "invitee views own invite"
on workspace_members for select
using (user_id = auth.uid() or invited_email = auth.email());

create policy "invitee accepts invite"
on workspace_members for update
using  (invited_email = auth.email())
with check (invited_email = auth.email());
