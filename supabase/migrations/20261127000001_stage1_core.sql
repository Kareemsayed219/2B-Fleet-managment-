-- Stage 1: people, vehicles, assignments, roles.
create extension if not exists btree_gist;

create type public.app_role as enum ('manager', 'admin', 'driver', 'runner', 'pending');
create type public.vehicle_type as enum ('light_truck', 'jumbo', 'private_car', 'van', 'motorcycle');
create type public.vehicle_status as enum ('active', 'workshop', 'off_road', 'retired');
create type public.km_source as enum ('gps', 'photo');
create type public.ownership as enum ('company', 'personal');
create type public.driver_kind as enum ('driver', 'runner');
create type public.person_status as enum ('active', 'inactive');

-- One row per login. New sign-ups land as 'pending' and inactive, so they see nothing.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'pending',
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  type public.vehicle_type not null,
  ownership public.ownership not null default 'company',
  make text,
  model text,
  year int check (year between 1980 and 2100),
  tank_liters numeric(6,1) check (tank_liters > 0),
  baseline_l_per_100km numeric(5,2) check (baseline_l_per_100km > 0),
  km_source public.km_source not null default 'photo',
  gps_provider text,
  petroapp_card_id text,
  status public.vehicle_status not null default 'active',
  license_expiry date,
  insurance_expiry date,
  notes text,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  phone text not null unique,
  kind public.driver_kind not null default 'driver',
  national_id text unique,
  license_class text,
  license_expiry date,
  status public.person_status not null default 'active',
  notes text,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Who had which vehicle, when. end_date null = still assigned.
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  driver_id uuid not null references public.drivers (id) on delete restrict,
  start_date date not null default current_date,
  end_date date,
  notes text,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  -- A vehicle cannot be with two drivers on the same day, and a driver cannot hold two vehicles.
  constraint assignments_vehicle_no_overlap exclude using gist (
    vehicle_id with =, daterange(start_date, coalesce(end_date, 'infinity'::date), '[]') with &&
  ),
  constraint assignments_driver_no_overlap exclude using gist (
    driver_id with =, daterange(start_date, coalesce(end_date, 'infinity'::date), '[]') with &&
  )
);
create index on public.assignments (driver_id);

-- updated_at
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger vehicles_touch before update on public.vehicles for each row execute function public.touch_updated_at();
create trigger drivers_touch before update on public.drivers for each row execute function public.touch_updated_at();

-- Role helpers (security definer so policies don't recurse into profiles RLS).
create function public.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('manager', 'admin'), false)
$$;

create function public.my_driver_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select d.id from public.drivers d
  join public.profiles p on p.id = d.profile_id
  where p.id = auth.uid() and p.active
$$;

-- New auth user -> profile. The very first user becomes the active manager; everyone else is pending.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare first_user boolean;
begin
  perform pg_advisory_xact_lock(hashtext('profiles_first_manager'));
  select not exists (select 1 from public.profiles where role = 'manager') into first_user;
  insert into public.profiles (id, full_name, phone, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    case when first_user then 'manager'::public.app_role else 'pending'::public.app_role end,
    first_user
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only a manager may change role or active; users may only change their own name/phone/locale.
create function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active)
     and coalesce(public.my_role() <> 'manager', true)
     and auth.uid() is not null then
    raise exception 'only a manager can change roles or activation';
  end if;
  if new.id = auth.uid() and old.role = 'manager' and (new.role <> 'manager' or not new.active) then
    raise exception 'a manager cannot demote or deactivate themselves';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Is the system still waiting for its first manager? (used by the setup page)
create function public.needs_setup() returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where role = 'manager')
$$;
grant execute on function public.needs_setup() to anon, authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.assignments enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_manager on public.profiles for update to authenticated
  using (public.my_role() = 'manager') with check (public.my_role() = 'manager');

-- Vehicles: staff manage everything; drivers/runners see only vehicles assigned to them now.
create policy vehicles_staff_all on public.vehicles for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy vehicles_driver_select on public.vehicles for select to authenticated
  using (exists (
    select 1 from public.assignments a
    where a.vehicle_id = vehicles.id and a.driver_id = public.my_driver_id()
      and a.start_date <= current_date and (a.end_date is null or a.end_date >= current_date)
  ));

create policy drivers_staff_all on public.drivers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy drivers_self_select on public.drivers for select to authenticated
  using (id = public.my_driver_id());

create policy assignments_staff_all on public.assignments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy assignments_self_select on public.assignments for select to authenticated
  using (driver_id = public.my_driver_id());

-- Helper functions should not be callable by anonymous users.
revoke execute on function public.my_role(), public.is_staff(), public.my_driver_id() from anon, public;
grant execute on function public.my_role(), public.is_staff(), public.my_driver_id() to authenticated;
revoke execute on function public.handle_new_user(), public.guard_profile_update() from anon, authenticated, public;
