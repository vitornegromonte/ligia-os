-- READ ONLY. Run with a database owner connection; never paste credentials in reports.
select table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns where table_schema in ('public', 'auth')
and (table_schema = 'public' or table_name = 'users') order by 1,2,ordinal_position;

select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p','v','m');
select * from pg_policies where schemaname='public' order by tablename,policyname;
select * from information_schema.role_table_grants where table_schema='public';
select * from information_schema.role_column_grants where table_schema='public';
select n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid)
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and n.nspname in ('public','auth');
select n.nspname, p.proname, p.prosecdef, p.proconfig, p.proacl, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') and p.prokind='f';
select c.conrelid::regclass, c.conname, pg_get_constraintdef(c.oid)
from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public';
select role::text, count(*) from public.profiles group by role;
select count(*) as auth_users_without_profile from auth.users u
where not exists(select 1 from public.profiles p where p.id=u.id);
