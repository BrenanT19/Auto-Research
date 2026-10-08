---
name: Drizzle migration validation
description: Lessons for reviewing generated PostgreSQL migrations that include custom SQL and composite foreign keys.
---

When a migration client is killed during a PostgreSQL `pg_sleep`, the backend may continue sleeping until the statement finishes instead of exiting immediately on client loss. Keep controlled sleep statements brief and wait for the backend PID to disappear before comparing post-interruption state or dropping its disposable database.

Generated SQL must be applied to a disposable PostgreSQL database before completion; schema generation and TypeScript checks do not validate SQL function syntax or every dependency ordering detail. When a composite foreign key references a unique key created in the same migration, create the referenced unique index before adding the foreign key. Drizzle's node-postgres session wraps PostgreSQL failures in a query error; inspect `error.cause` for the original SQLSTATE and server message. Drizzle Kit's CLI can exit nonzero without including the database exception in captured output; when injecting failures through the CLI, use a PostgreSQL-side log marker to confirm the fault fired.

**Why:** PostgreSQL caught a custom-function syntax error and a foreign-key dependency-order error that static generation did not surface. Checking the wrapper's `code` or `message` can miss the underlying PostgreSQL failure, while CLI output may omit it altogether.

**How to apply:** After reviewing generated SQL, rehearse clean migration, a second no-op migration, backup restore, integrity checks, API parity, and rollback against a temporary local database. For programmatic failure-injection tests, assert the SQLSTATE and diagnostic from `error.cause`; for CLI-injected failures, use a PostgreSQL-side marker and compare the post-failure journal, schema, and baseline to their pre-migration state.

Distinguish migrations committed in an earlier invocation from migrations pending in the current invocation. Drizzle's PostgreSQL migrator executes the pending batch in one transaction, not a separate transaction per journal entry.

**Why:** A later SQL error rolls back the current pending batch, but must not undo a prefix already committed by a prior invocation. Assuming per-entry commits would test the wrong recovery guarantee.

**How to apply:** For committed-prefix recovery rehearsals, apply an unmodified prefix in a separate invocation before injecting the later failure; compare committed journal identities and schema before and after failure.

Use explicit UNIQUE table constraints for composite keys referenced by foreign keys, rather than relying only on standalone unique indexes. Rehearse the actual Publish-generated schema diff separately from checked-in migrations.

**Why:** The managed Publish diff omitted a standalone composite unique index even though it existed in development and the checked-in migration created it before its dependent foreign key. The resulting publish SQL failed with PostgreSQL SQLSTATE 42830. An inline UNIQUE constraint survived introspection and restored correct dependency ordering.

**How to apply:** Preserve existing foreign-key dependencies by attaching an existing unique index as a table constraint instead of dropping it. Update the schema source and migration metadata, apply the change to development only, and replay the regenerated Publish diff in disposable PostgreSQL. Never add production migration hooks or startup DDL.
