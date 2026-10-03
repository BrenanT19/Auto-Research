import assert from "node:assert/strict";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer } from "node:net";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import {
  assertStage2aIdentityBackfill,
  assertStage2aRolledBack,
  captureLegacyDatabaseState,
  captureLegacySchemaCatalog,
  runStage2aConstraintChecks,
} from "./auto-research-stage2a-integrity-checks.mjs";

const { Client, Pool } = pg;
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const demoBaseline = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/auto-research-demo-baseline.json"),
    "utf8",
  ),
);
const legacyMigrationJournal = JSON.parse(
  readFileSync(resolve(workspaceRoot, "lib/db/migrations/legacy/meta/_journal.json"), "utf8"),
);
const stage2aMigrationJournal = JSON.parse(
  readFileSync(resolve(workspaceRoot, "lib/db/migrations/stage2a/meta/_journal.json"), "utf8"),
);
const temporaryDatabaseCommentPrefix = "auto-research-test-runner:v1";
const temporaryDatabaseRetentionMs = 24 * 60 * 60 * 1000;
const temporaryDatabaseNamePattern =
  /^auto_research_stage2a_(?:baseline|migrated|failure|interrupted|resumed|sql_resumed)_(\d+_[a-f0-9]{8})$/;
const temporaryDatabaseCommentPattern =
  /^auto-research-test-runner:v1 run=(\d+_[a-f0-9]{8}) createdAt=(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)$/;

function quoteSqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function formatTemporaryDatabaseComment(runId, createdAt) {
  if (!/^\d+_[a-f0-9]{8}$/.test(runId)) {
    throw new Error("The disposable migration run ID is invalid.");
  }
  const createdAtDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (!Number.isFinite(createdAtDate.getTime())) {
    throw new Error("The disposable migration run timestamp is invalid.");
  }
  return `${temporaryDatabaseCommentPrefix} run=${runId} createdAt=${createdAtDate.toISOString()}`;
}

export function parseRunnerOwnedTemporaryDatabase(databaseName, comment) {
  const nameMatch = temporaryDatabaseNamePattern.exec(databaseName);
  const commentMatch = temporaryDatabaseCommentPattern.exec(comment ?? "");
  if (!nameMatch || !commentMatch || nameMatch[1] !== commentMatch[1]) return null;

  const createdAt = Date.parse(commentMatch[2]);
  if (!Number.isFinite(createdAt) || new Date(createdAt).toISOString() !== commentMatch[2]) {
    return null;
  }
  return {
    runId: commentMatch[1],
    createdAt: commentMatch[2],
    createdAtMs: createdAt,
  };
}

async function temporaryDatabaseHasConnections(adminClient, databaseName) {
  const { rows } = await adminClient.query(
    `SELECT pid
     FROM pg_stat_activity
     WHERE datname = $1
       AND pid <> pg_backend_pid()
     LIMIT 1`,
    [databaseName],
  );
  return rows.length > 0;
}

async function dropRunnerOwnedTemporaryDatabase(adminClient, databaseName, expectedMetadata) {
  const { rows } = await adminClient.query(
    `SELECT shobj_description(oid, 'pg_database') AS comment,
            pg_get_userbyid(datdba) = current_user AS owned_by_current_user
     FROM pg_database
     WHERE datname = $1`,
    [databaseName],
  );
  const metadata = parseRunnerOwnedTemporaryDatabase(databaseName, rows[0]?.comment);
  if (
    !metadata ||
    rows[0]?.owned_by_current_user !== true ||
    metadata.runId !== expectedMetadata.runId ||
    metadata.createdAt !== expectedMetadata.createdAt
  ) {
    return { dropped: false, reason: "runner ownership metadata is missing or changed" };
  }

  if (await temporaryDatabaseHasConnections(adminClient, databaseName)) {
    return { dropped: false, reason: "the database still has active connections" };
  }

  // The identifier must match the strict runner-owned name format before interpolation.
  await adminClient.query(`DROP DATABASE "${databaseName}"`);
  return { dropped: true };
}

export async function cleanupStaleTemporaryDatabases(
  adminClient,
  { now = Date.now(), retentionMs = temporaryDatabaseRetentionMs } = {},
) {
  if (!Number.isFinite(now) || !Number.isFinite(retentionMs) || retentionMs < 0) {
    throw new Error("Temporary database cleanup requires a valid time and retention period.");
  }

  const { rows } = await adminClient.query(
    `SELECT datname, shobj_description(oid, 'pg_database') AS comment,
            pg_get_userbyid(datdba) = current_user AS owned_by_current_user
     FROM pg_database
     WHERE NOT datistemplate
       AND datname <> current_database()`,
  );
  const removed = [];
  const active = [];
  for (const row of rows) {
    const metadata = parseRunnerOwnedTemporaryDatabase(row.datname, row.comment);
    if (
      !metadata ||
      row.owned_by_current_user !== true ||
      metadata.createdAtMs > now - retentionMs
    ) {
      continue;
    }

    const result = await dropRunnerOwnedTemporaryDatabase(adminClient, row.datname, metadata);
    if (result.dropped) {
      removed.push(row.datname);
    } else if (result.reason === "the database still has active connections") {
      active.push(row.datname);
    }
  }
  return { removed, active };
}

async function createRunnerOwnedTemporaryDatabase(adminClient, databaseName, runId, createdAt) {
  const nameMatch = temporaryDatabaseNamePattern.exec(databaseName);
  if (!nameMatch || nameMatch[1] !== runId) {
    throw new Error("Refusing to create a database outside the disposable runner naming guard.");
  }

  await adminClient.query(`CREATE DATABASE "${databaseName}"`);
  const comment = formatTemporaryDatabaseComment(runId, createdAt);
  try {
    await adminClient.query(
      `COMMENT ON DATABASE "${databaseName}" IS ${quoteSqlLiteral(comment)}`,
    );
  } catch (metadataError) {
    try {
      await adminClient.query(`DROP DATABASE "${databaseName}"`);
    } catch (cleanupError) {
      throw new AggregateError(
        [metadataError, cleanupError],
        `Could not record ownership metadata for ${databaseName}, and its cleanup also failed.`,
      );
    }
    throw metadataError;
  }
  return { runId, createdAt: new Date(createdAt).toISOString() };
}

function assertCheckedInMigrationSequence() {
  for (const [directory, journal] of [
    ["legacy", legacyMigrationJournal],
    ["stage2a", stage2aMigrationJournal],
  ]) {
    const migrationDirectory = resolve(workspaceRoot, `lib/db/migrations/${directory}`);
    const checkedInFiles = readdirSync(migrationDirectory)
      .filter((file) => /^\d+_.*\.sql$/.test(file))
      .sort();
    assert.deepEqual(
      checkedInFiles,
      journal.entries.map((entry) => `${entry.tag}.sql`),
      `The ${directory} migration journal must match its checked-in numbered SQL sequence`,
    );
  }
}

function expectedMigrationTimes() {
  return [...legacyMigrationJournal.entries, ...stage2aMigrationJournal.entries]
    .sort((left, right) => left.when - right.when)
    .map((entry) => String(entry.when));
}

async function captureDrizzleMigrationJournal(pool) {
  const { rows } = await pool.query(`
    SELECT id, created_at::text AS created_at, hash
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at, id
  `);
  return rows;
}

