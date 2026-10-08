# U.S. Automotive Development Catalog: Coverage and Release Readiness

**Research date:** 2026-10-08  
**Depth:** Deep  
**Sources consulted:** 38 unique external URLs, with dated source captures in `research/sources/`

## Executive Summary

The development Browse count is now reconciled. Its API returns 4,818 selectable options but only 4,715 unique profile IDs: 4,672 model-year identities and 43 trim/configuration previews. The remaining 103 option rows come from 102 model-year profiles that have multiple generation/refresh memberships. Those memberships are intentional alternatives; they do not create extra vehicles or establish a vehicle's exact factory configuration. Thus the earlier difference of 146 between the option count and bundled model-year count consists of 43 added trim identities plus 103 extra era choices, not 146 unexplained profiles. The private export records both IDs and menu options. [Local option audit](catalog-options.csv) · [Profile audit](catalog-profiles.csv)

Most newer model-year entries now have record-level source matches. All 3,639 EPA all-years profiles match 18,764 referenced vehicle records in the official file retrieved on October 8, 2026, with no mismatches in ID, make, year, source model label, or base-model grouping. All 488 profiles from the 1978–83 EPA guides match the six guide-file hashes and all 908 source-line locators. The six NHTSA/vPIC supplemental profiles match current exact model/year queries. **Checksum correction:** the catalog hashes extracted CSV content, not its ZIP container; the current extracted CSV exactly matches the stored checksum. The earlier version-mismatch conclusion was incorrect. [Detailed method and results](catalog-source-verification.md) [1](#source-1) [2](#source-2) [3](#source-3)

The result is **not** a complete history of all U.S. models sold. The 539 selected historical identities are linked to secondary sources, but were not individually checked against a comprehensive archive; only 533 are pre-1978, and the searches found no single exhaustive source for all 13 makes. Another 660 missing-year leads across 70 normalized model-name groups require interpretation, not interpolation. The 43 exact-trim previews have 237 accepted evidence rows tied to 25 distinct public URLs; two claim rows point to the same internal research-review record without a URL. Evidence links do not imply retail-market completeness or resolve every source's terms. MY2027 remains preliminary where the supporting evidence does not establish finalized U.S. retail availability. Recommendation: keep the catalog private. Nothing was published, and no production data or release settings were changed.

## Background

The catalog's market is the United States and its core identity is make/model/model year. Its 4,672 bundled entries combine EPA all-years data, six annual EPA guide files, selected historical supplements, and a small vPIC supplement. Separate development records add exact trim/configuration previews. The CSV audit keeps these evidence types separate; a model-year listing is not a verified retail trim, and an era membership is not a precise vehicle configuration. [EPA's download description] [1](#source-1) [NHTSA's stated vPIC scope] [3](#source-3) [EPA's guide limitations] [4](#source-4)

The sources answer different questions. EPA data and annual guides establish that a fuel-economy record with a particular model/year label exists. NHTSA vPIC reports manufacturer-submitted information and is designed around vehicle identification. Neither source promises an exhaustive retail-sales census; the EPA testing archive and guides also document program-specific bounds and exclusions. Therefore a source match supports the identity label in that system, not proof that every U.S. retail offering is included or that an absent vehicle was not sold. [1](#source-1) [3](#source-3) [4](#source-4) [5](#source-5)

The work stayed in the development environment. The inventory is frozen as research evidence rather than used to alter the Browse catalog: source records, returned option rows, unique profile IDs, and detailed trim previews are separate exports. This lets a future review identify a changed source or a new option without treating it as a new vehicle or silently overwriting prior source evidence. [Coverage verification](catalog-source-verification.md) · [Source inventory](catalog-source-inventory.csv)

## Key Findings

### 1. Browse options and distinct identities reconcile

| API/profile measure | Count | Interpretation |
|---|---:|---|
| Browse option rows | 4,818 | Each row is a selectable result, not necessarily a distinct profile |
| Unique profile IDs | 4,715 | Deduplicated identities |
| Bundled model-year identities | 4,672 | Make/model/year records |
| Trim/configuration previews | 43 | Separate, development-only detailed identities |
| Extra generation/refresh options | 103 | 102 model-year profiles have alternate memberships |

The multi-era rows retain the same profile ID and make/model/year; only the generation/refresh candidate changes. There are 101 profiles with two candidate memberships and one with three. This is intentional overlap in the browse-era mapping, not evidence that a vehicle had multiple exact factory configurations. The API export and profile CSV preserve this distinction for review. [Local option audit](catalog-options.csv) · [Profile audit](catalog-profiles.csv) · [Coverage verification](catalog-source-verification.md)

The four-make history reports previously described different 4,818-entry decompositions because they were written before the live API and database-backed trim records were reconciled. Those stale 4,775/43 and 4,672/146 figures have been superseded throughout the research notes and focus reports. The 4,818 minus 4,672 difference is precisely 43 unique trim profiles plus 103 additional era choices; no unexplained 146-profile population remains.

### 2. Source-to-profile checks pass for EPA, guides, and selected vPIC rows

The bundled model-year source layers now reconcile as follows:

| Source layer | Profiles | Row-level result | What this does not prove |
|---|---:|---|---|
| FuelEconomy.gov all-years file | 3,639 | 18,764 referenced source records matched the live file's ID, make, year, model label, and base-model grouping; zero mismatches | Same-file archival identity, exhaustive U.S. sales coverage, or retail trim |
| EPA annual guides, MY1978–1983 | 488 | All six file checksums matched; 908 line locators matched their recorded model labels | That EPA listed every U.S. vehicle offered |
| Selected historical sources | 539 | Source references and locators are present; 533 entries are pre-1978 and 6 fall in MY1978–1983 | Independent verification of every fact or complete brand history |
| NHTSA/vPIC supplements | 6 | Five current exact endpoints returned the six recorded model/year labels | A complete vehicle-sales census |
| Database-backed trim previews | 43 | 237 accepted claim/source rows; 25 distinct public URLs, plus 2 rows for one URL-less internal source | Exhaustive trim coverage or cleared reuse terms |

EPA's current ZIP checksum is `33d32caa0343cdb11c47be631e8a80b7ed7c351ee8503646a4e96485bd67b22f`; its extracted CSV checksum is `b1ff0e3071c46cdc1c99e0015878b98a01851462d7e447237ce2fc1294ccf303`, exactly matching the bundled source metadata. The builder hashes the CSV, so the earlier ZIP-to-CSV comparison did not establish a source-version discrepancy. All catalogued identity references were rechecked with zero mismatches. [Saved checksum evidence](profile-information-audit/epa-live-recheck.json) EPA's download page describes the dataset as fuel-economy program data; the annual-guide archive and EPA's testing-data pages reinforce those program limits. [1](#source-1) [2](#source-2) [6](#source-6) [5](#source-5)

All six NHTSA rows were checked against five current exact model/year endpoints: one Ram MY2024 response containing both 2500 and 3500, and four Tesla Roadster responses for MY2008–2011. The returned vPIC model name matched each catalog label. The exact query parameters are year-scoped, though the API payload does not separately echo a model-year field. vPIC documentation describes manufacturer-submitted and vehicle-identification information, so these checks support only the listed identity fields—not completeness of the U.S. retail market. [3](#source-3) [7](#source-7) [8](#source-8) [9](#source-9) [10](#source-10) [11](#source-11) [12](#source-12)

### 3. Observed year ranges vary widely, and do not establish full histories

The bundled model-year file spans MY1928–2027. The table below reports only the earliest and latest **observed catalog entries** and the row counts by source era. It must not be read as each make's launch date, continuous model-year coverage, or complete final-year evidence. The CSV contains the full counts and within-name gap totals. [Make coverage CSV](catalog-coverage-by-make.csv)

| Make | Distinct profiles (model year + trims) | Observed model-year bounds | Pre-1978 model-year rows | MY1978–83 rows | Gap leads |
|---|---:|---|---:|---:|---:|
| Buick | 384 (381 + 3) | 1936–2027 | 61 | 57 | 92 |
| Cadillac | 394 (394 + 0) | 1940–2027 | 66 | 26 | 41 |
| Chevrolet | 1,091 (1,082 + 9) | 1950–2027 | 130 | 110 | 117 |
| Chrysler | 285 (285 + 0) | 1940–2027 | 52 | 27 | 30 |
| Dodge | 680 (680 + 0) | 1949–2027 | 57 | 104 | 142 |
| Ford | 886 (879 + 7) | 1928–2027 | 95 | 100 | 88 |
| GMC | 395 (387 + 8) | 1960–2027 | 18 | 42 | 11 |
| Jeep | 245 (245 + 0) | 1963–2027 | 15 | 14 | 96 |
| Lincoln | 237 (237 + 0) | 1940–2027 | 39 | 14 | 43 |
| Lucid | 13 (9 + 4) | 2022–2027 | 0 | 0 | 0 |
| Ram | 41 (29 + 12) | 2012–2027 | 0 | 0 | 0 |
| Rivian | 13 (13 + 0) | 2022–2027 | 0 | 0 | 0 |
| Tesla | 51 (51 + 0) | 2008–2027 | 0 | 0 | 0 |

The 660 gap leads are gaps between observed years for a case-insensitive make/model group, not 660 proven missing vehicles. They can reflect real hiatuses, name changes, source coverage boundaries, wartime disruptions, alias normalization, or data omissions. No gap has been filled from adjacent years. In the historical layers, the six EPA guide files supply 488 linked entries; selected secondary sources add 539 more, but do not turn the catalog into a continuous national history. [EPA's annual-guide archive] [2](#source-2) [EPA's bounded testing reports] [5](#source-5) [GM's archive scope] [13](#source-13)

The available archives illustrate the distinction between a useful record and a complete registry. GM's Heritage collection and Vehicle Information Kits provide selected historical documents, while The Henry Ford explains both surviving production-record ranges and their incompleteness. These sources can support or locate individual historical identities, but their collection counts and holdings do not promise coverage of every year or make. [14](#source-14) [13](#source-13) [15](#source-15)

### 4. Historical model-year transitions need direct, year-specific evidence

Calendar production dates and model years are not interchangeable. U.S. regulation defines model year from the manufacturer's annual production period; GM's announcement that final Camaro assembly was expected in January 2024 while identifying the final year as MY2024 is a concrete example. The project should retain source model-year labels rather than derive them from a plant date. [16](#source-16) [17](#source-17) [4](#source-4)

Ford and Lincoln records show why an apparent year gap should not be automatically filled or labeled a discontinuation. The Henry Ford describes surviving Lincoln production records for limited year ranges and warns that the record series is incomplete; the National WWII Museum and MotorCities describe the 1942 civilian-production interruption from different historical perspectives. Together they support a major production disruption, but do not prove the retail model-year status of every Ford or Lincoln nameplate in 1943–45. Lincoln's Town Car page places the nameplate's 1981 release and later generation spans in a retrospective, a useful distinction from its Continental lineage but not a year-by-year sales census. [15](#source-15) [18](#source-18) [19](#source-19) [20](#source-20)

The Dodge/Ram example requires similar care. A 2009 report documents the announcement of the Ram/Dodge truck-brand split; the project's EPA-linked records and vPIC's manufacturer-reported make/model layer preserve their own names and year labels. Announcement year, first stand-alone model year, corporate brand organization, and the source label attached to a specific model-year record are different facts. The project should preserve those exact source labels and avoid a single retroactive year rule. [21](#source-21) [1](#source-1) [3](#source-3) [22](#source-22)

The EPA's separate MY1990 Chrysler index lists Chrysler-branded models such as LeBaron, New Yorker, and Town and Country for that year. Its year-specific label is evidence about the 1990 index, not a rule for mapping later corporate or brand changes backward. [23](#source-23) [1](#source-1) [22](#source-22)

For the newer EV makes, the exact government listings support Tesla/Roadster in MY2008, Rivian/R1T and R1S in MY2022, and Lucid/Air in MY2022. Tesla's contemporary release calls the Roadster a 2008 model-year vehicle; the Rivian and Lucid comparisons use exact NHTSA make IDs and model-year endpoints. These results validate the cited entries and help separate model year from first production or delivery, but do not prove the earliest year sold to U.S. customers. [24](#source-24) [9](#source-9) [25](#source-25) [26](#source-26) [27](#source-27) [28](#source-28)

### 5. MY2027 entries require an entry-by-entry status, not a blanket assumption

EPA/FuelEconomy.gov marks the MY2027 data as preliminary. Current vPIC queries return Tesla, Rivian, and Lucid model/year listings for MY2027, and official Ford/Lincoln pages also carry some 2027 labels. Those are useful corroborating records for their stated scope, but an EPA or vPIC listing does not itself establish final specifications, sale, delivery, or a complete retail lineup. The catalog's preliminary flag should remain unless an exact year-specific source resolves that entry; current official lineup pages are manufacturer statements, not full retail-market censuses. [1](#source-1) [29](#source-29) [30](#source-30) [31](#source-31) [32](#source-32) [33](#source-33)

EPA's Rivian MY2026 certification application is additional evidence for EPA-listed carlines, not proof of customer delivery. Current vPIC make lists report Tesla Make_ID 441, Rivian 10887, and Lucid 10919, but those current IDs do not reconstruct historical assignment or establish sale status. Use each result for the field it actually records. [34](#source-34) [25](#source-25) [27](#source-27) [35](#source-35) [29](#source-29)

### 6. Evidence links, source terms, and release are separate gates

The 43 trim/configuration previews are development-preview identities with accepted evidence claims in the database export. Their evidence table links 25 distinct public source URLs; two claim rows point to the same internal research-review record without a URL. This is a stronger trace than an unsupported trim string, but it does not show that every source page or PDF was checked for the exact market/year/body/powertrain crosswalk, or that all terms for automated access, retention, attribution, and display have been reviewed. [Trim evidence CSV](catalog-trim-evidence.csv) [Profile audit](catalog-profiles.csv)

The internal source inventory marks the bundled records `allowed`, but that is a project metadata value rather than a source-by-source legal conclusion. EPA's general license says EPA-produced data are public domain by default unless otherwise specified and directs users to dataset-specific metadata; it does not settle the origin and terms of every field in FuelEconomy.gov files. NHTSA's API Use Policy addresses bulk VIN lookup, while the reviewed project queries use exact model/year listing endpoints. The policy should be applied to its stated scope—not treated as either a blanket ban or an affirmative license for all retained vPIC data. [36](#source-36) [1](#source-1) [37](#source-37) [3](#source-3) [7](#source-7)

For historical Wikipedia-derived material, CC BY-SA 4.0 has attribution terms and provisions for qualifying substantial database-rights reuse. The license text does not decide whether this normalized factual catalog uses enough licensed expression or protected database contents to trigger a particular obligation. Assess the source, access method, material actually retained, and the collection's selection/arrangement; do not presume facts about a manufacturer require that manufacturer's permission, and do not copy source prose, tables, or images. [38](#source-38) [36](#source-36) [37](#source-37)

## Analysis

The catalog is substantially more traceable than the first snapshot count suggested. The earlier 146-profile discrepancy was a counting problem: 43 exact-trim profiles were present in database-backed details, and 103 more option rows reflected overlapping generation memberships. Once profile identity is separated from option rows, the totals reconcile without discarding the overlapping candidates. The row-level checks then establish that the EPA IDs and model-year guides map back to their source material; the remaining uncertainty is not primarily the existence of those source rows, but what those source systems can and cannot say about the broader U.S. market.

That distinction matters most before 1984. EPA's available older records are organized around testing and fuel-economy guides, and the selected historical records fill only some names and years. The federal and corporate archives found in this research describe bounded collections; they do not provide a common, all-make, year-by-year U.S. sales list. Consequently, the 660 within-name gaps should remain research leads. Even a correctly matching secondary source row does not prove every adjacent year, and the absence of an EPA or vPIC row does not establish that a model was never sold.

Future years have a different risk. A source may record a model-year label before final retail details are established; a manufacturer's current page may advance its labels over time; and a current vPIC result can reflect a manufacturer's submission without proving delivery. Per-entry review should preserve the evidence date and source field, keep MY2027 provisional where the evidence is provisional, and distinguish identity from final U.S. availability. The regulatory model-year definition and the Ford/GM transition examples show why calendar production dates and nameplate continuity cannot replace year-specific evidence.

The 43 exact-trim previews also need a separate posture. Their claims and links give reviewers a starting point, but “accepted” is an internal research status, not an independent assurance of all package predicates, a total trim census, or public reuse permission. Keep those profiles in the preview tier until exact configuration relationships are independently checked. Source-specific terms should be evaluated narrowly: ordinary factual vehicle attributes are not the same thing as copied brochures, copyrighted prose, images, or protected data presentation.

## Limitations

This is a source audit, not a reconstruction of all U.S. vehicle sales. The 539 secondary historical identities have not each been corroborated against a complete archive, and all 660 year-gap leads remain unadjudicated. EPA and vPIC coverage is not a retail-sales census. The detailed trim sources have not all received independent page-level content and terms review. The report does not prove actual production, U.S. dealer availability, sale, delivery, or configuration from an EPA/vPIC listing alone. The current preliminary status for MY2027 must be reviewed entry by entry before any public-facing claim. The focused searches found no exhaustive source covering all 13 makes before 1984. The prior EPA checksum concern is resolved by comparing the same CSV payload. [1](#source-1) [3](#source-3) [5](#source-5) [13](#source-13) [15](#source-15)

## Recommendations

1. **Keep the catalog private and unreleased.** The current evidence does not justify a complete-coverage claim, and no publication is authorized.
2. **Retain the verified CSV audit as the review baseline.** The profile export includes the 4,715 unique IDs, each static source locator, its saved hash, and the cross-check result. Keep the 4,818-option export beside it so future revisions do not merge profile counts with era-option counts.
3. **Compare like-for-like source payloads.** Record whether a checksum covers the ZIP archive or the extracted data file. The current extracted EPA CSV matches the catalog hash; retain the retrieval date and checksum basis for future checks.
4. **Treat the 660 year gaps as an unresolved worklist.** Resolve only with direct model-year evidence; record legitimate hiatuses, name changes, and known source limitations separately. Do not fill years through interpolation.
5. **Keep model-year and exact-trim evidence in separate review queues.** The trim previews need independent exact-configuration crosswalks; model-year profiles need historical source verification where the source is secondary.
6. **Review reuse terms source by source.** Confirm the actual dataset, endpoint, fields retained, method of access, attribution, caching, and any public display conditions. Apply restrictions to the evidence source that carries them rather than requiring blanket OEM permission for factual specifications.
7. **Keep preliminary year labels visible in internal review and verify each profile before publication.** EPA/vPIC/OEM presence should not be presented as a guarantee of finalized sale or delivery.

## Research Artifacts

- [Unique profile audit](catalog-profiles.csv)
- [All 4,818 Browse choices](catalog-options.csv)
- [Make/year coverage](catalog-coverage-by-make.csv)
- [660 year-gap leads](catalog-year-gap-leads.csv)
- [46-source inventory](catalog-source-inventory.csv)
- [Trim evidence and source links](catalog-trim-evidence.csv)
- [Row-level matching methods and results](catalog-source-verification.md)

## Sources

_This section is rendered from `research/sources.json`; citation numbers follow first appearance in the report._

<span id="source-1"></span>
1. **Download Fuel Economy Data.** [Open source](https://www.fueleconomy.gov/feg/download.shtml). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/epa-01-download-coverage.md`.

<span id="source-2"></span>
2. **Test Data for Annual Fuel Economy Guide | US EPA.** [Open source](https://www.epa.gov/compliance-and-fuel-economy-data/test-data-annual-fuel-economy-guide). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/epa-04-annual-guide-test-data.md`.

<span id="source-3"></span>
3. **NHTSA Product Information Catalog and Vehicle Listing — About.** [Open source](https://vpic.nhtsa.dot.gov/About). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/epa-02-nhtsa-vpic-scope.md`.

<span id="source-4"></span>
4. **2026 Fuel Economy Guide.** [Open source](https://www.fueleconomy.gov/feg/pdfs/guides/FEG2026.pdf?pubDate=20260402). Publication date: 2026-04-02; accessed 2026-10-08; Tier 1. Evidence capture: `sources/epa-03-fuel-economy-guide-scope.md`.

<span id="source-5"></span>
5. **Reports on Cars used for Testing Fuel Economy | US EPA.** [Open source](https://www.epa.gov/compliance-and-fuel-economy-data/reports-cars-used-testing-fuel-economy). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/gapfill-history-01-epa.md`.

<span id="source-6"></span>
6. **Data on Cars used for Testing Fuel Economy | US EPA.** [Open source](https://www.epa.gov/compliance-and-fuel-economy-data/data-cars-used-testing-fuel-economy). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/gm-03-epa-test-car-data.md`.

<span id="source-7"></span>
7. **Vehicle API.** [Open source](https://vpic.nhtsa.dot.gov/api/). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-01-nhtsa-vpic-api.md`.

<span id="source-8"></span>
8. **NHTSA vPIC exact model/year query: Ram 2500 MY2024, Ram 3500 MY2024.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/RAM?format=json&modelYear=2024). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/catalog-vpic-01-identity-check.md`.

<span id="source-9"></span>
9. **NHTSA vPIC Tesla model listing for model year 2008.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/441/modelyear/2008?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-05-tesla-2008-vpic.md`.

<span id="source-10"></span>
10. **NHTSA vPIC exact model/year query: Tesla Roadster MY2009.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/441/modelyear/2009?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/catalog-vpic-03-identity-check.md`.

<span id="source-11"></span>
11. **NHTSA vPIC exact model/year query: Tesla Roadster MY2010.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/441/modelyear/2010?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/catalog-vpic-04-identity-check.md`.

<span id="source-12"></span>
12. **NHTSA vPIC exact model/year query: Tesla Roadster MY2011.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/441/modelyear/2011?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/catalog-vpic-05-identity-check.md`.

<span id="source-13"></span>
13. **GM Heritage Archive & Special Collections | General Motors.** [Open source](https://www.gm.com/heritage/archive). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 3. Evidence capture: `sources/gapfill-history-02-gm-archive.md`.

<span id="source-14"></span>
14. **GM Heritage Archive: Vehicle Info Kits | General Motors.** [Open source](https://www.gm.com/heritage/archive/vehicle-information-kits). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 3. Evidence capture: `sources/gm-01-heritage-vehicle-information-kits.md`.

<span id="source-15"></span>
15. **Ford Vehicle Production Records - The Henry Ford.** [Open source](https://www.thehenryford.org/collections/explore/popular-research-topics/vehicle-production-records). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ford-lincoln-05-henry-ford-production-records.md`.

<span id="source-16"></span>
16. **40 CFR Part 85, Subpart X: Determination of Model Year for Motor Vehicles and Engines.** [Open source](https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-85/subpart-X). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/gm-05-ecfr-model-year.md`.

<span id="source-17"></span>
17. **GM to retire Camaro at the end of the 2024 model year.** [Open source](https://news.gm.com/home.detail.html/Pages/news/us/en/2023/mar/0322-camaro.html). Publication date: 2023-03-22; accessed 2026-10-08; Tier 3. Evidence capture: `sources/gm-06-camaro-hiatus.md`.

<span id="source-18"></span>
18. **Making Automobiles Last During World War II | The National WWII Museum | New Orleans.** [Open source](https://www.nationalww2museum.org/war/articles/automobile-rationing-world-war-ii). Publication date: 2022-01-06; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ford-lincoln-04-wwii-production.md`.

<span id="source-19"></span>
19. **MotorCities - World War II and the Interrupted Production of 1942 Models | 2023 | Story of the Week.** [Open source](https://www.motorcities.org/story-of-the-week/2023/world-war-ii-and-the-interrupted-production-of-1942-models). Publication date: 2023-07-12; accessed 2026-10-08; Tier 2. Evidence capture: `sources/ford-lincoln-01-wartime-production.md`.

<span id="source-20"></span>
20. **Lincoln Town Car | Fullsize Luxury Sedan.** [Open source](https://www.lincoln.com/luxury-cars/town-car). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 3. Evidence capture: `sources/ford-lincoln-02-lincoln-town-car.md`.

<span id="source-21"></span>
21. **It's Official: Ram Truck Brand Split Off From Dodge Brand; Good Idea?.** [Open source](https://www.motortrend.com/news/its-official-ram-truck-brand-split-off-from-dodge-brand-good-idea-5581). Publication date: 2009-10-05; accessed 2026-10-08; Tier 2. Evidence capture: `sources/stellantis-04-motortrend-ram-split.md`.

<span id="source-22"></span>
22. **History of Chrysler Corporation and its various marques - Plymouth, Dodge, Jeep, etc..** [Open source](https://www.allpar.com/d3/history/index.html). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 3. Evidence capture: `sources/stellantis-02-allpar-chrysler-history.md`.

<span id="source-23"></span>
23. **1990 Fuel Economy by Model: Chrysler.** [Open source](https://fueleconomy.gov/feg/bymodel/Chrysler1990.shtml). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/stellantis-03-epa-chrysler-1990.md`.

<span id="source-24"></span>
24. **Tesla Motors Begins Regular Production of 2008 Tesla Roadster | Tesla Investor Relations.** [Open source](https://ir.tesla.com/press-release/tesla-motors-begins-regular-production-2008-tesla-roadster). Publication date: 2008-03-16; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-03-tesla-roadster-launch.md`.

<span id="source-25"></span>
25. **NHTSA vPIC model list for Rivian.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/Rivian?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-07-rivian-vpic-make.md`.

<span id="source-26"></span>
26. **NHTSA vPIC Rivian model listing for model year 2022.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/10887/modelyear/2022?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-10-rivian-2022-vpic.md`.

<span id="source-27"></span>
27. **NHTSA vPIC model list for Lucid.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/Lucid?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-08-lucid-vpic-make.md`.

<span id="source-28"></span>
28. **NHTSA vPIC Lucid model listing for model year 2022.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/10919/modelyear/2022?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-11-lucid-2022-vpic.md`.

<span id="source-29"></span>
29. **NHTSA vPIC Rivian model listing for model year 2027.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/10887/modelyear/2027?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-12-rivian-2027-vpic.md`.

<span id="source-30"></span>
30. **NHTSA vPIC Lucid model listing for model year 2027.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/10919/modelyear/2027?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-13-lucid-2027-vpic.md`.

<span id="source-31"></span>
31. **NHTSA vPIC Tesla model listing for model year 2027.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/441/modelyear/2027?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-14-tesla-2027-vpic.md`.

<span id="source-32"></span>
32. **Ford Corporate Newsroom.** [Open source](https://corporate.ford.com/newsroom). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 3. Evidence capture: `sources/ford-lincoln-03-ford-current-lineup.md`.

<span id="source-33"></span>
33. **Current Lincoln® SUV Models | Luxury Vehicles.** [Open source](https://www.lincoln.com/all-luxury-suvs). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 3. Evidence capture: `sources/ford-lincoln-06-lincoln-2026-2027.md`.

<span id="source-34"></span>
34. **MSF240987.pdf.** [Open source](https://dis.epa.gov/otaqpub/display_file.jsp?docid=62830&flag=1). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-02-epa-rivian-my2026.md`.

<span id="source-35"></span>
35. **NHTSA vPIC model list for Tesla.** [Open source](https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/Tesla?format=json). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/ev-makers-09-tesla-vpic-make.md`.

<span id="source-36"></span>
36. **EPA Standard Open Data License.** [Open source](https://edg.epa.gov/EPA_Data_License.html). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/gapfill-rights-01-epa-license.md`.

<span id="source-37"></span>
37. **API Use Policy | NHTSA.** [Open source](https://api.nhtsa.gov/). Publication date: not surfaced in the saved page; accessed 2026-10-08; Tier 1. Evidence capture: `sources/gapfill-rights-02-nhtsa-api-policy.md`.

<span id="source-38"></span>
38. **Creative Commons Attribution-ShareAlike 4.0 International Legal Code.** [Open source](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en). Publication date: 2013-11-25; accessed 2026-10-08; Tier 1. Evidence capture: `sources/gapfill-rights-03-cc-by-sa-legalcode.md`.
