# AutoResearch Stage 2A — Database Foundation Implementation Plan

**Status:** Implementation specification for review only. No database, schema, application, API, catalog, workflow, or vehicle-data change is authorized by this document.  
**Basis:** The approved [Stage 2 data architecture](./STAGE-2-ARCHITECTURE-PLAN.md), the attached Stage 2A decisions, and the current workspace implementation.  
**Stage boundary:** Additive relational foundation and demo-identity compatibility only. No real-data import, provider call, scraping, VIN lookup, or shopper-facing redesign.

## 1. Executive recommendation

Build a canonical, market-aware vehicle model beside the current demo schema, then transition reads only after separately authorized migrations and parity checks. Keep the existing `makes`, `models`, `generations`, `model_years`, `engines`, `transmissions`, `trims`, ownership, research, recall, safety, and owner-report tables intact during Stage 2A. Add explicit mapping and slug-alias records rather than renaming or repurposing the current tables.

This is safer than changing the legacy tables in place because the current API requires a make for every model, an engine and transmission for every trim, and an ownership-estimate row for every vehicle result. It returns the trim slug as the public vehicle ID. The present query path also uses inner joins to those records. A direct in-place redesign would either break the 13 existing demo profiles or require placeholder values for incomplete future records. The parallel canonical tables allow sparse, accurately scoped records without changing those assumptions now.

The canonical identity path is:

**Organization / Consumer Brand → Model → Generation → Model Year + Market → Trim → Vehicle Configuration**

Organizations, consumer brands, brand origin, vehicle market, and physical production sites are distinct records and relationships. A `VehicleConfiguration` is a documented combination, never the result of a Cartesian product. Powertrain components are reusable, versioned identities with explicit fitment to a configuration. Facts and applicability have sources, review state, and their own values; missing rows do not mean zero, “not applicable,” or universal scope.

The 13 existing public slugs remain resolvable through explicit aliases. Backfill only demo identity mappings in Stage 2A; do not migrate illustrative horsepower, price, economy, ownership, repair, issue, maintenance, recall, safety, or owner-report values into factual claims. Preserve their demo labels. If identity or configuration matching is unclear, retain the legacy profile and mark the mapping unresolved or ambiguous.

## 2. Current-state constraints to preserve

The current schema is defined in [`lib/db/src/schema`](../../lib/db/src/schema/index.ts):

- `makes` currently combines the display make/consumer mark and manufacturer-like concepts; `origin` is a text field defaulting to “United States” ([`makes.ts`](../../lib/db/src/schema/makes.ts)).
- `models` requires a `make_id`; `generations` are unique by model and start year; `model_years` are unique by generation and year and do not include a market ([`models.ts`](../../lib/db/src/schema/models.ts)).
- `trims` requires one engine and one transmission, repeats powertrain/economy values, and owns the unique public slug. The engine and transmission rows are tied to one model year ([`vehicles.ts`](../../lib/db/src/schema/vehicles.ts)).
- Ownership, maintenance, issue, recall, safety, and owner-report content have separate legacy tables but lack most per-claim source and revision data ([`ownership.ts`](../../lib/db/src/schema/ownership.ts), [`research.ts`](../../lib/db/src/schema/research.ts), [`community.ts`](../../lib/db/src/schema/community.ts)).
- Vehicle DTOs expose the trim slug and require legacy reliability/cost fields; list/detail reads inner-join engine, transmission, and ownership estimates ([`automotive.ts`](../api-server/src/routes/automotive.ts), [`openapi.yaml`](../../lib/api-spec/openapi.yaml)).
- The `@workspace/db` package currently exposes `push` and `push-force`, not a checked-in SQL migration history ([`package.json`](../../lib/db/package.json)). The config points Drizzle at the schema entry point but does not set an explicit migration output directory ([`drizzle.config.ts`](../../lib/db/drizzle.config.ts)).

The development snapshot contains 13 demo trims, estimates, maintenance rows, and owner reports; 11 common-problem rows; no recall or safety-rating rows. The isolated runner now seeds a checked-in baseline for all 13 profiles, retaining legacy IDs, slugs, demo flags, and child relationships. Automated API checks cover all profile list/detail routes and owner-report vehicle links. The repository fixture omits owner-report names and narrative text and supplies synthetic text only in its disposable test database. This repeatable fixture is not a database backup or migration restore baseline; the migration rehearsal still requires the protected artifacts described in §6.2.

The existing browser/API contract must remain stable while the canonical schema is introduced. Browse uses manufacturer/model suggestions and cascading filters; Compare uses comma-separated public IDs; Calculator reads `?vehicle=<slug>` and requires explicit estimate prefill; vehicle detail and owner-report routes also use the slug. Do not replace these identifiers with new database IDs.

## 3. Schema scope and naming

Use PostgreSQL, integer identity primary keys consistent with the current project, and explicit text checks for controlled statuses rather than proliferating irreversible database enum types. Keep field codes, claim kinds, roles, and status values in a reviewed allowlist. Do not store arbitrary fact keys or opaque JSON payloads.

