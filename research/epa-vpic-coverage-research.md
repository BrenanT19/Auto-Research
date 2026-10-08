# EPA FuelEconomy.gov and NHTSA vPIC: identity-coverage research

**Private research only.** No code, catalog data, or production state was changed. Public release remains blocked pending the owner's approval.

## Key Facts

- FuelEconomy.gov's download page describes the current all-model-years dataset as **MY1984–MY2026** (page updated 2026-09-29 at retrieval). It lists MY2027 separately as **preliminary**. Those are fuel-economy program data bounds, not a claim that every U.S. retail nameplate and body/trim sold in those years appears in the dataset. [1]
- The site describes its fuel-economy data as based on EPA laboratory testing and manufacturer testing under EPA oversight, and notes that published MPG values may be revised for comparability or correction. The dataset primarily proves that an EPA fuel-economy record exists for the listed identity/combination; it does not establish full U.S. market coverage or all retail variants. [1]
- NHTSA says vPIC is intended for VIN decoding and manufacturer information based on manufacturer reports/submissions, and is intended for MY1981 forward. Its model-year or make/model results therefore substantiate the existence of reported manufacturer/VIN identities within that system. They do **not** certify that all retail models sold in the United States are represented, nor that an absent identity was not sold. VIN-decoding scope is not a retail-sales census. [2]
- Official annual EPA Fuel Economy Guides are not exhaustive U.S. retail model-year identity lists. The 2026 guide itself notes that some vehicle categories are outside light-duty fuel-economy regulations and that information may arrive too late for inclusion. An EPA guide omission consequently cannot establish non-sale. [3]
- There is meaningful EPA archival evidence before the current Find-a-Car baseline: EPA's annual guide/test-data archive provides MY1978 onward records, with separately listed model-year guide data through the early 1980s. This supports candidate identity checks for some MY1978–83 vehicles, but it is a fuel-economy/testing dataset, not a complete U.S. retail catalogue. [4]
- Historical checking should triangulate by exact **model year**, make, and model from original official model-year evidence where available (EPA annual guide/test-car records for relevant years, contemporaneous manufacturer catalog/specification archives, and applicable NHTSA reports for MY1981 onward). Preserve gaps and conflicting naming rather than filling them from current model pages, calendar years, adjacent model years, or assumed nameplate continuity. No single complete pre-1984 U.S. model-year identity census was established in this pass.
- The reconciled development Browse response contains 4,818 selectable option rows across 4,715 distinct profile IDs: 4,672 bundled model-year identities and 43 trim/configuration previews. The 103 additional option rows reflect multiple era memberships on 102 model-year IDs, not additional profiles. A later row audit matched 3,639 model-year identities to 18,764 records in the live EPA file, verified all 488 EPA-guide identities against exact file hashes and 908 line locators, and matched all six NHTSA supplements to current vPIC results. The selected historical source rows and retail-market completeness remain separate questions. See [the source verification audit](catalog-source-verification.md) and [profile CSV](catalog-profiles.csv).

## Notable Claims Requiring Cross-Reference

- **“EPA covers all vehicles from 1984.”** False as an identity-completeness claim. The 1984 boundary refers to the public fuel-economy Find-a-Car/download coverage, not all vehicles sold. The guide explicitly documents exclusions and publication-timing omissions. [1, 3]
- **“vPIC lists every U.S. vehicle sold from 1981 onward.”** Unsupported. vPIC is manufacturer-submitted regulatory/VIN information, not a retail-sales or homologation-completeness assertion. An omission is not proof of non-sale. [2, 6, 7]
- **“No EPA/vPIC result means the model/year did not exist.”** Invalid. Their scopes differ; negative evidence requires independent exact-model-year historical sources. Keep unverified identities unresolved rather than converting source silence into a claim of non-sale. [1–4]
- **“1981 is a complete historical cutoff.”** Not established. vPIC's intended MY1981-forward scope is a systems boundary, while EPA has earlier guides/data, and neither supplies a census of all U.S. identities. [2, 4]
- **“A matching label proves year-to-year nameplate continuity.”** Invalid without direct model-year evidence. Matching names, contemporary listings, or records in adjacent years do not authorize interpolation; calendar year must not be substituted for model year.

## Source Quality Assessment

