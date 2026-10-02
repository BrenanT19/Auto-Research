---
name: Drizzle migration validation
description: Lessons for reviewing generated PostgreSQL migrations that include custom SQL and composite foreign keys.
---

Generated SQL must be applied to a disposable PostgreSQL database before completion; schema generation and TypeScript checks do not validate SQL function syntax or every dependency ordering detail. When a composite foreign key references a unique key created in the same migration, create the referenced unique index before adding the foreign key.

**Why:** PostgreSQL caught a custom-function syntax error and a foreign-key dependency-order error that static generation did not surface. During deliberate failure injection, Drizzle Kit exited nonzero without surfacing the database exception in its captured CLI output, so a PostgreSQL-side log marker was needed to prove the fault fired.

**How to apply:** After reviewing generated SQL, rehearse clean migration, a second no-op migration, backup restore, integrity checks, API parity, and rollback against a temporary local database. For fault injection, log a unique marker from PostgreSQL and verify the failed journal entry, schema state, and baseline separately.