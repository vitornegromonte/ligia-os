// Runs the actual remote RPCs and RLS with disposable auth users in one transaction.
// Every fixture is rolled back, including profiles, requests and audit rows.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { parseEnv } from "node:util";

const root = new URL("../", import.meta.url);
const secret = parseEnv(readFileSync(new URL(".env.local", root), "utf8"));
const app = parseEnv(readFileSync(new URL(".env", root), "utf8"));
const url = new URL(secret.DATABASE_URL);
const appHost = new URL(app.VITE_SUPABASE_URL.replace(/^"|"$/g, "")).hostname;
const projectRef = appHost.split(".")[0];
if (!url.hostname.includes(projectRef)) throw new Error("Database does not match the app project; no smoke test ran.");

const ids = Array.from({ length: 5 }, () => randomUUID());
const [applicant, rejected, director, coordinator, member] = ids;
const stamp = randomUUID().slice(0, 8);
const email = (n) => `smoke-${stamp}-${n}@example.invalid`;
const sql = `
do $$ begin
 if to_regprocedure('public.submit_membership_request(jsonb)') is null
   or to_regprocedure('public.review_membership_request(uuid,boolean)') is null
   or to_regprocedure('public.change_profile_role(uuid,text)') is null then
   raise exception 'Expected RPC signature missing'; end if;
 if position('motivation' in pg_get_functiondef('public.submit_membership_request(jsonb)'::regprocedure)) > 0 then
   raise exception 'Remote submit RPC still requires motivation'; end if;
 if not (select relrowsecurity from pg_class where oid='public.role_change_audit'::regclass) then
   raise exception 'Role audit RLS is disabled'; end if;
end $$;
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
insert into auth.users(id,email,raw_user_meta_data) values
 ('${applicant}','${email("applicant")}', '{}'::jsonb),
 ('${rejected}','${email("rejected")}', '{}'::jsonb),
 ('${director}','${email("director")}', '{}'::jsonb),
 ('${coordinator}','${email("coordinator")}', '{}'::jsonb),
 ('${member}','${email("member")}', '{}'::jsonb);
update public.profiles set team='Preserved team', bio='Preserved biography', github='https://github.com/preserved' where id='${applicant}';
update public.profiles set role='diretor' where id='${director}';
update public.profiles set role='coordenador' where id='${coordinator}';
update public.profiles set role='membro', status_membro='approved' where id='${member}';
set local role authenticated;
select set_config('request.jwt.claim.sub','${applicant}',true);
do $$ begin
 if public.is_admin() then raise exception 'External became admin'; end if;
 begin perform public.review_membership_request(gen_random_uuid(),true);
   raise exception 'External reviewed request';
 exception when insufficient_privilege then null; end;
 begin perform public.change_profile_role('${member}','diretor');
   raise exception 'External changed a role';
 exception when insufficient_privilege then null; end;
end $$;
do $$ begin
 begin perform public.submit_membership_request('{"name":"No Institution","discipline":"ML"}'::jsonb);
   raise exception 'Missing institution accepted';
 exception when invalid_parameter_value then null; end;
end $$;
select public.submit_membership_request('{"name":"Smoke Applicant","discipline":"ML, NLP","affiliation":"UFPE"}'::jsonb);
do $$ begin
 if (select role='externo' and status_membro='pending' from public.profiles where id='${applicant}') is not true then
   raise exception 'Applicant changed role before approval'; end if;
 if (select count(*) from public.membership_requests where profile_id='${applicant}' and status='pending') <> 1 then
   raise exception 'Pending request missing'; end if;
 if (select details ? 'bio' or details ? 'motivation' from public.membership_requests where profile_id='${applicant}') then
   raise exception 'Omitted fields persisted'; end if;
 if (select details ? 'team' from public.membership_requests where profile_id='${applicant}') then
   raise exception 'Request persisted team'; end if;
 begin perform public.submit_membership_request('{"name":"Again","discipline":"ML","affiliation":"UFPE"}'::jsonb);
   raise exception 'Second pending request accepted';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','${member}',true);
do $$ begin
 begin perform public.review_membership_request((select id from public.membership_requests where profile_id='${applicant}'),true);
   raise exception 'Member reviewed request';
 exception when insufficient_privilege then null; end;
 begin perform public.change_profile_role('${applicant}','coordenador');
   raise exception 'Member changed a role';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','${director}',true);
select public.review_membership_request((select id from public.membership_requests where profile_id='${applicant}'),true);
do $$ begin
 if (select role='membro' and status_membro='approved' and name='Smoke Applicant' and team='Preserved team'
   and discipline='ML, NLP' and affiliation='UFPE' and bio='Preserved biography'
   and github='https://github.com/preserved' from public.profiles where id='${applicant}') is not true then
   raise exception 'Approval did not preserve or transfer profile fields'; end if;
 if (select reviewed_by='${director}'::uuid and reviewed_at is not null and status='approved'
   from public.membership_requests where profile_id='${applicant}') is not true then
   raise exception 'Approval review metadata missing'; end if;
 if (select old_role='externo' and new_role='membro' and changed_by='${director}'::uuid and changed_at is not null
   from public.role_change_audit where target_profile_id='${applicant}' and changed_by='${director}' limit 1) is not true then
   raise exception 'Membership role audit missing'; end if;
end $$;
select public.change_profile_role('${applicant}','diretor');
do $$ begin
 if (select role='diretor' and status_membro='approved' from public.profiles where id='${applicant}') is not true then
   raise exception 'Member promotion failed'; end if;
 if (select old_role='membro' and new_role='diretor' and changed_by='${director}'::uuid and changed_at is not null
   from public.role_change_audit where target_profile_id='${applicant}' and new_role='diretor' limit 1) is not true then
   raise exception 'Director promotion audit missing'; end if;
end $$;
select set_config('request.jwt.claim.sub','${coordinator}',true);
select public.change_profile_role('${member}','coordenador');
do $$ begin
 if (select role='coordenador' and status_membro='approved' from public.profiles where id='${member}') is not true then
   raise exception 'Coordinator promotion failed'; end if;
 if (select old_role='membro' and new_role='coordenador' and changed_by='${coordinator}'::uuid
   from public.role_change_audit where target_profile_id='${member}' and new_role='coordenador' limit 1) is not true then
   raise exception 'Coordinator promotion audit missing'; end if;
end $$;
do $$ begin
 begin perform public.change_profile_role('${rejected}','diretor');
   raise exception 'Coordinator promoted External directly';
 exception when insufficient_privilege then null; end;
 if exists(select 1 from public.role_change_audit where target_profile_id='${rejected}' and changed_by='${coordinator}') then
   raise exception 'Rejected direct promotion left an audit row'; end if;
end $$;
select set_config('request.jwt.claim.sub','${rejected}',true);
select public.submit_membership_request('{"name":"Smoke Rejected","discipline":"CV","affiliation":"CIn-UFPE"}'::jsonb);
select set_config('request.jwt.claim.sub','${coordinator}',true);
select public.review_membership_request((select id from public.membership_requests where profile_id='${rejected}' and status='pending'),false);
do $$ begin
 if (select role='externo' and status_membro='rejected' from public.profiles where id='${rejected}') is not true then
   raise exception 'Rejection changed role'; end if;
 if (select reviewed_by='${coordinator}'::uuid and reviewed_at is not null and status='rejected'
   from public.membership_requests where profile_id='${rejected}' and status='rejected') is not true then
   raise exception 'Rejection review metadata missing'; end if;
end $$;
select set_config('request.jwt.claim.sub','${rejected}',true);
select public.submit_membership_request('{"name":"Smoke Resubmitted","discipline":"CV","affiliation":"CIn-UFPE"}'::jsonb);
do $$ begin
 if (select role='externo' and status_membro='pending' from public.profiles where id='${rejected}') is not true then
   raise exception 'Resubmission failed'; end if;
 if (select count(*) from public.membership_requests where profile_id='${rejected}') <> 2 then
   raise exception 'Resubmission did not create second request'; end if;
end $$;
reset role;
rollback;
do $$ begin
 if exists(select 1 from auth.users where id in ('${applicant}','${rejected}','${director}','${coordinator}','${member}'))
   or exists(select 1 from public.role_change_audit where target_profile_id in ('${applicant}','${rejected}','${director}','${coordinator}','${member}')) then
   raise exception 'Disposable remote data survived rollback'; end if;
end $$;
select 'PASS remote membership RPC/RLS smoke (all fixtures rolled back)';
`;
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432",
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: "require" };
const result = spawnSync(process.env.LOCAL_PG_BIN || "C:/Program Files/PostgreSQL/18/bin/psql.exe",
  ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"],
  { input: sql, env, encoding: "utf8", windowsHide: true, timeout: 90000 });
if (result.error || result.status !== 0) {
  // Database diagnostics can contain emails or connection details.
  throw new Error("Remote membership smoke failed; database diagnostics suppressed.");
}
console.log(result.stdout.trim().split("\n").at(-1));
