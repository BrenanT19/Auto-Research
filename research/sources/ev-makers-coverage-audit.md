# EV makers model-year research — private draft

**State:** Private research only; not approval for public release. No production code or catalog data was changed.
**Research date:** 2026-10-08.
**Scope:** Tesla, Rivian and Lucid U.S. model-year identity, exact current NHTSA Make_ID evidence, 2026/2027 listings and historical coverage of the inspected development model-year catalog.

## Key Facts

### Exact NHTSA Make_IDs and earliest reviewed model years

Current NHTSA vPIC GetModelsForMake responses and exact-ID/year responses report Tesla Make_ID 441, Rivian 10887 and Lucid 10919. The model-year-specific records return Tesla/Roadster for MY2008, Rivian/R1T and R1S for MY2022, and Lucid/Air for MY2022. This supports those years as the earliest years present in the reviewed U.S. catalog snapshot; it does not by itself prove the first retail sale, first customer delivery, or an exhaustive U.S. sales history.

- Tesla: Tesla Investor Relations' contemporaneous release (published 2008-03-16; production commencement described as 2008-03-17) identifies the Roadster as model year 2008 and mentions reservations for the 2009 model year. NHTSA Make_ID 441, MY2008 also returns TESLA / Roadster. In the inspected catalog, Tesla starts with Roadster MY2008, Model S MY2012, Model X MY2016, Model 3 MY2017, Model Y MY2020, and Cybertruck MY2025.
- Rivian: NHTSA Make_ID 10887, MY2022 returns R1T and R1S as well as submitted names RCV and EDV. EPA/FuelEconomy.gov identities also begin R1T/R1S at MY2022. Calendar-year 2021 production or customer delivery does not mean MY2021.
- Lucid: NHTSA Make_ID 10919, MY2022 returns Air. EPA/FuelEconomy.gov catalog identities begin Air at MY2022; Gravity first appears in that catalog at MY2025.

These are vPIC Make_ID fields, not NHTSA Manufacturer Information Database (MID) IDs and not catalog EPA/internal makeId values. Current vPIC output does not establish which Make_ID was assigned at every historical point in time.

### Development catalog historical coverage audit

The inspected model-year catalog snapshot has reviewedAt 2026-10-06, 4,672 entries, and year bounds 1928–2027. Its stated scope is model/year identity, not retail-trim configuration. Source composition: 3,639 EPA 1984-present entries; 488 entries from EPA guides for 1978–1983; 539 selected classic-supplement entries; and 6 NHTSA identity supplements. Of the classic entries, 533 are pre-1978 and six fall in 1978–1983. Historical source coverage is uneven: 1978–1983 consists mainly of selected annual-guide rows; the EPA bulk source begins in 1984; the earlier classic supplement is selected rather than exhaustive.

The current development Browse response contains 4,818 selectable option rows and 4,715 distinct profile IDs: 4,672 model-year entries and 43 trim/configuration profiles. A further 103 option rows represent multiple generation/refresh memberships across 102 model-year IDs; they are not additional profiles. All 3,639 EPA all-years identities match 18,764 vehicle rows in the live 2026-10-08 file; all 488 annual-guide profiles match saved checksums and 908 line locators; six vPIC supplements match current endpoint results. See `research/catalog-source-verification.md` for methods and limitations.

For the three requested brands, the snapshot contains 73 model/year entries: Tesla 51 (MY2008–2027), Rivian 13 (MY2022–2027), Lucid 9 (MY2022–2027).

- Tesla: Roadster MY2008–2011; Model S MY2012–2026; Model X MY2016–2026; Model 3 MY2017–2027; Model Y MY2020–2027; Cybertruck MY2025–2026. Catalog MY2027 EPA identities are only Model 3 and Model Y. Current vPIC MY2027 also lists Semi, Cybertruck and Cybercab; differing scopes do not establish sale status or EPA coverage. Roadster MY2012 is absent from the reviewed identity supplement, an unresolved evidence gap, not proof of non-sale or a discontinuation.
- Rivian: R1T and R1S MY2022–2027; R2 appears at MY2027. vPIC also returns EDV and RCV in other responses; submitted names do not prove retail-market availability.
- Lucid: Air MY2022–2027; Gravity MY2025–2027.

