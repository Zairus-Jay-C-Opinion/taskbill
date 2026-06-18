-- Pending invitees can't see the workspace via the join in getPendingInvites()
-- because the workspaces SELECT policy only covers accepted members.
-- Add a security-definer function + policy so the join resolves correctly.

create or replace function my_pending_invite_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id
  from workspace_members
  where invited_email = auth.email()
    and status = 'pending'
$$;

create policy "pending invitee views workspace"
on workspaces for select
using (id in (select my_pending_invite_workspace_ids()));