async function captureMigrationSchemaState(pool) {
  const { rows } = await pool.query(`
    SELECT 'relation' AS object_type, namespace.nspname AS schema_name,
           relation.relname AS object_name, relation.relkind::text AS details
    FROM pg_class AS relation
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname IN ('public', 'drizzle')
      AND relation.relkind IN ('r', 'p', 'v', 'm', 'S', 'i')
    UNION ALL
    SELECT 'constraint', namespace.nspname, constraint_row.conname,
           constraint_row.contype::text || ':' || pg_get_constraintdef(constraint_row.oid)
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS relation ON relation.oid = constraint_row.conrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname IN ('public', 'drizzle')
    UNION ALL
    SELECT 'routine', namespace.nspname,
           procedure.proname || '(' || pg_get_function_identity_arguments(procedure.oid) || ')',
           pg_get_functiondef(procedure.oid)
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname IN ('public', 'drizzle')
      AND procedure.prokind IN ('f', 'p')
    UNION ALL
    SELECT 'type', namespace.nspname, type_row.typname, type_row.typtype::text
    FROM pg_type AS type_row
    JOIN pg_namespace AS namespace ON namespace.oid = type_row.typnamespace
    WHERE namespace.nspname IN ('public', 'drizzle')
      AND type_row.typtype IN ('e', 'd')
    UNION ALL
    SELECT 'trigger', namespace.nspname,
           relation.relname || ':' || trigger_row.tgname,
           pg_get_triggerdef(trigger_row.oid)
    FROM pg_trigger AS trigger_row
    JOIN pg_class AS relation ON relation.oid = trigger_row.tgrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname IN ('public', 'drizzle')
      AND NOT trigger_row.tgisinternal
    ORDER BY object_type, schema_name, object_name, details
  `);
  return rows;
}

async function exerciseFailedMigrationRecovery(connectionString) {
  const pool = new Pool({ connectionString });
  const checkedInMigrations = resolve(workspaceRoot, "lib/db/migrations/stage2a");
  const temporaryMigrationDirectory = mkdtempSync(
    resolve(tmpdir(), "auto-research-stage2a-failed-migration-"),
  );

  try {
    await seedDemoVehicles(pool);
    const journalBeforeFailure = await captureDrizzleMigrationJournal(pool);
    const schemaBeforeFailure = await captureMigrationSchemaState(pool);
    const legacyDataBeforeFailure = await captureLegacyDatabaseState(pool);
    const temporaryMigrationFile = resolve(
      temporaryMigrationDirectory,
      `${stage2aMigrationJournal.entries.at(-1).tag}.sql`,
    );

    cpSync(checkedInMigrations, temporaryMigrationDirectory, { recursive: true });
    writeFileSync(
      temporaryMigrationFile,
      readFileSync(temporaryMigrationFile, "utf8") +
        "\n--> statement-breakpoint\nSELECT 1 / 0;\n",
    );

    // Drizzle wraps pending PostgreSQL migrations and their journal writes in one transaction.
    // Simulate a SQL failure, assert that transaction leaves the legacy database untouched,
    // then retry through the same CLI command used for a normal deployment migration.
    let injectedFailure;
    try {
      await migrate(drizzle(pool), {
        migrationsFolder: temporaryMigrationDirectory,
        migrationsSchema: "drizzle",
      });
    } catch (error) {
      injectedFailure = error;
    }
    assert(injectedFailure, "The disposable migration must fail at the injected SQL statement");
    const postgresFailure = injectedFailure.cause ?? injectedFailure;
    assert.equal(
      postgresFailure.code,
      "22012",
      `The injected migration failure must be a PostgreSQL division-by-zero error: ${postgresFailure.message}`,
    );
    assert.match(postgresFailure.message, /division by zero/i);

    assert.deepEqual(
      await captureDrizzleMigrationJournal(pool),
      journalBeforeFailure,
      "A failed migration must not add or alter migration-journal entries",
    );
    assert.deepEqual(
      await captureMigrationSchemaState(pool),
      schemaBeforeFailure,
      "A failed migration must leave every schema object in its pre-migration state",
    );
    assert.deepEqual(
      await captureLegacyDatabaseState(pool),
      legacyDataBeforeFailure,
      "A failed migration must preserve every legacy row and relationship",
    );

    await runCommand(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate"],
      {
        ...process.env,
        DATABASE_URL: connectionString,
        NODE_ENV: "test",
      },
    );
    assert.deepEqual(
      (await captureDrizzleMigrationJournal(pool)).map((row) => row.created_at),
      expectedMigrationTimes(),
      "Retrying the checked-in migration after failure must apply each migration exactly once",
    );
    assert.deepEqual(
      await captureLegacyDatabaseState(pool),
      legacyDataBeforeFailure,
      "Recovering from a failed migration must preserve every legacy profile, ID, slug, relationship, and demo classification",
    );
    await assertStage2aIdentityBackfill(pool);
    await runStage2aConstraintChecks(pool);
    console.log(
      "Disposable failed-migration recovery passed: no schema or journal changes on failure, " +
        "then a clean retry applied the checked-in Stage 2A migrations without changing any " +
        "of the 13 demo profiles, IDs, slugs, relationships, or demo classifications.",
    );
  } finally {
    await pool.end();
    rmSync(temporaryMigrationDirectory, { recursive: true, force: true });
  }
}

async function waitForInterruptedMigration(pool, databaseName, child) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("The migration process exited before reaching its controlled pause.");
    }
    const { rows } = await pool.query(
      `SELECT pid
       FROM pg_stat_activity
       WHERE datname = $1
         AND pid <> pg_backend_pid()
         AND state = 'active'
         AND position('pg_sleep(' IN query) > 0
       ORDER BY query_start DESC
       LIMIT 1`,
      [databaseName],
    );
    if (rows[0]) return rows[0].pid;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  throw new Error("The migration process did not reach its controlled PostgreSQL pause.");
}

async function waitForBackendExit(pool, backendPid) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const { rows } = await pool.query(
      "SELECT 1 FROM pg_stat_activity WHERE pid = $1",
      [backendPid],
    );
    if (rows.length === 0) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  throw new Error(`Interrupted PostgreSQL migration backend ${backendPid} did not exit.`);
}

