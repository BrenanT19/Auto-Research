# Stage 2B — Real-Data Pilot and American Catalog Expansion Plan

**Research cut-off:** 2026-10-01  
**Status:** Planning only; approval required before implementation  
**Scope:** Development-state audit and a proposed first evidence-backed vehicle pilot. No vehicle data, schema, API, UI, catalog, or workflow changes are authorized by this document.

## Executive recommendation

Proceed with a deliberately small, eight-configuration research pilot only after product approval of the pilot identities and legal review of each source’s intended use. Treat each listed vehicle as a **candidate research target**, not a verified, orderable build or approved import. Before creating any canonical configuration, confirm its exact U.S. model-year/trim/powertrain/body/drivetrain combination against a dated primary source and establish permitted source use.

The development catalog is currently in a useful but transitional state: Stage 2A catalog reads are enabled, all 13 legacy demo profiles remain readable, and the alias layer identifies them as demo-only. The inspected development snapshot contains no canonical configurations, source records, evidence, or claims. The current API deliberately excludes exact-supported canonical mappings because its public profile projection is not complete. Therefore:

1. Curated research and private evidence review may proceed after approval and rights checks.
2. Do not serve a real canonical profile publicly until Task #32’s projection and compatibility requirements are resolved and tested.
3. Keep all 13 demo IDs, slugs, URLs, and labels unchanged. Researching a matching real vehicle does not convert or overwrite a demo profile.
4. Fail closed: unresolved identity, evidence, legal rights, or applicability remains unresolved/unknown and blocks publication of the affected claim.

## 1. Current-state audit after Stage 2A

### Observed in the development project

The Stage 2 architecture report and current API source describe these relevant facts:

- Stage 2A adds a canonical catalog and alias layer alongside the legacy vehicle hierarchy. Catalog read mode defaults to `catalog`; the service marks exact-supported mappings as deliberately excluded until the canonical public projection has the required fields ([API source](../api-server/src/lib/vehicle-profile-source.ts#L10-L47), [Stage 2 architecture audit](./STAGE-2-ARCHITECTURE-PLAN.md#current-api-openapi-browse-reports-and-slug-compatibility)).
- The latest read-only development audit found 13 legacy demo trims and 13 aliases, all classified `demo_identity_only`; it found **zero** canonical configurations, source records, claims, and evidence records. Existing list and detail reads returned the 13 demos. These are development observations, not a statement about production.
- The alias catalog is therefore not yet evidence of real vehicle coverage. A demo alias can keep an old profile resolvable, but does not establish a canonical configuration or validate any demo specification.
- Current vehicle responses require a legacy-shaped set of related data. The current API inner-joins the hierarchy, engine, transmission, and estimate; its profile contract also has required fields and placeholder safety/recall status text. This is not a safe general projection for sparse real records yet ([current API findings](./STAGE-2-ARCHITECTURE-PLAN.md#current-api-openapi-browse-reports-and-slug-compatibility)).
- Browse has scoped cascading filters and manufacturer/model suggestions; Compare uses comma-separated profile IDs; Calculator uses a profile ID and explicit estimate-prefill action; the report view still includes illustrative content. Preserve those behaviors rather than treating catalog activation as a UI redesign ([Stage 2 architecture report](./STAGE-2-ARCHITECTURE-PLAN.md#current-api-openapi-browse-reports-and-slug-compatibility)).
- Current issue matching has an important residual fail-open risk: a null engine scope can be eligible for every selected engine, and deleting a referenced engine can set the scope to null. Stage 2B must not treat null as “all configurations” ([Stage 2 architecture report](./STAGE-2-ARCHITECTURE-PLAN.md#current-api-openapi-browse-reports-and-slug-compatibility)).

### Existing demo identities to preserve

All of these remain illustrative and must retain their existing IDs, slugs, routes, Compare/Calculator references, and demo classification:

| Demo profile | Existing public slug |
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

The repeatable development fixture verifies those legacy IDs, slugs, demo flags, and child/API links. It is not a production backup or a migration restore rehearsal ([Stage 2 architecture report](./STAGE-2-ARCHITECTURE-PLAN.md#observed-demo-state-and-exact-public-ids)).

## 2. Stage 2B goals and boundaries

### Goals

- Prove the canonical hierarchy from consumer brand through exact supported vehicle configuration with a small and technically varied sample.
- Establish source-level provenance, review status, typed facts, and independently evaluated applicability before showing real information publicly.
- Exercise actual sparse profiles: real records must remain available when optional maintenance, ownership estimates, ratings, or issues have not been researched.
- Preserve demo/real distinctions and current user-facing links while preparing for systematic American-brand coverage.
- Measure the effort and unresolved data gaps for a later expansion decision.

### Out of scope

- Importing the full U.S. American-brand catalog or historical brands.
- Any automatic scraping of OEM websites, paywalled material, or proprietary databases.
- VIN-level recall lookup, VIN collection, owner-submission features, or reliability scoring.
- Converting or deleting demo profiles, changing their values, or silently mapping their existing slugs to new configurations.
- Browse, autocomplete, Compare, Calculator, or Vehicle Research redesign; the future Browse-by-Brand UI is not part of this stage.
- Production database access or production automotive-provider calls during the planning stage.

## 3. Legal and data-use policy

Public accessibility is not, by itself, a right to store, normalize, cache, redistribute, or commercially display a dataset. Rights must be evaluated for the exact source, dataset/file/API, field set, use, and intended audience. Record the applicable terms and the reviewer’s decision with each source record. If the scope of permission is unclear, mark **NEEDS RIGHTS VERIFICATION** and do not implement ingestion, retention, caching, or public display as though permission exists.

For any source, preflight these questions:

1. Is automated access expressly supported, and are its frequency, pagination, and rate limits documented?
2. May AutoResearch retain the raw response or file, extracted facts, normalized/derived values, and a source copy or hash?
3. May those facts be displayed publicly and redistributed in a commercial product? What attribution, notices, or link-back are required?
4. Are there personal, sensitive, copyrighted, patent-encumbered, or contract-restricted fields or records?
5. Does the source license cover the precise dataset and version, rather than only the hosting agency or a related dataset?
6. Can the source’s revision, retrieval date, effective date, and later correction be tracked?

Current source notes support a cautious start, not blanket approval:

- The ODI complaints dataset record identifies a public-domain label; this is evidence about that named dataset record, not a blanket determination for every NHTSA feed, attached document, personal-data field, or derived product. Confirm the live dataset terms and privacy treatment before ingesting it ([DOT ODI Complaints metadata](../../research/sources/odi-complaints.md#L13-L67)).
- NHTSA’s API documentation describes automated traffic control, and vPIC’s standalone database is described as VIN-decoding-only. Neither statement is a general reuse license; vPIC rights for the intended persistent catalog use remain **NEEDS RIGHTS VERIFICATION**. The captured API-use-policy page states “Last Updated: Jan 2023,” so re-check it before implementation ([vPIC API snapshot](../../research/sources/identity-01-nhtsa-vpic-api.md#L5-L22), [vPIC download documentation](../../research/sources/vpic-downloads.md#L7-L12), [API-use-policy snapshot](../../research/sources/nhtsa-policy.md#L1-L13)).
- EPA/FuelEconomy.gov documents describe official testing, API and download access, and current dataset files; the captured documentation does not establish a blanket license for local retention, caching, derivative catalogs, or commercial redistribution. Those rights remain **NEEDS RIGHTS VERIFICATION** for each selected feed/file ([Fuel Economy downloads](../../research/sources/epa-01-fueleconomy-downloads.md#L7-L43), [web services](../../research/sources/epa-02-fueleconomy-web-services.md#L15-L69), [EPA test-method overview](../../research/sources/epa-03-epa-ev-testing.md#L21-L70)).
- OEM product pages, manuals, order guides, and maintenance schedules can be primary for their own stated specifications or service instructions, but the pages and captured order guide do not grant a general right to bulk-copy or redistribute their contents. OEM storage and display are **NEEDS RIGHTS VERIFICATION**. The 2026 Ford F-150 order guide is useful for testing real compatibility constraints, not a license to reproduce it ([retrieved Ford guide](../../research/sources/brand-pilot-03-ford-f150-order-guide.md#L1-L3)).
- Commercial data vendors are not an assumed fallback. Do not select one until its current data dictionary, source lineage, scope, terms, retention rights, display rights, and update commitments have been reviewed and approved.
- AutoResearch’s own analysis may be stored as original synthesis, but every factual input must remain linked to its evidence and population. Editorial interpretation must not be presented as an official fact.

The public-doc review found no numeric API quota for the recommended NHTSA/EPA sources. Do not infer “unlimited” from silence. Automated retrieval is conditional on a documented, approved access plan and rate controls; otherwise capture sources manually for the pilot.

## 4. Official-source comparison

The table distinguishes source authority from product reuse permission. Source snapshots were checked 2026-10-01; before implementation, re-open each current page, data dictionary, file revision, and terms. No API response from NHTSA SafetyRatings is used here; an inadvertently fetched response is explicitly excluded in the architecture report ([research boundary](./STAGE-2-ARCHITECTURE-PLAN.md#scope-and-evidence-boundary)).

| Source and authority | Useful documented fields / matching level | Update and access | Rights, limits, and recommended pilot use |
|---|---|---|---|
| **NHTSA vPIC** — manufacturer-submitted VIN-assignment information; useful for VIN decoding and identity leads, not as a retail trim authority. Documented methods include VIN decode, WMI, manufacturers/makes/models, variables and JSON/XML/CSV formats. Matching can be VIN or coarser manufacturer/make/model/year depending on method. | Decode values are key/value variables; method coverage and returned variables vary. vPIC recommends including model year and warns that its API is subject to automated traffic control. Standalone PostgreSQL/SQL Server snapshots are available, but documented as VIN-decoding-only. | API, examples, release notes, and dated standalone database downloads. The retrieved vPIC docs report version 4.06 and last code change 2026-06-13; the download page listed 2026-09 files. No numeric request quota was established in the reviewed docs. | **NEEDS RIGHTS VERIFICATION** for storing/reusing values in AutoResearch. Use only as an identity cross-check after rights review; never infer trim, engine, configuration, or brand origin from a partial decode. Not a bulk VIN pilot. [API](https://vpic.nhtsa.dot.gov/api) · [download terms/context](https://vpic.nhtsa.dot.gov/Downloads) · [snapshots](../../research/sources/vpic-root.md#L7-L21), [policy](../../research/sources/nhtsa-policy.md#L5-L11) |
| **NHTSA ODI recalls** — authoritative campaign/recall records, not a vehicle-specific open-recall result. | Reviewed docs show API lookup by model year/make/model or campaign number, plus flat ZIP datasets and field-layout documentation. Campaign population and production constraints must be interpreted from the current record and campaign documents. Model/year/make/model matching is too broad to prove VIN inclusion. | NHTSA describes daily dataset updates and publishes downloadable flat files/dictionaries; dataset page also links public search. Exact field mapping and current API service constraints must be inspected from the current data dictionary before implementation. | Dataset metadata lists a public-domain label, but API automation, storage, caching and redistribution terms still require legal review. Manual campaign-scope review is mandatory; never say “this VIN has an open recall” from model-level matching. [NHTSA dataset/API documentation](https://www.nhtsa.gov/nhtsa-datasets-and-apis) · [recall data snapshot](../../research/sources/nhtsa-datasets.md#L190-L369) · [VIN recall catalog record](../../research/sources/vin-recall-dataset.md#L39-L55) |
| **NHTSA ODI complaints and investigations** — official safety signals and case status, not proof of a defect, prevalence, or reliability. | Complaint dataset entry describes an owner-complaint database; it offers a flat ZIP and points to `CMPL.txt` field documentation. Investigations have separate records and identifiers. Confirm exact field names and population boundaries in the current dictionary before mapping. | DOT dataset metadata says daily update frequency; its record was last updated 2026-09-02 at research time. NHTSA pages list downloadable complaint and investigation files. | Complaint record metadata lists a public-domain label, subject to the exact source and personal-data/legal review above. Human review required for any issue synthesis; counts alone are not a reliability measure. [ODI complaints dataset](https://data.transportation.gov/Automobiles/NHTSA-s-Office-of-Defects-Investigation-ODI-Compla/8qbs-9p4c) · [NHTSA datasets](https://www.nhtsa.gov/nhtsa-datasets-and-apis) · [snapshot](../../research/sources/odi-complaints.md#L13-L67) |
| **NHTSA NCAP / 5-Star Safety Ratings** — authoritative only for the specific NHTSA tests and reported variant. | Documentation describes a year/make/model query followed by tested-variant IDs/descriptions and rating records. Results are tied to the selected tested variant, not necessarily every trim, body style, restraint, drivetrain, or package. | NHTSA describes annual coverage and provides API paths and a downloadable ratings file. The inspected dataset page listed `Safercar_data.csv` with a dated 2026-08-07 update. | **NEEDS RIGHTS VERIFICATION** for automated collection, caching, and public reuse; API terms/quotas were not established. Manual mapping of the tested variant and test year is mandatory. No result means “not found/not covered,” not a zero-star result. Do not use the excluded live response. [NHTSA data docs](https://www.nhtsa.gov/nhtsa-datasets-and-apis) · [rating program](https://www.nhtsa.gov/ratings) · [documented API fields](../../research/sources/nhtsa-datasets.md#L30-L188) |
| **EPA / FuelEconomy.gov** — official fuel economy and EV range label/test data. | Web-service fields include `id`, `year`, `make`, `model`, `engId`, `trany`, `cylinders`, `displ`, `fuelType1`/`fuelType2`, `city08`/`highway08`/`comb08`, alternative-fuel economy fields such as `cityA08`/`highwayA08`/`combA08`, and EV/PHEV range/charge fields where applicable. Resolve an EPA vehicle ID from its exact option row, then retain metric, fuel, unit, and test/label basis. A row is not automatically a trim-equivalence assertion. | JSON/XML services and CSV/XML downloads; the all-years page listed MY 1984–2026 and a 2026-09-29 update. Individual model-year data files are available. EPA explains test cycles, MPGe/charging losses, and adjusted EV-range methodology. | **NEEDS RIGHTS VERIFICATION** for storage, derived catalogs, caching, automation, and redistribution; no numeric quota/blanket license established in reviewed pages. Automate retrieval only after legal review; manually approve every EPA-to-canonical configuration crosswalk. [downloads](https://www.fueleconomy.gov/feg/download.shtml) · [web services](https://www.fueleconomy.gov/feg/ws/index.shtml) · [field definitions snapshot](../../research/sources/epa-02-fueleconomy-web-services.md#L98-L180) · [test methodology](https://www.epa.gov/greenvehicles/fuel-economy-and-ev-range-testing) |
| **EPA certification/test data** — technical compliance and test context, not a complete consumer trim catalog. | Potential supplemental model-type, test-car, emissions, or certification records. Exact fields and join keys depend on each file; inspect the selected current file and dictionary before using. | EPA lists annual test-car and compliance datasets; individual datasets have their own update cadence and revision history. | **NEEDS RIGHTS VERIFICATION**; search-result or landing-page evidence is not adequate to define field coverage or rights. Use for corroboration only after file-level review and manual matching. [EPA data page](https://www.epa.gov/compliance-and-fuel-economy-data) · [captured source notes](../../research/sources/epa-snippets.md#L5-L23) |
| **DOE AFDC** — supplementary alternative-fuel model and infrastructure context. | Retrieved documentation indicates a light-duty alternative-fuel/hybrid/diesel model-offerings dataset, but describes model-level offerings, not exact trim/configuration specs. Dataset-level field coverage varies. | AFDC offers page/data downloads, but specific datasets have different time windows and update dates. Current light-duty offering coverage in the captured result ran through 2025. | Do not use as a canonical configuration source. One AFDC download page says selected data/software are available for any purpose, but the captured permission does not cover every AFDC dataset, linked content, or logo; verify the exact dataset, attribution, and scope before use. [AFDC maps/data](https://afdc.energy.gov/data?page=3) · [data downloads](https://afdc.energy.gov/data_download) · [captured notes](../../research/sources/epa-snippets.md#L25-L43) |
| **OEM specs, order guides, manuals, maintenance schedules, and TSBs** — primary for the publisher’s own stated model-year build rules, specifications, and service instructions. | Exactness can be high when the document names model year, market, trim, engine, body, drivetrain, packages, build dates, and footnotes. Documents can be PDF/HTML and are frequently year/market/revision-specific. The captured 2026 Ford F-150 guide demonstrates mutually constrained engine/body/package availability; it is not a universal vehicle feed. | Manual retrieval from manufacturer consumer/support or media pages; record page/document edition, publication/effective date, retrieval date, section/table, and market. Recheck before relying on an older schedule or order guide. | **NEEDS RIGHTS VERIFICATION** for copying source text/tables, persistent storage, automated retrieval, and public display. Use source links and human-entered normalized facts only after rights review; manual evidence/fitment review is mandatory. [Ford order guide](../../research/sources/brand-pilot-03-ford-f150-order-guide.md#L1-L3) · [OEM manual example](../../research/sources/oem-02-nissan-owner-manual.md#L1-L14) |
| **AutoResearch original synthesis** — original interpretation, not an external authority. | Can describe evidence-supported patterns, known gaps, and methods, with each input and population cited. It cannot manufacture factual coverage from sparse sources. | Reviewed and versioned by an editor; revisit when underlying evidence changes. | Rights attach to the original text and its inputs separately. Never present a synthesis as OEM/NHTSA/EPA fact; do not produce an aggregate reliability score from unrepresentative complaints. |
| **Licensed commercial data, if later necessary** — potentially useful only under a negotiated, current license. | Data dictionary, lineage, geographic/year/configuration coverage, exact source fields, and stable IDs must be supplied before evaluation. | Vendor-specific API/bulk feed, refresh behavior, versioning, support, and quotas must be documented in the current agreement. | Not selected for this pilot. Require written permission for retention, derivative facts, caching, display, attribution, and commercial distribution before recommending it. |

## 5. Proposed pilot configurations

These are eight target scopes, not eight verified entries. The candidate list re-evaluates the Stage 2 architecture proposal, favors technically distinct cases, and avoids pretending one trim represents a full model line. Exact trim availability and every option combination remain subject to primary-source confirmation. If a target cannot be corroborated, replace it before implementation rather than broadening its scope.

| Candidate target scope to verify | Architecture value | Primary-source path and expected initial coverage | Likely unknowns and match risks |
|---|---|---|---|
| **2024 Ford Mustang EcoBoost Fastback — 2.3L turbo, 10-speed automatic, RWD** (verify the exact retail trim and orderable combination) | Conventional ICE passenger-car baseline; tests engine/transmission output and shared model/generation facts without assuming GT facts apply. | Ford’s MY2024 U.S. specifications/order documentation and owner’s manual; matching EPA option row for label metrics; NHTSA model-year recalls/complaints and NCAP only if the tested variant is a defensible match. | Exact named trim, option-induced changes, and engine/transmission crosswalk need primary confirmation. Do not apply GT output, package, or safety results. Maintenance schedule, issue-pattern coverage, and usable public OEM text likely remain unknown pending rights review. |
| **2024 Ford Mustang GT Fastback — 5.0L V8, 6-speed manual, RWD** (verify trim and orderability) | Same model/year family as EcoBoost but a materially different engine and transmission; tests component reuse, powertrain-specific claims, and sibling configuration separation. | Same-year Ford primary specs/order guide and manual, separate EPA row if available, and NHTSA record matching its tested variant. | Do not create an automatic-transmission variant by Cartesian pairing. Keep output and service items at verified engine/configuration scope; package and wheel differences can affect specific facts. |
| **2025 Ford Maverick XLT Hybrid — 2.5L hybrid, FWD** (verify the exact year/trim/build definition) | Conventional hybrid and efficient way to exercise an OEM hybrid system plus EPA hybrid record matching. | Ford MY2025 order/spec data and maintenance schedule; EPA option-level record; NHTSA recall/complaint data with exact population review. | Hybrid system component/output and transmission naming can differ between sources. A model-level EPA row, another trim, or the AWD gasoline/hybrid configuration cannot be substituted. Fuel economy is expected if the exact EPA row is confirmed; battery details and issue evidence may remain unknown. |
| **2025 Chrysler Pacifica Plug-in Hybrid Select — FWD** (verify exact retail trim and model-year availability) | PHEV/minivan tests dual energy paths, electric range/MPGe, charging-loss semantics, and PHEV-specific maintenance scope. | Chrysler MY2025 U.S. PHEV specification sheet, owner’s manual and maintenance schedule; matching EPA record; NHTSA campaign/tested-variant records. | Do not mix gasoline-only Pacifica figures with PHEV facts. Combined system output, battery detail, EPA option row, included charging equipment, and schedule applicability each need their own evidence. Owner patterns remain a separate, low-confidence research stream. |
| **2026 Ford F-150 XLT SuperCrew 4x4, 145-inch wheelbase / 5.5-foot bed — 3.5L PowerBoost hybrid** (verify the guide’s exact ordering row and terms) | Pickup with hybrid complexity; tests cab/bed/wheelbase/engine/drive combinations and constrained towing/payload/package facts. | Retrieved MY2026 Ford order guide, U.S. technical specifications and current owner schedule; EPA record if an exact one exists; NHTSA campaigns, investigations, complaints, and NCAP where variant coverage matches. The retrieved guide demonstrates that engine, body, and packages have non-Cartesian availability rules ([guide snapshot](../../research/sources/brand-pilot-03-ford-f150-order-guide.md)). | Confirm the exact trim/body code, engine code, drive, wheelbase, bed, market, emissions, axle/tire/tow packages, and ordering-revision date. Towing/payload is predicate-bound; no model-wide maximum or generic package inference. If exact combination cannot be confirmed from the guide, do not model it. |
| **2026 Ford F-150 XLT SuperCrew 4x4, 145-inch wheelbase / 5.5-foot bed — 5.0L V8** (verify the guide’s exact ordering row and terms) | Paired with the hybrid pickup, this tests distinct same-body engine applicability and guards against sharing engine issues, output, economy, tow/payload, or maintenance across the pair. | The same dated Ford guide/spec/schedule, separate EPA row if available, and separate campaign/complaint/NCAP applicability checks. | Must confirm that this exact XLT cab/bed/drive/engine combination is offered for the chosen order-guide revision. Treat missing engine-specific scope as unknown; never inherit the hybrid’s facts or infer a match from common nameplate. |
| **2024 Tesla Model Y Long Range AWD — dual-motor U.S.-market configuration** (verify exact model-year U.S. identity and build distinctions) | BEV and existing demo-route compatibility case; tests EPA range/MPGe/energy metrics and market-sensitive manuals/specs. | Tesla U.S. model-year build/technical material and U.S. owner’s manual; matching EPA test record; NHTSA campaigns, complaint signals, and ratings only for an adequately matched tested variant. | U.S. and non-U.S. manuals/configurations are not interchangeable. Motor/battery revision, wheel option, production date, and EPA vehicle ID must not be inferred from marketing name. Keep current demo values untouched. |
| **2024 Chevrolet Corvette Z06 1LZ Coupe — 5.5L LT6 V8, 8-speed DCT, RWD** (verify the exact trim/body/powertrain definition) | Performance case; tests high-output engine/transmission specificity, model-family inheritance boundaries, and inspection facts that should not flow from base Corvette. | Chevrolet MY2024 U.S. Z06 specs/order materials, owner’s manual and maintenance schedule; EPA record if a corresponding record exists; NHTSA recall/complaint and tested-variant safety records. | Verify package, wheel/tire, body, and manual applicability. Do not apply Stingray/base Corvette output or rating, nor turn a performance package into a universal claim. Maintenance/inspection cautions must cite source and scope. |

**Selection gate:** For every candidate, save a completed match sheet before assigning a canonical configuration ID: U.S. market, model year, consumer brand/model, generation evidence, named trim, powertrain, transmission, drive, body/cab/bed where applicable, package predicates, production/ordering period, source revision, and unresolved attributes. The owner/reviewer must approve the match. The table’s exact targets are proposed research questions; they are not verified facts.

## 6. Real-profile field coverage matrix

Profile completeness is not an acceptance goal. Publish only supported values, and let a real identity exist with many unresearched optional sections.

| Profile area | Best initial source path | Expected Stage 2B treatment | Common reason to leave unknown |
|---|---|---|---|
| Brand/model/generation/model year | OEM year-specific lineup and primary model history; vPIC as an identity cross-check | Store brand origin, corporate owner, U.S. availability, and assembly as separate concepts and separately sourced relationships. | Brand lineage or model-year generation boundary is ambiguous. |
| Trim and exact configuration | OEM order guide/spec/order matrix; EPA option row as secondary crosswalk | Create only source-supported combinations; preserve source identifiers and option constraints. | Generic trim label spans different engines/body/drives; model-only matches. |
| Engine, motor, battery, transmission, drivetrain | OEM exact-year technical sheet/manual; regulatory source when fit | Version reusable components; represent configuration-to-component relationship and source scope. | Source names a family rather than exact variant; later part revision not linked to model year. |
| Output, dimensions, capacities, curb/GVWR/towing/payload | OEM technical data; homologation/compliance source if exact mapping is documented | Preserve component vs. system output, units, test basis, optional equipment, and predicates. | Maximum is package/axle/tire dependent or source combines configurations. |
| MPG, MPGe, kWh/100 mi, charging, EV range | Exact EPA vehicle/test record; OEM labeling material as corroboration | Store metrics separately with units, fuel/charge basis, EPA vehicle ID, retrieval/revision, and range method. | EPA option record unresolved; label/test/marketing range differ; no comparable row. |
| Maintenance schedule | Exact U.S. OEM owner’s manual/maintenance guide and edition | Record operation, interval, severe-service conditions, market/config applicability, and link to source section. | Source does not cover the named build; content cannot be retained or displayed under terms. |
| Recalls | NHTSA campaign and manufacturer remedy documents | Model-level campaign mention only at supported affected-population scope; show retrieval date and direct exact-VIN lookup instruction. | Production range, component, or VIN inclusion not established; never imply open recall status. |
| NCAP/safety | NHTSA tested-variant record and program methodology | Show only ratings at matched tested-variant scope, with test year and categories. | No tested variant, body mismatch, or model-year/trim boundary unresolved. |
| Complaints/investigations | NHTSA ODI records and current dictionaries | Research signal with observation window, counts only when scope and denominator are honest, and no prevalence assertion. | Small/biased population, story not verified, matched model insufficiently specific. |
| Known/reported issues and inspection points | NHTSA records plus legally usable OEM bulletins and independently documented research | Keep external owner-reported pattern distinct from direct owner submissions; attach applicability and uncertainty. | Anecdotal or paywalled source, insufficient sample, no exact component/config match. |
| Ownership cost | Explicitly sourced inputs or user-editable calculations, with location/date/currency assumptions | Do not create a default cost or reliability score for a real profile. Label calculations and estimates separately from facts. | Local labor/fuel/electricity/tax assumptions not known or not reviewed. |
| Provenance | Every source record and claim | Show publisher, URL/identifier, document/file revision, source/effective/retrieved dates, exact passage/field, terms decision, evidence class, reviewer, and change history. | Any required provenance or rights field is absent. |

## 7. Ingestion, normalization, and review workflow

The pilot should be an auditable, approval-gated workflow rather than a scraper that writes directly to public records.

| Step | Automate in the pilot? | Required result / control |
|---|---|---|
| 1. Candidate/source discovery | Partially; source registry can hold human-selected links | Record the target vehicle, source publisher, source family, why it is authoritative for the fact, target fields, and initial rights state. A search result alone is a lead, not evidence. |
| 2. Legal/source-use preflight | **Manual approval** | Record permitted access, retention, derivative use, public display, attribution, caching, and refresh. Block retrieval or persistence when material rights are unresolved. |
| 3. Lawful retrieval | Conditional automation only after rights/rate review; otherwise manual | Preserve retrieval time, source revision/effective date, document title, URL or official identifier, format, relevant content locator, integrity hash where permitted, and access method. Honor rate controls; do not scrape around access restrictions. |
| 4. Raw/source record | Automated metadata capture where permitted; original payload storage requires a separate permission gate | Raw source and interpreted claims are separate objects. If raw retention is not permitted, retain only authorized metadata and a source link; do not copy the document. |
| 5. Normalization | Assisted extraction allowed; automated writes remain draft | Preserve verbatim source value/unit where allowed plus normalized typed value/unit and conversion method. Keep original field names, test basis, market, and source row/document anchor. |
| 6. Vehicle/configuration matching | **Manual review for the pilot** | Match source record to exact canonical target with rationale. Automated suggestions can rank matches but cannot publish them. Ambiguous match remains unmatched/unknown. |
| 7. Applicability evaluation | Deterministic shared evaluator plus **human review of rule inputs** | Evaluate each claim against explicit alternatives. Unknown scope never becomes global. Persist evaluated result and rule version for explainability. |
| 8. Evidence and claims | Automated linking scaffolding; **human approval** | Claim records link to supporting, contradicting, qualifying, or derived-from evidence at page/table/field granularity. A URL alone is not enough. |
| 9. Conflict detection | Automate value/scope/unit/revision comparison; human resolves | Preserve both sources and the disagreement. Do not silently pick the newest or most official-looking value. Record adjudication and rationale. |
| 10. Review/verification | **Manual reviewer approval** | Verify authority, exact match, rights, source freshness, field semantics, units, applicability, and public wording. Reviewer and date are required. |
| 11. Publication eligibility | Deterministic gate; no manual bypass | Block if identity, rights, evidence link, value status, applicability, or required review is unresolved. Sparse optional fields do not block the vehicle identity. |
| 12. API/report projection | After Task #32 contract decision and parity tests | Project only eligible, properly scoped claims. Preserve source class, unknown state, evidence link/attribution, and demo/real status. |

### Review and publication states

Use separate state dimensions rather than one overloaded status:

- **Source rights:** `pending_review`, `permitted_for_scope`, `restricted`, `not_permitted`, `expired_or_changed`. These apply to the particular source and intended use.
- **Collection/review:** `not_researched`, `captured`, `normalized`, `matched_pending_review`, `reviewed`, `rejected`, `superseded`.
- **Claim verification:** `unverified`, `source_backed`, `verified_for_scope`, `conflicted`, `withdrawn`.
- **Value state:** `known`, `unknown`, or `not_applicable`. “Not researched,” “not reported by source,” “not offered,” and “not measured” remain distinct reasons, not synonyms.
- **Publication:** `not_eligible`, `eligible`, `published`, `unpublished`. Publishing a profile must not automatically mark every attached claim as verified.

`verified_for_scope` is per claim, never a blanket certification for a whole vehicle page. Source authority and exact-match quality are independent dimensions. A safety agency source does not establish that a rating applies to an untested configuration; an official OEM spec still requires exact model-year/market matching.

## 8. Configuration matching and fail-closed applicability

Use the Stage 2A hierarchy:

**Consumer brand → model → generation → model year → trim → vehicle configuration**

A configuration is a documented real combination, not the product of independent lists of engines, transmissions, drive systems, bodies, packages, batteries, and wheels.

1. **Identity is not provenance.** Stable canonical identity and external source IDs must remain distinct. Save source aliases and the match decision; a VIN decode or EPA ID is not the canonical key.
2. **Each configuration requires positive evidence.** At minimum, primary documentation must establish the named model year, market, trim, and the material configuration attributes represented. Keep unresolved attributes explicitly unknown.
3. **No Cartesian generation.** Enumerate only combinations stated in a source matrix or separately corroborated by a second primary record. A compatible engine list plus compatible body list does not prove their intersection.
4. **Match scope is field-specific.** A model-year campaign can attach to its documented affected model-year population, but cannot prove VIN-level coverage. An EPA row supports only its own named vehicle/test record and metrics. A tested NCAP variant cannot be generalized to a different body/trim unless NHTSA’s record supports that match.
5. **Applicability uses supported alternatives.** Within one alternative, market, year, generation, trim, component, production range, and package constraints combine with AND. Separate independently supported alternatives combine with OR.
6. **Unknown is a real outcome.** Return `applies`, `does_not_apply`, or `unknown`. Missing/conflicting/coarse scope yields `unknown`; do not use a null component ID or empty predicate as universal scope.
7. **Negative scope requires evidence.** `does_not_apply` requires a documented mismatch, not merely a missing source or nonmatching free-text name.
8. **No silent broadening after edits.** Corrected/deleted components or source records must not expand an old claim. Supersede/tombstone the association and require fresh review.
9. **Historical values remain auditable.** Corrections create a new claim/source revision and link to the prior version as superseded/corrected. Preserve the original value, evidence, reviewer decision, and effective dates where permitted.
10. **Campaign and VIN status stay separate.** A recall campaign is not a current VIN result. Any future VIN lookup needs a separate provider-permitted, timestamped result type and explicit staleness/error semantics; that service is out of this pilot.

## 9. Demo and real-profile coexistence

- Keep all 13 demo rows, IDs, slugs, ownership links, calculations, and URLs intact and visibly demo. Do not change their values, attach real evidence to a demo fact, or set demo flags to false.
- Create a separate canonical configuration/profile identity for researched vehicles. A matching make/model/year/trim label is not enough to merge identities.
- Maintain explicit alias records with alias type and target. `demo_identity_only` remains distinct from any future `canonical_equivalent` or legacy-route alias.
- Do not silently redirect an existing demo slug to a real configuration. Preserve the old route and its demo meaning unless a separately approved migration defines what saved links should display and how users are informed.
- If an approved presentation later places real and demo versions side by side, use clear badges and provenance treatment on every surface: Browse, detail/report, Compare, and Calculator. Calculations must carry the originating profile type and not imply demo assumptions are verified inputs.
- A real profile may link to a demo “example” for continuity, but neither profile inherits the other’s facts or evidence. Keep a reversible mapping history.
- Regression-test every exact slug in the table in section 1, including route detail, Browse inclusion, Compare selection, Calculator selection/prefill, and Vehicle Research/Full Ownership Report links.

## 10. Task #32 dependency recommendation and user-facing flow

**Recommendation:** Task #32 is not a prerequisite for private source discovery, legal review, or curated research drafts. It **is** a prerequisite for serving a canonical real configuration through the existing public profile API and claiming end-to-end Stage 2B completion. Keep #32 separate; do not implement it as part of this planning document.

The current API source expressly excludes canonical exact-supported mappings until the complete canonical profile projection exists ([profile read source](../api-server/src/lib/vehicle-profile-source.ts#L42-L47)). The existing response contract expects many legacy values, while a new real profile may lack estimates, owner reports, maintenance, recall, and safety information. Before activation, #32 must settle the response contract and null/unknown semantics, avoid hiding a real identity through required joins, and verify that optional missing research does not remove a valid profile.

Future flow, without redesigning current UI:

- **Browse/search/autocomplete:** Real and demo entries remain distinguishable. Preserve manufacturer/model-level suggestions; do not imply an autocomplete selection identifies an exact build. Existing cascading filters continue to use scoped IDs.
- **Compare:** Stable profile IDs and clear demo/real status; unknown facts render as unknown and cannot be compared as zero or omitted in a misleading way.
- **Calculator:** Preserve the explicit prefill action. A sourced estimate or default cannot overwrite shopper-edited assumptions; calculations remain derived and explain their inputs.
- **Vehicle Research / Full Ownership Report:** Show claim-level sources and applicability; distinguish official fact, calculation, research synthesis, external owner-reported pattern, direct submission, and demo content. Do not render unsourced illustrative checklists as verified vehicle-specific inspection advice.
- **Browse by Brand:** A future data-model capability only; no brand-browse UI in Stage 2B.

## 11. Pilot implementation sequence (for later approval)

No step below authorizes implementation now. Each step requires its own approval and the applicable legal/deployment safeguards.

1. **Approve scope and definitions.** Confirm the American-origin rule, eight target identities, profile versus configuration boundaries, and which source categories may be used.
2. **Resolve rights per source and use.** Approve access, storage, derived values, public display, attribution, update schedule, and any restricted content; exclude unresolved sources.
3. **Close API/data-contract prerequisites.** Resolve Task #32’s canonical projection/null behavior and the compatibility approach for demo and real records; confirm Stage 2A development state and migration strategy before any schema work.
4. **Prepare a rights-aware source registry and one reviewed match sheet per candidate.** Re-fetch current primary sources, record editions/terms, verify orderability and exact market/configuration. Replace any unprovable candidate before loading facts.
5. **Build a draft-only ingestion path.** Add versioned source records, typed facts/claims, applicability, evidence links, conflict state, and review metadata; ingestion must not publish implicitly.
6. **Curate one configuration end-to-end first.** Select the best-supported target after source checks, populate only fields that pass rights and exact-match gates, and test unknown/empty sections.
7. **Run adversarial review and acceptance tests.** Include deliberately mismatched trim, market, component, tested safety variant, unrelated engine, unverified source, conflicting value, and missing optional fields.
8. **Review and publish the first real profile only after explicit owner approval.** Verify Browse, Compare, Calculator, and report behavior; keep the 13 demo URLs unchanged.
9. **Repeat in small batches to finish the pilot.** Review every candidate independently. No bulk publication by brand/model.
10. **Measure and decide.** Report source/rights coverage, match rate, unresolved fields, per-profile review time, conflict/unknown rates, and compatibility results before planning expansion.

## 12. Pilot test and acceptance matrix

| Acceptance test | Pass condition |
|---|---|
| Exact identity | Each published pilot has a reviewer-approved model-year, market, trim, and exact documented configuration; source revision and match rationale are retrievable. |
| Source/evidence linkage | Every displayed factual value has a permitted source, exact evidence locator, source/retrieval/effective dates, units/test basis as relevant, evidence class, and review record. |
| No unsupported combinations | The catalog contains only combinations supported by source rows/rules; pairwise options are not generated by Cartesian product. |
| Fail-closed applicability | Missing engine, battery, market, package, production range, or tested-variant evidence yields `unknown`, not applies-to-all. |
| Negative applicability | `does_not_apply` appears only when an explicit, supported mismatch is recorded. |
| Unknown / not applicable | Unknown, not researched, not reported, not offered, not measured, and semantically not applicable render distinctly where relevant; numeric zero stays a valid known value. |
| Demo/real separation | Demo profiles and child values remain marked demo; no matching identity is automatically promoted; API and UI identify record type. |
| Thirteen existing links | All 13 exact slugs continue to open and retain existing IDs/Compare/Calculator/report linkage and demo status. |
| Browse compatibility | Real profiles appear only when eligible; current manufacturer/model autocomplete and scoped cascading filters remain stable; optional absence does not remove identity. |
| Compare compatibility | Real and demo rows can be distinguished; missing specs are not silently coerced to zero or falsely treated as equal. |
| Calculator compatibility | Explicit prefill still works; user edits remain intact; unsupported/unknown inputs are not substituted with demo values. |
| Vehicle Research compatibility | Claims show exact evidence and scope; current demo copy remains labeled; no unsourced issue/maintenance/inspection claim is presented as verified. |
| Source conflict handling | Conflicting source values remain separately visible to reviewers; only a documented adjudication can make one eligible for display. |
| Update/version handling | A corrected source creates a new revision/claim and preserves previous evidence, value, decision, and effective period; rollback restores prior publication state without erasing history. |
| Rollback/recovery | Disposable migration rehearsal covers applying, partial failure/retry, rollback/recovery, and preserving all demo IDs/links; reviewed backup/restore artifacts exist before risky migration. |
| No unsourced “verified” facts | Contract/API tests prove claim-level verification and rights gates are required for verified/public labels. |
| Sparse profiles remain available | A real canonical identity without optional estimate, maintenance, owner pattern, recall, or rating data remains discoverable and has honest empty states. |
| Recall semantic boundary | A campaign row never renders as a VIN-specific open recall result; exact-VIN result is absent unless a separately approved lookup exists. |
| Safety variant boundary | Only a matching NHTSA tested variant is shown; absent/mismatched variant is labeled unavailable/unknown, not generalized. |
| Data provenance and rights | A source with missing/expired/restricted rights is blocked from the relevant public projection; attribution appears where required. |
| Brand and market separation | Brand origin, corporate parent, U.S. offering, and assembly location are separate attributes and are not inferred from one another. |

## 13. American-brand expansion strategy

### Initial active-brand candidate scope

Use the user’s 13 candidates as a **review queue**, not a claim of a complete or permanent American-brand list:

- Ford and Lincoln
- Chevrolet, Buick, GMC, and Cadillac
- Chrysler, Dodge, Jeep, and Ram
- Tesla, Rivian, and Lucid

This is a reasonable first-stage scope, subject to a product-approved rule and current evidence per brand. Manufacturer rosters support the distinction between brand and parent: GM identifies Chevrolet, Buick, GMC, and Cadillac as its brands; Stellantis groups Chrysler, Dodge, Jeep, and Ram in its North American portfolio, alongside non-U.S.-origin marques; brand origin must therefore not be inferred from corporate group or sales geography ([GM roster](../../research/sources/brand-pilot-01-gm-current-brands.md#L1-L43), [Stellantis/current-brand notes](../../research/sources/brand-pilot-snippets.md#L25-L43)). A manufacturer’s own roster supports its statement about its brands; separate evidence is still needed for brand origin/history and U.S. model-year availability.

Adopt the following decision fields independently:

1. **Consumer-brand origin/history** — the documented historical origin and consumer identity of the marque, reviewed under a written AutoResearch policy.
2. **Corporate parent/manufacturer** — legal/operating entity and effective dates; ownership can change without redefining brand origin.
3. **U.S.-market offering** — evidence that a retail vehicle was offered/delivered for a named U.S. model year. Do not treat a future announcement or reservation page as a delivered offering.
4. **Assembly/manufacturing locations** — separately sourced, potentially multiple, time-bound facts. Assembly location does not define brand nationality.

Keep new/future and historical names outside the active catalog until separately reviewed. Scout is a watchlist case: its own current page reports Volkswagen backing and future plans, which does not by itself establish a retail U.S. model-year configuration; do not treat it as an active production catalog entry without fresh delivery/configuration evidence ([Scout history source](../../research/sources/brand-pilot-02-scout-history.md#L87-L104)). Discontinued/historical brands such as Pontiac, Oldsmobile, Saturn, Mercury, and historic Hummer should be a later controlled expansion. Record successor/sub-brand relationships without presenting a current GMC Hummer EV as proof that the former standalone Hummer marque resumed unchanged.

### Systematic inclusion and deduplication

- Maintain a reviewed brand registry with source, identity rationale, ownership history, U.S.-market year coverage, status, and review date.
- For each approved brand, create model candidates from current official U.S. model-year lineup/order documents. Confirm actual market offering and the year before admitting a model.
- Establish generation boundaries from manufacturer histories/technical sources; do not infer a new generation from model-year styling alone.
- Build trims and exact configurations from source matrices. Add only combinations actually offered, and preserve restrictions on engines, transmissions, cab/bed, drive, battery, packages, build dates, and emissions market.
- Define when two configurations deserve separate research profiles by material differences in powertrain, body/cab/bed, battery/motor, drive, market, or equipment that changes safety, performance, maintenance, operating cost, applicability, or user purchase choice. Cosmetic options that do not change researched facts can remain attributes, not separate profiles.
- Use stable canonical IDs independent of display text, and a reviewed source-alias/deduplication map. Normalize spelling, trim synonyms, model-year names, and component labels without discarding source wording. Never merge solely on a name string, shared platform, VIN prefix, or engine family.
- Require collision review before attaching a new external source ID to an existing identity. Keep alias and merge decisions reversible and versioned.

## 14. Estimating catalog scale

Do not publish a speculative total from today’s brand/model lists. Calculate scale from source evidence after a bounded discovery pass:

1. Freeze the approved brand list and U.S.-market model-year window.
2. For each brand and model year, count verified consumer models from primary U.S. lineup documents.
3. Map each model to a generation and each generation to years with source-supported coverage.
4. Count actually offered trims from dated order/technical documents, keeping regional/effective-date qualifications.
5. For each trim, count **distinct documented configurations**, not the product of attribute values. Track ambiguous or unresolved rows separately.
6. Apply the product-approved profile-splitting rule and deduplicate exact equivalents across source feeds.
7. Report separate totals for `candidate identities`, `verified canonical configurations`, `published real profiles`, and `demo profiles`; provide an uncertainty range when documents are incomplete.

For planning, the scale equation is:

`approved brands × documented U.S. models/year × generation/year coverage × offered trims × source-supported configuration variants`

The factors must be expanded from actual source matrices; multiplication of broad theoretical choices is prohibited. The final profile count is a reviewed distinct-identity count, not the raw product of those factors.

## 15. Risks and unresolved decisions

| Risk / unresolved decision | Consequence | Required decision or mitigation |
|---|---|---|
| Data rights for EPA/NHTSA/OEM storage and redisplay are not uniform or fully established in captured docs. | An accessible page or API could be used outside its license/terms. | Legal approval per exact dataset, field, use, retention, display, and attribution before ingestion. |
| Exact retail trim/configuration is not a stable universal key across sources. | False joins can attach wrong output, recall, safety, maintenance, or economy facts. | Human-approved source crosswalk, stable source IDs, conflict queue, fail-closed applicability. |
| The eight model-year/trim candidates may no longer be orderable or may not match a complete source row. | Pilot scope could assert a fictitious build. | Revalidate model year, U.S. market, trim, and full combination from dated primary docs; substitute or reduce scope rather than infer. |
| Public API contract remains legacy-shaped and Task #32 is unresolved. | Sparse real profiles could disappear, be padded with demo values, or break consumer flows. | Complete Task #32 contract decision and compatibility tests before canonical public activation. |
| The current demo slugs overlap with real vehicles. | Silent identity replacement breaks saved links and makes demo facts appear real. | Separate identity and alias types; preserve all demo routes and values; require a product-approved transition design before remapping presentation. |
| Null applicability can broaden claims, including after a referenced component is deleted. | Unrelated configurations inherit issues. | Explicit applicability alternatives, no null-as-universal, deletion/supersession tests. |
| Complaints and owner anecdotes are biased and have no reliable denominator by default. | Raw counts may be misrepresented as defect prevalence or reliability. | Label as signals; describe population and time window; no numeric reliability score without a defensible method and denominator. |
| OEM maintenance content, TSBs, and technical guides may be restricted or revised. | Unauthorized copying or stale guidance. | Terms review, source versioning, edition/market checks, avoid persistent copying where not permitted. |
| NHTSA model-level recalls are not exact-VIN open status. | Shoppers could falsely believe their vehicle is or is not affected. | Display campaign scope only and link to official VIN lookup; no VIN-status claim in this pilot. |
| Safety ratings apply to tested variants and test years. | A nearby trim/body may be shown with an unsupported rating. | Match variant and method; mark absent/mismatch as unknown. |
| “American” has multiple plausible definitions and corporate ownership changes. | Inconsistent catalog membership and brand claims. | Approve a written consumer-brand origin/history rule; store parent, market, and assembly separately with dates. |
| Source pages change or a dataset metadata date can be stale. | Silent drift, changed fields, or an incorrect freshness claim. | Retain source revision/retrieval timestamps; monitor documented update paths only after rights approval; re-review changed schemas. |
| Existing test fixtures are not a protected backup/restore rehearsal. | A migration failure could harm IDs or links. | Plan reviewed migrations, protected backup/restore and failure-recovery rehearsal before any schema/data migration. |

## 16. Approval gates

### Gate A — approve before Stage 2B implementation

- Approve the eight candidate scope definitions or request substitutions.
- Approve the brand-origin policy and the separation of brand, parent, U.S. market, and assembly.
- Resolve rights for each intended source/use; reject or defer any **NEEDS RIGHTS VERIFICATION** source.
- Decide whether owner-reported issue research is in this stage and approve its evidence rubric. Direct owner submissions remain out of scope.
- Resolve Task #32’s API contract and sparse/null handling before public canonical activation.
- Approve the demo coexistence rule and confirm no existing demo slug is to be redirected or converted without a separate review.
- Approve migration, recovery, and test safeguards before schema implementation.

### Gate B — approve before first real profile publication

- The exact configuration match sheet is complete and reviewed.
- Every displayed claim has permitted, versioned evidence and a clear evidence class.
- Applicability and source conflicts have been reviewed; no unresolved match or rights ambiguity is represented as fact.
- The first-profile acceptance tests pass, including sparse profile behavior and all legacy links.
- The reviewer explicitly approves the public wording, attribution, and profile state.

### Gate C — approve before broad American catalog expansion

- All pilot acceptance tests pass across the eight proposed configurations or owner-approved replacements.
- The pilot report quantifies candidate-to-verified match rates, unsupported/unresolved facts, source rights coverage, review effort, conflict volume, and compatibility outcomes.
- A current brand/year inventory and configuration counting method are available from source evidence.
- The product owner approves the next brand/model-year batch, the source set, refresh duties, and operational review capacity.
- No broad-scale expansion begins on the assumption that pilot sources or terms automatically cover other brands, years, products, or data uses.

## 17. Source notes and evidence boundary

Official-source statements above are limited to the current pages and local snapshots linked at the point of use. The most important primary documentation reviewed for the pilot is:

- [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api) and [standalone downloads](https://vpic.nhtsa.dot.gov/Downloads)
- [NHTSA API use policy](https://api.nhtsa.gov/) and [NHTSA datasets and APIs](https://www.nhtsa.gov/nhtsa-datasets-and-apis)
- [NHTSA ODI complaints dataset](https://data.transportation.gov/Automobiles/NHTSA-s-Office-of-Defects-Investigation-ODI-Compla/8qbs-9p4c)
- [FuelEconomy.gov downloads](https://www.fueleconomy.gov/feg/download.shtml) and [web-service documentation](https://www.fueleconomy.gov/feg/ws/index.shtml)
- [EPA fuel-economy and EV-range testing](https://www.epa.gov/greenvehicles/fuel-economy-and-ev-range-testing)
- [DOE AFDC data](https://afdc.energy.gov/data?page=3)
- [Ford 2026 F-150 Order Guide](https://www.fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2026/order-guides/2026_Ford_F-150_Order_Guide.pdf)
- [GM brand roster](https://www.gm.com/our-brands) and [Stellantis North America brand context](https://www.stellantis.com/en/news/insights/discover-stellantis/north-america-home-of-icons-at-the-heart-of-innovation)

Source snapshots under `research/sources/` capture the fetched content and retrieval dates for local review. Search snippets are used only as leads and do not establish exact configuration facts or rights. The previously fetched live NHTSA SafetyRatings response is excluded. No provider API or production automotive service was called to create this plan.

---

**Decision requested:** approve, revise, or reject this pilot plan before any Stage 2B implementation begins.