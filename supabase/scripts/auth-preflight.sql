-- Read-only inventory. Does not return user records or credentials.
begin transaction read only;

select current_database() as database_name, current_user as inspection_role;

select table_name, column_name, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select c.relname as table_name, c.relrowsecurity, c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
order by table_name, grantee, privilege_type;

select table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
order by table_name, column_name, grantee, privilege_type;

select n.nspname as schema_name, c.relname as table_name, t.tgname,
       pg_get_triggerdef(t.oid) as definition,
       pn.nspname as function_schema, p.proname as function_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal
  and (n.nspname = 'public' or (n.nspname = 'auth' and c.relname = 'users'))
order by n.nspname, c.relname, t.tgname;

-- Inventory signatures and privileges only: function bodies may contain secrets.
select n.nspname as schema_name, p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer, p.proconfig, p.proacl,
       pg_get_userbyid(p.proowner) as owner
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
order by n.nspname, p.proname;

select c.relname as table_name, con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, con.conname;

select to_regclass('public.profiles') as profiles,
       to_regclass('supabase_migrations.schema_migrations') as migration_history;

rollback;