### 3.1 Organizations, brands, markets, and production

| Table | Important columns and constraints |
|---|---|
| `organizations` | `id` PK; `legal_name` required; `jurisdiction_country_code` required; optional `jurisdiction_region_code`, `registry_id`; `created_at`. Require non-empty names and stable jurisdiction codes. A partial unique index on `(jurisdiction_country_code, jurisdiction_region_code, registry_id)` applies only when `registry_id` is present. Do not store a consumer brand or factory country as the organization’s “origin.” |
| `organization_relationships` | `id` PK; `parent_organization_id` and `child_organization_id` FKs to `organizations`; `relationship_type` (`parent_of`, `controls`, `subsidiary_of`, `successor_of`, or another reviewed code); `valid_from`, nullable `valid_to`; supporting `research_claim_id`; `created_at`. Reject self-links and invalid date ranges. Index both organization FKs and effective dates. |
| `consumer_brands` | `id` PK; `canonical_name`, normalized `slug` unique, `lifecycle_status` (`active`, `discontinued`, `watchlist`, `retired`), timestamps. Do not add an `is_american` boolean or infer origin from owner, headquarters, assembly, or manufacturing location. Retire rather than delete a brand with referenced history. |
| `brand_organization_relationships` | `id` PK; `consumer_brand_id` and `organization_id` FKs; `relationship_type` (`created_by`, `owned_by`, `controlled_by`, `licensed_to`, `operated_by`, `manufactured_by`); valid dates; supporting claim FK. A brand may have multiple dated relationships; never overwrite historical ownership. |
| `brand_origin_claim_details` | `research_claim_id` PK/FK; `consumer_brand_id` FK; `country_code`; `origin_basis` (`founded_in`, `historical_identity`, `other_reviewed_basis`); optional explanation. Origin remains a sourced, reviewable claim, not a single intrinsic country field. The product’s “American-origin” filter is a policy over reviewed claims, not a manufacturing or ownership shortcut. |
| `markets` | `id` PK; stable unique `code`; `name`; `market_type` (`country`, `subdivision`, `custom_jurisdiction`); nullable `parent_market_id` self-FK; timestamps. Reject empty codes and self-parenting. Use a consistent documented jurisdiction-code scheme (for example, a country and its subdivision); do not treat a brand origin or plant as a market. |
| `production_sites` | `id` PK; `organization_id` FK; `market_id` FK for the physical jurisdiction; optional `site_code`; `name`; valid dates; supporting claim FK. Unique `(organization_id, site_code)` when a site code exists. The physical site is separate from brand origin and vehicle sale market. |
| `vehicle_production_assignments` | `id` PK; exactly one of `model_year_id` or `configuration_id`; `production_site_id` FK; `production_role` (`final_assembly`, `vehicle_manufacture`, `engine`, `battery`, `other_reviewed_role`); valid dates; supporting claim FK. Enforce exactly one vehicle scope with a check. No row means unknown, not “assembled in the brand’s origin country.” |

### 3.2 Canonical vehicle hierarchy and compatibility

