-- Keep a driver/runner login in step with its driver record, without a service-role key in the app.
-- Admins (not only managers) edit driver records, so the sync runs as a trigger.

-- Profile updates made by our own triggers (nested, depth > 1) skip the manager-only check.
-- Users cannot create triggers, so they cannot reach this path directly.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() <= 1
     and (new.role is distinct from old.role or new.active is distinct from old.active)
     and coalesce(public.my_role() <> 'manager', true)
     and auth.uid() is not null then
    raise exception 'only a manager can change roles or activation';
  end if;
  if new.id = auth.uid() and old.role = 'manager' and (new.role <> 'manager' or not new.active) then
    raise exception 'a manager cannot demote or deactivate themselves';
  end if;
  return new;
end $$;

-- Only driver/runner logins follow the driver record; a staff login linked by mistake is never demoted.
create function public.sync_driver_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.profile_id is not null then
    update public.profiles p
       set role = new.kind::text::public.app_role,
           active = (new.status = 'active'),
           full_name = new.full_name,
           phone = new.phone
     where p.id = new.profile_id
       and p.role in ('driver', 'runner');
  end if;
  return new;
end $$;
create trigger drivers_sync_profile after update of kind, status, full_name, phone on public.drivers
  for each row execute function public.sync_driver_profile();
revoke execute on function public.sync_driver_profile() from anon, authenticated, public;
