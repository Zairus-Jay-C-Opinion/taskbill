-- TaskBill initial schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- ─── clients ────────────────────────────────────────────────────────────────
create table clients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null,
  created_at timestamptz default now()
);

alter table clients enable row level security;

create policy "user owns their clients" on clients
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── invoices ───────────────────────────────────────────────────────────────
create table invoices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id  uuid not null references clients(id) on delete cascade,
  status     text not null default 'draft',  -- 'draft' | 'sent' | 'paid'
  due_date   date,
  created_at timestamptz default now(),
  constraint invoices_status_check check (status in ('draft', 'sent', 'paid'))
);

alter table invoices enable row level security;

create policy "user owns their invoices" on invoices
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── tasks ──────────────────────────────────────────────────────────────────
-- invoice_id is null for unbilled tasks; set when task is added to an invoice.
-- ON DELETE SET NULL means deleting an invoice un-bills its tasks (doesn't delete them).
create table tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  invoice_id  uuid references invoices(id) on delete set null,
  title       text not null,
  description text,
  amount      numeric(10,2) not null default 0,
  created_at  timestamptz default now()
);

alter table tasks enable row level security;

create policy "user owns their tasks" on tasks
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
