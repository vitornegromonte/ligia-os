// Runs real PostgreSQL in a NEW disposable cluster, never a configured/live database.
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const tempRoot = path.resolve(tmpdir());
const cluster = mkdtempSync(path.join(tempRoot, "ligia-rls-test-"));
const data = path.join(cluster, "data");
const pgBin = process.env.LOCAL_PG_BIN || (process.platform === "win32" ? "C:/Program Files/PostgreSQL/18/bin" : "");
function run(name, args, options = {}) {
  const binary = pgBin ? path.join(pgBin, name + (process.platform === "win32" ? ".exe" : "")) : name;
  const result = spawnSync(binary, args, { cwd: root, encoding: "utf8", windowsHide: true, timeout: 60000, ...options });
  if (result.error || result.status !== 0) throw new Error(`${name} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}
const server = net.createServer();
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
let started = false;
try {
  run("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "--encoding=UTF8", "--no-locale"]);
  run("pg_ctl", ["-D", data, "-l", path.join(cluster, "postgres.log"), "-o", `-p ${port} -h 127.0.0.1`, "-w", "start"], { stdio: "ignore" });
  started = true;
  const args = ["-X", "-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
  for (const file of ["supabase/tests/fixture.sql", "supabase/proposals/001_identity.sql", "supabase/proposals/002_internal_boundary.sql", "supabase/proposals/001_identity.sql", "supabase/proposals/002_internal_boundary.sql", "supabase/tests/access.sql"]) {
    run("psql", [...args, "-f", path.join(root, file)]);
    console.log(`PASS ${file}`);
  }
  console.log("PostgreSQL authorization tests passed (disposable fixture; not production verification).");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  let stopped = !existsSync(path.join(data, "postmaster.pid"));
  if (started || !stopped) {
    try { run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]); stopped = true; }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
  // Verify the exact resolved path before recursive removal on Windows.
  if (stopped && path.dirname(path.resolve(cluster)) === tempRoot && path.basename(cluster).startsWith("ligia-rls-test-")) {
    rmSync(cluster, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
