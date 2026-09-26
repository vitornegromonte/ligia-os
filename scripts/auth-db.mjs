// Production commands are explicit. Credentials stay in child-process environment.
// `backup` is schema-only: it is a recovery reference, NOT a full data backup.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const migration = path.join(root, "supabase/migrations/202609260001_authentication.sql");
const hash = value => createHash("sha256").update(value).digest("hex");
const sql = readFileSync(migration, "utf8");
const action = process.argv[2];
const digest = hash(sql);
if (action === "plan") {
  console.log(JSON.stringify({ migration: "supabase/migrations/202609260001_authentication.sql", sha256: digest, remoteConnection: false }));
  process.exit(0);
}
if (!["backup", "apply", "verify"].includes(action)) throw new Error("Use plan, backup, apply <sha256> <backup-directory>, or verify <backup-directory>.");
const config = parseEnv(readFileSync(path.join(root, ".env.local"), "utf8"));
let url;
try { url = new URL(config.DATABASE_URL); } catch { throw new Error("DATABASE_URL missing or invalid (value suppressed)."); }
const api = new URL(parseEnv(readFileSync(path.join(root, ".env"), "utf8")).VITE_SUPABASE_URL);
const project = api.hostname.split(".")[0];
if (url.hostname !== `db.${project}.supabase.co` && !(url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username).endsWith(`.${project}`))) {
  throw new Error("Database target does not match the frontend project; refusing.");
}
const targetHash = hash([url.hostname, url.port, url.pathname, url.username].join("|"));
const env = {
  ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("PG"))),
  PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
  PGSSLMODE: "require", PGCONNECT_TIMEOUT: "12", PGAPPNAME: "ligia-auth-migration",
  PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=60000 -c lock_timeout=5000",
};
const pgBin = process.env.LOCAL_PG_BIN || "C:/Program Files/PostgreSQL/18/bin";
function run(name, args, input, writable = false) {
  const result = spawnSync(path.join(pgBin, name + (process.platform === "win32" ? ".exe" : "")), args, {
    input, env: writable ? { ...env, PGOPTIONS: "-c statement_timeout=60000 -c lock_timeout=5000" } : env,
    encoding: "utf8", windowsHide: true, timeout: 120000,
  });
  if (result.error || result.status !== 0) {
    // Server diagnostics can echo connection details or SQL values: never print them.
    throw new Error(`${name} failed; diagnostics suppressed. Stop before deployment and inspect safely.`);
  }
  return result.stdout;
}
const args = ["-X", "-A", "-t", "-q", "-v", "ON_ERROR_STOP=1"];
function state() {
  return JSON.parse(run("psql", args, `begin read only;
    select json_build_object(
      'roles', (select md5(coalesce(string_agg(id::text||':'||role,',' order by id),'')) from public.profiles),
      'missingProfiles', (select count(*) from auth.users u left join public.profiles p on p.id=u.id where p.id is null),
      'roleRpc', to_regprocedure('public.change_profile_role(uuid,text)') is not null,
      'profileGuard', exists(select 1 from pg_trigger where tgrelid='public.profiles'::regclass and tgname='ligia_guard_profile_fields' and tgenabled='O'),
      'emailTrigger', exists(select 1 from pg_trigger where tgrelid='auth.users'::regclass and tgname='ligia_sync_profile_email' and tgenabled='O'),
      'signupTriggers', (select count(*) from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal and (tgtype & 4)=4),
      'boundaries', (select count(*) from pg_policies where schemaname='public' and policyname='ligia_internal_boundary' and permissive='RESTRICTIVE'),
      'anonProfiles', has_table_privilege('anon','public.profiles','SELECT'),
      'directRoleUpdate', has_column_privilege('authenticated','public.profiles','role','UPDATE')
    ); rollback;`));
}
if (action === "backup") {
  const directory = mkdtempSync(path.join(tmpdir(), "ligia-auth-recovery-"));
  run("pg_dump", ["--schema-only", "--no-owner", "--file", path.join(directory, "schema.sql")]);
  const before = state();
  writeFileSync(path.join(directory, "manifest.json"), JSON.stringify({ targetHash, migrationHash: digest, capturedAt: Date.now(), before, schemaHash: hash(readFileSync(path.join(directory, "schema.sql"))) }, null, 2));
  console.log(`Schema-only recovery reference saved outside repository: ${directory}`);
  process.exit(0);
}
const directory = action === "apply" ? process.argv[4] : process.argv[3];
if (!directory) throw new Error("Provide the backup directory.");
const manifest = JSON.parse(readFileSync(path.join(directory, "manifest.json"), "utf8"));
if (manifest.targetHash !== targetHash || manifest.migrationHash !== digest || manifest.schemaHash !== hash(readFileSync(path.join(directory, "schema.sql")))) {
  throw new Error("Target, migration or recovery-reference hash mismatch.");
}
if (action === "apply") {
  if (process.argv[3] !== digest) throw new Error("Pass the exact reviewed migration SHA256.");
  if (Date.now() - manifest.capturedAt > 3600000) throw new Error("Recovery reference is older than one hour; capture it again.");
  const before = state();
  if (before.roles !== manifest.before.roles || before.missingProfiles !== 0 || before.signupTriggers !== 1) {
    throw new Error("Identity state changed or requires manual reconciliation; no migration applied.");
  }
  run("psql", [...args, "-f", migration], undefined, true);
}
const after = state();
if (after.roles !== manifest.before.roles || after.missingProfiles !== 0 || !after.roleRpc || !after.profileGuard || !after.emailTrigger || after.signupTriggers !== 1 || after.boundaries !== 12 || after.anonProfiles || after.directRoleUpdate) {
  throw new Error("Post-migration verification failed. Do not deploy. No automatic reversal was attempted.");
}
console.log("PASS authentication schema verified; existing identity/role fingerprint unchanged. This does not replace authenticated E2E tests.");
