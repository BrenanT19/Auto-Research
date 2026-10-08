# Research Notes: U.S. Automotive Catalog Coverage

**Status:** complete  
**Depth:** Deep

## Plan

- **Question:** What does the development Browse catalog actually contain, how much of its U.S. model-year history is source-verified, and what prevents release?
- **Scope:** Private audit of the 13 target makes, 4,818 development Browse choices, profile identities, source locators, historical gaps, exact trim previews, MY2026/2027 claims, and source-use terms. No production data or release settings may be changed.
- **Audience:** AutoResearch product owner.
- **Deliverable:** A cited Markdown and standalone HTML report, unique-profile/option exports, row-level source checks, make coverage, gap leads, and a clear release-readiness recommendation. Publication remains subject to the owner's explicit approval.

## Focus Areas

| # | Area | Status | Sources |
|---|---|---|---|
| 1 | EPA/FuelEconomy.gov and NHTSA identity-source scope | complete; limits retained | EPA, NHTSA, eCFR |
| 2 | Ford/Lincoln history and nameplate/year distinctions | complete; historical gaps retained | 6 URLs |
| 3 | Buick/Cadillac/Chevrolet/GMC archives and continuity limits | complete; archive gaps retained | 5 URLs |
| 4 | Chrysler/Dodge/Jeep/Ram transitions and identity labels | complete; year-specific questions retained | 4 URLs |
| 5 | Tesla/Rivian/Lucid launch-year and forward-year evidence | complete; 2027 remains preliminary | 12 URLs |
| 6 | Historical source availability and source-use rights | complete; unresolved rights called out | EPA, GM, NHTSA, CC BY-SA |

## Coverage Checklist

- [x] Reconcile API choices with unique profiles and identity levels.
- [x] Match all EPA all-years and annual-guide source references against current official files.
- [x] Match each NHTSA supplement against current exact model/year results and save all five endpoint responses.
- [x] Separate selected historical sources from primary, exhaustive market evidence; carry remaining uncertainty into Limitations.
- [x] Report observed make/year ranges and produce a case-insensitive list of within-name gap leads.
- [x] Distinguish model-year identities, trim/configuration previews, overlapping generation memberships, and actual retail availability.
- [x] Review source-use questions and recommend whether public release is supported; no release is authorized.

## Findings Log

_`[@key]` markers refer to `research/sources.json`; local audit files are linked directly._

### Census and identity levels

- The development Browse API returns 4,818 selectable choices but only 4,715 distinct profile IDs: 4,672 model-year identities and 43 trim/configuration profiles. The 103 extra choices are intentional generation/refresh memberships on 102 model-year IDs, not additional vehicle profiles. ([options](catalog-options.csv), [profiles](catalog-profiles.csv), [source audit](catalog-source-verification.md))
- The profile CSV preserves all source locators and the internal rights status separately from the new external verification result; its “allowed” value is not a public redistribution clearance.
- The 43 preview trim identities have 237 accepted evidence rows and 25 distinct source URLs. This documents linked claims, not completeness of the retail trim catalog or clearance of source-specific terms. ([trim evidence](catalog-trim-evidence.csv))

### Source verification

- Static model-year source composition is 3,639 EPA all-years entries, 488 EPA annual-guide entries, 539 selected historical entries, and 6 NHTSA/vPIC supplements. Five current vPIC URLs covered the six supplements. Of the 539 secondary historical entries, 533 are before MY1978 and 6 are within MY1978–1983.
- All 18,764 vehicle-ID references attached to the 3,639 EPA identities were present in the current official file retrieved 2026-10-08; make, year, source model label, and base-model group matched with zero mismatches. The current ZIP checksum differs from the 2026-10-06 reviewed snapshot, so the match is to the live file, not a byte-identical archived version. [@epa-01-download-coverage]
- The six annual guide files for MY1978–1983 match their recorded checksums. All 908 stored line locators match the model labels in those files. This proves catalog-to-guide linkage, not completeness of EPA guide coverage. [@epa-04-annual-guide-test-data] [@epa-03-fuel-economy-guide-scope]
- All six NHTSA model-year supplements match current exact vPIC results across five year-scoped endpoints; response JSON and exact query URLs are saved in `research/sources/catalog-vpic-01..05-identity-check.md`. vPIC's manufacturer-submission/VIN system is not an exhaustive U.S. retail-sales census. [@epa-02-nhtsa-vpic-scope] [@ev-makers-01-nhtsa-vpic-api] [@catalog-vpic-01-identity-check] [@ev-makers-05-tesla-2008-vpic] [@catalog-vpic-03-identity-check] [@catalog-vpic-04-identity-check] [@catalog-vpic-05-identity-check]
- The EPA all-years dataset and annual guide boundary describe EPA fuel-economy data, not a complete inventory of every vehicle sold in the United States. [@epa-01-download-coverage] [@epa-03-fuel-economy-guide-scope] [@gapfill-history-01-epa]

