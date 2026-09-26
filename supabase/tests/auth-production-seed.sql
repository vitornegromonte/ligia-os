-- Synthetic records, loaded ONLY by test-auth-schema.mjs into a disposable cluster.
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000001','visitor@example.test'),
 ('00000000-0000-0000-0000-000000000002','member@example.test'),
 ('00000000-0000-0000-0000-000000000003','admin@example.test');
update public.profiles set role='membro' where id='00000000-0000-0000-0000-000000000002';
update public.profiles set role='admin' where id='00000000-0000-0000-0000-000000000003';
insert into public.projects(id,name) values('10000000-0000-0000-0000-000000000001','Test project');
insert into public.project_members(project_id,profile_id) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
insert into public.events(title,starts_at,visibility) values
 ('Public test event',now(),'public'),('Internal test event',now(),'internal');
create function public.test_assert(condition boolean,label text) returns void language plpgsql as $$
begin if condition is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
create function public.test_denied(statement text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when insufficient_privilege then return; end;
  raise exception 'FAILED: operation permitted: %',statement;
end $$;
