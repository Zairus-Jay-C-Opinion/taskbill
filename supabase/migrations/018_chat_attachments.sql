alter table chat_messages
  add column attachment_url  text,
  add column attachment_name text,
  add column attachment_type text; -- 'image' | 'file'

-- Storage bucket for chat attachments (public so images render in-browser)
insert into storage.buckets (id, name, public)
  values ('chat-attachments', 'chat-attachments', true)
  on conflict (id) do nothing;

create policy "authenticated users can upload chat files"
on storage.objects for insert
with check (bucket_id = 'chat-attachments' and auth.role() = 'authenticated');

create policy "public can view chat files"
on storage.objects for select
using (bucket_id = 'chat-attachments');
