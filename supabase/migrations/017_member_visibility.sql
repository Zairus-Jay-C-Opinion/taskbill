-- Accepted members can see all other members in their workspace
create policy "members can view workspace members"
on workspace_members for select
using (
  workspace_id in (select my_member_workspace_ids())
);
