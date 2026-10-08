# Catalog source and identity verification

**Research date:** 2026-10-08  
**Scope:** Private development Browse data only. No catalog data or production settings were changed. Public release remains blocked until the owner explicitly approves it.

## Browse census

| Measure | Result |
|---|---:|
| Rows returned by development `/api/catalog/options` | 4,818 |
| Distinct profile IDs | 4,715 |
| Distinct model-year identities | 4,672 |
| Distinct trim/configuration identities | 43 |
| Extra rows from multiple generation/refresh memberships | 103 |
| Model-year IDs with multiple era memberships | 102 |

The 4,818 API rows are selectable Browse options, not 4,818 different vehicles. The 103 additional rows represent 101 model-year IDs with two era memberships and one ID with three. Each repeated ID retains the same make, model, year, and identity level; only the generation/refresh candidate differs. This matches the project rule to preserve overlapping era memberships without treating an era as an exact factory configuration.

## Source-backed model-year entries

The 4,672 bundled identities divide into 3,639 FuelEconomy.gov all-years entries, 488 EPA annual-guide entries, 539 selected historical entries, and 6 NHTSA/vPIC supplement entries. Of the 539 historical entries, 533 are before MY1978 and 6 fall in MY1978–1983. The catalog has 46 source records. Its internal source checks found a source reference, checksum, locator, and `allowed` status for every bundled entry. That internal status is not a substitute for this report's separate, source-specific rights review.

### EPA all-years file

On 2026-10-08, the current official ZIP contained 50,407 vehicle records. All 18,764 vehicle IDs referenced by the 3,639 catalog identities were present. For every referenced row, make, model year, source model label, and EPA base-model grouping matched the catalog crosswalk. There were zero missing IDs or field mismatches.

The current ZIP SHA-256 is `33d32caa0343cdb11c47be631e8a80b7ed7c351ee8503646a4e96485bd67b22f`; the catalog snapshot records `b1ff0e3071c46cdc1c99e0015878b98a01851462d7e447237ce2fc1294ccf303`. Because the checksums differ, this verifies the referenced identities against the live file retrieved on 2026-10-08, not against the byte-identical file reviewed on 2026-10-06.

### EPA annual guides, model years 1978–1983

All six catalogued guide-file checksums matched the currently retrieved official files. Every one of the 908 stored line locators matched its model label:

| Model year | Catalog identities | Source-line locators | Checksum and locator result |
|---|---:|---:|---|
| 1978 | 52 | 101 | Exact |
| 1979 | 52 | 98 | Exact |
| 1980 | 48 | 93 | Exact |
| 1981 | 96 | 179 | Exact |
| 1982 | 114 | 205 | Exact |
| 1983 | 126 | 232 | Exact |
| **Total** | **488** | **908** | **No mismatches** |

This verifies catalog-to-guide references, not that EPA's guides list every vehicle sold in the United States.

### NHTSA/vPIC supplements

All six bundled NHTSA identities were checked against five current vPIC URLs. All requests returned HTTP 200. The exact responses and full JSON payloads are saved with their query URLs in the linked capture files:

| Query scope | Catalog identities | Result |
|---|---|---|
| `GetModelsForMake/RAM?format=json&modelYear=2024` | Ram 2500 and Ram 3500, MY2024 | 112 response rows; both exact `Make_Name` / `Model_Name` labels found |
| `GetModelsForMakeIdYear/makeId/441/modelyear/2008?format=json` | Tesla Roadster, MY2008 | 1 response row; exact model label found |
| Same endpoint for MY2009 | Tesla Roadster, MY2009 | 1 response row; exact model label found |
| Same endpoint for MY2010 | Tesla Roadster, MY2010 | 1 response row; exact model label found |
| Same endpoint for MY2011 | Tesla Roadster, MY2011 | 1 response row; exact model label found |

