// Explicit learning-schema deployment. No credentials are logged or put in argv.
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const configRoot = process.env.LIGIA_CONFIG_DIR || root;
const files = ["0018_challenges_submissions.sql", "0100_learning_core.sql", "0101_rate_limit.sql", "0102_practice_open_access.sql", "0103_practice_progress.sql", "0104_pretest_respostas.sql", "0105_perfil_e_rascunho_nivelamento.sql", "0106_learning_privileges.sql"];
const tables = ["challenges", "submissions", "student_progress", "loop_results", "pretest_results", "learning_events", "rate_limits", "learner_profiles", "nivelamento_rascunhos"];
const hash = value => createHash("sha256").update(value).digest("hex");
const sql = files.map(f => readFileSync(path.join(root, "supabase/migrations", f), "utf8")).join("\n") + "\n" + readFileSync(path.join(root, "supabase/seed/challenges.sql"), "utf8");
const digest = hash(sql);
const action = process.argv[2];
if (action === "plan") {
  console.log(JSON.stringify({ sha256: digest, migrations: files, seed: "supabase/seed/challenges.sql", remoteConnection: false }));
  process.exit(0);
}
if (!["apply", "verify"].includes(action)) throw new Error("Use plan, apply <sha256> <recovery-directory>, or verify.");
const envFile = parseEnv(readFileSync(path.join(configRoot, ".env.local"), "utf8"));
const url = new URL(envFile.DATABASE_URL);
const project = new URL(parseEnv(readFileSync(path.join(configRoot, ".env"), "utf8")).VITE_SUPABASE_URL).hostname.split(".")[0];
if (url.hostname !== `db.${project}.supabase.co` && !(url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username).endsWith(`.${project}`))) throw new Error("Project mismatch.");
const env = {
  ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("PG"))),
  PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
  PGSSLMODE: "require", PGCONNECT_TIMEOUT: "12", PGAPPNAME: "ligia-learning-migration",
};
function query(input, writable = false) {
  const result = spawnSync(path.join(process.env.LOCAL_PG_BIN || "C:/Program Files/PostgreSQL/18/bin", process.platform === "win32" ? "psql.exe" : "psql"), ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"], {
    input, env: { ...env, PGOPTIONS: `-c default_transaction_read_only=${writable ? "off" : "on"} -c statement_timeout=60000 -c lock_timeout=5000` },
    encoding: "utf8", windowsHide: true, timeout: 90000,
  });
  if (result.error || result.status !== 0) throw new Error("Database command failed; diagnostics suppressed. Stop and inspect safely.");
  return result.stdout.trim();
}
const tableList = tables.map(t => `'${t}'`).join(",");
if (action === "apply") {
  if (process.argv[3] !== digest || !process.argv[4]) throw new Error("Pass the reviewed SHA256 and recovery directory.");
  const manifest = JSON.parse(readFileSync(path.join(process.argv[4], "manifest.json"), "utf8"));
  const target = hash([url.hostname, url.port, url.pathname, url.username].join("|"));
  if (manifest.targetHash !== target || Date.now() - manifest.capturedAt > 3600000 || manifest.schemaHash !== hash(readFileSync(path.join(process.argv[4], "schema.sql")))) throw new Error("Recovery reference expired, damaged or for a different target.");
  const check = JSON.parse(query(`select json_build_object('auth',to_regprocedure('public.change_profile_role(uuid,text)') is not null,'existing',(select count(*) from information_schema.tables where table_schema='public' and table_name in (${tableList})));`));
  if (!check.auth || check.existing !== 0) throw new Error("Expected auth baseline or empty learning schema differs. No migration applied.");
  query("begin;\nset local lock_timeout='5s';\nset local statement_timeout='60s';\n" + sql + "\ncommit;", true);
}
const result = JSON.parse(query(`begin read only; select json_build_object(
  'tables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in (${tableList}) and c.relrowsecurity),
  'catalog',(select count(*) from public.challenges),
  'clientInsert',has_table_privilege('authenticated','public.submissions','INSERT'),
  'clientRateRpc',has_function_privilege('authenticated','public.consume_rate_limit(uuid,text,int,interval)','EXECUTE'),
  'serviceRateRpc',has_function_privilege('service_role','public.consume_rate_limit(uuid,text,int,interval)','EXECUTE'),
  'roles',(select md5(coalesce(string_agg(id::text||':'||role,',' order by id),'')) from public.profiles)
); rollback;`));
if (result.tables !== 9 || result.catalog !== 41 || result.clientInsert || result.clientRateRpc || !result.serviceRateRpc) throw new Error("Learning verification failed. Do not publish.");
if (action === "apply") {
  const manifest = JSON.parse(readFileSync(path.join(process.argv[4], "manifest.json"), "utf8"));
  if (result.roles !== manifest.before.roles) throw new Error("Identity fingerprint changed; stop before publication.");
}
console.log("PASS 9 learning tables with RLS, 41 challenges, server-only results/rate RPC. Authenticated Edge E2E remains a separate check.");