async function exerciseInterruptedMigrationRecovery(connectionString) {
  const pool = new Pool({ connectionString });
  const databaseName = new URL(connectionString).pathname.slice(1);
  const checkedInMigrations = resolve(workspaceRoot, "lib/db/migrations/stage2a");
  const temporaryMigrationDirectory = mkdtempSync(
    resolve(tmpdir(), "auto-research-stage2a-interrupted-migration-"),
  );
  let child;
  let childClose;

  try {
    await seedDemoVehicles(pool);
    const journalBeforeInterruption = await captureDrizzleMigrationJournal(pool);
    const schemaBeforeInterruption = await captureMigrationSchemaState(pool);
    const legacyDataBeforeInterruption = await captureLegacyDatabaseState(pool);

    cpSync(checkedInMigrations, temporaryMigrationDirectory, { recursive: true });
    const firstMigrationFile = resolve(
      temporaryMigrationDirectory,
      `${stage2aMigrationJournal.entries[0].tag}.sql`,
    );
    writeFileSync(
      firstMigrationFile,
      readFileSync(firstMigrationFile, "utf8") +
        "\n--> statement-breakpoint\nSELECT pg_sleep(3);\n",
    );

    const migrationProcessSource = `
      import pg from "pg";
      import { drizzle } from "drizzle-orm/node-postgres";
      import { migrate } from "drizzle-orm/node-postgres/migrator";
      const pool = new pg.Pool({
        connectionString: process.env.INTERRUPTION_TEST_DATABASE_URL,
      });
      try {
        await migrate(drizzle(pool), {
          migrationsFolder: process.env.INTERRUPTION_MIGRATIONS_FOLDER,
          migrationsSchema: "drizzle",
        });
      } finally {
        await pool.end();
      }
    `;
    child = spawn(
      process.execPath,
      ["--input-type=module", "-e", migrationProcessSource],
      {
        cwd: resolve(workspaceRoot, "lib/db"),
        env: {
          ...process.env,
          INTERRUPTION_TEST_DATABASE_URL: connectionString,
          INTERRUPTION_MIGRATIONS_FOLDER: temporaryMigrationDirectory,
        },
        stdio: "inherit",
      },
    );
    childClose = new Promise((resolvePromise, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolvePromise({ code, signal }));
    });

    const backendPid = await waitForInterruptedMigration(pool, databaseName, child);
    child.kill("SIGKILL");
    const exit = await childClose;
    assert.equal(exit.signal, "SIGKILL", "The migration process must be forcibly interrupted");
    await waitForBackendExit(pool, backendPid);

    assert.deepEqual(
      await captureDrizzleMigrationJournal(pool),
      journalBeforeInterruption,
      "An interrupted migration must not add or alter migration-journal entries",
    );
    assert.deepEqual(
      await captureMigrationSchemaState(pool),
      schemaBeforeInterruption,
      "An interrupted migration must roll back every schema object created before the pause",
    );
    assert.deepEqual(
      await captureLegacyDatabaseState(pool),
      legacyDataBeforeInterruption,
      "An interrupted migration must preserve every seeded legacy row and relationship",
    );

    await runCommandWithCapturedOutput(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate"],
      {
        ...process.env,
        DATABASE_URL: connectionString,
        NODE_ENV: "test",
      },
    );
    const journalAfterRetry = await captureDrizzleMigrationJournal(pool);
    assert.deepEqual(
      journalAfterRetry.map((row) => row.created_at),
      expectedMigrationTimes(),
      "Retrying after process interruption must apply each checked-in migration exactly once",
    );
    assert.deepEqual(
      await captureLegacyDatabaseState(pool),
      legacyDataBeforeInterruption,
      "Retrying an interrupted migration must preserve every legacy profile and relationship",
    );
    await assertStage2aIdentityBackfill(pool);
    await runStage2aConstraintChecks(pool);

    const schemaAfterRetry = await captureMigrationSchemaState(pool);
    await runCommandWithCapturedOutput(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate"],
      {
        ...process.env,
        DATABASE_URL: connectionString,
        NODE_ENV: "test",
      },
    );
    assert.deepEqual(
      await captureDrizzleMigrationJournal(pool),
      journalAfterRetry,
      "A second normal migration run must not duplicate or alter journal entries",
    );
    assert.deepEqual(
      await captureMigrationSchemaState(pool),
      schemaAfterRetry,
      "A second normal migration run must not duplicate or alter schema objects",
    );
    console.log(
      "Disposable interrupted-migration recovery passed: killing the migrator during " +
        "uncommitted Stage 2A DDL left schema, journal, and legacy data unchanged; " +
        "the normal migration command then completed and was a no-op on retry.",
    );
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      if (childClose) await childClose.catch(() => {});
    }
    await pool.end();
    rmSync(temporaryMigrationDirectory, { recursive: true, force: true });
  }
}

