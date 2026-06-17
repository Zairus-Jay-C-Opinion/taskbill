-- Enable Realtime for invoices so the frontend auto-updates when webhook marks as paid
alter publication supabase_realtime add table invoices;
