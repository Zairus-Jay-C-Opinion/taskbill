-- Run in Supabase SQL editor after 002_profiles.sql.

alter table invoices
  add column if not exists payment_link    text,   -- Stripe Payment Link URL sent to client
  add column if not exists payment_link_id text;   -- Stripe Payment Link ID (for reference)
