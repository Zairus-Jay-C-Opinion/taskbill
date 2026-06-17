-- Add plan column to profiles. NULL means the user hasn't chosen yet.
alter table profiles add column if not exists plan text;
alter table profiles add column if not exists stripe_customer_id text;
