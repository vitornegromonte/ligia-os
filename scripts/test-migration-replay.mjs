// Replays every migration in CLI order in a disposable local PostgreSQL.
// No .env file or remote connection is used. Supabase-owned auth objects are stubbed.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const pgBin = process.env.LOCAL_PG_BIN || "C:/Program Files/PostgreSQL/18/bin";
const tempRoot = path.resolve(tmpdir());
const cluster = mkdtempSync(path.join(tempRoot, "ligia-migration-replay-"));
const data = path.join(cluster, "data");
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !key.startsWith("PG") && !key.startsWith("SUPABASE_") &&
  !key.startsWith("VITE_") && key !== "DATABASE_URL"));
const listener = net.createServer();
await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));

function run(name, args, input) {
  const binary = path.join(pgBin, name + (process.platform === "win32" ? ".exe" : ""));
  const result = spawnSync(binary, args, {
    input, env, encoding: "utf8", windowsHide: true, timeout: 90_000,
    stdio: name === "pg_ctl" ? "ignore" : undefined,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${name} failed: ${result.error?.message || result.stderr || result.stdout}`);
  }
  return result.stdout;
}

let started = false;
try {
  run("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "--encoding=UTF8", "--no-locale"]);
  run("pg_ctl", ["-D", data, "-l", path.join(cluster, "postgres.log"),
    "-o", `-p ${port} -h 127.0.0.1`, "-w", "start"]);
  started = true;
  const conn = ["-X", "-h", "127.0.0.1", "-p", String(port), "-U", "postgres",
    "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
  run("psql", conn, `
    create role anon; create role authenticated; create role service_role bypassrls;
    create role supabase_admin; create role supabase_auth_admin;
    create schema auth; create schema extensions;
    create extension "uuid-ossp" with schema extensions;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
  `);
  const migrations = readdirSync(path.join(root, "supabase/migrations"))
    .filter((file) => file.endsWith(".sql")).sort();
  for (const file of migrations) {
    if (file === "202609270001_four_roles_membership.sql") {
      run("psql", conn, `
        insert into auth.users(id,email) values ('10000000-0000-0000-0000-000000000099','legacy-admin@test');
        update public.profiles set role='admin', category='diretor', director_role='Pesquisa'
          where email='legacy-admin@test';
      `);
      let blocked = false;
      try { run("psql", [...conn, "-f", path.join(root, "supabase/migrations", file)]); }
      catch (error) { blocked = error.message.includes("Unclassified legacy administrators"); }
      if (!blocked) throw new Error("Ambiguous legacy administrator was not blocked");
      run("psql", conn, "delete from auth.users where email='legacy-admin@test';");
    }
    run("psql", [...conn, "-f", path.join(root, "supabase/migrations", file)]);
  }
  run("psql", [...conn, "-f", path.join(root, "supabase/seed/challenges.sql")]);
  run("psql", [...conn, "-f", path.join(root, "supabase/tests/four-roles.sql")]);
  const result = JSON.parse(run("psql", [...conn, "-q", "-A", "-t"], `
    select json_build_object(
      'tables', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r'),
      'withoutRls', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and not c.relrowsecurity),
      'challenges', (select count(*) from public.challenges),
      'clientCanInsertSubmission', has_table_privilege('authenticated','public.submissions','INSERT')
    );
  `).trim());
  if (result.tables !== 25 || result.withoutRls !== 0 || result.challenges !== 41 ||
      result.clientCanInsertSubmission) {
    throw new Error(`Unexpected replay result: ${JSON.stringify(result)}`);
  }
  const comparePath = process.argv[2];
  if (comparePath) {
    const localDump = path.join(cluster, "replayed.sql");
    run("pg_dump", ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", "postgres",
      "--schema-only", "--no-owner", "--no-privileges", "--schema=public", "--schema=private",
      "--file", localDump]);
    const normalize = (sql) => sql.replace(/\r\n/g, "\n").split("\n")
      .filter((line) => !/^\\(?:un)?restrict\s/.test(line) &&
        !line.startsWith("-- Dumped from database version"))
      .join("\n");
    if (normalize(readFileSync(localDump, "utf8")) !== normalize(readFileSync(comparePath, "utf8"))) {
      throw new Error("Replayed public/private schema differs from supplied schema-only snapshot");
    }
  }
  console.log(`PASS ${migrations.length} migrations in CLI order, 25 RLS tables, four-role flow, 41 challenges, server-only submissions${comparePath ? ", remote schema equivalent" : ""}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  let stopped = !existsSync(path.join(data, "postmaster.pid"));
  if (started || !stopped) {
    try { run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]); stopped = true; }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
  if (stopped && path.dirname(path.resolve(cluster)) === tempRoot &&
      path.basename(cluster).startsWith("ligia-migration-replay-")) {
    rmSync(cluster, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
