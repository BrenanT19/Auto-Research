# Auto Research regression checks

Run the regression suite with:

```sh
pnpm --filter @workspace/scripts test:auto-research
```

The suite includes unit checks for optional calculator lookups, loan/fuel
estimates, browse filters and URL cleanup, and comparison limits/URL state. Its
read-only API checks require the API Server development workflow and the seeded
demo database to be running locally. They use only `GET /api/vehicles` and
reject API base URLs outside `localhost`, `127.0.0.1`, or `::1`; do not point
these checks at production.

CI should provision the development/test database with its demo fixtures, start
the local API workflow, then run the command above.