// Operator-only first administrator bootstrap. Never bundle or expose this script.
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const value = (flag) => {
  const i = args.indexOf(flag);
  return i < 0 ? null : args[i + 1];
};
const target = value("--email") || value("--id");
const role = value("--role");
const apply = args.includes("--apply");
const confirm = value("--confirm-id");
const expectHost = value("--expect-host");
if (!target || !["diretor", "coordenador"].includes(role) ||
    (apply && (!confirm || !expectHost)) || (!apply && (confirm || expectHost)) ||
    (value("--email") && value("--id"))) {
  throw new Error("Usage: node scripts/bootstrap-first-admin.mjs (--email EMAIL | --id UUID) --role (diretor|coordenador) [--apply --confirm-id PROFILE_UUID --expect-host DATABASE_HOST]");
}
if (value("--id") && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target)) {
  throw new Error("Invalid profile UUID.");
}
if (value("--email") && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target) || target.length > 320)) {
  throw new Error("Invalid email.");
}
if (confirm && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(confirm)) {
  throw new Error("Invalid confirmation UUID.");
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required (value suppressed).");
let url;
try { url = new URL(databaseUrl); } catch { throw new Error("Invalid DATABASE_URL (value suppressed)."); }
if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error("DATABASE_URL must use PostgreSQL.");
if (apply && url.hostname !== expectHost) throw new Error("Database host does not match --expect-host; no change made.");
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432",
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: url.hostname === "127.0.0.1" || url.hostname === "localhost" ? "disable" : "require" };
delete env.DATABASE_URL;
const sql = apply ? `
begin;
set local lock_timeout = '5s';
set local statement_timeout = '20s';
lock table public.profiles in share row exclusive mode;
select set_config('ligia.bootstrap.target', :'target', true);
select set_config('ligia.bootstrap.role', :'role', true);
select set_config('ligia.bootstrap.confirm', :'confirm', true);
do $$
declare matched public.profiles; matches integer; admins integer;
begin
  if current_user <> 'postgres' then raise exception 'Database owner postgres required'; end if;
  select count(*) into admins from public.profiles where role in ('diretor','coordenador');
  if admins > 0 then raise exception 'Administrator already exists; use normal role management'; end if;
  select count(*) into matches from public.profiles
    where lower(email) = lower(current_setting('ligia.bootstrap.target'))
       or id::text = current_setting('ligia.bootstrap.target');
  if matches <> 1 then raise exception 'Target must match exactly one profile'; end if;
  select * into matched from public.profiles
    where lower(email) = lower(current_setting('ligia.bootstrap.target'))
       or id::text = current_setting('ligia.bootstrap.target') for update;
  if matched.id::text <> current_setting('ligia.bootstrap.confirm') then
    raise exception 'Confirmation UUID does not match target'; end if;
  if matched.role not in ('externo','membro') or matched.status_membro = 'pending' then
    raise exception 'Target must be an external without pending request or an approved member'; end if;
  update public.profiles set role = current_setting('ligia.bootstrap.role'),
    status_membro = case when matched.role = 'membro' then 'approved' else 'none' end
    where id = matched.id;
end $$;
select json_build_object('id',id,'role',role,'status_membro',status_membro)
  from public.profiles where id::text = :'confirm';
commit;
` : `
begin read only;
select json_build_object(
  'database_user', current_user,
  'administrator_count', (select count(*) from public.profiles where role in ('diretor','coordenador')),
  'matches', (select coalesce(json_agg(json_build_object('id',id,'email',email,'role',role,'status_membro',status_membro)), '[]'::json)
    from public.profiles where lower(email) = lower(:'target') or id::text = :'target')
);
rollback;
`;
const binary = process.env.LOCAL_PG_BIN || "C:/Program Files/PostgreSQL/18/bin/psql.exe";
const result = spawnSync(binary, ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1",
  "-v", `target=${target}`, "-v", `role=${role}`, "-v", `confirm=${confirm || ""}`],
{ input: sql, env, encoding: "utf8", windowsHide: true, timeout: 30000 });
if (result.error || result.status !== 0) {
  throw new Error("Bootstrap query failed or was refused; database diagnostics suppressed.");
}
const line = result.stdout.trim().split("\n").findLast((part) => part.trim().startsWith("{"));
const data = JSON.parse(line);
if (apply) {
  console.log(`Bootstrap complete: ${data.id} -> ${data.role} (${data.status_membro}).`);
} else {
  if (data.database_user !== "postgres") throw new Error("Database owner postgres required.");
  if (data.administrator_count > 0) throw new Error("Administrator already exists; use normal role management.");
  if (data.matches.length !== 1) throw new Error(`Target must match exactly one profile; found ${data.matches.length}.`);
  const profile = data.matches[0];
  if (profile.status_membro === "pending") throw new Error("Target has a pending membership request.");
  console.log(`Database: ${url.hostname}/${decodeURIComponent(url.pathname.slice(1))}.`);
  console.log(`Target: ${profile.email} (${profile.id}); current role: ${profile.role}; requested role: ${role}.`);
  console.log(`To apply, rerun with --apply --confirm-id ${profile.id} --expect-host ${url.hostname}`);
}
