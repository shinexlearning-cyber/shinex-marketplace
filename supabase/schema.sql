create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  username text not null unique,
  email text not null unique,
  phone text not null,
  password_hash text not null,
  avatar text,
  bio text,
  location text,
  whatsapp text,
  shop_name text,
  role text not null default 'user' check (role in ('user','admin')),
  shop_views integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  price numeric(14,2) not null check (price > 0),
  category text not null,
  description text not null,
  location text not null,
  images jsonb not null default '[]'::jsonb,
  is_approved boolean not null default true,
  views integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  shop_id uuid references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorite_target check ((product_id is not null) <> (shop_id is not null))
);

create unique index if not exists favorites_user_product_unique on public.favorites(user_id, product_id) where product_id is not null;
create unique index if not exists favorites_user_shop_unique on public.favorites(user_id, shop_id) where shop_id is not null;

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  image text,
  product_id uuid references public.products(id) on delete set null,
  plan text not null,
  amount numeric(14,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','active','expired','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  advertisement_id uuid references public.advertisements(id) on delete set null,
  reference text unique,
  amount numeric(14,2) not null default 0,
  status text not null default 'pending',
  gateway text default 'paystack',
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users(id) on delete set null,
  product_id uuid references public.products(id) on delete cascade,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.categories(name) values
('Electronics'),('Fashion'),('Vehicles'),('Property'),('Furniture'),
('Phones & Tablets'),('Beauty'),('Services'),('Jobs'),('Sports')
on conflict (name) do nothing;

insert into public.settings(key,value) values
('ad_pricing', '{"plans":[
  {"key":"1day","label":"1 Day","price":200,"days":1},
  {"key":"3days","label":"3 Days","price":500,"days":3},
  {"key":"7days","label":"7 Days","price":1000,"days":7},
  {"key":"30days","label":"30 Days","price":3000,"days":30}
]}'::jsonb)
on conflict (key) do nothing;

create or replace function public.increment_product_views(product_uuid uuid)
returns void
language sql
security definer
as $$
  update public.products set views = views + 1 where id = product_uuid;
$$;

-- IMPORTANT:
-- This backend uses the Supabase SERVICE ROLE key server-side.
-- Do NOT put SUPABASE_SERVICE_ROLE_KEY in React/Vite or commit it to GitHub.
