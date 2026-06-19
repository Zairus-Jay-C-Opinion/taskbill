create table chat_messages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  sender_id    uuid not null references auth.users(id) on delete cascade,
  content      text not null check (char_length(content) between 1 and 2000),
  created_at   timestamptz not null default now()
);

alter table chat_messages enable row level security;

create policy "workspace members can read messages"
on chat_messages for select
using (
  workspace_id in (select my_workspace_ids())
  or workspace_id in (select my_member_workspace_ids())
);

create policy "workspace members can insert messages"
on chat_messages for insert
with check (
  sender_id = auth.uid()
  and (
    workspace_id in (select my_workspace_ids())
    or workspace_id in (select my_member_workspace_ids())
  )
);

alter publication supabase_realtime add table chat_messages;

create index chat_messages_workspace_created
  on chat_messages (workspace_id, created_at asc);