async function exerciseCommittedPrefixMigrationRecovery(connectionString, { sqlFailure = false } = {}) {
  const pool = new Pool({ connectionString });
  const databaseName = new URL(connectionString).pathname.slice(1);
  const checkedInMigrations = resolve(workspaceRoot, "lib/db/migrations/stage2a");
  const temporaryMigrationDirectory = mkdtempSync(
    resolve(tmpdir(), "auto-research-stage2a-committed-prefix-recovery-"),
  );
  let child;
  let childClose;

  try {
    await seedDemoVehicles(pool);
    const firstStage2aEntry = stage2aMigrationJournal.entries[0];
    const firstStage2aSql = readFileSync(
      resolve(checkedInMigrations, `${firstStage2aEntry.tag}.sql`),
      "utf8",
    );
    const committedPrefixDirectory = resolve(temporaryMigrationDirectory, "committed-prefix");
    mkdirSync(resolve(committedPrefixDirectory, "meta"), { recursive: true });
    writeFileSync(
      resolve(committedPrefixDirectory, `${firstStage2aEntry.tag}.sql`),
      firstStage2aSql,
    );
    writeFileSync(
      resolve(committedPrefixDirectory, "meta/_journal.json"),
      JSON.stringify(
        {
          ...stage2aMigrationJournal,
          entries: [firstStage2aEntry],
        },
        null,
        2,
      ),
    );
    await migrate(drizzle(pool), {
      migrationsFolder: committedPrefixDirectory,
      migrationsSchema: "drizzle",
    });

    const journalAfterFirstStage2aMigration = await captureDrizzleMigrationJournal(pool);
    const expectedCommittedPrefixTimes = expectedMigrationTimes().slice(
      0,
      legacyMigrationJournal.entries.length + 1,
    );
    assert.deepEqual(
      journalAfterFirstStage2aMigration.map((row) => row.created_at),
      expectedCommittedPrefixTimes,
      "The first Stage 2A migration must commit while later Stage 2A migrations remain pending",
    );
    assert.equal(
      journalAfterFirstStage2aMigration.at(-1)?.hash,
      sha256(firstStage2aSql),
      "The committed Stage 2A journal entry must identify the checked-in first migration",
    );

    const schemaAfterFirstStage2aMigration = await captureMigrationSchemaState(pool);
    assert.ok(
      schemaAfterFirstStage2aMigration.some(
        (object) =>
          object.object_type === "relation" && object.object_name === "research_claims",
      ),
      "The first Stage 2A migration must leave its schema objects committed",
    );
    const legacyDataAfterFirstStage2aMigration = await captureLegacyDatabaseState(pool);
    assert.equal(
      schemaAfterFirstStage2aMigration.filter(
        (object) => object.object_type === "routine" &&
          object.object_name.startsWith("stage2a_reject_history_mutation("),
      ).length,
      0,
      "The later migration's function must not exist in the committed prefix",
    );

    cpSync(checkedInMigrations, temporaryMigrationDirectory, { recursive: true });
    const interruptedMigrationEntry = stage2aMigrationJournal.entries[1];
    const interruptedMigrationFile = resolve(
      temporaryMigrationDirectory,
      `${interruptedMigrationEntry.tag}.sql`,
    );
    const interruptedMigrationSql = readFileSync(interruptedMigrationFile, "utf8");
    const statementBreakpoint = "--> statement-breakpoint";
    const firstBreakpoint = interruptedMigrationSql.indexOf(statementBreakpoint);
    assert.notEqual(
      firstBreakpoint,
      -1,
      "The later migration must include an opening statement boundary",
    );
    const secondBreakpoint = interruptedMigrationSql.indexOf(
      statementBreakpoint,
      firstBreakpoint + statementBreakpoint.length,
    );
    assert.notEqual(
      secondBreakpoint,
      -1,
      "The later migration must include a statement boundary after its opening DDL",
    );
    writeFileSync(
      interruptedMigrationFile,
      `${interruptedMigrationSql.slice(0, secondBreakpoint)}\n` +
        `${statementBreakpoint}\n` +
        (sqlFailure
          ? `DO $fault$
BEGIN
  IF to_regprocedure('public.stage2a_reject_history_mutation()') IS NULL THEN
    RAISE EXCEPTION 'Expected later migration DDL before injected failure';
  END IF;
  PERFORM 1 / 0;
END
$fault$;\n`
          : "SELECT pg_sleep(3);\n") +
        interruptedMigrationSql.slice(secondBreakpoint),
    );

    if (sqlFailure) {
      let injectedFailure;
      try {
        await migrate(drizzle(pool), {
          migrationsFolder: temporaryMigrationDirectory,
          migrationsSchema: "drizzle",
        });
      } catch (error) {
        injectedFailure = error;
      }
      assert(injectedFailure, "The later migration must fail after running its opening DDL");
      const postgresFailure = injectedFailure.cause ?? injectedFailure;
      assert.equal(postgresFailure.code, "22012", postgresFailure.message);
      assert.match(postgresFailure.message, /division by zero/i);
    } else {
      const migrationProcessSource = `
        import pg from "pg";
        import { drizzle } from "drizzle-orm/node-postgres";
        import { migrate } from "drizzle-orm/node-postgres/migrator";
        const pool = new pg.Pool({
          connectionString: process.env.INTERRUPTION_TEST_DATABASE_URL,
        });
        try {
          await migrate(drizzle(pool), {
            migrationsFolder: process.env.INTERRUPTION_MIGRATIONS_FOLDER,
            migrationsSchema: "drizzle",
          });
        } finally {
          await pool.end();
        }
      `;
      child = spawn(
        process.execPath,
        ["--input-type=module", "-e", migrationProcessSource],
        {
          cwd: resolve(workspaceRoot, "lib/db"),
          env: {
            ...process.env,
            INTERRUPTION_TEST_DATABASE_URL: connectionString,
            INTERRUPTION_MIGRATIONS_FOLDER: temporaryMigrationDirectory,
          },
          stdio: "inherit",
        },
      );
      childClose = new Promise((resolvePromise, reject) => {
        child.once("error", reject);
        child.once("close", (code, signal) => resolvePromise({ code, signal }));
      });

      const backendPid = await waitForInterruptedMigration(pool, databaseName, child);
      child.kill("SIGKILL");
      const exit = await childClose;
      assert.equal(exit.signal, "SIGKILL", "The later migration process must be interrupted");
      await waitForBackendExit(pool, backendPid);
    }

    const journalAfterInterruption = await captureDrizzleMigrationJournal(pool);
    assert.deepEqual(
      journalAfterInterruption,
      journalAfterFirstStage2aMigration,
      "Failure must preserve the committed first Stage 2A journal entry and add no later entry",
    );
    const schemaAfterInterruption = await captureMigrationSchemaState(pool);
    assert.deepEqual(
      schemaAfterInterruption,
      schemaAfterFirstStage2aMigration,
      "Failure must preserve first-migration schema and roll back all later migration DDL",
    );
    assert.equal(
      schemaAfterInterruption.filter(
        (object) =>
          object.object_type === "routine" &&
          object.object_name.startsWith("stage2a_reject_history_mutation("),
      ).length,
      0,
      "The failed later migration must leave no uncommitted function behind",
    );
    assert.deepEqual(
      await captureLegacyDatabaseState(pool),
      legacyDataAfterFirstStage2aMigration,
      "Failure must preserve every legacy row and relationship",
    );

    await runCommandWithCapturedOutput(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate"],
      {
        ...process.env,
        DATABASE_URL: connectionString,
        NODE_ENV: "test",
      },
    );
    const journalAfterRetry = await captureDrizzleMigrationJournal(pool);
    assert.deepEqual(
      journalAfterRetry.map((row) => row.created_at),
      expectedMigrationTimes(),
      "Retry must apply every checked-in migration exactly once after the committed prefix",
    );
    assert.deepEqual(
      journalAfterRetry.slice(0, journalAfterFirstStage2aMigration.length),
      journalAfterFirstStage2aMigration,
      "Retry must retain the original committed journal IDs, timestamps, and hashes",
    );
    assert.deepEqual(
      journalAfterRetry.map((row) => row.hash),
      [...legacyMigrationJournal.entries.map((entry) => sha256(readFileSync(
        resolve(workspaceRoot, `lib/db/migrations/legacy/${entry.tag}.sql`),
      ))), ...stage2aMigrationJournal.entries.map((entry) => sha256(readFileSync(
        resolve(checkedInMigrations, `${entry.tag}.sql`),
      )))],
      "Retry must record the checked-in SQL hashes, not the injected migration hash",
    );
    assert.deepEqual(
      await captureLegacyDatabaseState(pool),
      legacyDataAfterFirstStage2aMigration,
      "Retry must preserve every legacy profile and relationship",
    );
    await assertStage2aIdentityBackfill(pool);
    await runStage2aConstraintChecks(pool);

    const schemaAfterRetry = await captureMigrationSchemaState(pool);
    const schemaObjectKeys = schemaAfterRetry.map(
      (object) =>
        `${object.object_type}\u0000${object.schema_name}\u0000${object.object_name}`,
    );
    assert.equal(
      new Set(schemaObjectKeys).size,
      schemaObjectKeys.length,
      "The completed schema must contain each expected object exactly once",
    );
    assert.equal(
      schemaAfterRetry.filter(
        (object) =>
          object.object_type === "routine" &&
          object.object_name.startsWith("stage2a_reject_history_mutation("),
      ).length,
      1,
      "Retry must create the later migration's function exactly once",
    );

    await runCommandWithCapturedOutput(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate"],
      {
        ...process.env,
        DATABASE_URL: connectionString,
        NODE_ENV: "test",
      },
    );
    assert.deepEqual(
      await captureDrizzleMigrationJournal(pool),
      journalAfterRetry,
      "A second normal migration run must not duplicate or alter the recovered journal",
    );
    assert.deepEqual(
      await captureMigrationSchemaState(pool),
      schemaAfterRetry,
      "A second normal migration run must not duplicate or alter the recovered schema",
    );
    assert.deepEqual(
      await captureLegacyDatabaseState(pool),
      legacyDataAfterFirstStage2aMigration,
      "A second normal migration run must preserve legacy data",
    );
    console.log(
      `Disposable committed-prefix ${sqlFailure ? "SQL-error" : "interruption"} recovery passed: the first Stage 2A ` +
        "migration remained committed, later DDL rolled back on failure, and the " +
        "normal migration command resumed each remaining migration exactly once.",
    );
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      if (childClose) await childClose.catch(() => {});
    }
    await pool.end();
    rmSync(temporaryMigrationDirectory, { recursive: true, force: true });
  }
}

export function parseSafeTestDatabaseUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl ?? "");
  } catch {
    throw new Error(
      "Set AUTO_RESEARCH_TEST_DATABASE_URL to a local PostgreSQL URL for the auto_research_test database.",
    );
  }

  const allowedHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  let databaseName = "";
  try {
    databaseName = decodeURIComponent(url.pathname.slice(1));
  } catch {
    // Keep malformed paths on the same fail-closed path as unsafe targets.
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !allowedHosts.has(url.hostname.toLowerCase()) ||
    databaseName !== "auto_research_test" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(
      "AUTO_RESEARCH_TEST_DATABASE_URL must point to a local PostgreSQL database named exactly auto_research_test and must not include query options or a fragment.",
    );
  }

  return { connectionString: rawUrl, databaseName };
}