| Source | Tier and date | Evidentiary value | Limit |
|---|---|---|---|
| EPA / FuelEconomy.gov, Download Fuel Economy Data [1] | **Tier 1, primary government program source**; page says updated 2026-09-29; fetched 2026-10-08 | Directly establishes downloadable year boundaries and preliminary status | Scope is EPA fuel-economy program data; not retail identity completeness |
| NHTSA, vPIC About [2] | **Tier 1, primary government source**; no page publication date shown; fetched 2026-10-08 | Direct statement of system function, manufacturer-report basis and intended year scope | Does not state a retail-sales completeness standard |
| EPA / FuelEconomy.gov, 2026 Fuel Economy Guide [3] | **Tier 1, primary official publication**; guide updated 2026-09-29; fetched 2026-10-08 | First-party description of guide exclusions and publication limits | Consumer guide only; not a complete vehicle census |
| EPA, Test Data for Annual Fuel Economy Guide [4] | **Tier 1, primary government archive index**; last updated 2026-02-18; previously fetched 2026-10-08 | Links year-specific EPA guide data back through MY1978 | Program-specific records; no guarantee every retail model is present |
| NHTSA vPIC API and Downloads search leads [6–7] | **Tier 1, primary government pages; discovery snippets only**; search 2026-10-08 | Corroborate manufacturer submission basis and distinguish API from standalone VIN decoder files | Not fetched in this pass; verify before relying on detailed fields |
| EPA annual test-car reports search lead [8] | **Tier 1, primary government page; discovery snippet only**; search 2026-10-08 | Potentially useful test-car corroboration for MY1978–1997 | Not fetched here and does not imply exhaustive market coverage |

Rights handling: only links and paraphrased facts are retained in the evidence notes. No tables, images, or guide prose are reproduced. The NHTSA About page describes its public/open-data purpose; this finding is not a substitute for checking dataset-specific terms before bulk reuse or redistribution. No public catalog release is authorized.

## Gaps & Unanswered Questions

- **The identity census and core source crosswalk are now reconciled, but historical coverage is still partial.** The 539 selected historical entries have source links; this pass did not independently verify each against a complete U.S. archive. The 43 detail profiles have accepted evidence links, but those documents and their use terms have not all been independently reviewed.
- Source-linked model-year identity is not proof of U.S. retail availability or an exhaustive market census. EPA and vPIC omissions cannot establish non-sale, and the source ZIP hash mismatch means the current EPA match is not a byte-identical reproduction of the saved review snapshot.
- The exact inclusion rules and coverage omissions of individual EPA year files, model grouping and configuration distinctions need review against each record; model-year guide fuel-economy rows do not prove retail availability in the absence of exact identity evidence.
- MY2027 is explicitly preliminary on the EPA data page; each future-year Browse claim needs its own source and preliminary-status review.
- The six vPIC model/year supplements match current exact API responses. Broader vPIC results still need to be interpreted within the manufacturer's reporting and VIN-decoding purpose, not as proof of all retail offerings.
- Historical model year must be checked directly. Do not assume calendar-year correspondence or uninterrupted nameplate identity.
- **Approval gate:** do not enable or publicly release the catalog until the owner has reviewed the full profile-level audit and explicitly approved release.

## Sources

1. EPA, [Download Fuel Economy Data](https://www.fueleconomy.gov/feg/download.shtml), fetched evidence: `research/sources/epa-01-download-coverage.md`.
2. NHTSA, [vPIC About](https://vpic.nhtsa.dot.gov/About), fetched evidence: `research/sources/epa-02-nhtsa-vpic-scope.md`.
3. U.S. DOE / EPA, [2026 Fuel Economy Guide](https://www.fueleconomy.gov/feg/pdfs/guides/FEG2026.pdf?pubDate=20260402), fetched evidence: `research/sources/epa-03-fuel-economy-guide-scope.md`.
4. EPA, [Test Data for Annual Fuel Economy Guide](https://www.epa.gov/compliance-and-fuel-economy-data/test-data-annual-fuel-economy-guide), fetched evidence: `research/sources/epa-04-annual-guide-test-data.md`.
5. Local initial audit and pending-work log: `research/notes.md`.
6. NHTSA, [Vehicle API](https://vpic.nhtsa.dot.gov/api), search-snippet note: `research/sources/epa-vpic-search-snippets.md`.
7. NHTSA, [vPIC Downloads](https://vpic.nhtsa.dot.gov/Downloads), search-snippet note: `research/sources/epa-vpic-search-snippets.md`.
8. EPA, [Reports on Cars Used for Testing Fuel Economy](https://www.epa.gov/compliance-and-fuel-economy-data/reports-cars-used-testing-fuel-economy), search-snippet note: `research/sources/epa-vpic-search-snippets.md`.

Search questions and additional result leads (including FuelEconomy.gov Web Services and annual guide search results) are recorded, paraphrased, in `research/sources/epa-vpic-search-snippets.md`. Search snippets remain leads only where a direct fetch is not identified above.