| Table | Important columns and constraints |
|---|---|
| `vehicle_models` | `id` PK; `consumer_brand_id` FK; canonical `name`, normalized `slug`, lifecycle status, timestamps. Unique `(consumer_brand_id, slug)`. A model is attached to a consumer brand, not to an organization or assembly site. |
| `vehicle_model_aliases` | `id` PK; `vehicle_model_id` FK; `market_id` FK; `alias`, normalized alias, locale, alias type, required `valid_from`, optional `valid_to`. Unique `(vehicle_model_id, market_id, locale, normalized_alias, valid_from)`. This is for market/locale names, not profile URLs. |
| `vehicle_generations` | `id` PK; `vehicle_model_id` FK; canonical `name`, normalized `slug`; optional `start_year` / `end_year`; lifecycle status. Unique `(vehicle_model_id, slug)`; check end year is not earlier than start year when both exist. Do not enforce non-overlapping ranges: generation boundaries can vary by market or body style. |
| `vehicle_model_years` | `id` PK; `vehicle_generation_id` FK; nullable `market_id` only for explicitly demo/unresolved rows; `model_year`; optional source identifier; `identity_status` (`demo_identity_only`, `provisional`, `supported`, `retired`). Unique `(vehicle_generation_id, market_id, model_year)` for market-scoped rows and a separate partial unique key for unmarketed demo rows. Require a market for any supported real row. Model year is not build or registration year. |
| `vehicle_trims` | `id` PK; `vehicle_model_year_id` FK; sales `name`, normalized name, optional OEM trim code, lifecycle status. Unique `(vehicle_model_year_id, normalized_name)`. Trim is a sales label, not a mechanical configuration. |
| `vehicle_configurations` | `id` PK; `vehicle_trim_id` FK; optional source `configuration_key`; optional display label; `identity_status` (`unresolved`, `provisional`, `supported`, `retired`); `is_demo`; timestamps. Unique `(vehicle_trim_id, configuration_key)` when a key exists. `supported` requires an exact reviewed identity and market through the parent model year. Never generate a configuration from every possible option combination. |
| `vehicle_profile_aliases` | `id` PK; unique normalized `slug`; nullable `legacy_trim_id` FK to existing `trims`; nullable `vehicle_configuration_id` FK; `alias_kind` (`legacy_profile`, `canonical_profile`); `mapping_status` (`demo_identity_only`, `exact_supported`, `ambiguous`, `unresolved`, `retired`); timestamps. A legacy alias requires its old trim target; a canonical alias requires a configuration; at least one target is required. `exact_supported` requires an exact supported configuration. A legacy alias keeps its old trim target; attach a canonical configuration only when supported. Never silently redirect an ambiguous alias to the first candidate. |
| `powertrain_components` | `id` PK; `component_type` (`engine`, `transmission`, `motor`, `battery`, `fuel_cell`, `energy_system`, `other_reviewed_type`); optional responsible `organization_id` FK; optional stable source identity key; timestamps. Do not deduplicate by display name. Unique source identity only when its source namespace and identifier are known. |
| `powertrain_component_revisions` | `id` PK; `component_id` FK; stable revision key; valid dates; lifecycle status; timestamps. Unique `(component_id, revision_key)`; check date order. Changed calibration, output, fuel, installed role, or battery/motor generation gets a new revision when supported by evidence. |
| `configuration_component_fitments` | `id` PK; `vehicle_configuration_id` FK; `component_revision_id` FK; `role`; `position_code` (required, default `system`); positive `quantity`; `fitment_status` (`provisional`, `supported`, `rejected`); supporting claim FK. Require a supporting claim for `supported` fitment. Unique `(vehicle_configuration_id, role, position_code)` for one exact configuration. A missing fitment is unknown; no cascading deletion or widening to every component. |

The model-year market is the market boundary inherited by its trim and configurations. Demo rows may remain market-unknown; a market must not be guessed to make a record satisfy a non-null constraint. A supported real configuration cannot be published without a supported market.

### 3.3 Sources, claims, evidence, and typed values

| Table | Important columns and constraints |
|---|---|
| `research_sources` | `id` PK; publisher/organization FK when known; stable source key; source kind; canonical URL; jurisdiction/market; timestamps. A source is a publisher/feed/document family, not a particular revision. |
| `source_revisions` | `id` PK; `research_source_id` FK; source document identifier/version; publication and retrieval timestamps; content hash when lawful; format; update behavior; terms URL/version; last terms review; separate storage, derivative-use, and display-rights states (`unknown`, `pending`, `allowed`, `restricted`, `denied`). Unique `(research_source_id, document_identifier, source_version)` when identifiers exist. Append revisions; do not overwrite the prior source record. Do not store a protected full document unless its terms permit it. |
| `evidence_items` | `id` PK; `source_revision_id` FK; precise locator (page/table/field/record); capture time; optional excerpt/hash only when permitted; evidence kind. Index source revision and locator. A homepage alone is not evidence for every claim. |
| `research_claims` | `id` PK; `claim_kind` (`brand_origin`, `identity`, `specification`, `fitment`, `reliability`, `known_issue`, `maintenance`, `recall`, `safety_rating`, `ownership_estimate`, `calculation`, `editorial`, `owner_pattern`, `owner_experience`); `content_class` (`source_fact`, `estimate`, `calculation`, `editorial_synthesis`, `external_owner_pattern`, `direct_owner_experience`, `demo_fixture`); `research_status` (`not_researched`, `researching`, `researched`, `blocked`); `review_status` (`not_reviewed`, `in_review`, `accepted`, `rejected`, `stale`, `superseded`); qualitative evidence strength; effective dates; `supersedes_claim_id`; created timestamp. `content_class` and review state are independent. No numeric reliability score is required. |
| `claim_subjects` | `id` PK; `research_claim_id` FK; nullable typed FKs for one subject among organization, consumer brand, model, generation, model year, trim, configuration, component revision, market, or production site. A check requires exactly one subject FK per row; unique claim/subject pairs. This avoids an unchecked `subject_type + subject_id` polymorphic reference. |
| `claim_evidence` | `research_claim_id` FK; `evidence_item_id` FK; `evidence_relation` (`supports`, `contradicts`, `qualifies`, `derived_from`); optional locator note; composite primary key including relation. Preserve conflicts instead of replacing one source’s statement with another. |
| `claim_reviews` | `id` PK; claim FK; decision, reviewer reference, rationale, reviewed timestamp. Append a review decision rather than editing source evidence or erasing a prior conflict. Avoid storing reviewer personal details in public DTOs. |
| `spec_field_definitions` | Controlled field `code` PK; `value_type` (`numeric`, `text`, `boolean`); dimension; canonical unit when applicable; allowed subject type; label; active status. New codes require review; no arbitrary client-defined fact keys. |
| `spec_claim_values` | `research_claim_id` PK/FK; `field_code` and `value_type` composite FK to the controlled field registry; `value_state` (`known`, `unknown`, `not_applicable`); typed `numeric_value`, `text_value`, or `boolean_value`; original source value/unit; normalized unit; test/measurement basis. A check allows exactly one matching typed value for `known`, including numeric zero, and no typed value for `unknown` or `not_applicable`. Use a check/trigger or transaction validator to ensure the value column matches the registered field type. |
| `applicability_sets` | `id` PK; one-to-one `research_claim_id` FK; `scope_state` (`restricted`, `explicit_unrestricted`, `unknown`); review timestamp. An explicitly unrestricted scope requires an accepted supporting claim/evidence; empty scope is never an implied wildcard. |
| `applicability_alternatives` | `id` PK; applicability-set FK; ordinal; `scope_completeness` (`complete`, `partial`, `unknown`); nullable typed predicates for market, model/generation/model year/trim/configuration/component revision, package code, and build-date range. Unique `(applicability_set_id, ordinal)`; valid date check; require at least one predicate for a restricted alternative. Each row is one AND group; rows in a set are OR alternatives only when independently evidenced. Partial or unresolved groups evaluate to `unknown`. |

