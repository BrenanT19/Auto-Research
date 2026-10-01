# AutoResearch Stage 2 Data Architecture

**Research date:** 2026-10-01  
**Status:** Planning proposal; no schema, application, or catalog change is authorized  
**Evidence convention:** Workspace claims are observations of development code/data, not production guarantees. External references use registered citation markers; evidence supported only by search snippets is identified as limited. Internal implementation references link to inspected files and line anchors. The excluded NHTSA ratings API evidence is not used.

## Executive summary

**Observed.** AutoResearch is a PostgreSQL/Drizzle demo whose path is `makes → models → generations → model_years → trims`. A trim’s unique slug is the public profile ID used in routes, Compare, Calculator, and report relationships. The development snapshot has 13 illustrative profiles across 11 makes/models/generations/model years, 12 engines, and 11 transmissions, plus 13 estimates, 13 maintenance rows, 11 common-problem rows, and 13 owner reports. Recall and safety-rating tables are empty. Every trim, estimate, and owner report is demo material, not verified data or a canonical catalog.

**Assessment.** The hierarchy is a useful compatibility layer, not a long-term domain model: it conflates manufacturer and consumer mark, year-binds components, requires one engine/transmission per trim, and repeats specs. Inner joins to components and estimates hide future records missing either. Per-fact evidence, source revisions, market, units/test basis, effective periods, and value/research states are sparse. Current common-problem filtering does exclude a known different engine, contrary to a stale Stage 1 finding, but a null engine matches every selected engine and engine deletion sets a reference to null. That can broaden narrow evidence.

**Recommendation.** Preserve every old slug as a route alias while adding market-aware manufacturer and consumer-brand identities, dated ownership/name relationships, exact supported configurations, reusable versioned components, and typed specs. Separate claims, evidence, applicability, review status, and value status. Combine constraints with AND within a scope and OR only across independently supported alternatives; missing evidence never broadens a claim. Separate external owner-reported patterns from direct submissions and distinguish facts, estimates, calculations, editorial synthesis, and demos.

**Recommendation.** Proceed only after product and legal/procurement gates. Map the 13 demo slugs to configuration-shaped compatibility targets without validating demo values. Adapters and parity tests must preserve vehicle, Browse, Compare, Calculator, and report links. An isolated runner exists, but it creates a temporary database and seeds only two fixtures—not the 13-profile development catalog. No repository SQL migration history or authoritative 13-profile seed manifest was found; prepare versioned migrations, snapshots, rollback artifacts, and a reproducible demo manifest before schema work.

## Scope and evidence boundary

This planning-only assessment covers development schema/API/Browse/report flows, Stage 1 deltas, sources, brand/pilot scope, and migration gates for a U.S.-first design that can later extend globally. It authorizes no implementation, API call, import, scraping, VIN lookup, new real records, or demo-to-evidence conversion.

