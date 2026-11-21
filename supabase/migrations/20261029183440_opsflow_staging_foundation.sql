create table public.opsflow_profiles (
 id uuid primary key default gen_random_uuid(),
 myops_user_ref text not null unique check (myops_user_ref ~ '^[A-Za-z0-9_-]{43}$'),
 display_name text not null default '',
 created_at timestamptz not null default now()
);
create table public.opsflow_companies (
 id uuid primary key default gen_random_uuid(),
 owner_profile_id uuid not null references public.opsflow_profiles(id),
 name text not null check (length(btrim(name)) between 1 and 200),
 settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
 created_at timestamptz not null default now()
);
create table public.opsflow_memberships (
 company_id uuid not null references public.opsflow_companies(id),
 profile_id uuid not null references public.opsflow_profiles(id),
 role text not null check (role in ('admin','manager','cashier')),
 active boolean not null default true,
 primary key(company_id,profile_id)
);
create table public.opsflow_app_sessions (
 id uuid primary key,
 profile_id uuid not null references public.opsflow_profiles(id),
 company_id uuid not null,
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(),
 last_activity_at timestamptz not null default now(),
 verified_until timestamptz not null,
 absolute_expires_at timestamptz not null,
 revoked_at timestamptz,
 foreign key(company_id,profile_id) references public.opsflow_memberships(company_id,profile_id),
 check (last_activity_at >= created_at),
 check (absolute_expires_at > created_at and absolute_expires_at <= created_at + interval '12 hours'),
 check (verified_until <= absolute_expires_at)
);
create table public.opsflow_documents (
 company_id uuid not null references public.opsflow_companies(id),
 collection text not null check (collection in ('products','categories','suppliers','customers','purchases','sales','expenses','stock_movements','cash_ledger','bank_accounts','bank_ledger','capital_entries','notifications','settings','purchase_orders','purchase_order_items','pending_references','goods_receipts','supplier_invoices','payment_transactions','invite_codes')),
 id text not null check (length(id) between 1 and 128),
 data jsonb not null check (jsonb_typeof(data) = 'object'),
 version bigint not null default 1 check(version > 0),
 updated_at timestamptz not null default now(),
 primary key(company_id,collection,id)
);
create index opsflow_memberships_profile_idx on public.opsflow_memberships(profile_id,company_id) where active;
create index opsflow_sessions_profile_idx on public.opsflow_app_sessions(profile_id) where revoked_at is null;
alter table public.opsflow_profiles enable row level security;
alter table public.opsflow_companies enable row level security;
alter table public.opsflow_memberships enable row level security;
alter table public.opsflow_app_sessions enable row level security;
alter table public.opsflow_documents enable row level security;
revoke all on public.opsflow_profiles,public.opsflow_companies,public.opsflow_memberships,public.opsflow_app_sessions,public.opsflow_documents from public,anon,authenticated;
grant select,insert,update,delete on public.opsflow_profiles,public.opsflow_companies,public.opsflow_memberships,public.opsflow_app_sessions,public.opsflow_documents to service_role;
