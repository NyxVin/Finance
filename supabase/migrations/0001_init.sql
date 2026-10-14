-- =====================================================================
-- Life & Finance Dashboard - Migration 0001
-- Jalankan SEKALI di Supabase > SQL Editor. Aman dijalankan sebelum membuat akun.
-- Isi: tabel, constraint, trigger, Row Level Security (RLS), kategori default.
-- =====================================================================

create extension if not exists pgcrypto;

-- Trigger umum: isi updated_at otomatis
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- PROFIL ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  base_currency text not null default 'IDR',
  timezone text not null default 'Asia/Jakarta',
  emergency_months int not null default 6 check (emergency_months between 1 and 36),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- KEUANGAN ----------
-- Catatan: uang memakai numeric (bukan float). user_id otomatis = pengguna yang login.
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null default 'bank' check (type in ('cash','bank','ewallet','savings','other')),
  currency text not null default 'IDR' check (currency ~ '^[A-Z]{3}$'),
  opening_balance numeric(18,2) not null default 0,
  rate_to_base numeric(18,6) not null default 1 check (rate_to_base > 0), -- kurs manual ke IDR
  is_liquid boolean not null default true,
  is_emergency_fund boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null check (type in ('income','expense')),
  is_essential boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, type)
);

create table public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  principal numeric(18,2) not null check (principal >= 0),   -- pokok awal
  currency text not null default 'IDR' check (currency ~ '^[A-Z]{3}$'),
  rate_to_base numeric(18,6) not null default 1 check (rate_to_base > 0),
  due_date date,
  value_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null default 'other' check (type in ('gold','vehicle','property','receivable','other')),
  value numeric(18,2) not null check (value >= 0),
  currency text not null default 'IDR' check (currency ~ '^[A-Z]{3}$'),
  rate_to_base numeric(18,6) not null default 1 check (rate_to_base > 0),
  value_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense','transfer','debt_payment','adjustment')),
  date date not null,
  amount numeric(18,2) not null,                 -- dalam mata uang akun
  currency text not null default 'IDR',
  exchange_rate numeric(18,6) not null default 1 check (exchange_rate > 0), -- kurs ke IDR saat transaksi
  amount_base numeric(18,2) not null default 0,  -- nilai IDR (dihitung trigger)
  account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  to_amount numeric(18,2) check (to_amount is null or to_amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  liability_id uuid references public.liabilities(id) on delete restrict,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- penyesuaian boleh +/-, jenis lain harus > 0
  constraint tx_amount_ck check ((type = 'adjustment' and amount <> 0) or (type <> 'adjustment' and amount > 0)),
  -- transfer wajib punya akun tujuan berbeda; jenis lain tidak boleh
  constraint tx_transfer_ck check ((type = 'transfer' and to_account_id is not null and to_account_id <> account_id) or (type <> 'transfer' and to_account_id is null)),
  -- bayar utang wajib terhubung ke utang
  constraint tx_debt_ck check (type <> 'debt_payment' or liability_id is not null)
);

create or replace function public.tx_calc_base() returns trigger
language plpgsql as $$ begin new.amount_base = round(new.amount * new.exchange_rate, 2); return new; end $$;
create trigger tx_calc_base before insert or update on public.transactions
  for each row execute function public.tx_calc_base();

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null check (extract(day from month) = 1), -- selalu tanggal 1
  amount_limit numeric(18,2) not null check (amount_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type text not null default 'savings' check (type in ('emergency','savings','education','other')),
  target_amount numeric(18,2) not null check (target_amount > 0),
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kontribusi tujuan TIDAK mengubah saldo akun maupun kekayaan bersih.
create table public.financial_goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null references public.financial_goals(id) on delete cascade,
  date date not null,
  amount numeric(18,2) not null check (amount <> 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PRODUKTIVITAS ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  deadline date,
  status text not null default 'active' check (status in ('active','done','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  start_date date,
  due_date date,
  project_id uuid references public.projects(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_done_ck check (status <> 'done' or completed_at is not null)
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  frequency_type text not null default 'daily' check (frequency_type in ('daily','days','weekly_count')),
  target_per_week int check (target_per_week is null or target_per_week between 1 and 7),
  target_days int[],  -- 0=Minggu ... 6=Sabtu
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

-- ---------- INDEKS ----------
create index on public.transactions (user_id, date desc);
create index on public.transactions (account_id);
create index on public.tasks (user_id, status);
create index on public.tasks (project_id);
create index on public.habit_logs (habit_id, log_date);
create index on public.financial_goal_contributions (goal_id);
create index on public.budgets (user_id, month);

-- ---------- updated_at ----------
do $$ declare t text; begin
  foreach t in array array['profiles','accounts','categories','liabilities','assets','transactions','budgets',
    'financial_goals','financial_goal_contributions','projects','tasks','habits','habit_logs'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- ROW LEVEL SECURITY ----------
-- Pengguna HANYA bisa melihat dan mengubah baris miliknya sendiri.
do $$ declare t text; begin
  foreach t in array array['accounts','categories','liabilities','assets','transactions','budgets',
    'financial_goals','financial_goal_contributions','projects','tasks','habits','habit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own_rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy "own_profile" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Hak akses: hanya pengguna login (authenticated), bukan anonim
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------- KATEGORI DEFAULT + PROFIL OTOMATIS ----------
create or replace function public.seed_default_categories(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.categories (user_id, name, type, is_essential) values
    (uid,'Gaji','income',false), (uid,'Bonus','income',false), (uid,'Usaha','income',false), (uid,'Pemasukan Lain','income',false),
    (uid,'Makanan & Minuman','expense',true), (uid,'Transportasi','expense',true), (uid,'Tagihan & Utilitas','expense',true),
    (uid,'Sewa / Cicilan Rumah','expense',true), (uid,'Kesehatan','expense',true), (uid,'Pendidikan','expense',true),
    (uid,'Belanja','expense',false), (uid,'Hiburan','expense',false), (uid,'Donasi & Sosial','expense',false),
    (uid,'Pengeluaran Lain','expense',false)
  on conflict do nothing;
end $$;
revoke all on function public.seed_default_categories(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  perform public.seed_default_categories(new.id);
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Untuk pengguna yang sudah ada sebelum migration ini dijalankan
insert into public.profiles (id) select id from auth.users on conflict do nothing;
do $$ declare u record; begin
  for u in select id from auth.users loop perform public.seed_default_categories(u.id); end loop;
end $$;
