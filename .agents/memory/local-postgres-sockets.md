---
name: Local PostgreSQL sockets
description: Starting temporary PostgreSQL servers in this NixOS workspace.
---

When starting a temporary PostgreSQL server, use an existing directory such as the cluster's temporary data directory for Unix sockets (for example, `-k "$PGDATA"`). The default `/run/postgresql` directory may not exist here, even when PostgreSQL client and server binaries are installed.

**Why:** PostgreSQL otherwise exits during startup while trying to create its Unix-socket lock file, which can look like a port or database initialization failure.

**How to apply:** For disposable local test clusters, keep TCP bound to loopback and explicitly set the socket directory to a writable temporary path.

Keep temporary database servers in a managed background shell with the PostgreSQL process running in the foreground, rather than relying on a detached daemon from a completed one-off command.

**Why:** A detached server appeared ready but was terminated after the one-off shell ended, leaving subsequent test connections refused without a normal PostgreSQL shutdown message.

**How to apply:** Give disposable servers an explicit background-task lifetime and stop them when their acceptance tests are finished.