**Observed.** Counts come from a read-only development snapshot, not production; notes record the inventory and limitations ([research notes](../../research/notes.md#L13-L25)). No schema/data writes were performed for this report.

**Recommendation.** Store source version/retrieval dates and terms. Snippets are limited evidence, and neither a landing page nor API description proves storage, derivative-use, or redistribution rights. **Research-process note:** one worker inadvertently made a single read-only request to the live NHTSA SafetyRatings endpoint. That response is excluded and not cited. No records were imported, and no project API, database, catalog, or code was changed.

## Current system: relational model and development catalog

### Hierarchy, keys, indexes, and deletion semantics

**Observed.** Drizzle defines `makes` with a serial primary key, required `name`, unique `slug`, required `mark`, `origin` defaulting to `"United States"`, and creation timestamp ([`makes.ts`](../../lib/db/src/schema/makes.ts#L5-L20)). The model table points to a make with `ON DELETE CASCADE`; models have a make-scoped unique slug. Generations point to models with cascade deletion and are unique by `(model_id, start_year)`, while `end_year` may be null and `body_type` is required ([`models.ts`](../../lib/db/src/schema/models.ts#L6-L35)). The `origin` column and current naming mean “make” functions as both corporate maker and consumer mark; `mark` is a second brand-like display string rather than a separate identity.

`model_years` belongs to a generation, cascades when that generation is deleted, and is unique by `(generation_id, year)`. It holds required `fuel_type`. Engines and transmissions each belong to one model-year and cascade with it. Engine horsepower/fuel/availability and transmission gears/availability are required; the schema defines no explicit engine/transmission natural-key uniqueness or reuse across years. `trims` belong to a model-year, require one engine and one transmission, store their own unique public slug and repeat drivetrain, fuel type, economy, horsepower, and price. `is_demo` defaults true ([`vehicles.ts`](../../lib/db/src/schema/vehicles.ts#L13-L75)).

The explicitly visible unique indexes are `makes.slug`, `(models.make_id, models.slug)`, `(generations.model_id, generations.start_year)`, `(model_years.generation_id, year)`, `trims.slug`, and the unique trim relationship in ownership estimates. Serial IDs are database identities; slugs are the stable public identity in route reads. Foreign-key columns are generally not accompanied by explicit additional indexes in these schema declarations. There are no visible check constraints for valid date ranges, positive cost intervals, reliability bounds, horsepower scope, or mileage range ordering. Validation presently relies on non-null columns and generated Zod schemas, not comprehensive domain constraints.

Make deletion cascades through the hierarchy and child profile records. Trim-to-engine/transmission references have no explicit deletion action. A model-year problem may reference an engine, but engine deletion uses `ON DELETE SET NULL`; this can turn a narrow issue into a null-scoped record without evidence it applies broadly ([`research.ts`](../../lib/db/src/schema/research.ts#L6-L18)). Future deletion must preserve/invalidate evidence rather than reinterpret it.

Ownership estimates are one-to-one with trims and require reliability score/label/note, annual cost categories, depreciation, lifespan, and demo flag. Maintenance requires trim, mileage interval, estimated USD cost, and demo flag; both tables cascade with trim deletion ([`ownership.ts`](../../lib/db/src/schema/ownership.ts#L6-L40)). Neither models monthly/severe-duty intervals, other currencies, independent item applicability, actual-versus-estimate status, or source versions.

Common problems require description, mileage range, low/high USD cost, severity, and demo flag. Recall and safety records are model-year-scoped and cascade with that row; they have a small number of source/verification fields but no affected-population model, evidence history, rating test-year/variant, or VIN result ([`research.ts`](../../lib/db/src/schema/research.ts#L20-L50)). Owner reports require a trim, ownership details and text, default demo, and cascade with trim; they do not prove a submission backend exists ([`community.ts`](../../lib/db/src/schema/community.ts#L6-L22)).

**Observed.** Per-field source, retrieved/source revision, evidence location, claim status, currency/unit basis, market, and effective dates do not exist for most facts. `sourceUrl` on a recall or rating is not a full evidence relationship; an official link shown elsewhere does not establish a source for every displayed number. Demo flags exist on the main claim-bearing tables, but some child data are not propagated as flags in route DTOs. The schema does not use immutable revisions for a fact whose value or applicability changes.

### Observed demo state and exact public IDs

The development snapshot has 11 makes, models, generations and model-year rows; 12 engines; 11 transmissions; 13 trims, estimates, maintenance rows and owner reports; 11 common problems; and zero recalls or safety ratings. All trims, estimates and reports are demo. F-150 XLT/Lariat share a row-year engine and transmission. Model Y Long Range/Performance share the row-year transmission but reference two same-name demo engine rows with different illustrative output (384/456 hp); that label does not prove component identity or value correctness.

| Demo profile | Public slug |
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

**Observed.** The isolated runner accepts a disposable local PostgreSQL target, creates a temporary database, pushes schema, seeds only 2024 Ford F-150 XLT and Tesla Model Y Long Range, then drops the database ([fixtures](../../lib/db/scripts/auto-research-test-runner.mjs#L99-L151), [lifecycle](../../lib/db/scripts/auto-research-test-runner.mjs#L268-L343)). It is not the 13-profile catalog source. DB scripts expose `push`/`push-force`, with no checked-in SQL migration history ([`lib/db/package.json`](../../lib/db/package.json#L10-L13)); no authoritative 13-profile seed manifest was found. Stage 1’s claim that test infrastructure was absent is stale. The current `TESTING.md` smoke checklist says all 13 seeded profiles should return, but this isolated runner seeds only two fixtures; reconcile that documentation/fixture mismatch before treating either as migration provenance ([testing guide](./TESTING.md#L120-L141)).

## Current API, OpenAPI, Browse, reports, and slug compatibility

**Observed.** `vehicleSelection` returns `trims.slug` as `id` with hierarchy, component, repeated trim-spec and estimate fields ([projection](../api-server/src/routes/automotive.ts#L35-L77)). `loadVehicles` inner-joins all hierarchy rows, engine, transmission and estimate, hiding a future record without any required relation. Its fallback limit is 100; OpenAPI advertises list default 24/max 100. Sorts are demo rank, reliability and annual ownership cost ([query builder](../api-server/src/routes/automotive.ts#L81-L139)).

Routes cover makes, complete `/catalog/options`, list/detail, popular/trending, owner reports and counts ([handlers](../api-server/src/routes/automotive.ts#L202-L245) [and](../api-server/src/routes/automotive.ts#L286-L389)). Options contain one hierarchy row per trim independent of capped vehicle results ([contract](../../lib/api-spec/openapi.yaml#L43-L57)). List filters now include scoped model/generation/trim IDs alongside legacy names ([OpenAPI](../../lib/api-spec/openapi.yaml#L78-L141)).

Browse has option loading, scoped cascading IDs, URL helpers, invalid-selection detection, `popstate`, and unambiguous resolution of legacy model/trim text ([helpers](./src/shopper-tools.ts#L72-L179), [state](./src/App.tsx#L143-L180), [filters](./src/App.tsx#L240-L281)). Suggestions cover makes/models, not exact builds. Compare uses comma-separated slug IDs, max four, with a 100-row convenience list ([UI](./src/App.tsx#L331-L365), [helpers](./src/shopper-tools.ts#L292-L307)). Calculator reads `?vehicle=` and requires an explicit profile-estimate prefill action; other assumptions remain editable ([calculator](./src/App.tsx#L381-L415)). Migration must preserve all these IDs/links, not just the detail route.

OpenAPI makes MPG nullable but requires many figures and reliability/cost values, requires report arrays and placeholder `recallStatus`/`safetyStatus`, and gives common-problem applicability only `applies | unknown`; `does_not_apply` is unavailable. Specs include unit-like property names, not a universal `value + unit + test basis` contract ([summary schema](../../lib/api-spec/openapi.yaml#L264-L315), [detail/common-problem schema](../../lib/api-spec/openapi.yaml#L316-L413)). The implementation uses hardcoded illustrative overview/checklist copy; `toVehicleDetail` returns `recallStatus: "Not verified — check the VIN with NHTSA"` and `safetyStatus: "Official rating not loaded in this demo"` despite the existing tables, which are empty in the snapshot ([detail mapper](../api-server/src/routes/automotive.ts#L141-L200)). It filters common problems by matching model-year and either null engine or selected engine. It marks equality as `applies` and included null engine as `unknown` ([detail queries](../api-server/src/routes/automotive.ts#L319-L341)). Thus Stage 1’s claim that this route entirely ignored engine constraints is stale. The risk remains substantive: null means eligible for every engine in the query, and deleting a constrained engine sets the issue’s engine ID to null. Null must not be interpreted as supported universal scope.

The report page currently has Overview, Reliability, Ownership costs, and Owner reports navigation; inspection content is a fixed checklist rather than sourced applicability-backed records. It labels issue rows as “Reported problem areas,” attaches mileage/cost/severity values, and labels user report content as sample. The safety aside advises checking an exact VIN and provides official links, but the API status is a placeholder, not a lookup result ([report route](./src/App.tsx#L296-L329)). Community explicitly separates future direct owner submissions from externally researched owner-reported issue patterns and identifies sample scenarios as fictional ([Community](./src/App.tsx#L421-L443)). Direct user reports are not yet accepted.

## Stage 1 comparison: what remains valid, changed, or stale

The prior plan remains a useful requirements baseline, but the present code is materially ahead of some of its implementation-gap statements. The relevant earlier proposal covers current risks, identity/configuration, evidence/applicability, and additive migration ([Stage 1 current-state assessment](../../.local/tasks/auto-research-next-stage.md#L48-L76), [vehicle model](../../.local/tasks/auto-research-next-stage.md#L78-L120), [research and applicability](../../.local/tasks/auto-research-next-stage.md#L178-L253), [migration sequencing](../../.local/tasks/auto-research-next-stage.md#L255-L268)).

| Stage 1 proposal or finding | Stage 2 status |
|---|---|
| Preserve public slugs and keep Browse/report/Compare/Calculator links compatible. | **Still valid.** Slugs are currently returned as IDs and reused in those URLs. Add aliases rather than changing existing paths or silently mapping a slug to a different configuration. |
| Keep all existing values visibly demo; do not promote demo text or estimates to fact. | **Still valid and blocking.** Every profile/estimate/report in the snapshot remains demo; row presence is not evidence. |
| Introduce exact configuration rather than conflating trim and hardware. | **Still valid.** The current trim FK to one engine/transmission plus repeated specs illustrates the problem. |
| Add per-claim sources, units/test basis, unknown values, evidence-strength and review metadata. | **Still valid.** These are still absent for most claims. Distinguish evidential strength from verification status and severity. |
| Separate external owner-pattern research and direct submissions. | **Still valid.** The UI names the distinction, but schema currently has only trim-linked `owner_reports`; no source-backed external pattern family or submission service exists. |
| Model recall facts separately from exact-VIN open-recall status. | **Still valid.** Current text correctly says to check VIN, but the compatibility `recallStatus` is a string placeholder, not a verified service. |
| Ignore no engine scope / detail query returns all problems. | **Stale.** Current query filters to null-engine OR selected-engine. Yet null eligibility and `ON DELETE SET NULL` remain a fail-open widening bug. |
| Isolated DB test infrastructure not present / not yet merged. | **Stale.** A local-only temporary DB runner now exists; it seeds only two fixtures and cannot establish or reproduce the 13-record development catalog. |
| Catalog options, scoped IDs, URL/history and MPGe display remain gaps. | **Changed.** `/catalog/options`, scoped IDs, cascades, URL helpers and MPGe labeling exist; preserve them rather than rebuilding. |
| Cap risk in Browse and comparison discovery. | **Still relevant.** Browse sends 60, Compare/Community fetch up to 100, popular/trending use 8; none guarantee completeness. Define completeness/version semantics for uncapped `/catalog/options`. |
| Calculator profile prefill should be explicit; user edits and formula behavior preserved. | **Still valid.** The current explicit prefill button is the right boundary. Any later sourced field must carry units/provenance and not overwrite a shopper’s edited assumptions. |

## Proposed domain architecture

### Identity: organizations, consumer brands, market, model, and configuration

**Recommendation.** Keep `Manufacturer` (legal/production entity) and `ConsumerBrand` distinct. Store dated ownership/control and sourced brand-description, incorporation, engineering, manufacturing, and assembly facts separately. Parent changes do not erase marque history; a plant does not define brand origin.

Brand eligibility is a policy, not an intrinsic universal field. Proposed definition: documented U.S. consumer-brand origin/history, independent of current parent or manufacturing geography; record evidence and let product owners decide whether U.S.-market availability is a separate filter. A North American operating group is not an origin taxonomy, and Scout’s own history page reports Volkswagen Group backing despite its U.S. operation ([Stellantis, limited company evidence](../../research/sources/brand-pilot-snippets.md#L25-L33) [1](#source-1); [Scout narrative](../../research/sources/brand-pilot-02-scout-history.md#L87-L104) [2](#source-2)).

**Provisional active-brand candidates for owner review.** Ford and Lincoln [3](#source-3); Chevrolet, Buick, GMC and Cadillac [4](#source-4); Chrysler, Dodge, Jeep and Ram as named North American marques [1](#source-1); and Tesla, Rivian and Lucid as current U.S. vehicle-company/consumer-brand candidates [5](#source-5) [6](#source-6) [7](#source-7). These sources identify brands or company activity but do not establish a universal definition of American brand origin, current ownership history, or U.S. model-year availability. Record those relationships separately and approve inclusion only after product owners adopt the brand-origin rule and a primary source supports each relationship. Treat Scout as a watchlist: its company page reports Volkswagen backing, but future-facing copy does not prove retail delivery or exact configuration availability [2](#source-2).

For discontinued history, propose Pontiac, Oldsmobile, Saturn, Mercury and the retired standalone Hummer marque. Represent the current GMC Hummer EV as a GMC product/sub-brand, not as proof that the historical Hummer marque resumed unchanged. GM’s service/archive list also includes Saab, but an archive listing does not establish U.S. brand origin [8](#source-8) [9](#source-9). Ford says it phased out Mercury in 2011 [3](#source-3). Evidence does not establish a complete historical list or every legal origin; publish a reviewed subset, not an exhaustive claim.

`Model` belongs to a consumer brand with possible local aliases. `Generation` is an evidenced engineering/marketing cycle or explicitly provisional editorial grouping; ranges may overlap across markets/body styles. `ModelYear` is a market-specific manufacturer convention, not build/registration year. `Trim` is a year/market sales label, not a mechanical identity. Preserve dated aliases and production/availability periods.

Make `Market`/jurisdiction first-class. A U.S. trim, spec, schedule, test or recall population does not automatically apply in Canada, the EU or elsewhere. Express imports without recasting them as factory offerings in the destination market.

Introduce `VehicleConfiguration` beneath trim for a documented combination—body/cab/bed, drive/axle, wheels, battery/motor layout, package and market/emissions variant—not a Cartesian product of options. Create combinations only from auditable order-guide, homologation, registry, or equivalent evidence; leave unknown compatibility unknown.

Define reusable, versioned engines, transmissions, motors, batteries and energy systems; connect them through explicit year/market/configuration fitment. Reuse identity only when sources support it: calibration, outputs, fuel, installed role/count and system rating may change. Never deduplicate by display name; keep combined-system output distinct from component output.

### Typed facts, values, and applicability

**Recommendation.** Keep hierarchy/filter keys and common facts relational/typed, not a generic string/EAV table or opaque JSON. Define field concepts/units for displacement, output, dimensions, mass, capacity, towing/payload, battery/charging, energy use, range and economy. Each fact records type, canonical/original unit/value, exact scope, test/source basis, market and revision. Preserve component versus system output and measured versus manufacturer-published values. EPA testing illustrates why MPG, MPGe, kWh/100 miles and range cannot collapse into “mpg” [10](#source-10).

Use at least three independent value states:

- **Known:** a supported value exists, including a legitimate numeric zero.
- **Unknown:** the field applies, but the value or a matching source has not been established.
- **Not applicable:** the field does not semantically apply to this propulsion/configuration (for example, engine displacement on a BEV).

Keep **not researched** as process/review state, not as a fourth interchangeable vehicle value: it means the collection/review task has not examined the field. Also distinguish “not reported by source,” “not offered in this market,” “not measured by this rating program,” and “source did not resolve applicability.” Absence of a row is not evidence of zero, not applicable, no defect, or universal fit. vPIC documentation specifically warns that a missing decoded variable means NHTSA lacks data for that variable; mark that interpretation as limited to the cited official documentation and recheck current behavior before adoption [11](#source-11).

**Recommendation: shared fail-closed applicability.** Use an `ApplicabilitySet` with one or more `ApplicabilityAlternative` groups. Within each, market, model/generation/year, trim/config, component, build date and package constraints combine with AND. Groups combine with OR only when each alternative is independently supported. Empty scope is unknown, not universal. Return `applies`, `does_not_apply`, or `unknown`; negative applicability requires a supported mismatch. Missing/coarse/conflicting evidence yields unknown, which differs from “not researched.”

Never use a null foreign key to mean universal. Explicit unrestricted scope requires source, date and review. Retire/tombstone scope without broadening; test positive/negative matches, missing market/component, alternatives, build-date overlap and deleted identity. Reuse the evaluator for issues, maintenance, inspections, recalls, ratings and compatibility.

### Claims, evidence, provenance, conflicts, and review

**Recommendation.** Store each reportable fact, issue, interval, rating or cost range as a claim independent of report pages. A source record carries publisher/type, URL/document ID, title, source and retrieval dates, lawful version/hash, market/scope, format, update behavior, terms and last review. Evidence links point to the claim and exact page/table/field, with `supports`, `contradicts`, `qualifies` or `derived_from` role. Keep source statements separate from AutoResearch interpretation.

Keep conflicts linked and time/version scoped; never silently overwrite. Store decision/rationale/reviewer, evidence strength, verification and applicability separately. “Official” does not prove a configuration match; severity is not confidence. A documented evidence rubric should assess source authority, exact-match relevance, independent corroboration, freshness, coverage/denominator and review; syndicated duplicates are not independent. Cite claims, not a generic homepage for the whole report.

### Research, maintenance, safety, costs, and reports

| Domain | Recommended record and semantic boundary |
|---|---|
| Specifications | Typed, dated claim at component/configuration/market scope; preserve raw/source value and normalized value/unit/test basis, with evidence edge. |
| Reliability research | A reviewed synthesis about a named population and time window, component/system, available evidence, limitations, and review date. No mandatory aggregate score and no score implied by complaint count. |
| Known-issue pattern | A sourced issue claim plus explicit applicability alternatives, symptoms, system, evidence, severity assessment, affected conditions, mileage if supported, repairs/cost basis, and review state. “Reported” does not mean diagnosed or prevalent. |
| Research-owner pattern | A separate external-literature/owner-reported pattern with each forum/survey/review sample’s source, sample, geography, date, inclusion bias, and evidence class. Not a direct AutoResearch user report. |
| Direct owner experience | A future individual submission, clearly first-hand/user-origin, time-stamped, moderation/consent handled if product scope approves it. Keep user’s experience, claim of vehicle identity, and inferred population pattern separate. Current records stay demo; no account/submission backend is authorized. |
| Maintenance | Source-backed required/severe-service tasks and time/mileage interval(s), conditions, market/configuration, source edition, applicable engine/component, and last reviewed. Separate OEM schedule from an AutoResearch planning suggestion and from a repair estimate. |
| Inspection | Generic pre-purchase checklist versus configuration-specific point derived from a sourced issue. Label buyer-observable check separately from a mechanic-only diagnosis; attach same applicability/evidence as originating issue. |
| Recalls | Official campaign identity, issuing agency/manufacturer, affected population/production constraints, announcement/revision/remedy, source, and currentness. One campaign may apply to many configurations. Model-level campaign listing is not exact-vehicle open status. |
| Safety rating | Authority/program, test year, exact tested variant/population, component/result, score, source and scope. Do not extrapolate between body, restraint, package, generation, or market unless the authority says so. |
| Future VIN check | Separate, ephemeral or deliberately retained result entity recording lookup time, provider, exact VIN-derived subject, response coverage, status/error/stale state and provider terms. Never inferred from model-level recall row or basic VIN decode. Avoid raw VIN in URLs, analytics, and unnecessary logs/storage. |
| Estimate/calculation | Explicit estimate or deterministic calculation with inputs, assumptions, formula/model version, location, currency, date, categories included/excluded, and uncertainty range. A user’s calculator result stays user-input-derived; it is not sourced fact. |
| Editorial/demo | `editorial_synthesis` and `demo_fixture` remain distinct classes. Existing score, maintenance price, problem mileage/cost and owner stories stay illustrative until independently sourced and reviewed. |

An observed complaint is an allegation, not a confirmed defect or population rate. A rate requires a credible numerator and denominator and comparable exposure/time window; a recall/investigation is another evidence class, not a “reliability score.” Store evidence count/sample/provenance and known bias. Sparse evidence should render as “insufficient evidence/not researched,” not a low or high score. Official recall/safety records can inform decisions within their defined scopes but do not replace inspection or vehicle history.

## U.S.-first sources: comparative fit and procurement gates

The table describes source-specific evidence found in this research, not assumed entitlements. Where evidence is a search snippet, it is labeled. “Authority” means authority for the fact class indicated, not for every claim derived from it.

| Source | Useful data, format, and authority | Limits, rights, storage, and update gate |
|---|---|---|
| NHTSA vPIC | Government VIN/manufacturer/make/model decoder; documented API formats include JSON/XML/CSV. Useful for identity and decode leads, not a global trim catalog. [11](#source-11) [12](#source-12) | Fields may be absent; absence is not zero or N/A. Downloads are described as VIN-decoding-only. Confirm rates, terms, storage and bulk-use policy before integration. [13](#source-13) [14](#source-14) |
| NHTSA recalls | Official model/year campaign information and a consumer VIN/plate lookup are different products. NHTSA’s vehicle lookup excludes certain repaired campaigns, campaigns with VINs not yet identified, many campaigns older than 15 years, some specialty manufacturers, non-safety issues, and international vehicles. [15](#source-15) [16](#source-16) | Preserve the exact query type, coverage, retrieval time and campaign scope; model-level campaign data cannot prove exact-vehicle open status. API docs do not by themselves grant unrestricted bulk use; verify terms and limits. |
| ODI complaints and investigation records | DOT hosts a flat complaint dataset with history back to 1949; metadata identifies daily updates, most recently dated 2026-09-02 in this review, and labels the dataset public domain. NHTSA also links investigations and manufacturer communications/TSBs. [17](#source-17) [18](#source-18) | Complaints are allegations/trend signals, not confirmed defects or prevalence. Treat TSBs as manufacturer documents, not NHTSA defect determinations. Check document revision, population and copyright/redistribution terms. Do not convert counts to reliability scores. |
| NHTSA NCAP | Annual/model-year ratings for tested variants; authoritative only for the authority’s defined tests. [16](#source-16) [19](#source-19) | Retain tested variant, year, program and categories. Not reliability or exact VIN status; confirm current service terms and fields. |
| EPA / FuelEconomy.gov | Official year/make/model and EPA vehicle-ID data with API and downloadable files; the download page spans 1984–2026 and said its all-years data was updated 2026-09-29. Web services document vehicle/emissions/menu lookups and JSON/XML; downloads include tabular files. [20](#source-20) [21](#source-21) [10](#source-10) | Crosswalk each EPA vehicle ID to an exact market/configuration; labels are test-derived, not owner outcomes. Preserve MPGe/kWh/range/test semantics and file/API retrieval version. Public docs reviewed did not establish API quotas, reuse rights, local-retention license or SLA; verify before adoption. |
| EPA compliance / test-car data | Annual certification/test-car records can supplement identity and revision research. [22](#source-22) [23](#source-23) | Evidence is snippet-only; test cars are not a retail trim catalog. Inspect actual file, date and terms before use. |
| DOE AFDC | Supplementary alternative-fuel model offerings and infrastructure/download context. Search-result metadata describes light-duty offerings across 1991–2025 with a March 2026 update; separate infrastructure/registration datasets have different dates. [24](#source-24) [25](#source-25) | Claims are snippet-only and need dataset-level verification. File-specific scope, attribution and updates differ; not a canonical exact-trim source. Confirm exact download rights, field definitions and retrieval/version before use. |
| OEM manuals, maintenance schedules and TSBs | Primary instructions and schedules by make/year/market; Mazda provides U.S. year/model resources, while the 2023 Nissan manual contains maintenance information. NHTSA-hosted TSBs are maker-issued documents. [26](#source-26) [27](#source-27) [18](#source-18) | Usually PDFs/HTML, not a structured catalog or blanket API. Nissan restricts reproduction/storage/transmission absent permission; Mazda terms were not surfaced. Manuals/TSBs are edition- and market-specific and do not establish issue prevalence. Obtain rights or use a licensed feed; retain edition/revision and applicability. |
| MOTOR | Company documentation describes licensed OEM parts/pricing/service information with web services and bulk-format delivery; a 2015 DaaS brochure described REST/XML/JSON. The older format description is a lead, not a current product specification. [28](#source-28) [29](#source-29) | Exact current fields, vehicle coverage, source lineage, endpoint, storage/derivative/redistribution rights, price and refresh are unverified. Require a current coverage matrix, sample payloads and contract. |
| RepairPal | Snippet-only estimator description combines parts pricing/labor times with proprietary labor-rate modeling; partner integration is mentioned. [30](#source-30) [31](#source-31) | No open API, exact coverage, methodology, geography or reuse rights established. Treat only as candidate estimate input pending documentation and terms. |
| J.D. Power / S&P Global Mobility | Public J.D. Power material markets a JSON REST EV-data API and S&P markets automotive data products. [32](#source-32) [33](#source-33) [34](#source-34) | Landing pages/terms do not establish target fields, market/year coverage, costs, update guarantees, local retention or display/derivative rights. Require current samples, data dictionary, coverage matrix and negotiated terms. |
| Auto Care Association | Standards documentation is login-gated; ACES/PIES are fitment/reference standards, not broad specification, safety, maintenance or reliability corpora. [35](#source-35) | Verify any API/feed, versioning, terms and whether reference data is separately licensed; no broad data right is assumed. |
| NASTF | Industry service/security-information ecosystem. [36](#source-36) | Not a public bulk catalog or automatic right to redistribute OEM service data; membership/security policy review is separate. |
| ISO / SAE identity | ISO WMI summary supports manufacturer-identifier context; full standard is licensed and SAE database access/coverage is unverified. [37](#source-37) [38](#source-38) | WMI identifies manufacturer, not brand, trim or configuration. Confirm edition and terms; a public preview is not a license. |

## Eight-case provisional pilot and exact-match gate

This is a test matrix proposal, not a catalog import or assertion that all candidate values have been validated. Cases are deliberately diverse across hybrid, plug-in hybrid, BEV, multi-engine pickup, and performance vehicle complexity. Several current evidence items are snippet-only, so “candidate” means a retrieval/review exercise; it does not mean ready-to-publish.

| Case | Why it tests the architecture | Minimum evidence gate before a canonical configuration or displayed fact |
|---|---|---|
| 2025 Ford Maverick HEV FWD | Compact hybrid and an EPA record naming year, HEV and FWD. EPA snippet reports a specific vehicle record; Ford spec snippet names its hybrid system. [39](#source-39) [40](#source-40) | Acquire/read the exact Ford year-market spec/order guide and EPA vehicle record, match trim/engine/transmission/drivetrain, preserve EPA test ID/basis, and reject any broader model-only match. Current snippets alone are limited. |
| 2026 Ford F-150, one order-guide-defined configuration | Full-size pickup with cab/bed, engine, drivetrain and package compatibility combinations. Ford order-guide evidence documents many alternatives and demonstrates non-Cartesian fitment. [41](#source-41) | Select one named MY2026 orderable cab/bed/engine/drive/package row from the fetched guide; confirm order-guide revision/effective date and exact availability. Tow/payload claims need their own exact cab/axle/tire/package source and terms. |
| 2025 Chrysler Pacifica Plug-in Hybrid | PHEV/minivan, distinct energy sources and operating costs. Registered OEM specification-sheet snippet identifies the 2025 PHEV document. [42](#source-42) | Obtain actual sheet and owner schedule, match exact trim/market, identify battery/motor/engine/combined outputs, and source EPA values separately. Current title snippet alone does not verify numerical specifications. |
| 2025 Jeep Wrangler 4xe | Off-road PHEV with engine, two motors and high-voltage battery. Manufacturer press-kit snippet describes that architecture and reports a range/MPGe example. [43](#source-43) | Fetch exact model-year manufacturer source and linked EPA record; separate test metrics from system outputs; exact trim, transfer case, tire/package, market and applicability must match before sharing towing/off-road/maintenance claims. |
| 2025 Chevrolet Corvette Z06 | Performance trim where engine/transmission and system output must not inherit generic Corvette values. Chevrolet trim comparison is snippet-only. [44](#source-44) | Fetch exact 2025 Z06 OEM spec and current owner manual; confirm trim, engine, transmission, market, installed equipment, and test scope for every fact. Do not generalize base Corvette data. |
| 2025 Chevrolet Silverado 1500, Double Cab / Standard Bed / Duramax I-6 / 20-inch-wheel example | Full-size pickup and configuration-sensitive towing/load scope; Chevrolet’s snippet describes a conditional maximum-towing example for this combination. [45](#source-45) [46](#source-46) | Treat the combination as a source lead, not a completed match. Obtain a dated model-year tow guide and verify exact engine, axle, wheels/tires, tow package and market; keep the predicate-bound towing claim separate from model-wide specs. |
| 2026 Rivian R1T, exact motor/battery build | BEV with battery/motor variant complexity; the registered current configurator snippet is dynamic and ambiguous about selected option. [47](#source-47) | Candidate only after a reproducible U.S.-market manufacturer build/config document and matching EPA vehicle/label entry are captured and reviewed. Persist a stable configuration identity, selected options, retrieval date and test basis; do not scrape the dynamic URL or infer which mixed snippet value belongs to which pack. |
| 2024 Tesla Model Y Long Range AWD (U.S.-market candidate only) | Existing demo slug provides a compatibility case; market distinction is essential because the registered owner manual is EU-market, not evidence for the U.S. pilot. [48](#source-48) | Obtain U.S.-market manufacturer order/technical documentation and matching EPA record and schedule; confirm build/configuration and exact manual edition. Keep current 384-hp/price/economy/ownership values marked demo and do not adopt EU manual data as U.S. evidence. |

For each case, record source/version, market, exact population, field map/units, match rationale, unresolved fields, evidence class, rights, refresh plan, reviewer, and stop condition. Unsupported fields remain unknown/not researched; demonstrate empty states rather than generic estimates.

## Report projection and future data flow

**Recommendation.** Keep domain tables independent from the current report sections. The current four navigation labels are a presentation view, not a schema design. Build read models/DTOs from typed domain claims, evidence, applicability, research assessments, and estimates:

| Current/future report area | Independent record families to project |
|---|---|
| Vehicle overview/specifications | Configuration identity and scoped typed facts; source link/revision, unit/test basis and confidence for each displayed fact. |
| Reliability / issue patterns | Reliability assessment and issue claims with applicability, evidence class, time/mileage context, conflict notes and limitations; never mandatory score. |
| Maintenance and inspection | Maintenance schedule items, distinct estimate rows, general checklist, and applicability-derived inspection points linked back to issues/source. |
| Recall/safety | Model/configuration campaign/rating records with authority, affected/tested population, dates, currentness and exact limits; separately a future VIN-query status card. |
| Ownership costs/calculator | Versioned estimates/calculations with assumptions/units/currency/geography and manual inputs; no silent prefill overwrite. |
| Owner reports/community | Direct submission records only after separate product approval; external researched owner-pattern records shown with their own provenance; demo scenarios remain fictional. |

Panels may group record classes, and claims may also appear in Compare or Calculator. Do not persist hardcoded placeholders merely because a panel exists. Treat OpenAPI as contract; add fields compatibly and regenerate clients.

## Additive reversible migration of all 13 current profiles

**Recommendation.** This is a representation migration, not a source import. First snapshot all profile and child rows/slugs, approve ID retention, and create a reproducible seed manifest. Map each of the 13 legacy profiles to an initial `VehicleConfiguration` beneath its trim, preserving slugs and IDs where practical. This does not validate demo specs, estimates, issues, maintenance, or owner content; retain demo classification.

Suggested sequence:

1. **Baseline.** Snapshot schema/counts, demo flags, IDs/slugs, API examples, routes/queries and missing sources. Map each legacy trim/slug to a configuration, record unresolved associations, and reconcile the two-profile runner with development data.
2. **Add schema only.** Add manufacturer/brand/history, market/aliases, components/fitment, configuration, typed facts, evidence/revisions, applicability, and record classification. Keep legacy schema/routes readable; no `push-force` or destructive reseed. Number and review SQL migrations with an approved rollback plan.
3. **Backfill identities, not truths.** Create identity/alias records for all 13 demos, preserving IDs/slugs and demo status. Ambiguous identities remain unresolved demo aliases, not invented configurations; no copied claim gains `verified`/`official` status.
4. **Validate.** Test 13/13 slug resolution, uniqueness/FKs, source/value state, applicability, deletion safety, query completeness, and API parity. Cover missing estimate/engine/recall/source and unknown market through OpenAPI/client generation.
5. **Switch reads reversibly.** Adapt new records to existing DTOs, shadow-compare outputs, then switch only after parity/demo-label checks. Retain old tables/read path for an observation window; rollback by restoring the old adapter.
6. **Retire later.** Remove redundant legacy columns only after consumers, routes, links and fixtures move and a separate review approves cleanup.

Never repoint an old slug such as `ford-f-150-2024-xlt` at an unrelated configuration. If ambiguous, keep the labeled demo profile or show a safe chooser—never silently select the first match. Preserve `makeSlug`, Browse legacy links/scoped filters, Compare `ids`, and Calculator `vehicle` while adding canonical IDs.

## Phased rollout, risks, and decisions

**Stage 0 — Decision and controls.** Approve brand/origin and market policy, public identity/slug strategy, value/research/applicability semantics, and migration approach. Obtain legal/procurement review of retention, derivatives, display, documents, and attribution before migration.

**Stage 1 — Architecture specification.** Define ER diagrams, typed fields, constraints/indexes, lifecycle/deletion rules, DTO changes, source model, and applicability/evidence fixtures. Approve the eight cases, field sources, data rights and owners.

**Stage 2A — Additive foundation, separately authorized.** Implement approved migrations, aliases, evidence/applicability foundation and typed configuration; backfill demo identities only. Rehearse/rollback on a copy and preserve legacy API/report fields through adapters.

**Stage 2B — Evidence-backed pilot, separately authorized.** Load only facts passing exact-match and storage-rights gates. Start with curated capture, not broad crawling. Mark partial scope, render unknown when unsourced, maintain EPA/OEM crosswalk states and review visible conflicts.

**Stage 2C — Source operations.** Refresh only permitted sources, with rate limits, cache bounds, provenance, change detection, stale/deleted-source handling, alerts and measured coverage. Separate adapters from domain semantics; require access, security and rights review.

**Stage 2D — Controlled expansion and future VIN.** Expand only after coverage and unknown-state behavior are accepted. A VIN service must provide permitted exact-VIN open/unrepaired status; a decoder or model campaign is not a substitute. Failed/stale/out-of-coverage checks say “unable to verify,” never “no open recalls.” Avoid raw VIN retention absent approval.

### Principal risks and mitigations

- **Demo laundering:** users could mistake current fields for facts during backfill. Preserve demo type per record, prominent disclosures, and block publication unless provenance/review thresholds pass.
- **False configuration match:** similar trim labels may hide engine/body/market differences. Require exact-match gates, source crosswalk, explicit match status, and unresolved alternatives.
- **Scope widening:** null/deleted engine or missing year/market can imply universal applicability. Use explicit alternative groups and fail-closed matching; reject or invalidate scope deletion.
- **Source rights / vendor lock-in:** APIs or PDFs may not permit local storage, derivative use, or display. Contract and counsel approval precede ingestion; preserve provider key/terms/expiry and export/termination plan.
- **Stale and revised claims:** recall, EPA label, OEM manual, prices, and configuration availability change. Keep source versions/retrieval time, effective period, scheduled review, supersession, and stale/error UI.
- **False reliability precision:** counts of unverified anecdotes can look statistical. Separate evidence quality from severity, record denominator/coverage where available, omit an aggregate score without a transparent validated method.
- **Breaking compatibility:** URLs, generated API clients and calculator assumptions may be in use. Additive DTO/alias layer, OpenAPI-first changes, route parity tests, and reversible read switch.
- **Operational overreach:** public API docs do not establish capacity or support. Bounded imports, provider-specific quotas, idempotency, audit trail and incident response are prerequisites, not part of the planning report.

### Decisions required before Stage 2A

1. Is the catalog intended to mean U.S.-origin brands, vehicles sold in the U.S., or both as separately filterable classifications?
2. Which manufacturer/brand/model identities are canonical and what source governs ownership/name-history changes?
3. Is each current slug a legacy profile alias forever, and should a future profile support multiple exact configurations?
4. Which facts are worth typed first-class fields, what are canonical units, and what data must be retained verbatim?
5. What minimum evidence/matching/review threshold makes a fact displayable, and how should conflicts and stale values appear?
6. What exact scope semantics and deletion policy are approved for applicability, especially supported universal scope?
7. Which provider/data contract permits local storage, derived facts, citations, user-facing display, and ongoing updates? What is the legal fallback if terms prohibit one of these?
8. Is an initial public report allowed to be sparse/unknown or without reliability/cost estimates, requiring nullable API fields and no inner-join dependency?
9. Which eight-case pilot candidates and source packets are approved? A snippet-only source or wrong-market manual cannot pass exact-match gate.
10. Which versioned SQL migration tool/review policy, fixture manifest, backup, rollback test, and deprecation window are required before the first migration?

**No implementation authorization.** This document is an architecture and migration plan only. It does not approve a schema migration, seed/data import, source integration, UI/API change, VIN lookup, or expansion of the catalog. Stage 2A should be a separately approved task after the decisions and source-rights gates above are resolved.

## Cited source register

Sources are dated where the page or document provided a date. Otherwise the page was accessed on 2026-10-01. Tier describes authority for the claim type, not universal data quality. Evidence links open the saved source page or search-result note; snippet-only entries do not support claims beyond the recorded excerpt.

<a id="source-1"></a>
### [1] Stellantis North America

- URL: [https://www.stellantis.com/en/news/insights/discover-stellantis/north-america-home-of-icons-at-the-heart-of-innovation](https://www.stellantis.com/en/news/insights/discover-stellantis/north-america-home-of-icons-at-the-heart-of-innovation)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — manufacturer corporate primary source
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: North American operations include American-heritage and non-U.S.-origin brands; snippet only.

<a id="source-2"></a>
### [2] Scout Motors: Our Story

- URL: [https://www.scoutmotors.com/ourstory](https://www.scoutmotors.com/ourstory)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — manufacturer primary source
- Saved evidence: [research/sources/brand-pilot-02-scout-history.md](../../research/sources/brand-pilot-02-scout-history.md)
- Scope / limitation: Company/brand self-description; recheck production and corporate status.

<a id="source-3"></a>
### [3] Ford: The Story of the Mercury Brand

- URL: [https://corporate.ford.com/articles/history/history-of-the-mercury-brand](https://corporate.ford.com/articles/history/history-of-the-mercury-brand)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — manufacturer corporate primary source
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Mercury ended in 2011; snippet only.

<a id="source-4"></a>
### [4] GM Brands

- URL: [https://www.gm.com/our-brands](https://www.gm.com/our-brands)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — manufacturer corporate primary source
- Saved evidence: [research/sources/brand-pilot-01-gm-current-brands.md](../../research/sources/brand-pilot-01-gm-current-brands.md)
- Scope / limitation: GM's current brand roster only; not a universal American-brand definition.

<a id="source-5"></a>
### [5] Tesla, Inc. 2025 Form 10-K

- URL: [https://www.sec.gov/Archives/edgar/data/1318605/000162828026003952/tsla-20251231.htm](https://www.sec.gov/Archives/edgar/data/1318605/000162828026003952/tsla-20251231.htm)
- Date: Filed 2026; 2025 fiscal year; accessed 2026-10-01
- Authority: Tier 1 — SEC company filing
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Supports only the company's disclosed legal/business facts; not a universal brand-origin taxonomy.

<a id="source-6"></a>
### [6] Rivian Begins R2 Public Customer Deliveries

- URL: [https://rivian.com/newsroom/article/rivian-begins-r2-public-customer-deliveries](https://rivian.com/newsroom/article/rivian-begins-r2-public-customer-deliveries)
- Date: Not stated in snippet; accessed 2026-10-01
- Authority: Tier 3 — manufacturer primary source
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Supports company/model activity only; not a general U.S.-origin rule.

<a id="source-7"></a>
### [7] Lucid 2026 Form 10-K

- URL: [https://ir.lucidmotors.com/static-files/e84f1f4e-4624-4cdb-b5ea-54d2f9fbf064](https://ir.lucidmotors.com/static-files/e84f1f4e-4624-4cdb-b5ea-54d2f9fbf064)
- Date: Filed 2026-02-24 per search result; accessed 2026-10-01
- Authority: Tier 3 — company filing copy
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Snippet refers to a predecessor entity; do not use it alone to characterize current domicile or brand origin.

<a id="source-8"></a>
### [8] GM Discontinued Brands

- URL: [https://experience.gm.com/discontinued-brands](https://experience.gm.com/discontinued-brands)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — manufacturer corporate primary source
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Retired marque examples; snippet only.

<a id="source-9"></a>
### [9] Pontiac — GM Heritage Collection

- URL: [https://www.gm.com/heritage/collection/pontiac](https://www.gm.com/heritage/collection/pontiac)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — manufacturer heritage source
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Historical marque lead; snippet only.

<a id="source-10"></a>
### [10] Fuel Economy and EV Range Testing

- URL: [https://www.epa.gov/greenvehicles/fuel-economy-and-ev-range-testing](https://www.epa.gov/greenvehicles/fuel-economy-and-ev-range-testing)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 1 — U.S. EPA primary source
- Saved evidence: [research/sources/epa-03-epa-ev-testing.md](../../research/sources/epa-03-epa-ev-testing.md)
- Scope / limitation: Test basis, adjustments, MPGe and EV range context.

<a id="source-11"></a>
### [11] NHTSA Vehicle Product Information Catalog (vPIC) API documentation

- URL: [https://vpic.nhtsa.dot.gov/api/](https://vpic.nhtsa.dot.gov/api/)
- Date: Version 4.06; code changed 2026-06-13; accessed 2026-10-01
- Authority: Tier 1 — U.S. government primary source
- Saved evidence: [research/sources/vpic-root.md](../../research/sources/vpic-root.md)
- Scope / limitation: VIN decoding/manufacturer/make/model/year; not a complete exact-as-built configuration catalog. Recheck terms/rates.

<a id="source-12"></a>
### [12] NHTSA vPIC FAQ

- URL: [https://vpic.nhtsa.dot.gov/Downloads/FAQ](https://vpic.nhtsa.dot.gov/Downloads/FAQ)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 1 — U.S. government primary source
- Saved evidence: [research/sources/vpic-faq.md](../../research/sources/vpic-faq.md)
- Scope / limitation: Public documentation; check current coverage and rate limits.

<a id="source-13"></a>
### [13] NHTSA vPIC Downloads

- URL: [https://vpic.nhtsa.dot.gov/Downloads](https://vpic.nhtsa.dot.gov/Downloads)
- Date: Snapshot dates in page; September 2026 example; accessed 2026-10-01
- Authority: Tier 1 — U.S. government primary source
- Saved evidence: [research/sources/vpic-downloads.md](../../research/sources/vpic-downloads.md)
- Scope / limitation: Standalone databases are for VIN decoding; other attributes use APIs. Reuse rights need confirmation.

<a id="source-14"></a>
### [14] NHTSA API Use Policy

- URL: [https://api.nhtsa.gov/](https://api.nhtsa.gov/)
- Date: Last updated January 2023; accessed 2026-10-01
- Authority: Tier 1 — U.S. government primary source
- Saved evidence: [research/sources/nhtsa-policy.md](../../research/sources/nhtsa-policy.md)
- Scope / limitation: Policy says consumer API is not intended for third-party bulk VIN lookups; rate controls. Recheck before implementation.

<a id="source-15"></a>
### [15] NHTSA Check for Recalls

- URL: [https://www.nhtsa.gov/recalls](https://www.nhtsa.gov/recalls)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 1 — U.S. government primary source
- Saved evidence: [research/sources/recall-lookup.md](../../research/sources/recall-lookup.md)
- Scope / limitation: Consumer VIN/plate lookup coverage exclusions; result needs time/coverage qualifier.

<a id="source-16"></a>
### [16] NHTSA Datasets and APIs

- URL: [https://www.nhtsa.gov/nhtsa-datasets-and-apis](https://www.nhtsa.gov/nhtsa-datasets-and-apis)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 1 — U.S. government primary source
- Saved evidence: [research/sources/nhtsa-datasets.md](../../research/sources/nhtsa-datasets.md)
- Scope / limitation: Static source descriptions for recalls, NCAP, complaints and related datasets.

<a id="source-17"></a>
### [17] NHTSA ODI Complaints dataset

- URL: [https://data.transportation.gov/Automobiles/NHTSA-s-Office-of-Defects-Investigation-ODI-Compla/8qbs-9p4c](https://data.transportation.gov/Automobiles/NHTSA-s-Office-of-Defects-Investigation-ODI-Compla/8qbs-9p4c)
- Date: Catalog metadata updated 2026-09-02; accessed 2026-10-01
- Authority: Tier 1 — U.S. government dataset/catalog
- Saved evidence: [research/sources/odi-complaints.md](../../research/sources/odi-complaints.md)
- Scope / limitation: Daily updated public complaint data; complaints are not a defect finding or prevalence denominator.

<a id="source-18"></a>
### [18] NHTSA Resources Related to Investigations and Recalls

- URL: [https://www.nhtsa.gov/resources-investigations-recalls](https://www.nhtsa.gov/resources-investigations-recalls)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 1 — U.S. government primary source
- Saved evidence: [research/sources/recall-resources.md](../../research/sources/recall-resources.md)
- Scope / limitation: Investigations, communications and recall resources are separate evidence classes.

<a id="source-19"></a>
### [19] NHTSA Ratings / NCAP program

- URL: [https://www.nhtsa.gov/Ratings](https://www.nhtsa.gov/Ratings)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 1 — U.S. government primary source
- Saved evidence: [research/sources/ratings-program.md](../../research/sources/ratings-program.md)
- Scope / limitation: Ratings apply only to tested variants/programs; preserve test basis.

<a id="source-20"></a>
### [20] Download Fuel Economy Data

- URL: [https://www.fueleconomy.gov/feg/download.shtml](https://www.fueleconomy.gov/feg/download.shtml)
- Date: All-years data page updated 2026-09-29; accessed 2026-10-01
- Authority: Tier 1 — EPA/DOE program source
- Saved evidence: [research/sources/epa-01-fueleconomy-downloads.md](../../research/sources/epa-01-fueleconomy-downloads.md)
- Scope / limitation: 1984–2026 files; label data/test context; verify file-specific terms and version.

<a id="source-21"></a>
### [21] FuelEconomy.gov Web Services

- URL: [https://www.fueleconomy.gov/feg/ws/index.shtml](https://www.fueleconomy.gov/feg/ws/index.shtml)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 1 — EPA/DOE program source
- Saved evidence: [research/sources/epa-02-fueleconomy-web-services.md](../../research/sources/epa-02-fueleconomy-web-services.md)
- Scope / limitation: Vehicle, emissions, menus and fuel-price endpoints; terms/limits/SLA not established by docs reviewed.

<a id="source-22"></a>
### [22] EPA Compliance and Fuel Economy Data

- URL: [https://www.epa.gov/compliance-and-fuel-economy-data](https://www.epa.gov/compliance-and-fuel-economy-data)
- Date: Search result says updated 2026-07-30; accessed 2026-10-01
- Authority: Tier 1 — U.S. EPA primary source
- Saved evidence: [research/sources/epa-snippets.md](../../research/sources/epa-snippets.md)
- Scope / limitation: Snippet only; follow links and inspect dataset-specific fields before use.

<a id="source-23"></a>
### [23] EPA Data on Cars Used for Testing Fuel Economy

- URL: [https://www.epa.gov/compliance-and-fuel-economy-data/data-cars-used-testing-fuel-economy](https://www.epa.gov/compliance-and-fuel-economy-data/data-cars-used-testing-fuel-economy)
- Date: Annual files; snippet shows 2026 January 2026, 2024 May 2025; accessed 2026-10-01
- Authority: Tier 1 — U.S. EPA primary source
- Saved evidence: [research/sources/epa-snippets.md](../../research/sources/epa-snippets.md)
- Scope / limitation: Test-car records are not a comprehensive retail trim catalog; snippet only.

<a id="source-24"></a>
### [24] DOE Alternative Fuels Data Center Maps and Data

- URL: [https://afdc.energy.gov/data?page=3](https://afdc.energy.gov/data?page=3)
- Date: Model offerings updated March 2026 per search result; accessed 2026-10-01
- Authority: Tier 1 — U.S. DOE primary source
- Saved evidence: [research/sources/epa-snippets.md](../../research/sources/epa-snippets.md)
- Scope / limitation: Alternative-vehicle model offerings and infrastructure context; not exact trim catalog; snippet only.

<a id="source-25"></a>
### [25] DOE Alternative Fuels Data Center Data Downloads

- URL: [https://afdc.energy.gov/data_download](https://afdc.energy.gov/data_download)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 1 — U.S. DOE primary source
- Saved evidence: [research/sources/epa-snippets.md](../../research/sources/epa-snippets.md)
- Scope / limitation: Terms statement scoped to specific downloads; infrastructure datasets are not vehicle specs; snippet only.

<a id="source-26"></a>
### [26] Mazda Owner Resources

- URL: [https://www.mazdausa.com/owners/how-to-use-my-mazda](https://www.mazdausa.com/owners/how-to-use-my-mazda)
- Date: Not stated; returned page covered 2000–2026; accessed 2026-10-01
- Authority: Tier 2 — manufacturer primary source
- Saved evidence: [research/sources/oem-01-mazda-owner-resources.md](../../research/sources/oem-01-mazda-owner-resources.md)
- Scope / limitation: Year/model manuals; U.S.-vehicle scope; page did not state reuse rights.

<a id="source-27"></a>
### [27] 2023 Nissan Versa Owner's Manual

- URL: [https://www.nissanusa.com/content/dam/Nissan/us/manuals-and-guides/versa/2023/2023-nissan-versa-owner-manual.pdf](https://www.nissanusa.com/content/dam/Nissan/us/manuals-and-guides/versa/2023/2023-nissan-versa-owner-manual.pdf)
- Date: 2023 model year; accessed 2026-10-01
- Authority: Tier 2 — manufacturer primary source
- Saved evidence: [research/sources/oem-02-nissan-owner-manual.md](../../research/sources/oem-02-nissan-owner-manual.md)
- Scope / limitation: Maintenance information; reproduction/storage/transmission requires prior written permission.

<a id="source-28"></a>
### [28] MOTOR Our Data

- URL: [https://dev-www.motor.com/about-motor/our-data](https://dev-www.motor.com/about-motor/our-data)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — commercial provider
- Saved evidence: [research/sources/oem-03-motor-data-provenance.md](../../research/sources/oem-03-motor-data-provenance.md)
- Scope / limitation: Licensed data and delivery options described; exact current coverage/rights require contract verification.

<a id="source-29"></a>
### [29] MOTOR Data-as-a-Service brochure

- URL: [https://www.motor.com/wp-content/uploads/2015/11/daas-product-description.pdf](https://www.motor.com/wp-content/uploads/2015/11/daas-product-description.pdf)
- Date: 2015; accessed 2026-10-01
- Authority: Tier 3 — commercial provider
- Saved evidence: [research/sources/oem-snippets.md](../../research/sources/oem-snippets.md)
- Scope / limitation: Historical REST/API brochure; stale and insufficient for current coverage/terms.

<a id="source-30"></a>
### [30] RepairPal Repair Cost Estimator

- URL: [https://repairpal.com/estimate](https://repairpal.com/estimate)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — commercial/editorial estimate
- Saved evidence: [research/sources/oem-snippets.md](../../research/sources/oem-snippets.md)
- Scope / limitation: Parts/labor model; API, geography, rights and field coverage not established.

<a id="source-31"></a>
### [31] RepairPal Partner Integrations

- URL: [https://partnersuccess.repairpal.com/article/302-website-integrations](https://partnersuccess.repairpal.com/article/302-website-integrations)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — commercial provider
- Saved evidence: [research/sources/oem-snippets.md](../../research/sources/oem-snippets.md)
- Scope / limitation: Partner access claim only; does not establish generally available API rights.

<a id="source-32"></a>
### [32] J.D. Power EV Data API

- URL: [https://www.jdpower.com/business/ev-data-api](https://www.jdpower.com/business/ev-data-api)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — commercial provider
- Saved evidence: [research/sources/oem-snippets.md](../../research/sources/oem-snippets.md)
- Scope / limitation: Marketing/docs do not establish full field coverage, pricing, or redistribution terms.

<a id="source-33"></a>
### [33] J.D. Power Terms of Use

- URL: [https://www.jdpower.com/business/terms-conditions](https://www.jdpower.com/business/terms-conditions)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — commercial provider
- Saved evidence: [research/sources/oem-snippets.md](../../research/sources/oem-snippets.md)
- Scope / limitation: Terms are product-specific; obtain written data license and sample.

<a id="source-34"></a>
### [34] S&P Global Mobility Data Lake

- URL: [https://www.spglobal.com/mobility/en/products/automotive-mobility-data-lake.html](https://www.spglobal.com/mobility/en/products/automotive-mobility-data-lake.html)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — commercial provider
- Saved evidence: [research/sources/oem-snippets.md](../../research/sources/oem-snippets.md)
- Scope / limitation: Public landing page insufficient to establish exact source coverage or rights.

<a id="source-35"></a>
### [35] Auto Care Digital Standards

- URL: [https://digital.autocare.org/standards](https://digital.autocare.org/standards)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 2 — industry standards body
- Saved evidence: [research/sources/oem-snippets.md](../../research/sources/oem-snippets.md)
- Scope / limitation: Reference/fitment standard context, not evidence of complete specifications/maintenance data.

<a id="source-36"></a>
### [36] National Automotive Service Task Force

- URL: [https://www.nastf.org/](https://www.nastf.org/)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 2 — industry service-information organization
- Saved evidence: [research/sources/oem-snippets.md](../../research/sources/oem-snippets.md)
- Scope / limitation: Secure service/security-info access; not a public catalog feed.

<a id="source-37"></a>
### [37] ISO 3780:2009 — World manufacturer identifier (WMI)

- URL: [https://www.iso.org/cms/live/live/en/sites/isoorg/contents/data/standard/04/58/45844.html](https://www.iso.org/cms/live/live/en/sites/isoorg/contents/data/standard/04/58/45844.html)
- Date: 2009; corrigendum 2010; accessed 2026-10-01
- Authority: Tier 1 — international standards body
- Saved evidence: [research/sources/identity-03-iso-3780.md](../../research/sources/identity-03-iso-3780.md)
- Scope / limitation: Public summary only; full standard is licensed/purchased.

<a id="source-38"></a>
### [38] SAE WMI/VIN Information

- URL: [https://legacy.sae.org/standards/development/wmi-vin-information](https://legacy.sae.org/standards/development/wmi-vin-information)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 2 — standards organization
- Saved evidence: [research/sources/identity-snippets.md](../../research/sources/identity-snippets.md)
- Scope / limitation: Snippet indicates standards/database access; scope, price and reuse need verification.

<a id="source-39"></a>
### [39] EPA Fuel Economy record: 2025 Ford Maverick HEV FWD

- URL: [https://fueleconomy.gov/Feg/noframes/48869.shtml](https://fueleconomy.gov/Feg/noframes/48869.shtml)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 1 — EPA/DOE program source
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: One EPA vehicle record only, not all Maverick trims; snippet only.

<a id="source-40"></a>
### [40] 2025 Ford Maverick and Lobo Technical Specifications

- URL: [https://www.fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2025/specs/2025-Ford-Maverick-and-Lobo-Technical-Specs.pdf](https://www.fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2025/specs/2025-Ford-Maverick-and-Lobo-Technical-Specs.pdf)
- Date: 2025 model year; accessed 2026-10-01
- Authority: Tier 3 — OEM product document
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: HEV vs EcoBoost details; snippet only.

<a id="source-41"></a>
### [41] 2026 Ford F-150 Order Guide

- URL: [https://www.fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2026/order-guides/2026_Ford_F-150_Order_Guide.pdf](https://www.fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2026/order-guides/2026_Ford_F-150_Order_Guide.pdf)
- Date: Effective Job #2, 2026-04-06; accessed 2026-10-01
- Authority: Tier 3 — OEM product document
- Saved evidence: [research/sources/brand-pilot-03-ford-f150-order-guide.md](../../research/sources/brand-pilot-03-ford-f150-order-guide.md)
- Scope / limitation: Year-specific packages and availability; confirm each configuration and rights.

<a id="source-42"></a>
### [42] 2025 Chrysler Pacifica Plug-in Hybrid Specification Sheet

- URL: [https://stellantis-wn2025-assetlib.s3.amazonaws.com/resources/2025_CH_Pacifica_Plug-in_Hybrid.SP.pdf](https://stellantis-wn2025-assetlib.s3.amazonaws.com/resources/2025_CH_Pacifica_Plug-in_Hybrid.SP.pdf)
- Date: 2025 model year; accessed 2026-10-01
- Authority: Tier 3 — OEM product source
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: PHEV/MPV pilot evidence; snippet verifies document only.

<a id="source-43"></a>
### [43] 2025 Jeep Wrangler 4xe Press Kit

- URL: [https://media.stellantisnorthamerica.com/newsrelease.do?id=26168](https://media.stellantisnorthamerica.com/newsrelease.do?id=26168)
- Date: 2025 model year; accessed 2026-10-01
- Authority: Tier 3 — OEM product source
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: PHEV architecture; exact trims/footnotes must be confirmed.

<a id="source-44"></a>
### [44] 2025 Chevrolet Corvette Z06 Trim Comparison

- URL: [https://www.chevrolet.com/shopping/configurator/performance/2025/corvette/corvette-z06/compare](https://www.chevrolet.com/shopping/configurator/performance/2025/corvette/corvette-z06/compare)
- Date: 2025 model year; accessed 2026-10-01
- Authority: Tier 3 — OEM product source
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Z06-specific engine/transmission; snippet only.

<a id="source-45"></a>
### [45] 2025 Chevrolet Silverado 1500

- URL: [https://www.chevrolet.com/trucks/previous-year/silverado/1500](https://www.chevrolet.com/trucks/previous-year/silverado/1500)
- Date: Model year 2025; accessed 2026-10-01
- Authority: Tier 3 — OEM product source
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Towing is configuration/predicate-specific; snippet only.

<a id="source-46"></a>
### [46] 2025 Ford F-150 Towing Guide

- URL: [https://www.ford.com/content/dam/brand_ford/en_us/brand/towing/pdf/2025-Ford-F150-Towing-Guide-1.pdf](https://www.ford.com/content/dam/brand_ford/en_us/brand/towing/pdf/2025-Ford-F150-Towing-Guide-1.pdf)
- Date: 2025 model year; accessed 2026-10-01
- Authority: Tier 3 — OEM product document
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Towing guidance is configuration-dependent; snippet only.

<a id="source-47"></a>
### [47] Rivian R1T Configurator

- URL: [https://rivian.com/configurations/builder/r1t/build?CONFIG=GEN-2_2026_RGN-USA_MOT-201_EXP-LSV_ROOF-FGP_WHL-2SS_INT-BMP_UTL-T01_TON-P02_PROC40WJ94_PKG-ADV_CHRG-NACS01_BLD-DR1T_ACTBDG-DRK_BAT-A01](https://rivian.com/configurations/builder/r1t/build?CONFIG=GEN-2_2026_RGN-USA_MOT-201_EXP-LSV_ROOF-FGP_WHL-2SS_INT-BMP_UTL-T01_TON-P02_PROC40WJ94_PKG-ADV_CHRG-NACS01_BLD-DR1T_ACTBDG-DRK_BAT-A01)
- Date: 2026 model year in selected URL; accessed 2026-10-01
- Authority: Tier 3 — OEM dynamic configurator
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Dynamic selection and ambiguous snippet; do not scrape or use as static verification.

<a id="source-48"></a>
### [48] Tesla Model Y EU Owner's Manual — Subsystems

- URL: [https://www.tesla.com/ownersmanual/modely/en_eu/GUID-E414862C-CFA1-4A0B-9548-BE21C32CAA58.html](https://www.tesla.com/ownersmanual/modely/en_eu/GUID-E414862C-CFA1-4A0B-9548-BE21C32CAA58.html)
- Date: Not stated; accessed 2026-10-01
- Authority: Tier 3 — OEM manual, wrong market for U.S. population
- Saved evidence: [research/sources/brand-pilot-snippets.md](../../research/sources/brand-pilot-snippets.md)
- Scope / limitation: Explicitly not used to populate U.S. pilot; demonstrates market scoping.