The Tesla endpoint year and Ram query parameter scope each request to the relevant model year; the returned payloads do not separately echo a `ModelYear` field. Captures: [Ram](sources/catalog-vpic-01-identity-check.md), [Tesla 2008](sources/catalog-vpic-02-identity-check.md), [Tesla 2009](sources/catalog-vpic-03-identity-check.md), [Tesla 2010](sources/catalog-vpic-04-identity-check.md), and [Tesla 2011](sources/catalog-vpic-05-identity-check.md). vPIC's manufacturer-submission and VIN-decoding purpose does not make it a complete retail-sales census.

### Historical supplemental entries and detailed trims

The 539 historical entries use selected secondary references; 533 are pre-1978 and 6 fall in 1978–1983. Their source records are linked, but this pass did not independently verify every historical fact against a complete U.S. archive. The searches found no single source promising complete pre-1984 coverage across all 13 makes.

All 43 trim/configuration profiles return a development-preview detail record with 237 accepted claim-source rows and 26 distinct source URLs. These are provenance links, not an independent audit of each source's terms, and do not establish that every retail trim or package has been catalogued.

## Coverage leads and limits

- Model-year extrema and counts by make are in `catalog-coverage-by-make.csv`; they describe observed catalog rows, not each make's complete history.
- Case-insensitive make/model grouping produces 660 missing-year leads across 70 displayed model identities. These are investigation leads, not confirmed omissions or hiatuses. Wartime stops, model-name transitions, discontinued products, and incomplete historical sources can all produce gaps.
- MY2026 and MY2027 appear in the catalog. MY2027 is preliminary; source presence does not establish finalized retail availability, sale, or delivery. The separate preliminary workbook has 363 MY2027 rows; a make/division plus model/carline name-only crosswalk matched 21 of the 34 catalog MY2027 profiles and did not find 13. No exact vehicle-ID join was established, and a name missing from the workbook is not evidence of no U.S. availability. [Saved workbook crosswalk](sources/release-review-whole-catalog-04-my2027-datafile.md)
- The source set explicitly states that historical coverage is incomplete. EPA/vPIC coverage, archival coverage, model identity, retail availability, and exact trim identity are separate evidence questions.
- Source-specific retention/display/automation rights remain unresolved for some files and endpoints. In particular, the general EPA open-data statement does not resolve every field's provenance; vPIC API restrictions must be applied to the relevant endpoint; and Wikipedia-derived collections and OEM brochure sources need use-specific review.

## Private release-readiness disposition

The separate [release-readiness report](catalog-release-readiness.md) and [row-level disposition CSV](catalog-release-readiness.csv) classify all 4,715 profiles. A 4,099-profile group (3,605 non-2027 EPA all-years, 488 EPA annual-guide, and 6 vPIC) is only a possible first review cohort; the remaining 616 profiles (539 selected historical, 34 MY2027, and 43 trim/configuration) are held. Every row is marked `release_ready_now=No`, and owner approval is not granted. No production data or release settings were changed.

## Audit files

- `catalog-profiles.csv` — one row per distinct profile ID, with source IDs, locators, and era-candidate memberships.
- `catalog-options.csv` — all 4,818 Browse options, including intentional multi-era choices.
- `catalog-trim-evidence.csv` — source URLs and accepted claim rows for the 43 exact trim/configuration previews.
- `catalog-release-readiness.csv` — one disposition row for each of the 4,715 profiles.
- `sources/release-review-trim-source-ledger.md` — 26 exact trim-source URLs and their linked profile counts; not rights clearance.
- `catalog-source-inventory.csv` — the 46 bundled source records.
- `catalog-year-gap-leads.csv` — 660 within-name year gaps to review.
- `catalog-coverage-by-make.csv` — observed make/year counts and historical source layers.

**Decision:** Do not release this catalog yet. It is source-linked and substantially cross-checked against the exact EPA-guide and current EPA/vPIC records described above, but the selected pre-1978 records are not a complete or independently verified history, forward-year profiles remain preliminary, and remaining source-use questions have not been cleared. No release has been made.
