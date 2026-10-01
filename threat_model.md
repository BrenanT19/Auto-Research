# Threat Model

## Project Overview

A public, read-only automotive ownership-research web application. It presents an
illustrative catalog of vehicle makes, models, trims, specifications, ownership-cost
estimates, common problems, maintenance schedules, and (demo) owner reports.

Tech stack:
- Monorepo: pnpm workspaces, Node.js 24, TypeScript 5.9.
- API: Express 5 (`artifacts/api-server`), served under `/api`.
- Data: PostgreSQL via Drizzle ORM (`lib/db`), parameterized queries only.
- Validation: Zod schemas generated from an OpenAPI spec (`lib/api-zod`).
- Frontend: React SPA (`artifacts/auto-research`) using shadcn/ui, consuming the API
  via a generated React Query client (`lib/api-client-react`).
- `artifacts/mockup-sandbox` (Canvas, preview `/__mockup`) is a design/dev-only surface.

Deployment: Autoscale, public visibility, TLS handled by Replit.

## Assets

- **Catalog data** — vehicle specs, ownership/cost estimates, demo owner reports. All
  explicitly illustrative/demo data; no PII, no proprietary or business-sensitive content.
- **Application secret** — `DATABASE_URL` (server-side only, never shipped to the client).

There are no user accounts, credentials, sessions, payment data, or uploaded files.

## Trust Boundaries

- **Browser → API** — all client requests cross this boundary. The API is fully public
  and read-only; there is no authenticated or privileged surface to protect.
- **API → PostgreSQL** — the API server holds direct DB access via `DATABASE_URL`. All
  access is through Drizzle's parameterized query builder.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/app.ts` (Express app, CORS, body
  parsers) and `artifacts/api-server/src/routes/automotive.ts` (all data endpoints:
  `/api/makes`, `/api/vehicles`, `/api/vehicles/:id`, `/api/owner-reports`,
  `/api/discovery/stats`). Health at `artifacts/api-server/src/routes/health.ts`.
- Data layer: `lib/db/src/index.ts` (pool) and `lib/db/src/schema/*`.
- Input validation: Zod params in `lib/api-zod` (e.g. `limit` constrained 1–100).
- Highest-risk-by-nature area: the search/filter builder `loadVehicles()` in
  `automotive.ts` — reviewed; uses `ilike`/`eq` with bound parameters, no raw SQL.
- Dev-only / ignore unless proven reachable: `artifacts/mockup-sandbox` (`/__mockup`).
- No raw SQL (`sql.raw`, `.execute()` with concatenation), no `child_process`, no
  filesystem sinks, no outbound user-controlled fetch (SSRF), no secrets in client code.

## Threat Categories

### Information Disclosure

All data served is intentionally public demo content. API responses are shaped by
explicit Drizzle column selections and re-validated with Zod response schemas, so there
is no over-broad `SELECT *` leaking unexpected fields to the client. `DATABASE_URL` stays
server-side; no secrets are injected into the client bundle. Logger redacts auth/cookie
headers. No PII is present, so disclosure risk is minimal.

### Tampering / Elevation of Privilege

There are no write, update, delete, auth, billing, or admin endpoints and no object
ownership model, so IDOR, broken function-level authorization, and mass-assignment do not
apply. All DB access uses parameterized Drizzle queries (`eq`, `ilike` with bound values),
so SQL injection is not reachable through the search/filter inputs.

### Denial of Service

Endpoints are unauthenticated and un-rate-limited (expected for a public read API). Query
cost is bounded: `limit` is Zod-constrained to 1–100 and list endpoints cap results. CORS
is open (`cors()` with no credentials), which is acceptable for a public, cookieless,
read-only API. Platform-level protections apply at the Replit edge.