Adjacent-year rows are not proof of uninterrupted U.S. sales. Missing EPA/vPIC rows may reflect source scope or coverage; they do not prove a nameplate hiatus or non-sale. Calendar year is not model year. No nameplate continuity, exact trim, sales, or delivery claims have been interpolated. Catalog metadata expressly labels historical coverage partial, exact trims unverified, and MY2027 potentially preliminary.

### Forward-year evidence

The inspected EPA/FuelEconomy.gov all-model-years snapshot (source URL below, in the catalog snapshot reviewed 2026-10-06; research cross-check performed 2026-10-08) contains MY2026 groupings for Tesla Cybertruck, Model 3, Model S, Model X and Model Y; Rivian R1T/R1S; and Lucid Air/Gravity. EPA's Rivian MY2026 Part 1 certification application is dated 2025-03-21 and identifies R1T/R1S carlines, including Tri Max variants. It supports an EPA model-year/carmodel listing, not retail sale or delivery.

The same EPA catalog snapshot contains MY2027 entries for Tesla Model 3/Model Y, Rivian R1T/R1S/R2, and Lucid Air/Gravity. Current vPIC exact-ID/year responses retrieved 2026-10-08 return Tesla MY2027 Model 3, Model Y, Semi, Cybertruck and Cybercab; Rivian R1T/R1S/RCV/EDV/R2; Lucid Air/Gravity. These are forward model-year listings in current sources. Catalog metadata says MY2027 may be preliminary; source presence alone does not prove production readiness, U.S. retail availability, a finalized configuration, delivery, or sale.

## Notable Claims Requiring Cross-Reference

1. “Roadster skipped MY2009.” A Tesla Motors Club forum search result says this, but Tesla's 2008 primary release refers to MY2009 reservations, and the existing catalog has a 2009 Roadster vPIC entry. Evidence conflicts; do not report a MY2009 hiatus without stronger contemporaneous U.S.-sale records.
2. “First model year” versus “first delivery.” Rivian/Lucid 2021 calendar-year events cannot establish MY2021. Model-year records support MY2022 listings; exact first U.S. retail availability and delivery dates need separate primary evidence.
3. MY2027 retail availability. EPA/vPIC support preliminary model-year identities, not final consumer availability or sales.
4. Identifier meaning. Do not conflate Make_ID with NHTSA manufacturer MID or EPA/catalog identifiers.
5. Missing row equals hiatus/non-sale. Not supported. Roadster MY2012 remains an unresolved coverage endpoint.
6. All Browse entries covered. The option/profile census is reconciled, and the identified government-source rows were cross-checked. This still does not establish exhaustive history, exact retail availability, or independent verification of all 539 selected classic-source identities.

## Source Quality Assessment

- Tier 1 government primary/official structured evidence: NHTSA vPIC methods and exact Make_ID responses; official EPA vehicle file and Rivian certification application. Appropriate for normalized identifiers with attribution, subject to API/site terms. vPIC is manufacturer-submitted decoder data; EPA groupings do not represent all sales, all trims, or a complete chronology.
- Tier 1 contemporaneous manufacturer primary: Tesla IR's 2008 release is strong evidence for Tesla's MY2008 identification and stated MY2009 reservation year. It is an interested-party source and does not resolve later U.S. sales through 2012. Use factual claims and citation only, no prose/images.
- Tier 2 / not relied upon: a fan forum and Wikipedia appeared in search results. The forum hiatus claim conflicts with primary evidence; Wikipedia was not used for first-year/continuity claims. No commercial publisher source was used.
- No FCA/Chrysler automated extraction was conducted. This report uses links and normalized factual findings only; no source prose, tables or images are reproduced. Search notes are paraphrased. Keep private until owner approval; research visibility is not publication approval.

## Gaps & Unanswered Questions

- Distinguish row-level source matches from historical completeness: the 539 classic-source identities and exact retail availability remain incomplete research questions, despite the reconciled option/profile census.
- Obtain a versioned historical vPIC record or equivalent evidence of Make_ID assignment history; current API responses do not provide a temporal ID-assignment audit.
- Resolve Tesla Roadster MY2012 and any defensible final U.S. model year; vPIC omissions alone cannot establish hiatus or non-sale.
- Cross-reference Rivian and Lucid first retail-availability/delivery dates with exact MY2022 primary evidence if claims need to exceed earliest official catalog year.
- Research did not establish later hiatuses for these makers. Do not infer them from gaps or current lineups.
- Recheck MY2027 against final EPA certifications and retail evidence before any public use.
- Re-evaluate rights for automation, storage/cache, attribution and public display before deployment. No release is approved.

