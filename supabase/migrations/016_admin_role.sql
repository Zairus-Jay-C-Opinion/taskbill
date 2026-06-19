-- Expand role to include 'admin'
alter table workspace_members drop constraint workspace_members_role_check;
alter table workspace_members add constraint workspace_members_role_check
  check (role in ('owner', 'member', 'admin'));

-- Any accepted member (including admin) can leave — deletes their own row
create policy "member can leave workspace"
on workspace_members for delete
using (user_id = auth.uid() and status = 'accepted');

-- Admins can invite new members to their workspace
create policy "admin can invite members"
on workspace_members for insert
with check (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role = 'admin' and status = 'accepted'
  )
);

-- Admins can remove other members from their workspace
create policy "admin can remove members"
on workspace_members for delete
using (
  workspace_id in (
    select workspace_id from workspace_members
    where user_id = auth.uid() and role = 'admin' and status = 'accepted'
  )
);
