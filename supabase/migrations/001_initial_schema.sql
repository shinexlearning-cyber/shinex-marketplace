create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  full_name text not null default '',
  phone text,
  avatar_url text,
  bio text,
  location text,
  whatsapp text,
  shop_name text,
  shop_description text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_admin boolean not null default false,
  is_seller boolean not null default false,
  is_suspended boolean not null default false,
  suspension_reason text,
  plan text not null default 'starter',
  plan_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null constraint products_user_id_fkey references public.profiles(id) on delete cascade,
  category_id uuid constraint products_category_id_fkey references public.categories(id) on delete set null,
  name text not null,
  description text not null default '',
  price numeric(14,2) not null check (price >= 0),
  condition text not null check (condition in ('new', 'used', 'refurbished')),
  location text not null default '',
  is_sold boolean not null default false,
  is_active boolean not null default true,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  views_count integer not null default 0 check (views_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  is_primary boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.favorite_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.favorite_sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, seller_id),
  check (user_id <> seller_id)
);

create table if not exists public.ad_durations (
  id uuid primary key default gen_random_uuid(),
  duration_days integer not null check (duration_days > 0),
  price numeric(14,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null constraint advertisements_user_id_fkey references public.profiles(id) on delete cascade,
  duration_id uuid references public.ad_durations(id) on delete restrict,
  title text not null,
  description text not null default '',
  image_url text not null,
  amount numeric(14,2) not null check (amount >= 0),
  duration_days integer not null check (duration_days > 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'paused')),
  rejection_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  amount numeric(14,2) not null check (amount >= 0),
  listing_limit integer check (listing_limit is null or listing_limit > 0),
  is_active boolean not null default true
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null constraint payments_user_id_fkey references public.profiles(id) on delete cascade,
  advertisement_id uuid references public.advertisements(id) on delete set null,
  payment_type text not null check (payment_type in ('advertisement', 'subscription')),
  amount numeric(14,2) not null check (amount >= 0),
  status text not null default 'initialized' check (status in ('initialized', 'paid', 'failed')),
  paystack_reference text not null unique,
  provider_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  plan text not null,
  amount numeric(14,2) not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null constraint reports_reporter_id_fkey references public.profiles(id) on delete cascade,
  target_user_id uuid constraint reports_target_user_id_fkey references public.profiles(id) on delete set null,
  target_product_id uuid references public.products(id) on delete set null,
  target_advertisement_id uuid references public.advertisements(id) on delete set null,
  reason text not null,
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_notes text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied')),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists products_public_idx on public.products (approval_status, is_active, is_sold, created_at desc);
create index if not exists products_user_idx on public.products (user_id, created_at desc);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists product_images_product_idx on public.product_images (product_id, display_order);
create index if not exists advertisements_user_idx on public.advertisements (user_id, created_at desc);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists activity_user_idx on public.activity (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.favorite_products enable row level security;
alter table public.favorite_sellers enable row level security;
alter table public.ad_durations enable row level security;
alter table public.advertisements enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.reports enable row level security;
alter table public.contact_messages enable row level security;
alter table public.activity enable row level security;

drop policy if exists "public can view active categories" on public.categories;
create policy "public can view active categories" on public.categories for select using (is_active = true);
drop policy if exists "public can view approved products" on public.products;
create policy "public can view approved products" on public.products for select using (approval_status = 'approved' and is_active = true);
drop policy if exists "public can view product images" on public.product_images;
create policy "public can view product images" on public.product_images for select using (exists (select 1 from public.products p where p.id = product_id and p.approval_status = 'approved' and p.is_active = true));
drop policy if exists "public can view active durations" on public.ad_durations;
create policy "public can view active durations" on public.ad_durations for select using (is_active = true);
drop policy if exists "public can view active plans" on public.subscription_plans;
create policy "public can view active plans" on public.subscription_plans for select using (is_active = true);

insert into public.categories (name, slug, description) values
  ('Electronics', 'electronics', 'Phones, computers and other devices'),
  ('Fashion', 'fashion', 'Clothing, shoes and accessories'),
  ('Home & Garden', 'home-garden', 'Furniture, appliances and home goods'),
  ('Vehicles', 'vehicles', 'Cars, bikes and parts'),
  ('Services', 'services', 'Local services and professional offers')
on conflict (slug) do nothing;

insert into public.ad_durations (duration_days, price) values
  (7, 5000), (14, 8500), (30, 15000)
on conflict do nothing;

insert into public.subscription_plans (slug, label, amount, listing_limit) values
  ('starter', 'Starter', 0, 3), ('pro', 'Pro', 10000, 20), ('business', 'Business', 25000, null)
on conflict (slug) do nothing;