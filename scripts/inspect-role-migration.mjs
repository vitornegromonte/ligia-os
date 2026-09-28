// Read-only inventory for the four-role migration. Never prints credentials or emails.
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";

const config = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"));
const url = new URL(config.DATABASE_URL);
const query = `begin read only;
select json_build_object(
  'roles', (select json_object_agg(role, n) from (select role, count(*) n from public.profiles group by role) r),
  'adminClassifications', (select coalesce(json_agg(x), '[]'::json) from (
    select coalesce(category, '<null>') as category,
           coalesce(director_role, '<null>') as director_role,
           count(*) as total
    from public.profiles where role = 'admin'
    group by category, director_role order by category, director_role
  ) x),
  'adminIdentifiers', (select coalesce(json_agg(x), '[]'::json) from (
    select id, category, director_role from public.profiles where role = 'admin' order by director_role, id
  ) x),
  'hasMembershipRequests', to_regclass('public.membership_requests') is not null
  ,'challengeTestsNotArray', (select count(*) from public.challenges where jsonb_typeof(tests) <> 'array')
); rollback;`;
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432",
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: "require",
  PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=15000" };
const result = spawnSync("C:/Program Files/PostgreSQL/18/bin/psql.exe", ["-X", "-A", "-t", "-q", "-v", "ON_ERROR_STOP=1"],
  { input: query, env, encoding: "utf8", windowsHide: true, timeout: 25000 });
if (result.error || result.status !== 0) throw new Error("Read-only role inventory failed; diagnostics suppressed.");
console.log(result.stdout.trim());