`spec_claim_values` is a bounded typed fact relation, not an unrestricted EAV store: field codes, allowed subjects, types, units, and display semantics are a reviewed allowlist. Common filtering keys remain normalized hierarchy columns; measurements such as displacement, output, dimensions, economy, battery capacity, charging, and range use typed claims because they need independent scope, evidence, units, and revisions.

### 3.4 Domain-specific claim details and legacy records

Domain detail tables reference `research_claims.id` as their primary key. This preserves a common evidence/review envelope without putting every domain into an opaque JSON column.

| Detail table | Initial typed fields |
|---|---|
| `reliability_assessment_details` | Claim PK; named population; observation window; method; optional numerator/denominator; coverage and limitations. No required score and no score derived from complaint count. |
| `known_issue_details` | Claim PK; issue/system code; symptom summary; severity assessment; supported mileage range; optional cost low/high, currency, cost date and cost basis. Costs are estimates, not confirmed repair outcomes unless their own evidence establishes that. |
| `maintenance_schedule_details` | Claim PK; task code/description; optional distance and month intervals with explicit units; normal/severe service condition; applicable component revision when supported. Keep an OEM schedule distinct from an editorial reminder and from an estimate. |
| `recall_campaign_details` | Claim PK; issuing authority; campaign identifier; announcement/revision dates; remedy; affected-population description. Uniqueness is scoped by authority and campaign identifier. This is campaign-level data, not an exact-VIN open-recall result. |
| `safety_rating_details` | Claim PK; authority/program; test year; tested variant/population; category; result/score and unit/basis. Never extrapolate a tested result to another market/body/configuration without supporting evidence. |
| `ownership_estimate_details` | Claim PK; cost category; low/high amounts in minor currency units; ISO currency code; period; annual-mileage assumption; market/location; method version; included/excluded categories and uncertainty. Estimates remain distinct from user-entered calculator inputs. |
| `external_owner_pattern_details` | Claim PK; source population/sample; geography; observation window; sample size when reported; collection/inclusion method; known bias and limitations. Evidence points to external material. |
| `calculation_method_versions` | `id` PK; stable method code; version; description; input/output contract version; effective dates; implementation hash/release reference. This describes a deterministic method, not an individual user run. |

Current `ownership_estimates`, `maintenance_items`, `common_problems`, `recalls`, `safety_ratings`, and `owner_reports` remain unchanged during Stage 2A. They are not bulk-converted into `research_claims`. Their current `is_demo`/`is_verified` flags remain legacy fields; no value is upgraded by migration. Map current owner-report samples only as `demo_fixture` if a future, separately approved conversion explicitly requires it. Do not describe external owner-pattern research as a direct AutoResearch submission. Do not create accounts, a submission workflow, or a direct-owner table in this stage; that requires separate consent, moderation, and product approval.

Persist no per-user calculator runs in Stage 2A. The current Calculator remains user-input driven; its existing profile-prefill action stays explicit and must not overwrite a shopper’s edited assumptions. A later calculation service can write a calculation-class result only if persistence is separately approved and its input privacy/retention rules are defined.

## 4. Key, index, check, and deletion policy

