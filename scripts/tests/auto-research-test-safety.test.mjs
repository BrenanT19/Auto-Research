import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSafeTestDatabaseUrl } from "../../lib/db/scripts/auto-research-test-runner.mjs";

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
