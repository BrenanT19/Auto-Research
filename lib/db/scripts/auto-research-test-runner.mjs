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

async function startApiServer(connectionString) {
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

  const { connectionString, databaseName } = parseSafeTestDatabaseUrl(
    process.env.AUTO_RESEARCH_TEST_DATABASE_URL,
  );
  let adminClient;
  let baselinePool;
  let migratedPool;
  let serverProcess;
  let backupDirectory;
  let encryptedBackup;
  const temporaryDatabases = [];

  try {
    adminClient = new Client({ connectionString });
    await adminClient.connect();
    const selectedDatabase = await adminClient.query("SELECT current_database() AS name");
    if (selectedDatabase.rows[0]?.name !== databaseName) {
      throw new Error("The test database URL did not select the expected local test database.");
    }

    const runSuffix = `${process.pid}_${randomBytes(4).toString("hex")}`;
    const baselineDatabase = `auto_research_stage2a_baseline_${runSuffix}`;
    const migratedDatabase = `auto_research_stage2a_migrated_${runSuffix}`;
    for (const name of [baselineDatabase, migratedDatabase]) {
      try {
        await adminClient.query(`CREATE DATABASE "${name}"`);
        temporaryDatabases.push(name);
      } catch {
        throw new Error(
          "Could not create the disposable migration database. Ensure the local auto_research_test role has CREATEDB permission.",
        );
      }
    }

    const baselineUrl = new URL(connectionString);
    baselineUrl.pathname = `/${baselineDatabase}`;
    const baselineConnectionString = baselineUrl.toString();
    const migratedUrl = new URL(connectionString);
    migratedUrl.pathname = `/${migratedDatabase}`;
    const migratedConnectionString = migratedUrl.toString();
    const baselineEnv = {
      ...process.env,
      DATABASE_URL: baselineConnectionString,
      NODE_ENV: "test",
    };

    await runCommand(
      "pnpm",
      ["--filter", "@workspace/db", "run", "migrate:legacy"],
      baselineEnv,
    );

    baselinePool = new Pool({ connectionString: baselineConnectionString });
    await seedDemoVehicles(baselinePool);
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

    let apiServer = await startApiServer(baselineConnectionString);
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

    apiServer = await startApiServer(migratedConnectionString);
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

    apiServer = await startApiServer(migratedConnectionString);
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

    apiServer = await startApiServer(migratedConnectionString);
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
      "fail-closed constraints, and rollback checks passed.",
    );
  } finally {
    if (serverProcess) await stopServer(serverProcess);
    if (baselinePool) await baselinePool.end();
    if (migratedPool) await migratedPool.end();
    if (adminClient) {
      for (const name of temporaryDatabases.reverse()) {
        try {
          await adminClient.query(`DROP DATABASE "${name}"`);
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