export function getSafeTestDatabaseUrl(environment = process.env) {
  return parseSafeTestDatabaseUrl(environment.AUTO_RESEARCH_TEST_DATABASE_URL);
}

function runCommand(command, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} exited with ${signal ?? `code ${code}`}.`,
          ),
        );
      }
    });
  });
}

function runCommandWithCapturedOutput(command, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      const output = Buffer.concat([...stdout, ...stderr]).toString("utf8").trim();
      reject(
        new Error(
          `${command} ${args.join(" ")} exited with ${signal ?? `code ${code}`}.` +
          (output ? `\n${output}` : ""),
        ),
      );
    });
  });
}

async function findFreePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not reserve a local API port.");
  }
  await new Promise((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
  return address.port;
}

async function waitForApi(apiUrl, serverProcess) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error("The temporary Auto Research API server stopped before it became ready.");
    }
    try {
      const response = await fetch(`${apiUrl}/vehicles?limit=1`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // The server may still be building its first database connection.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error("The temporary Auto Research API server did not become ready.");
}

async function startApiServer(connectionString, profileReadMode) {
  const port = await findFreePort();
  const serverProcess = spawn(
    process.execPath,
    ["--enable-source-maps", resolve(workspaceRoot, "artifacts/api-server/dist/index.mjs")],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
        NODE_ENV: "development",
        AUTO_RESEARCH_PROFILE_READ_MODE: profileReadMode,
        PORT: String(port),
      },
      stdio: "inherit",
    },
  );
  const apiBaseUrl = `http://127.0.0.1:${port}/api`;
  await waitForApi(apiBaseUrl, serverProcess);
  return { serverProcess, apiBaseUrl };
}

function apiSnapshotPaths() {
  const slugs = demoBaseline.tables.trims.map((trim) => trim.slug);
  return [
    "/catalog/options",
    "/vehicles?limit=100",
    "/vehicles?makeSlug=ford&model=F-150&year=2024&limit=100",
    "/vehicles/popular",
    "/vehicles/trending",
    "/makes",
    "/discovery/stats",
    ...slugs.flatMap((slug) => [
      `/vehicles/${encodeURIComponent(slug)}`,
      `/owner-reports?vehicleId=${encodeURIComponent(slug)}`,
    ]),
    "/vehicles/not-a-legacy-profile",
    "/owner-reports?vehicleId=not-a-legacy-profile",
  ];
}

async function captureApiSnapshot(apiBaseUrl) {
  const snapshot = [];
  for (const path of apiSnapshotPaths()) {
    const response = await fetch(`${apiBaseUrl}${path}`);
    const bodyText = await response.text();
    let body = bodyText;
    try {
      body = JSON.parse(bodyText);
    } catch {
      // Preserve non-JSON error bodies exactly.
    }
    snapshot.push({
      path,
      status: response.status,
      contentType: response.headers.get("content-type"),
      body,
    });
  }
  return snapshot;
}

function databaseCliEnvironment(connectionString, databaseName) {
  const url = new URL(connectionString);
  return {
    ...process.env,
    PGHOST: url.hostname.replace(/^\[|\]$/g, ""),
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: databaseName,
  };
}