1. Use generated integer IDs for joins; keep slugs and source identifiers as separately constrained business keys. IDs are not URLs.
2. Add B-tree indexes to every frequently joined FK; PostgreSQL does not automatically index referencing FK columns. Minimum lookup indexes are:
   - `vehicle_models(consumer_brand_id, slug)` unique;
   - `vehicle_generations(vehicle_model_id, slug)` unique;
   - `vehicle_model_years(vehicle_generation_id, market_id, model_year)` unique for market-scoped rows, plus a partial key for unmarketed demo placeholders;
   - `vehicle_trims(vehicle_model_year_id, normalized_name)` unique;
   - `vehicle_configurations(vehicle_trim_id)` and `(identity_status, vehicle_trim_id)`;
   - `vehicle_profile_aliases(slug)` unique, plus indexes on legacy trim/configuration targets;
   - `configuration_component_fitments(vehicle_configuration_id, role, position_code)` unique and an index on component revision;
   - claim subject indexes for each typed subject FK; claim status/type and effective-date index;
   - source/revision/evidence and applicability set/alternative lookup indexes.
3. Check non-empty normalized slugs and stable codes; year/date intervals; positive component quantities and mileage/month intervals; lower values not above upper values; nonnegative cost amounts where the domain requires it; and three-letter uppercase currency codes. Do not impose unsupported domain ranges on demo values as though they were validated facts.
4. For scoped profile identity, market, component fitment, claim subject, and evidence relationships, use `ON DELETE RESTRICT`. Retire or supersede referenced identities rather than deleting them. Never use `ON DELETE SET NULL` on a constraint that would broaden applicability. Cascades may be used only on disposable, unreferenced draft link rows with explicit tests.
5. Treat claims, source revisions, evidence links, and review decisions as append-only history. Correct an error with a superseding claim or review; do not overwrite the source statement or remove a contradictory source.
6. Do not enforce table-wide `is_demo=false` as proof of truth. Publication eligibility requires a supported identity, a market where relevant, a value/research state, applicable evidence, and an accepted review. Demo class always stays visible in compatibility DTOs.

## 5. Values, evidence, and applicability rules

- **Known** means an evidence-supported value exists, including a legitimate numeric zero. **Unknown** means the field applies but is not established. **Not applicable** means the field does not apply to that configuration and must be supported by configuration semantics. **Not researched** is a research-process state, not a value state.
- A claim’s `content_class`, `research_status`, `review_status`, evidence strength, value state, and applicability are separate dimensions. `accepted` does not imply “official”; “official” does not prove the exact configuration match; severity is not confidence.
- Every source-derived or derived claim must link to evidence. Derived claims use `derived_from` edges to their input claims. Estimates record their assumptions/method, currency, interval, geography, and uncertainty; deterministic calculations identify their method version. Demo values stay `demo_fixture`.
- Applicability is shared across specifications, issues, maintenance, recalls, ratings, and fitments. Within one alternative, predicates combine with AND. Independently supported alternatives combine with OR.
- A `complete` alternative means evidence has resolved every dimension relevant to that claim. An omitted dimension is not a wildcard by itself; if evidence does not establish that the omitted dimension is unrestricted, the alternative is `partial`/`unknown` or must include that dimension (especially market for vehicle-specific claims).
- `applies` requires a complete, accepted matching alternative or explicitly evidenced unrestricted scope. `does_not_apply` requires a supported mismatch and complete coverage. If evidence is missing, coarse, conflicting, partially scoped, or uses a deleted identity, return `unknown`.
- A missing FK, empty set, absent child row, or SQL `NULL` never means “applies to all.” A change/delete that would broaden a scope is rejected; preserve the prior scope or mark the claim unresolved/stale.

## 6. Thirteen-profile baseline and backup specification

This is the required plan for a future, separately authorized migration rehearsal; no backup, snapshot, API call, or database write was performed for this document.

### 6.1 Fixed slug inventory

| Current profile | Public slug |
|---|---|
| Buick Enclave 2024 Preferred | `buick-enclave-2024-preferred` |
| Cadillac Escalade 2024 Premium Luxury | `cadillac-escalade-2024-premium-luxury` |
| Chevrolet Silverado 1500 2024 LT | `chevrolet-silverado-1500-2024-lt` |
| Chrysler Pacifica 2024 Touring | `chrysler-pacifica-2024-touring` |
| Dodge Charger 2023 GT | `dodge-charger-2023-gt` |
| Ford F-150 2024 Lariat | `ford-f-150-2024-lariat` |
| Ford F-150 2024 XLT | `ford-f-150-2024-xlt` |
| GMC Sierra 1500 2024 Elevation | `gmc-sierra-1500-2024-elevation` |
| Jeep Grand Cherokee 2024 Laredo | `jeep-grand-cherokee-2024-laredo` |
| Lincoln Navigator 2023 Reserve | `lincoln-navigator-2023-reserve` |
| Ram 1500 2024 Big Horn | `ram-1500-2024-big-horn` |
| Tesla Model Y 2024 Long Range | `tesla-model-y-2024-long-range` |
| Tesla Model Y 2024 Performance | `tesla-model-y-2024-performance` |

### 6.2 Baseline contents and handling

Before any authorized migration:

