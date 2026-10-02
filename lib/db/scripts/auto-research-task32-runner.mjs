import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { parseSafeTestDatabaseUrl } from "./auto-research-test-runner.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const taskDatabasePattern = /^auto_research_task32_(\d+_[a-f0-9]{8})$/;
const taskCommentPrefix = "auto-research-task32-runner:v1";

function quoteSqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function makeDisposableTarget(rawUrl) {
  const parsed = parseSafeTestDatabaseUrl(rawUrl);
  const runId = `${Date.now()}_${randomBytes(4).toString("hex")}`;
  const databaseName = `auto_research_task32_${runId}`;
  assert.match(databaseName, taskDatabasePattern);
  const url = new URL(parsed.connectionString);
  url.pathname = `/${databaseName}`;
  return {
    runId,
    databaseName,
    connectionString: url.toString(),
    createdAt: new Date().toISOString(),
    comment: `${taskCommentPrefix} run=${runId}`,
  };
}

async function assertRunnerOwnsDatabase(admin, target) {
  const { rows } = await admin.query(
    `SELECT shobj_description(oid, 'pg_database') AS comment,
            pg_get_userbyid(datdba) = current_user AS owned_by_current_user
     FROM pg_database WHERE datname = $1`,
    [target.databaseName],
  );
  const nameMatch = taskDatabasePattern.exec(target.databaseName);
  assert.ok(nameMatch && nameMatch[1] === target.runId);
  assert.equal(rows[0]?.comment, target.comment, "Task32 disposable DB ownership comment must be intact.");
  assert.equal(rows[0]?.owned_by_current_user, true, "Task32 runner must own its temporary DB.");
}

async function dropRunnerOwnedDatabase(admin, target) {
  await assertRunnerOwnsDatabase(admin, target);
  const { rows } = await admin.query(
    `SELECT pid FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid() LIMIT 1`,
    [target.databaseName],
  );
  assert.equal(rows.length, 0, "Refusing to drop the Task32 database while it has open connections.");
  await admin.query(`DROP DATABASE "${target.databaseName}"`);
  const { rows: remaining } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [target.databaseName],
  );
  assert.deepEqual(remaining, [], "Task32 disposable database cleanup must remove the owned database.");
}

async function runCommand(command, args, env) {
  const child = spawn(command, args, { cwd: workspaceRoot, env, stdio: "inherit" });
  const exit = await once(child, "exit");
  const [code, signal] = exit;
  if (code !== 0) throw new Error(`${command} ${args.join(" ")} exited with ${signal ?? `code ${code}`}.`);
}

async function captureAnchorState(pool) {
  const { rows: tables } = await pool.query(
    `SELECT schemaname, tablename
     FROM pg_tables
     WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
     ORDER BY schemaname, tablename`,
  );
  const contents = [];
  for (const { schemaname, tablename } of tables) {
    const { rows } = await pool.query(
      `SELECT count(*)::text AS count FROM "${schemaname.replaceAll('"', '""')}"."${tablename.replaceAll('"', '""')}"`,
    );
    contents.push([schemaname, tablename, rows[0].count]);
  }
  return { tables, contents };
}

async function exerciseRollback(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO research_sources (source_key, source_kind)
       VALUES ('task32-rollback-probe', 'other_reviewed')`,
    );
    await client.query("ROLLBACK");
    const { rows } = await client.query(
      "SELECT id FROM research_sources WHERE source_key = 'task32-rollback-probe'",
    );
    assert.deepEqual(rows, [], "The runner's disposable rollback probe must leave no synthetic rows.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const { connectionString: anchorUrl, databaseName: anchorName } = parseSafeTestDatabaseUrl(
    process.env.AUTO_RESEARCH_TEST_DATABASE_URL,
  );
  const anchor = new Pool({ connectionString: anchorUrl });
  const target = makeDisposableTarget(anchorUrl);
  let targetCreated = false;
  let testPool;
  let completed = false;
  let anchorBefore;

  try {
    anchorBefore = await captureAnchorState(anchor);
    await anchor.query(`CREATE DATABASE "${target.databaseName}"`);
    targetCreated = true;
    await anchor.query(
      `COMMENT ON DATABASE "${target.databaseName}" IS ${quoteSqlLiteral(target.comment)}`,
    );
    await assertRunnerOwnsDatabase(anchor, target);

    const disposableEnvironment = {
      ...process.env,
      DATABASE_URL: target.connectionString,
      NODE_ENV: "test",
      AUTO_RESEARCH_PROFILE_READ_MODE: "catalog",
    };
    delete disposableEnvironment.AUTO_RESEARCH_API_BASE_URL;
    delete disposableEnvironment.AUTO_RESEARCH_TASK32_API_URL;
    delete disposableEnvironment.AUTO_RESEARCH_TEST_DATABASE_URL;
    for (const key of ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGSERVICE", "PGSERVICEFILE"]) {
      delete disposableEnvironment[key];
    }

    await runCommand(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate:legacy"],
      disposableEnvironment,
    );

    testPool = new Pool({ connectionString: target.connectionString });
    const { seedDemoBaseline } = await import("./auto-research-task32-fixtures.mjs");
    const seedClient = await testPool.connect();
    try {
      await seedDemoBaseline(seedClient);
    } finally {
      seedClient.release();
    }

    await runCommand(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate"],
      disposableEnvironment,
    );
    await exerciseRollback(testPool);
    await testPool.end();
    testPool = undefined;

    await runCommand(
      "pnpm",
      [
        "--filter",
        "@workspace/scripts",
        "exec",
        "node",
        "--import",
        "tsx",
        "--test",
        resolve(workspaceRoot, "scripts/tests/auto-research-task32-api.test.mjs"),
      ],
      disposableEnvironment,
    );
    completed = true;
  } finally {
    if (testPool) await testPool.end();
    try {
      if (targetCreated) {
        try {
          await dropRunnerOwnedDatabase(anchor, target);
        } catch (error) {
          console.error(
            `Could not safely remove disposable Task32 database ${target.databaseName}: ${
              error instanceof Error ? error.message : "unknown cleanup error"
            }`,
          );
          process.exitCode = 1;
        }
      }
      assert.deepEqual(
        await captureAnchorState(anchor),
        anchorBefore,
        "The local test anchor database must not be changed by Task32 setup or teardown.",
      );
    } finally {
      await anchor.end();
      if (!completed && process.exitCode !== 1) process.exitCode = 1;
    }
  }
  console.log("Task32 acceptance tests passed in an owned, disposable PostgreSQL database.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Task32 disposable HTTP tests failed.");
    process.exitCode = 1;
  });
}