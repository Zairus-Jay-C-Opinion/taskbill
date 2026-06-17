-- Run this in the Supabase SQL editor after 001_schema.sql.

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "user owns their profile" on profiles
  for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a blank profile row whenever a new user signs up.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill a blank profile for any users who already exist.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
