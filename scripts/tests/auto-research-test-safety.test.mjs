import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanupStaleTemporaryDatabases,
  formatTemporaryDatabaseComment,
  getSafeTestDatabaseUrl,
  parseRunnerOwnedTemporaryDatabase,
  parseSafeTestDatabaseUrl,
} from "../../lib/db/scripts/auto-research-test-runner.mjs";

const runnerRunId = "1234_a1b2c3d4";

test("test database guard accepts only a local auto_research_test database", () => {
  const target = parseSafeTestDatabaseUrl(
    "postgresql://test-user:example@localhost:5432/auto_research_test",
  );
  assert.equal(target.databaseName, "auto_research_test");
});

test("test database guard rejects remote, production-named, and overridden targets", () => {
  for (const unsafeUrl of [
    "postgresql://test-user:example@db.example.com:5432/auto_research_test",
    "postgresql://test-user:example@localhost:5432/production",
    "postgresql://test-user:example@localhost:5432/auto_research_test?host=db.example.com",
    "https://localhost:5432/auto_research_test",
  ]) {
    assert.throws(
      () => parseSafeTestDatabaseUrl(unsafeUrl),
      /must point to a local PostgreSQL database named exactly auto_research_test/,
    );
  }
});

test("test database guard requires an explicit disposable database URL", () => {
  assert.throws(
    () => parseSafeTestDatabaseUrl(undefined),
    /Set AUTO_RESEARCH_TEST_DATABASE_URL/,
  );
});

test("test database selection never falls back to DATABASE_URL", () => {
  assert.throws(
    () =>
      getSafeTestDatabaseUrl({
        DATABASE_URL: "postgresql://hosted.example.com:5432/production",
      }),
    /Set AUTO_RESEARCH_TEST_DATABASE_URL/,
  );
});

test("explicit safe test target takes precedence over an unrelated DATABASE_URL", () => {
  const testUrl = "postgresql://test-user:example@127.0.0.1:5432/auto_research_test";
  assert.deepEqual(
    getSafeTestDatabaseUrl({
      AUTO_RESEARCH_TEST_DATABASE_URL: testUrl,
      DATABASE_URL: "postgresql://hosted.example.com:5432/production",
    }),
    { connectionString: testUrl, databaseName: "auto_research_test" },
  );
});

test("invalid explicit test targets cannot fall back to a safe DATABASE_URL", () => {
  for (const testUrl of [
    "",
    "postgresql://hosted.example.com:5432/auto_research_test",
    "postgresql://localhost:5432/production",
  ]) {
    assert.throws(
      () => getSafeTestDatabaseUrl({
        AUTO_RESEARCH_TEST_DATABASE_URL: testUrl,
        DATABASE_URL: "postgresql://localhost:5432/auto_research_test",
      }),
      /AUTO_RESEARCH_TEST_DATABASE_URL/,
    );
  }
});

test("temporary database metadata must match the runner name and run ID", () => {
  const createdAt = new Date("2026-10-01T12:00:00.000Z");
  const comment = formatTemporaryDatabaseComment(runnerRunId, createdAt);
  assert.deepEqual(
    parseRunnerOwnedTemporaryDatabase(
      `auto_research_stage2a_baseline_${runnerRunId}`,
      comment,
    ),
    {
      runId: runnerRunId,
      createdAt: createdAt.toISOString(),
      createdAtMs: createdAt.getTime(),
    },
  );
  assert.deepEqual(
    parseRunnerOwnedTemporaryDatabase(
      `auto_research_stage2a_resumed_${runnerRunId}`,
      comment,
    ),
    {
      runId: runnerRunId,
      createdAt: createdAt.toISOString(),
      createdAtMs: createdAt.getTime(),
    },
  );
  assert.equal(
    parseRunnerOwnedTemporaryDatabase(
      `auto_research_stage2a_baseline_5678_a1b2c3d4`,
      comment,
    ),
    null,
  );
  assert.equal(
    parseRunnerOwnedTemporaryDatabase("auto_research_stage2a_shared", comment),
    null,
  );
});

test("stale cleanup removes only inactive runner-owned temporary databases", async () => {
  const now = Date.parse("2026-10-02T12:00:00.000Z");
  const staleCreatedAt = new Date(now - 48 * 60 * 60 * 1000);
  const recentCreatedAt = new Date(now - 30 * 60 * 1000);
  const staleName = `auto_research_stage2a_baseline_${runnerRunId}`;
  const activeName = `auto_research_stage2a_migrated_${runnerRunId}`;
  const recentName = `auto_research_stage2a_failure_${runnerRunId}`;
  const unmarkedName = "auto_research_stage2a_interrupted_5678_1234abcd";
  const nameRunMismatch = "auto_research_stage2a_baseline_9876_87654321";
  const otherOwnerName = "auto_research_stage2a_interrupted_2468_2468abcd";
  const comments = new Map([
    [staleName, formatTemporaryDatabaseComment(runnerRunId, staleCreatedAt)],
    [activeName, formatTemporaryDatabaseComment(runnerRunId, staleCreatedAt)],
    [recentName, formatTemporaryDatabaseComment(runnerRunId, recentCreatedAt)],
    [unmarkedName, null],
    [
      nameRunMismatch,
      formatTemporaryDatabaseComment("1234_87654321", staleCreatedAt),
    ],
    [
      otherOwnerName,
      formatTemporaryDatabaseComment("2468_2468abcd", staleCreatedAt),
    ],
  ]);
  const activeConnections = new Set([activeName]);
  const removedByQuery = [];
  const adminClient = {
    async query(sql, values = []) {
      if (sql.includes("SELECT datname, shobj_description")) {
        return {
          rows: [...comments].map(([datname, comment]) => ({
            datname,
            comment,
            owned_by_current_user: datname !== otherOwnerName,
          })),
        };
      }
      if (sql.includes("SELECT shobj_description") && sql.includes("WHERE datname = $1")) {
        return {
          rows: [{
            comment: comments.get(values[0]),
            owned_by_current_user: values[0] !== otherOwnerName,
          }],
        };
      }
      if (sql.includes("FROM pg_stat_activity")) {
        return { rows: activeConnections.has(values[0]) ? [{ pid: 987 }] : [] };
      }
      if (sql.startsWith("DROP DATABASE")) {
        const databaseName = sql.match(/^DROP DATABASE "([^"]+)"$/)?.[1];
        removedByQuery.push(databaseName);
        comments.delete(databaseName);
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL in cleanup test: ${sql}`);
    },
  };

  const result = await cleanupStaleTemporaryDatabases(adminClient, {
    now,
    retentionMs: 24 * 60 * 60 * 1000,
  });

  assert.deepEqual(result, { removed: [staleName], active: [activeName] });
  assert.deepEqual(removedByQuery, [staleName]);
  assert.ok(comments.has(activeName), "A stale database with open sessions must be preserved");
  assert.ok(comments.has(recentName), "A recent runner database must not be removed");
  assert.ok(comments.has(unmarkedName), "A database without ownership metadata must be preserved");
  assert.ok(comments.has(nameRunMismatch), "Mismatched run metadata must be preserved");
  assert.ok(comments.has(otherOwnerName), "A database owned by another role must be preserved");
});
