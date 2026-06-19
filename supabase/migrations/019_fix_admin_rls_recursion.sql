-- The "admin can invite/remove members" policies in 016 query workspace_members
-- from inside a policy ON workspace_members, causing infinite recursion.
-- Fix: use a security-definer function (same pattern as my_member_workspace_ids).

create or replace function my_admin_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id from workspace_members
  where user_id = auth.uid() and role = 'admin' and status = 'accepted'
$$;

drop policy if exists "admin can invite members" on workspace_members;
drop policy if exists "admin can remove members" on workspace_members;

create policy "admin can invite members"
on workspace_members for insert
with check (
  workspace_id in (select my_admin_workspace_ids())
);

create policy "admin can remove members"
on workspace_members for delete
using (
  workspace_id in (select my_admin_workspace_ids())
);
