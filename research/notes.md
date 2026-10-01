# Research Notes: AutoResearch Stage 2 Data Architecture

**Status:** evidence reviewed; drafting
**Depth:** Deep

## Plan

- **Question:** How should AutoResearch's demo catalog evolve into a scalable, source-backed vehicle research platform without breaking existing routes or misrepresenting uncertainty?
- **Scope:** Current-code audit; global-ready vehicle identity/configuration, facts, applicability, evidence, ingestion, migration, U.S.-first source landscape, and catalog/pilot recommendations. No implementation or imports.
- **Audience:** Product owner and engineers reviewing architecture before schema work.
- **Deliverable:** Cited Markdown plan at artifacts/auto-research/STAGE-2-ARCHITECTURE-PLAN.md.

## Findings Log

- Current development DB snapshot: 11 makes, 11 models, 11 generations, 11 model-year rows, 12 engines, 11 transmissions, 13 trims, 13 ownership estimates, 13 maintenance rows, 11 common-problem rows, zero recalls, zero safety ratings, and 13 owner reports. All 13 trims and 13 ownership estimates are demo; owner reports also are demo. These are observed development data, not canonical source evidence.
- Exact profile slugs preserved in the report. The 13 trims use 11 make/model/year groupings; two F-150 trims share a row-year engine/transmission and two Model Y trims share one engine/transmission row. All records in this snapshot are marked demo.
- No repository SQL migration history or authoritative seed manifest for the observed 13 profiles found. Current DB package exposes Drizzle push/push-force. The isolated test runner safely creates a temporary local database, pushes the schema and seeds two fixtures (2024 Ford F-150 XLT and Tesla Model Y Long Range), then runs API checks; it is not the source of the current 13-row development catalog. `artifacts/auto-research/TESTING.md` nevertheless expects all 13 seeded profiles in its browser smoke checklist, so documentation and fixture scope disagree.
- Current makes conflate maker and consumer mark; Make origin default is “United States.” Model → generation → model year is hierarchy; engine/transmission belong to a single model-year; trim requires one engine/transmission and repeats several specs. Trim slug is the public vehicle identity.
- Required inner joins to an ownership estimate and engine/transmission make detail/list APIs dependent on completeness. The route maps every trim to the currently coupled profile/trim model and returns hardcoded recall/safety placeholders. Recall/safety tables exist but have zero rows and aren't read by the route.
- API/OpenAPI uses non-null compatibility fields for most estimates, fixed applicability enum {applies, unknown}, and mandatory report sections. Owner reports are trim-linked but aren't currently distinct in schema from external owner-pattern research; demo flags exist on most content tables. Per-fact sources/revisions/market/unit/test basis are sparse or absent.
- NHTSA vPIC/recalls/NCAP/complaints are useful but non-equivalent sources; public model-level data is not exact-VIN status. NHTSA page policy says its consumer API is not meant for bulk VIN lookup; exact current rate/terms need recheck.
- EPA/FuelEconomy.gov offers official year/make/model/vehicle records, API and data downloads, but a validated crosswalk to the app's exact configuration remains necessary. EPA label values are standardized test-derived values, not individualized real-world outcomes; preserve test basis and units. Official docs did not establish unrestricted production-use license or SLA.
- OEM manuals/portals are valuable primary sources scoped by model year and market, but are unstructured and often restrict reproduction. Commercial repair/spec/reliability providers require product-specific coverage samples, terms, and rights review; public landing pages did not prove redistributable API coverage.
- Source registry and fetched/snippet evidence are in research/sources/. Each report claim is classified by whether it came from observed project state, a fetched primary page, or a limited search-result snippet. Source publication dates are stated when visible; otherwise access date 2026-10-01.
- Process exception: a research worker accidentally made one read-only GET to a live NHTSA SafetyRatings endpoint. The endpoint payload is expressly excluded from the report and source recommendations. No data was imported and no project API/database/code was changed.

## Focus Areas

| # | Area | Status | Sources |
|---|---|---|---|
| 1 | NHTSA identity, complaints, recalls, safety | reviewed | 10 |
| 2 | EPA efficiency and alternative powertrain data | reviewed | 9 |
| 3 | OEM, maintenance, reliability and commercial source limits | reviewed | 12 |
| 4 | Vehicle identity, specifications, applicability and evidence patterns | reviewed | 8 |
| 5 | American-brand scope and technically diverse pilot | reviewed | 22 |

## Conflicts & Open Questions

- Static source pages do not establish unrestricted storage/redistribution rights or an API SLA. This remains a pre-ingestion legal/procurement gate.
- Brand-origin policy is proposed, not a factual universal definition. Ownership, brand origin, legal incorporation, headquarters, engineering, manufacturing and assembly are separate relationships/attributes.
- EPA and OEM vehicle names must be mapped to an exact model-year/market/configuration with documented match status; a similar name is insufficient.
- A current exhaustive discontinued U.S. marque history is beyond the evidence reviewed; catalog expansion must be evidence-gated.
- Report proposes schema concepts only. Stage 2A requires approval of identity, source licensing, evidence/applicability, and migration gates.

## Gaps

No catalog import, provider API, VIN lookup or API change was performed. The NHTSA endpoint retrieval exception above is excluded. Need product-owner selection of initial brand/pilot scope and legal diligence before real source integration.