1. Record the schema revision, table counts, indexes/constraints, exact integer IDs, FK relationships, slugs, `is_demo`/`is_verified` values, and values for all 13 profile rows and their children. Record the observed development counts (11 makes/models/generations/model years, 12 engines, 11 transmissions, 13 trims/estimates/maintenance/owner reports, 11 common problems, zero recalls, zero ratings) as snapshot facts, not catalog truth.
2. Produce a consistent logical database backup and schema-only export from the approved environment. Store them encrypted and access-controlled outside the repository; calculate checksums and record tool/version/time/target. Do not put database URLs, credentials, or unrestricted owner-report data in a commit.
3. A deterministic demo fixture now covers the 13 legacy vehicle IDs and structural/value child rows; `TESTING.md` and the disposable runner are reconciled, with automated checks for all 13 IDs, slugs, demo flags, and API relationships. This fixture is not a backup, a restore rehearsal, or a complete golden-response archive. Complete those protected migration-baseline artifacts separately before migration work.
4. Capture stable JSON responses from the local AutoResearch API only: `/api/catalog/options`, `/api/vehicles?limit=100`, each `/api/vehicles/{slug}`, applicable `/api/owner-reports?vehicleId={slug}`, `/api/makes`, `/api/discovery/stats`, and current popular/trending routes. Include status, ordering, public IDs, `isDemo`, nullable fields, and error behavior. No external automotive endpoint is called.
5. Record representative shopper URL behavior for `/vehicles/{slug}`, Browse query filters, Compare `?ids=...`, and Calculator `?vehicle=...`. This is a compatibility baseline, not a request to change UI.
6. Restore the backup to a uniquely named disposable local database and verify its checksum, counts, keys, and API snapshot before using it as the migration rehearsal source. Never restore into a shared or production database as a test.

Keep the original snapshot immutable. A migration candidate is compared against a copy; a mismatch stops the rehearsal. Store manifests/backups under approved access/retention controls, not in source control or attached to public documentation.

## 7. Additive migration and backfill order

The current DB package has no checked-in SQL migration history. After explicit implementation authorization, establish reviewed, versioned migrations; set an explicit migration output directory in `lib/db/drizzle.config.ts` and add documented `generate`/`migrate` commands to `lib/db/package.json`. Generate SQL from the Drizzle schema, review the SQL in the change, and apply it only to the approved environment. Keep `push-force` prohibited; do not use schema push as the shared/production migration process.

| Migration | Contents and stop condition |
|---|---|
| M0 — baseline and migration journal | Complete §6 backup/snapshot and restore rehearsal; record the migration tool/version and current schema fingerprint. Stop if all 13 slugs and child IDs are not represented or the backup cannot be restored to a disposable database. |
| M1 — identity foundations | Add `organizations`, organization relationships, `consumer_brands`, brand relationships/origin-claim detail, `markets`, `production_sites`, and production assignments. No brand-origin assumptions or real source imports. |
| M2 — canonical hierarchy | Add `vehicle_models`, model aliases, generations, market-scoped model years, trims, and exact configurations. Add no cross-market model-year uniqueness based on the old single-market hierarchy. |
| M3 — components and compatibility | Add component identities/revisions, explicit configuration fitments, and `vehicle_profile_aliases`. Keep existing `makes`/`models`/`generations`/`model_years`/`trims` read paths unchanged. |
| M4 — evidence and typed domain foundation | Add source revisions, evidence, claims, claim subjects/evidence/reviews, applicability sets/alternatives, controlled spec fields/values, and typed domain-detail tables. No provider calls, sourced-value loads, or demo-to-fact conversion. |
| M5 — demo identity mapping | Insert only identity-shaped canonical rows and aliases for the 13 demo profiles from the approved baseline fixture. Set mapping to `demo_identity_only`, keep the original legacy slug/IDs and demo classification, and leave unresolved market/configuration/component details explicitly unresolved. Never copy illustrative metric values into accepted claims. |
| M6 — validation and observation | Run migration, constraint, deletion, fail-closed, and 13-profile/API parity tests on a disposable copy. Keep reads on legacy tables unless every gate passes and a separate task authorizes the adapter/read switch. |

Each migration has an ordered filename, a reviewed SQL diff, a recorded checksum, and a migration-journal entry. Apply schema additions before backfill; make backfill idempotent using immutable legacy IDs/slug mappings, not display-name deduplication. Do not drop or relax legacy constraints in this foundation release. If future sparse records require nullable V1 data, design an additive V2 contract rather than adding fabricated values to satisfy V1.

## 8. API and slug compatibility

No API, OpenAPI, client, or UI changes are part of this planning task. The future implementation must preserve the current contract:

