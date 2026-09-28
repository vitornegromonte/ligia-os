-- A transactional history of every actual profile role transition.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.role_change_audit (
  id uuid primary key default gen_random_uuid(),
  target_profile_id uuid not null,
  changed_by uuid,
  old_role text not null check (old_role in ('externo','membro','diretor','coordenador')),
  new_role text not null check (new_role in ('externo','membro','diretor','coordenador')),
  changed_at timestamptz not null default now(),
  check (old_role <> new_role)
);
create index role_change_audit_target_date on public.role_change_audit(target_profile_id, changed_at desc);
alter table public.role_change_audit enable row level security;
revoke all on public.role_change_audit from public, anon, authenticated;
grant select on public.role_change_audit to authenticated;
create policy role_change_audit_admin_read on public.role_change_audit for select to authenticated
  using ((select private.current_global_role()) in ('diretor','coordenador'));

create or replace function private.audit_profile_role_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.role_change_audit(target_profile_id, changed_by, old_role, new_role)
    values (new.id, auth.uid(), old.role, new.role);
  return new;
end $$;
create trigger audit_profile_role_change after update of role on public.profiles
  for each row when (old.role is distinct from new.role)
  execute function private.audit_profile_role_change();

commit;
