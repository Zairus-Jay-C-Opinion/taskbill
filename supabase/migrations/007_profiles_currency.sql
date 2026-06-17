alter table profiles
  add column if not exists currency text not null default 'PHP';