- Continue resolving all 13 old slugs in vehicle detail, owner-report filtering, Browse links, Compare IDs, and Calculator prefill.
- Keep current endpoint names and response shapes stable for legacy profiles: `/api/makes`, `/api/catalog/options`, `/api/vehicles`, `/api/vehicles/{vehicleId}`, `/api/vehicles/popular`, `/api/vehicles/trending`, `/api/owner-reports`, and `/api/discovery/stats`.
- Route legacy IDs through `vehicle_profile_aliases` with an explicit mapping state; preserve fallback to the legacy profile while a configuration is ambiguous or unresolved. Never choose the first candidate silently.
- Preserve `makeSlug`, model/year/trim filters, scoped Browse IDs, the complete catalog-options response, Compare’s comma-separated `ids`, and Calculator’s `vehicle` query. Do not use new integer keys in public URLs.
- Keep the legacy DTO projection as an adapter for mapped demo records and verify the JSON output against the §6 baseline. The existing `VehicleSummary` requires many numeric fields and `VehicleDetail` requires fixed report sections; do not send invented zeroes/placeholders for unknown future values.
- If future sparse, sourced profiles need a new contract, add a separately approved versioned/additive DTO with `value_state`, nullable typed values, market, evidence links, and applicability. Regenerate OpenAPI clients in that later task; do not redesign the frontend here.
- Preserve Calculator’s explicit prefill action; loading a profile must not overwrite shopper-edited assumptions.

## 9. Rollback and recovery

1. On a disposable database, test both migration from the baseline and restore from the pre-migration backup. Verify all 13 original slugs, child rows, demo flags, FK relationships, and API snapshots.
2. Before any shared-database change, take and verify a fresh approved backup, pause writes for the migration window, and record the exact migration journal position. The implementation must have a named owner and a tested restore rehearsal.
3. Before canonical rows are used by an API read switch or contain non-demo claims, rollback may use the reviewed reverse migration to remove only the unused additive objects. Reverse in FK dependency order and stop if any canonical rows are referenced.
4. After new claims/configurations exist or reads switch, prefer rolling the application adapter back to the legacy read path while preserving additive tables. Do not drop user/source evidence to achieve rollback. Use a forward repair migration for data errors unless a separately approved restore decision is made.
5. Restore a full backup only to the same intended environment after impact approval, write freeze, and a verified recovery point. A restore can overwrite newer data; never use production restore as a casual migration rollback.
6. Do not use `push-force`, table truncation, reseeding, or `ON DELETE SET NULL` to recover. Any cleanup of retained legacy tables is a later, separately reviewed deprecation task after all consumers and slugs have moved.

## 10. Automated migration, data-integrity, and parity tests

All tests run against a disposable local database. External provider endpoints are not used. The current temporary runner seeds and checks the 13-profile demo fixture, but that fixture is not a pre-migration backup or restore rehearsal and does not replace the protected artifacts in §6.2.

| Test group | Required assertions |
|---|---|
| Migration lifecycle | Fresh database applies every numbered migration; second run is a no-op; migration journal matches the checked-in migration sequence; a failed migration leaves either a known prior version or a clear recovery state. No shared `DATABASE_URL` fallback or `push-force`. |
| Schema constraints | Duplicate canonical brand/model/year/trim keys fail; valid market-specific same-year identities can coexist; invalid year/date intervals, zero/negative fitment quantity, invalid cost range, unsupported field code/type, and wrong typed value fail. |
| Demo baseline | Resolve all 13 legacy slugs; map original legacy IDs; keep every original `is_demo` flag; never set a demo claim to sourced/accepted; counts and stable child relationships match the baseline. An unresolved identity remains a legacy profile rather than being deleted. |
| API parity | Golden-compare list, detail, make, catalog/options, owner reports, stats, popular, and trending responses for the 13 IDs; verify status, ordering, existing required properties, and `isDemo`; compare URL IDs and query filters. |
| Component/configuration identity | Same-name engines are not deduplicated without a stable identity; multiple supported configurations remain distinct; component revisions may vary; no unsupported Cartesian combinations are generated. |
| Market and origin separation | A market-scoped year does not match another market; a parent/owner relationship does not set brand origin; assembly-site country does not set brand origin or sale market; unmarketed demos remain flagged unresolved. |
| Value states | A known numeric zero is retained as known; unknown and not-applicable have no numeric/text/boolean value; not-researched is distinct from value state; a BEV displacement can be not-applicable only when supported. Wrong value type/unit fails validation. |
| Applicability | Positive exact match returns applies; supported complete mismatch returns does-not-apply; missing market/component, partial scope, no scope row, conflicting evidence, or deleted identity returns unknown. AND predicates must all match; OR alternatives require independent supporting evidence; null never broadens to universal. |
| Evidence/review | Each source-derived fact has a linked locator; conflicting evidence remains queryable; source revisions are append-only; restricted rights block content storage/display; stale/rejected claims do not pass publication checks. |
| Deletion behavior | Referenced brands, components, configurations, markets, claims, sources, and evidence cannot be hard-deleted; retire/supersede works without widening applicability; legacy profile aliases stay resolvable. |
| Browser compatibility smoke | Existing Browse cascading filters and URL state, vehicle report, Compare selection/removal/history, and Calculator query prefill still work against legacy profiles. This is regression verification, not a UI redesign. |
| Restore rehearsal | Restore the baseline to a fresh local temporary database; verify checksum, row counts, 13 slug list, demo flags, and API golden outputs before and after migration. |