## Sources

Tier 1 = primary government record/document or contemporaneous manufacturer primary source; Tier 2 = independent secondary lead, not relied upon if rights/quality uncertain. Retrieved 2026-10-08 unless otherwise stated.

### Fetched evidence paths

- research/sources/ev-makers-04-vpic-scope.md — NHTSA API documentation digest; v4.06, last code change 2026-06-13; retrieved 2026-10-08; Tier 1.
- research/sources/ev-makers-05-tesla-2008-vpic.md — Tesla Make_ID 441 / MY2008; Tier 1, retrieved 2026-10-08.
- research/sources/ev-makers-06-tesla-roadster-launch.md — Tesla IR fact digest; published 2008-03-16; Tier 1.
- research/sources/ev-makers-07-rivian-vpic-make.md, research/sources/ev-makers-08-lucid-vpic-make.md, research/sources/ev-makers-09-tesla-vpic-make.md — current Make_ID responses; Tier 1, retrieved 2026-10-08.
- research/sources/ev-makers-10-rivian-2022-vpic.md and research/sources/ev-makers-11-lucid-2022-vpic.md — exact Make_ID/MY2022 responses; Tier 1, retrieved 2026-10-08.
- research/sources/ev-makers-12-rivian-2027-vpic.md, research/sources/ev-makers-13-lucid-2027-vpic.md, research/sources/ev-makers-14-tesla-2027-vpic.md — exact Make_ID/MY2027 responses; Tier 1, retrieved 2026-10-08.
- research/sources/ev-makers-search-snippets.md — four paraphrased search logs; leads only.
- research/sources/ev-makers-02-epa-rivian-my2026.md — pre-existing fetched EPA MY2026 Rivian application; document date 2025-03-21; Tier 1, previously saved 2026-10-08.

### External source register

1. NHTSA vPIC Vehicle API docs, https://vpic.nhtsa.dot.gov/api/ — Tier 1 government documentation; v4.06 / code change 2026-06-13; fetched 2026-10-08. Describes methods and limits, not full retail history.
2. Exact NHTSA API responses: Tesla Make_ID 441 MY2008 https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/441/modelyear/2008?format=json ; Rivian Make_ID 10887 MY2022 https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/10887/modelyear/2022?format=json ; Lucid Make_ID 10919 MY2022 https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/10919/modelyear/2022?format=json ; current make listings https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/Tesla?format=json , https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/Rivian?format=json , https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/Lucid?format=json . Tier 1, retrieved 2026-10-08; not historical ID-assignment or sales proof.
3. Exact NHTSA Make_ID/MY2027 responses: Tesla 441 https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/441/modelyear/2027?format=json ; Rivian 10887 https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/10887/modelyear/2027?format=json ; Lucid 10919 https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/10919/modelyear/2027?format=json . Tier 1, retrieved 2026-10-08; preliminary listing evidence only.
4. Tesla IR, “Tesla Motors Begins Regular Production of 2008 Tesla Roadster,” https://ir.tesla.com/press-release/tesla-motors-begins-regular-production-2008-tesla-roadster — Tier 1 manufacturer primary; 2008-03-16; supports MY2008 and stated MY2009 reservation year.
5. EPA/FuelEconomy.gov all-model-years vehicles data, https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip — Tier 1 government dataset; no publication/version date or separate retrieval timestamp recorded here; included in the catalog snapshot reviewed 2026-10-06. EPA groupings are not exhaustive retail trim/sales records. Catalog rights metadata points to EPA Data License https://edg.epa.gov/EPA_Data_License.htm; verify storage/display terms before public use.
6. EPA Rivian MY2026 Part 1 certification application, https://dis.epa.gov/otaqpub/display_file.jsp?docid=62830&flag=1 — Tier 1 government certification record with manufacturer-submitted data; 2025-03-21; fetched in the pre-existing evidence file listed above. Supports model year/carlines, not sale or delivery.
7. NHTSA year pages https://www.nhtsa.gov/vehicle/2022/RIVIAN/R1T and https://www.nhtsa.gov/vehicle/2022/Lucid/Air — Tier 1, search-result cross-check accessed 2026-10-08; not first-sale proof.
8. EPA guides 1978–1983 and classic supplemental sources: catalog metadata/records; official annual EPA guide tier 1, classic sources require per-source evaluation. The historical set remains partial.