function captureCommandBuffer(command, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      env,
      stdio: ["ignore", "pipe", "inherit"],
    });
    const chunks = [];
    let outputBytes = 0;
    child.stdout.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > 100 * 1024 * 1024) {
        child.kill("SIGKILL");
        reject(new Error(`${command} output exceeded the 100 MiB disposable test limit.`));
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} exited with ${signal ?? `code ${code}`}.`));
        return;
      }
      resolvePromise(Buffer.concat(chunks));
    });
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function encryptDisposableArchive(archive, backupDirectory) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encryptedPayload = Buffer.concat([cipher.update(archive), cipher.final()]);
  const encrypted = Buffer.concat([
    Buffer.from("AR2A"),
    iv,
    cipher.getAuthTag(),
    encryptedPayload,
  ]);
  const encryptedPath = resolve(backupDirectory, "legacy-demo-baseline.dump.enc");
  writeFileSync(encryptedPath, encrypted, { mode: 0o600 });
  chmodSync(encryptedPath, 0o600);
  return {
    encryptedPath,
    key,
    encryptedSha256: sha256(encrypted),
    archiveSha256: sha256(archive),
  };
}

function readAndDecryptDisposableArchive(backup) {
  const encrypted = readFileSync(backup.encryptedPath);
  assert.equal(sha256(encrypted), backup.encryptedSha256, "Encrypted baseline checksum must match");
  assert.equal(encrypted.subarray(0, 4).toString(), "AR2A", "Encrypted baseline format header must match");
  const iv = encrypted.subarray(4, 16);
  const authTag = encrypted.subarray(16, 32);
  const decipher = createDecipheriv("aes-256-gcm", backup.key, iv);
  decipher.setAuthTag(authTag);
  const archive = Buffer.concat([
    decipher.update(encrypted.subarray(32)),
    decipher.final(),
  ]);
  assert.equal(sha256(archive), backup.archiveSha256, "Restored archive checksum must match");
  return archive;
}

async function seedDemoVehicles(pool) {
  if (
    demoBaseline.format !== "auto-research-demo-baseline.v1" ||
    demoBaseline.classification !== "demo_fixture" ||
    demoBaseline.tables?.trims?.length !== 13
  ) {
    throw new Error("The checked-in Auto Research demo baseline must contain all 13 demo profiles.");
  }

  const ownerReportFixtureFields = {
    display_name: "Synthetic demo test owner",
    ownership_months: 12,
    miles_driven: 10_000,
    rating: 4,
    title: "Synthetic demo test report",
    body: "Synthetic test fixture only; not an actual owner submission.",
    reported_problem: null,
  };
  const tables = demoBaseline.tables;
  for (const [table, rows] of Object.entries(tables)) {
    if (!Array.isArray(rows) || demoBaseline.counts[table] !== rows.length) {
      throw new Error(`The checked-in Auto Research baseline has an inconsistent ${table} count.`);
    }
  }

  const seedTables = [
    ["makes", ["id", "name", "slug", "mark", "origin"], tables.makes],
    ["models", ["id", "make_id", "name", "slug"], tables.models],
    ["generations", ["id", "model_id", "name", "start_year", "end_year", "body_type"], tables.generations],
    ["model_years", ["id", "generation_id", "year", "fuel_type"], tables.model_years],
    ["engines", ["id", "model_year_id", "name", "horsepower", "fuel_type", "availability"], tables.engines],
    ["transmissions", ["id", "model_year_id", "name", "gears", "availability"], tables.transmissions],
    [
      "trims",
      [
        "id", "model_year_id", "engine_id", "transmission_id", "name", "slug", "drivetrain",
        "fuel_type", "mpg_city", "mpg_highway", "mpg_combined", "horsepower", "price_usd",
        "research_rank", "image_key", "is_demo",
      ],
      tables.trims,
    ],
    [
      "ownership_estimates",
      [
        "id", "trim_id", "reliability_score", "reliability_label", "reliability_note",
        "annual_ownership_usd", "annual_maintenance_usd", "annual_repair_usd", "annual_fuel_usd",
        "annual_insurance_usd", "five_year_depreciation_percent", "expected_lifespan_miles", "is_demo",
      ],
      tables.ownership_estimates,
    ],
    [
      "maintenance_items",
      ["id", "trim_id", "item", "interval_miles", "estimated_cost_usd", "is_demo"],
      tables.maintenance_items,
    ],
    [
      "common_problems",
      [
        "id", "model_year_id", "engine_id", "title", "description", "typical_mileage_start",
        "typical_mileage_end", "repair_cost_low_usd", "repair_cost_high_usd", "severity", "is_demo",
      ],
      tables.common_problems,
    ],
    [
      "owner_reports",
      [
        "id", "trim_id", "display_name", "ownership_months", "miles_driven", "rating", "title",
        "body", "reported_problem", "is_demo", "created_at",
      ],
      tables.owner_reports.map((row) => ({ ...ownerReportFixtureFields, ...row })),
    ],
  ];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [table, columns, rows] of seedTables) {
      for (const row of rows) {
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
        const values = columns.map((column) => row[column]);
        await client.query(
          `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
          values,
        );
      }
    }

    for (const [table] of seedTables) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM ${table}`,
      );
    }

    const identityTables = [
      ["makes", ["id", "slug"], tables.makes],
      ["models", ["id", "make_id"], tables.models],
      ["generations", ["id", "model_id"], tables.generations],
      ["model_years", ["id", "generation_id"], tables.model_years],
      ["engines", ["id", "model_year_id"], tables.engines],
      ["transmissions", ["id", "model_year_id"], tables.transmissions],
      ["trims", ["id", "model_year_id", "engine_id", "transmission_id", "slug", "is_demo"], tables.trims],
      ["ownership_estimates", ["id", "trim_id", "is_demo"], tables.ownership_estimates],
      ["maintenance_items", ["id", "trim_id", "is_demo"], tables.maintenance_items],
      ["common_problems", ["id", "model_year_id", "engine_id", "is_demo"], tables.common_problems],
      ["owner_reports", ["id", "trim_id", "is_demo"], tables.owner_reports],
      ["recalls", ["id", "model_year_id", "is_demo", "is_verified"], tables.recalls],
      ["safety_ratings", ["id", "model_year_id", "is_demo", "is_verified"], tables.safety_ratings],
    ];

    for (const [table, columns, expectedRows] of identityTables) {
      const actual = await client.query(
        `SELECT ${columns.join(", ")} FROM ${table} ORDER BY id`,
      );
      assert.deepEqual(
        actual.rows,
        expectedRows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column]]))),
        `Disposable ${table} IDs and legacy relationships must match the checked-in demo baseline`,
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function stopServer(serverProcess) {
  if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) return;
  serverProcess.kill("SIGTERM");
  let timeout;
  await Promise.race([
    once(serverProcess, "exit"),
    new Promise((resolvePromise) => {
      timeout = setTimeout(resolvePromise, 5_000);
      timeout.unref();
    }),
  ]);
  clearTimeout(timeout);
  if (serverProcess.exitCode === null && serverProcess.signalCode === null) {
    serverProcess.kill("SIGKILL");
    await once(serverProcess, "exit");
  }
}

async function main() {
  assertCheckedInMigrationSequence();
  await runCommand(
    "pnpm",
    ["--filter", "@workspace/scripts", "run", "test:auto-research:safety"],
    process.env,
  );
  await runCommand(
    "pnpm",
    ["--filter", "@workspace/scripts", "run", "test:auto-research:stage2a-unit"],
    process.env,
  );

  const { connectionString, databaseName } = getSafeTestDatabaseUrl(process.env);
  let adminClient;
  let baselinePool;
  let migratedPool;
  let serverProcess;
  let backupDirectory;
  let encryptedBackup;
  let runId;
  let runCreatedAt;
  const temporaryDatabases = [];

  try {
    adminClient = new Client({ connectionString });
    await adminClient.connect();
    const selectedDatabase = await adminClient.query("SELECT current_database() AS name");
    if (selectedDatabase.rows[0]?.name !== databaseName) {
      throw new Error("The test database URL did not select the expected local test database.");
    }

    const staleCleanup = await cleanupStaleTemporaryDatabases(adminClient);
    if (staleCleanup.removed.length > 0) {
      console.log(
        `Removed stale disposable migration databases: ${staleCleanup.removed.join(", ")}`,
      );
    }
    if (staleCleanup.active.length > 0) {
      console.log(
        `Preserved stale runner-owned databases with active connections: ${staleCleanup.active.join(", ")}`,
      );
    }

    runId = `${process.pid}_${randomBytes(4).toString("hex")}`;
    runCreatedAt = new Date();
    if (process.argv.includes("--failed-migration-recovery-only")) {
      const failedMigrationDatabase = `auto_research_stage2a_failure_${runId}`;
      await createRunnerOwnedTemporaryDatabase(
        adminClient,
        failedMigrationDatabase,
        runId,
        runCreatedAt,
      );
      temporaryDatabases.push(failedMigrationDatabase);

      const failedMigrationUrl = new URL(connectionString);
      failedMigrationUrl.pathname = `/${failedMigrationDatabase}`;
      const failedMigrationConnectionString = failedMigrationUrl.toString();
      await runCommand(
        "pnpm",
        ["--filter", "@workspace/db", "run", "migrate:legacy"],
        {
          ...process.env,
          DATABASE_URL: failedMigrationConnectionString,
          NODE_ENV: "test",
        },
      );
      await exerciseFailedMigrationRecovery(failedMigrationConnectionString);
      return;
    }

    if (process.argv.includes("--interrupted-migration-recovery-only")) {
      const interruptedMigrationDatabase = `auto_research_stage2a_interrupted_${runId}`;
      await createRunnerOwnedTemporaryDatabase(
        adminClient,
        interruptedMigrationDatabase,
        runId,
        runCreatedAt,
      );
      temporaryDatabases.push(interruptedMigrationDatabase);

      const interruptedMigrationUrl = new URL(connectionString);
      interruptedMigrationUrl.pathname = `/${interruptedMigrationDatabase}`;
      const interruptedMigrationConnectionString = interruptedMigrationUrl.toString();
      await runCommand(
        "pnpm",
        ["--filter", "@workspace/db", "run", "migrate:legacy"],
        {
          ...process.env,
          DATABASE_URL: interruptedMigrationConnectionString,
          NODE_ENV: "test",
        },
      );
      await exerciseInterruptedMigrationRecovery(interruptedMigrationConnectionString);
      return;
    }

    if (
      process.argv.includes("--committed-migration-recovery-only") ||
      process.argv.includes("--committed-sql-error-recovery-only")
    ) {
      const sqlFailure = process.argv.includes("--committed-sql-error-recovery-only");
      const resumedMigrationDatabase = `auto_research_stage2a_${sqlFailure ? "sql_resumed" : "resumed"}_${runId}`;
      await createRunnerOwnedTemporaryDatabase(
        adminClient,
        resumedMigrationDatabase,
        runId,
        runCreatedAt,
      );
      temporaryDatabases.push(resumedMigrationDatabase);

      const resumedMigrationUrl = new URL(connectionString);
      resumedMigrationUrl.pathname = `/${resumedMigrationDatabase}`;
      const resumedMigrationConnectionString = resumedMigrationUrl.toString();
      await runCommand(
        "pnpm",
        ["--filter", "@workspace/db", "run", "migrate:legacy"],
        {
          ...process.env,
          DATABASE_URL: resumedMigrationConnectionString,
          NODE_ENV: "test",
        },
      );
      await exerciseCommittedPrefixMigrationRecovery(
        resumedMigrationConnectionString,
        { sqlFailure },
      );
      return;
    }

    const baselineDatabase = `auto_research_stage2a_baseline_${runId}`;
    const migratedDatabase = `auto_research_stage2a_migrated_${runId}`;
    const failedMigrationDatabase = `auto_research_stage2a_failure_${runId}`;
    const interruptedMigrationDatabase = `auto_research_stage2a_interrupted_${runId}`;
    const resumedMigrationDatabase = `auto_research_stage2a_resumed_${runId}`;
    const sqlResumedMigrationDatabase = `auto_research_stage2a_sql_resumed_${runId}`;
    for (const name of [
      baselineDatabase,
      migratedDatabase,
      failedMigrationDatabase,
      interruptedMigrationDatabase,
      resumedMigrationDatabase,
      sqlResumedMigrationDatabase,
    ]) {
      try {
        await createRunnerOwnedTemporaryDatabase(adminClient, name, runId, runCreatedAt);
        temporaryDatabases.push(name);
      } catch (error) {
        throw new Error(
          "Could not create and mark the disposable migration database. Ensure the local auto_research_test role has CREATEDB permission.",
          { cause: error },
        );
      }
    }

    const baselineUrl = new URL(connectionString);
    baselineUrl.pathname = `/${baselineDatabase}`;
    const baselineConnectionString = baselineUrl.toString();
    const migratedUrl = new URL(connectionString);
    migratedUrl.pathname = `/${migratedDatabase}`;
    const migratedConnectionString = migratedUrl.toString();
    const failedMigrationUrl = new URL(connectionString);
    failedMigrationUrl.pathname = `/${failedMigrationDatabase}`;
    const failedMigrationConnectionString = failedMigrationUrl.toString();
    const interruptedMigrationUrl = new URL(connectionString);
    interruptedMigrationUrl.pathname = `/${interruptedMigrationDatabase}`;
    const interruptedMigrationConnectionString = interruptedMigrationUrl.toString();
    const resumedMigrationUrl = new URL(connectionString);
    resumedMigrationUrl.pathname = `/${resumedMigrationDatabase}`;
    const resumedMigrationConnectionString = resumedMigrationUrl.toString();
    const sqlResumedMigrationUrl = new URL(connectionString);
    sqlResumedMigrationUrl.pathname = `/${sqlResumedMigrationDatabase}`;
    const sqlResumedMigrationConnectionString = sqlResumedMigrationUrl.toString();
    const baselineEnv = {
      ...process.env,
      DATABASE_URL: baselineConnectionString,
      NODE_ENV: "test",
    };
    const failedMigrationEnv = {
      ...process.env,
      DATABASE_URL: failedMigrationConnectionString,
      NODE_ENV: "test",
    };
    const interruptedMigrationEnv = {
      ...process.env,
      DATABASE_URL: interruptedMigrationConnectionString,
      NODE_ENV: "test",
    };
    const resumedMigrationEnv = {
      ...process.env,
      DATABASE_URL: resumedMigrationConnectionString,
      NODE_ENV: "test",
    };

    await runCommand(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate:legacy"],
      baselineEnv,
    );
    await runCommand(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate:legacy"],
      failedMigrationEnv,
    );
    await runCommand(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate:legacy"],
      interruptedMigrationEnv,
    );
    await runCommand(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate:legacy"],
      resumedMigrationEnv,
    );
    await runCommand(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate:legacy"],
      {
        ...process.env,
        DATABASE_URL: sqlResumedMigrationConnectionString,
        NODE_ENV: "test",
      },
    );

    baselinePool = new Pool({ connectionString: baselineConnectionString });
    await seedDemoVehicles(baselinePool);
    await exerciseFailedMigrationRecovery(failedMigrationConnectionString);
    await exerciseInterruptedMigrationRecovery(interruptedMigrationConnectionString);
    await exerciseCommittedPrefixMigrationRecovery(
      resumedMigrationConnectionString,
    );
    await exerciseCommittedPrefixMigrationRecovery(
      sqlResumedMigrationConnectionString,
      { sqlFailure: true },
    );
    const baselineLegacyState = await captureLegacyDatabaseState(baselinePool);
    const baselineLegacySchema = await captureLegacySchemaCatalog(baselinePool);
    const legacySchemaRevision = sha256(
      readFileSync(resolve(workspaceRoot, "lib/db/migrations/legacy/0000_legacy_baseline.sql")),
    );
    console.log(
      `Disposable legacy baseline schema SHA-256=${legacySchemaRevision}; ` +
      `table counts=${JSON.stringify(Object.fromEntries(
        Object.entries(baselineLegacyState).map(([table, rows]) => [table, rows.length]),
      ))}`,
    );

    await runCommand(
      "pnpm",
      ["--filter", "@workspace/api-server", "run", "build"],
      baselineEnv,
    );

    let apiServer = await startApiServer(baselineConnectionString, "legacy");
    serverProcess = apiServer.serverProcess;
    const baselineApiSnapshot = await captureApiSnapshot(apiServer.apiBaseUrl);
    await runCommand(
      "pnpm",
      ["--filter", "@workspace/scripts", "run", "test:auto-research:checks"],
      {
        ...baselineEnv,
        AUTO_RESEARCH_API_BASE_URL: apiServer.apiBaseUrl,
      },
    );
    await stopServer(serverProcess);
    serverProcess = undefined;

    apiServer = await startApiServer(baselineConnectionString, "catalog");
    serverProcess = apiServer.serverProcess;
    assert.deepEqual(
      await captureApiSnapshot(apiServer.apiBaseUrl),
      baselineApiSnapshot,
      "A catalog-read server must retain legacy behavior when the Stage 2A alias table is absent",
    );
    await stopServer(serverProcess);
    serverProcess = undefined;

    backupDirectory = mkdtempSync(resolve(tmpdir(), "auto-research-stage2a-"));
    chmodSync(backupDirectory, 0o700);
    const pgEnvironment = databaseCliEnvironment(connectionString, baselineDatabase);
    const pgDumpVersion = (
      await captureCommandBuffer("pg_dump", ["--version"], pgEnvironment)
    ).toString("utf8").trim();
    const rawArchive = await captureCommandBuffer(
      "pg_dump",
      ["--format=custom", "--no-owner", "--no-acl"],
      pgEnvironment,
    );
    encryptedBackup = encryptDisposableArchive(rawArchive, backupDirectory);
    rawArchive.fill(0);
    const restoredArchive = readAndDecryptDisposableArchive(encryptedBackup);
    console.log(
      `Disposable migration baseline: ${pgDumpVersion}; captured ${new Date().toISOString()}; ` +
      `target=${baselineDatabase}; encrypted archive SHA-256=${encryptedBackup.encryptedSha256}; ` +
      `dump SHA-256=${encryptedBackup.archiveSha256}`,
    );

    const restoreArchivePath = resolve(backupDirectory, "restore-input.dump");
    writeFileSync(restoreArchivePath, restoredArchive, { mode: 0o600 });
    chmodSync(restoreArchivePath, 0o600);
    restoredArchive.fill(0);
    try {
      await runCommand(
        "pg_restore",
        [
          "--dbname",
          migratedDatabase,
          "--no-owner",
          "--no-acl",
          "--exit-on-error",
          "--single-transaction",
          restoreArchivePath,
        ],
        databaseCliEnvironment(connectionString, migratedDatabase),
      );
    } finally {
      rmSync(restoreArchivePath, { force: true });
    }

    migratedPool = new Pool({ connectionString: migratedConnectionString });
    assert.deepEqual(
      await captureLegacyDatabaseState(migratedPool),
      baselineLegacyState,
      "Restoring the protected disposable baseline must preserve every legacy row and child relationship",
    );
    assert.deepEqual(
      await captureLegacySchemaCatalog(migratedPool),
      baselineLegacySchema,
      "Restoring the protected disposable baseline must preserve legacy indexes and constraints",
    );

    apiServer = await startApiServer(migratedConnectionString, "legacy");
    serverProcess = apiServer.serverProcess;
    const restoredApiSnapshot = await captureApiSnapshot(apiServer.apiBaseUrl);
    assert.deepEqual(
      restoredApiSnapshot,
      baselineApiSnapshot,
      "The restored pre-migration database must match the baseline API snapshot",
    );
    await stopServer(serverProcess);
    serverProcess = undefined;

    await runCommandWithCapturedOutput(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate"],
      {
        ...process.env,
        DATABASE_URL: migratedConnectionString,
        NODE_ENV: "test",
      },
    );
    const firstMigrationJournal = await captureDrizzleMigrationJournal(migratedPool);
    assert.deepEqual(
      firstMigrationJournal.map((row) => row.created_at),
      expectedMigrationTimes(),
      "The database migration journal must match every checked-in legacy and Stage 2A migration",
    );
    assert.ok(
      firstMigrationJournal.every((row) => /^[a-f0-9]{64}$/.test(row.hash)),
      "Every applied versioned migration must have a SHA-256 journal entry",
    );
    await runCommandWithCapturedOutput(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate"],
      {
        ...process.env,
        DATABASE_URL: migratedConnectionString,
        NODE_ENV: "test",
      },
    );
    assert.deepEqual(
      await captureDrizzleMigrationJournal(migratedPool),
      firstMigrationJournal,
      "A second Stage 2A migration run must be a no-op",
    );
    await assertStage2aIdentityBackfill(migratedPool);
    assert.deepEqual(
      await captureLegacyDatabaseState(migratedPool),
      baselineLegacyState,
      "Stage 2A migration must not update or delete legacy data",
    );

    apiServer = await startApiServer(migratedConnectionString, "catalog");
    serverProcess = apiServer.serverProcess;
    const migratedApiSnapshot = await captureApiSnapshot(apiServer.apiBaseUrl);
    assert.deepEqual(
      migratedApiSnapshot,
      baselineApiSnapshot,
      "Stage 2A migration must preserve all legacy API responses, ordering, IDs, demo flags, and errors",
    );
    await runCommand(
      "pnpm",
      ["--filter", "@workspace/scripts", "run", "test:auto-research:checks"],
      {
        ...process.env,
        DATABASE_URL: migratedConnectionString,
        AUTO_RESEARCH_API_BASE_URL: apiServer.apiBaseUrl,
      },
    );
    const duplicateLegacyAliasSlug = "stage2a-duplicate-legacy-alias";
    const duplicateAliasInsert = await migratedPool.query(
      `INSERT INTO "vehicle_profile_aliases"
         (slug, legacy_trim_id, alias_kind, mapping_status)
       SELECT $1, id, 'legacy_profile', 'unresolved'
       FROM "trims"
       WHERE slug = $2`,
      [duplicateLegacyAliasSlug, "ford-f-150-2024-xlt"],
    );
    assert.equal(
      duplicateAliasInsert.rowCount,
      1,
      "The slug-stability check must add exactly one legacy alias",
    );
    assert.deepEqual(
      await captureApiSnapshot(apiServer.apiBaseUrl),
      baselineApiSnapshot,
      "Adding a later alias must not change any established public vehicle IDs",
    );
    await migratedPool.query(
      `DELETE FROM "vehicle_profile_aliases" WHERE slug = $1`,
      [duplicateLegacyAliasSlug],
    );
    const unresolvedSlug = "ford-f-150-2024-xlt";
    await migratedPool.query(
      `UPDATE "vehicle_profile_aliases"
       SET mapping_status = 'unresolved'
       WHERE slug = $1`,
      [unresolvedSlug],
    );
    assert.deepEqual(
      await captureApiSnapshot(apiServer.apiBaseUrl),
      baselineApiSnapshot,
      "An unresolved alias with a known legacy ID must retain the legacy API fallback",
    );
    await migratedPool.query(
      `UPDATE "vehicle_profile_aliases"
       SET mapping_status = 'demo_identity_only'
       WHERE slug = $1`,
      [unresolvedSlug],
    );
    await assertStage2aIdentityBackfill(migratedPool);
    await stopServer(serverProcess);
    serverProcess = undefined;

    await runStage2aConstraintChecks(migratedPool);
    await assertStage2aIdentityBackfill(migratedPool);

    const rollbackClient = await migratedPool.connect();
    try {
      const rollbackSql = readFileSync(
        resolve(workspaceRoot, "lib/db/migrations/stage2a/rollback.sql"),
        "utf8",
      ).replaceAll("--> statement-breakpoint", "");
      await rollbackClient.query("BEGIN");
      await rollbackClient.query(rollbackSql);
      await rollbackClient.query("COMMIT");
    } catch (error) {
      await rollbackClient.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      rollbackClient.release();
    }

    await assertStage2aRolledBack(migratedPool);
    assert.deepEqual(
      await captureLegacyDatabaseState(migratedPool),
      baselineLegacyState,
      "Rolling back Stage 2A must preserve every legacy row and child relationship",
    );

    apiServer = await startApiServer(migratedConnectionString, "legacy");
    serverProcess = apiServer.serverProcess;
    const rolledBackApiSnapshot = await captureApiSnapshot(apiServer.apiBaseUrl);
    assert.deepEqual(
      rolledBackApiSnapshot,
      baselineApiSnapshot,
      "After rollback, the legacy API must still resolve all public profile links",
    );
    await runCommand(
      "pnpm",
      ["--filter", "@workspace/scripts", "run", "test:auto-research:checks"],
      {
        ...process.env,
        DATABASE_URL: migratedConnectionString,
        AUTO_RESEARCH_API_BASE_URL: apiServer.apiBaseUrl,
      },
    );
    console.log(
      "Stage 2A disposable migration, encrypted restore, 13-profile/API parity, " +
        "failed-migration retry, interrupted-migration recovery before and after a " +
        "committed Stage 2A migration, SQL-error recovery after a committed prefix, " +
        "fail-closed constraints, and rollback checks passed.",
    );
  } finally {
    if (serverProcess) await stopServer(serverProcess);
    if (baselinePool) await baselinePool.end();
    if (migratedPool) await migratedPool.end();
    if (adminClient) {
      for (const name of temporaryDatabases.reverse()) {
        try {
          const result = await dropRunnerOwnedTemporaryDatabase(adminClient, name, {
            runId,
            createdAt: runCreatedAt.toISOString(),
          });
          if (!result.dropped) {
            console.error(
              `Could not safely remove disposable database ${name}: ${result.reason}.`,
            );
            process.exitCode = 1;
          }
        } catch {
          console.error(
            `Could not remove disposable database ${name}; drop it manually after confirming no test process is using it.`,
          );
          process.exitCode = 1;
        }
      }
      await adminClient.end();
    }
    if (encryptedBackup?.key) encryptedBackup.key.fill(0);
    if (backupDirectory) rmSync(backupDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Auto Research test setup failed.",
    );
    process.exitCode = 1;
  });
}