Any parity difference, missing slug, newly factual-looking demo value, unsupported `applies` result, or unexpected deletion stops the read switch and requires a reviewed correction.

## 11. Temporary legacy structures

Retain the current tables and their legacy constraints through the observation window:

- `makes`, `models`, `generations`, `model_years`, `engines`, `transmissions`, and `trims`;
- `ownership_estimates` and `maintenance_items`;
- `common_problems`, `recalls`, and `safety_ratings`;
- `owner_reports` (current rows remain sample/demo; no direct-submission backend is implied).

Do not rename legacy `makes` to `organizations`, change `trims.slug`, infer a new brand from `makes.origin`, or delete old rows once canonical aliases exist. Keep old API routes on the established adapter until parity is accepted. A future cleanup must inventory consumers, generated clients, user-shared URLs, test fixtures, and backup/restore behavior and receive separate approval.

## 12. Exact implementation sequence after authorization

This is the executor sequence to use only after the specification and migration window are approved:

1. Confirm that the Stage 2A document is approved, source-use gates for any stored source content are settled, and the reconciled 13-profile fixture checks still pass. No real data is required for the foundation.
2. Verify the selected development/test database target and backup destination without exposing credentials. Take the approved baseline backup and schema/API snapshot; verify restore in a uniquely named disposable database.
3. Add the explicit versioned Drizzle migration output and commands. Generate and review the initial SQL migration; do not run schema `push-force`.
4. Add organization, brand, market, production, canonical hierarchy, component/version/fitment, and profile-alias tables in dependency order. Keep every legacy table and API query intact.
5. Add source/revision/evidence, claim/review, applicability, controlled typed-spec, and typed detail tables with FK/check/index tests. Do not call any provider or insert sourced facts.
6. Backfill only the 13 demo identity mappings from the baseline. Set `demo_identity_only`, retain all legacy slugs and IDs, and leave unsupported market/configuration/component associations unresolved.
7. Run schema/migration tests, the 13-profile fixture checks, fail-closed applicability tests, deletion tests, restore rehearsal, and API/URL parity matrix.
8. If any gate fails, do not switch reads; correct with a new reviewed migration or keep the legacy adapter. If every gate passes, present parity results for separate approval before enabling a new read adapter.
9. Keep the old tables and old DTO projection during the observation period. Plan any V2 API or legacy cleanup as a separate approved task.

## 13. Approval gates and explicit stop conditions

The attached decisions resolve the broad product direction: global-ready identities; American-origin candidates and U.S. market first; a separate manufacturer/organization and consumer brand; brand-origin, market, and production geography separated; exact configurations; explicit component versions; fail-closed applicability; distinct value/research states; preserved demo slugs; sparse output allowed; additive reversible migrations; no reliability score requirement.

The following still require owner confirmation before implementation:

1. Approval of this exact table set, alias/mapping semantics, and canonical-versus-legacy read boundary.
2. Approval of the Drizzle versioned migration directory/commands and who may run them in each environment.
3. Approval of baseline backup access, storage, retention, and restore ownership. Do not keep database backups in the repository.
4. The separate 13-profile fixture reconciliation is complete; rerun its disposable-database checks before migration rehearsal. It verifies the demo test baseline only, not backup/restore readiness.
5. Confirmation of `source_revisions` rights-state semantics and legal/procurement approvals before any source content is stored or displayed. This is separate from structural migrations and blocks ingestion/pilot work.
6. Any future change to OpenAPI, client generation, route output, or UI needs its own acceptance after the legacy response parity review.

**Hard stops:** no implementation from this document alone; no SQL migration, backup, restore, API call, import, scrape, VIN lookup, UI change, provider integration, conversion of demo facts, or shared database write. If an identity, market, configuration, source right, or applicability is unknown, keep it unknown and preserve the legacy demo presentation.

## 14. Requested-section coverage

| User-requested subject | Where specified |
|---|---|
| 1. Proposed tables and important columns | §§3.1–3.4 |
| 2. Relationships, FKs, indexes, constraints | §§3–4 |
| 3. Manufacturer/brand/market structure | §§3.1, 5 |
| 4. VehicleConfiguration and component/fitment | §3.2 |
| 5. Applicability structure | §§3.3, 5 |
| 6. Sources/evidence/provenance | §§3.3, 5 |
| 7. Typed facts and value states | §§3.3, 5 |
| 8. Demo/content classifications | §§3.3–3.4, 6, 11 |
| 9. Slug/legacy compatibility | §§3.2, 8, 11 |
| 10. Thirteen-profile baseline and backup | §6 |
| 11. Migration order | §7 |
| 12. Rollback strategy | §9 |
| 13. API compatibility/adapters | §8 |
| 14. Automated migration/parity tests | §10 |
| 15. Legacy structures retained temporarily | §11 |
| 16. Exact post-authorization implementation sequence | §12 |
