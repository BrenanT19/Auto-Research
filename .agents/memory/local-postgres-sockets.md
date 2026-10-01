---
name: Local PostgreSQL sockets
description: Starting temporary PostgreSQL servers in this NixOS workspace.
---

When starting a temporary PostgreSQL server, use an existing directory such as the cluster's temporary data directory for Unix sockets (for example, `-k "$PGDATA"`). The default `/run/postgresql` directory may not exist here, even when PostgreSQL client and server binaries are installed.

**Why:** PostgreSQL otherwise exits during startup while trying to create its Unix-socket lock file, which can look like a port or database initialization failure.

**How to apply:** For disposable local test clusters, keep TCP bound to loopback and explicitly set the socket directory to a writable temporary path.