### Historical continuity and future years

- The project source mix is uneven before MY1984. EPA test-car and annual-guide archives offer bounded program data; GM's Vehicle Information Kits and Henry Ford's production-record archive are useful but selected holdings, not make-wide year-by-year censuses. [@gapfill-history-01-epa] [@gm-01-heritage-vehicle-information-kits] [@gapfill-history-02-gm-archive] [@ford-lincoln-05-henry-ford-production-records]
- Ford/Lincoln wartime and nameplate breaks require model-year evidence; factory shutdown dates alone do not determine a retail model year. [@ford-lincoln-01-wartime-production] [@ford-lincoln-04-wwii-production] [@ford-lincoln-05-henry-ford-production-records] [@gm-05-ecfr-model-year]
- Corporate make changes are not identical to model-year changes. Dodge/Ram's announced split, EPA's remaining Dodge labels, and each model-year catalog name must be preserved as separate evidence rather than collapsed into one date. [@stellantis-04-motortrend-ram-split] [@stellantis-03-epa-chrysler-1990] [@epa-01-download-coverage]
- Development model-year extrema and counts are in [the make coverage table](catalog-coverage-by-make.csv). They are observed catalog bounds, not launch/end years for each brand. Within-name gaps total 660 leads across 70 case-insensitive make/model groups; none is presumed an omission or confirmed hiatus. ([gap leads](catalog-year-gap-leads.csv))
- MY2027 entries remain preliminary until the exact entry's supporting source, model year, and U.S. availability are established. vPIC currently returns Tesla, Rivian, and Lucid MY2027 model listings, which are not proof of final retail availability, sale, delivery, or configuration. [@ev-makers-12-rivian-2027-vpic] [@ev-makers-13-lucid-2027-vpic] [@ev-makers-14-tesla-2027-vpic]

### Rights and release decision

- EPA's general open-data statement defaults EPA-produced material to public domain but directs users to check the metadata and limitations for the dataset itself; it does not settle the provenance or rights of every field in every export. [@gapfill-rights-01-epa-license] [@epa-01-download-coverage]
- NHTSA's API Use Policy describes limits on bulk VIN lookups; the current source checks here used exact make/model/year listing endpoints, not bulk VIN lookups. That policy is neither a blanket prohibition nor a blanket license for all vPIC datasets and downstream display. [@gapfill-rights-02-nhtsa-api-policy] [@epa-02-nhtsa-vpic-scope] [@ev-makers-01-nhtsa-vpic-api]
- Wikipedia-derived identities need attribution and source-history review; the CC BY-SA database-rights provision is use- and scope-dependent and does not itself decide whether this normalized catalog triggers obligations. [@gapfill-rights-03-cc-by-sa-legalcode]
- Distinguish factual vehicle names from copied prose, tables, images, and creative presentation. Do not require manufacturer permission merely because a factual record concerns that make; review actual access terms and any restrictions for the specific evidence used. ([source inventory](catalog-source-inventory.csv))
- **Recommendation:** Do not release the catalog. No code or production data was changed, and no publication was made. The project owner must explicitly approve any later release.

## Conflicts & Open Questions

- The initial 4,818/4,672/146 and 4,775/43 totals are superseded by the live API census: 4,818 option rows, 4,715 unique IDs, 4,672 model-year profiles, and 43 trim profiles.
- The EPA live-file match is complete for referenced identity fields, but its archive checksum differs from the catalog's saved snapshot; this is a version/provenance mismatch, not a make/year/model mismatch.
- The 539 selected historical profiles remain secondary-source evidence, not a complete historical U.S. census; 660 name-year gaps remain leads only.
- Exact retail availability and final MY2027 status are distinct from EPA/vPIC listing. Some current official product pages announce 2027 products, but a listing or preliminary catalog row is not a complete final sales roster.
- The catalog's source metadata marks all source records `allowed`; source-specific rights and access restrictions have not been independently cleared for every retained field or trim URL.

## Gaps

- Moved to report Limitations: no single comprehensive pre-1984 source was found; selected historical source rows and each gap lead still need independent historical review.
- Moved to report Limitations: exact trim evidence is linked but all 25 source URLs have not been independently assessed for access, storage, attribution, and display terms.
- Moved to report Limitations: the EPA raw ZIP does not match the saved review checksum, and MY2027 retail/final-availability claims are not established for every entry.
