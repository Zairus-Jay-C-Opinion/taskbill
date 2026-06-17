alter table profiles
  add column if not exists logo_url    text,
  add column if not exists brand_color text not null default '#0D0D0D';
