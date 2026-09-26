// Restores a schema-only inspection snapshot into a NEW disposable PostgreSQL.
// Never reads .env files and never connects to a configured remote database.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const snapshot = process.argv[2];
if (!snapshot) throw new Error("Pass the schema-only snapshot directory as the sole argument.");
const dump = readFileSync(path.join(snapshot, "public-schema.sql"), "utf8");
const metadata = JSON.parse(readFileSync(path.join(snapshot, "metadata.json"), "utf8"));
const tempRoot = path.resolve(tmpdir());
const cluster = mkdtempSync(path.join(tempRoot, "ligia-auth-schema-"));
const data = path.join(cluster, "data");
const pgBin = process.env.LOCAL_PG_BIN || "C:/Program Files/PostgreSQL/18/bin";
const server = net.createServer();
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
// Ignore inherited PG connection settings, including service/password files.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("PG")));
function run(name, args, options = {}) {
  const result = spawnSync(path.join(pgBin, name + (process.platform === "win32" ? ".exe" : "")), args,
    { cwd: root, env, encoding: "utf8", windowsHide: true, timeout: 60000, ...options });
  if (result.error || result.status !== 0) throw new Error(`${name}: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}
let started = false;
try {
  run("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "--encoding=UTF8", "--no-locale"]);
  run("pg_ctl", ["-D", data, "-l", path.join(cluster, "postgres.log"), "-o", `-p ${port} -h 127.0.0.1`, "-w", "start"], { stdio: "ignore" });
  started = true;
  const args = ["-X", "-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
  run("psql", args, { input: `
    create role anon; create role authenticated; create role service_role bypassrls;
    create role supabase_admin; create role supabase_auth_admin;
    create schema auth; create schema extensions;
    create extension "uuid-ossp" with schema extensions;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth to anon,authenticated,service_role;
  ` });
  run("psql", args, { input: dump.replace("CREATE SCHEMA public;", "CREATE SCHEMA IF NOT EXISTS public;") });
  run("psql", args, { input: metadata.trigger + ";" });
  console.log("PASS actual public schema, original grants/policies and signup trigger restored without user data");
  run("psql", [...args, "-f", path.join(root, "supabase/tests/auth-production-seed.sql")]);
  const migration = path.join(root, "supabase/migrations/202609260001_authentication.sql");
  run("psql", [...args, "-f", migration]);
  run("psql", [...args, "-f", migration]);
  console.log("PASS authentication migration applied twice against inspected schema");
  run("psql", [...args, "-f", path.join(root, "supabase/tests/auth-production-access.sql")]);
  console.log("PASS signup, email sync, role authorization, grants, RLS and existing memberships (synthetic users)");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  let stopped = !existsSync(path.join(data, "postmaster.pid"));
  if (started || !stopped) {
    try { run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]); stopped = true; }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
  if (stopped && path.dirname(path.resolve(cluster)) === tempRoot && path.basename(cluster).startsWith("ligia-auth-schema-")) {
    rmSync(cluster, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
