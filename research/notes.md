# Research Notes: U.S. Automotive Catalog Coverage

**Status:** researching — full profile-information verification<br>
**Depth:** Deep

## Plan

- **Question:** Are the facts already displayed on every current development profile supported for that model year, market, configuration, and source-use context?
- **Scope:** All 4,715 profiles and their existing populated information only. Missing optional facts stay missing. No production data, public visibility, or release settings may be changed.
- **Audience:** AutoResearch product owner.
- **Deliverable:** A row-by-row disposition backed by saved evidence, plus an updated cited report. Publication is considered only when every populated claim has a supported factual, applicability, provenance, and source-use verdict.

## Current full-verification pass

**Scope:** Continue from the completed census, not from its old readiness recommendation. A returned profile and a matching dataset row are not by themselves proof that every populated fact, scope, and reuse basis is verified.

| # | Area | Status | Target |
|---|---|---|---|
| 1 | EPA, annual-guide and vPIC identity facts | Prior exact row checks available; finish field/source disposition | 4,133 profiles |
| 2 | Historical model-year identities and source lineage | Open; 223 of 539 have bounded support across 716 populated facts; 316 have not yet received targeted fact-level checks. The latest batch adds 23 Ford Thunderbird identities from exact-year secondary guides; primary-source review, rights, and provenance remain open | 539 profiles |
| 3 | Preliminary MY2027 identity fields and extra information | All 34 make/model/year identities checked; Pacifica's separate generation field is partial | 34 profiles |
| 4 | Generation and refresh labels/ranges | Open; 699 populated fields and 142 bundled intervals; all 70 populated Corvette generation values are now matched to Chevrolet's C1–C8 ranges, and three F-150 intervals plus five corresponding profile identities have factual support | 699 profiles |
| 5 | Trim facts and sibling lists | Open; source and scope checks remain | 43 profiles |
| 6 | Mustang configuration and overview | Open; two specifications supported, four incomplete | 1 profile |

### Coverage checklist

- [x] Retrieve every profile, match its Browse identity, and inventory each populated field and claim.
- [x] Verify the 34 populated MY2027 make/model/year identities in 13 fresh NHTSA vPIC make/year responses; none are inferred missing from a guide crosswalk.
- [ ] For each existing populated fact, record a source that supports its exact value and scope; distinguish direct support from a partial match.
- [ ] Verify historical make/model/year identities and preserve exact source revision or primary-document locators.
- [ ] Verify every displayed generation/refresh association and year boundary, not just the name or onset.
- [ ] Verify trim and sibling-trim statements against year-, market-, and model-specific evidence.
- [ ] Verify source-use conditions separately from factual accuracy, with no blanket manufacturer-permission requirement.
- [ ] Reconcile all profiles and evidence before preparing any release; unresolved populated claims remain blockers.

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
- The 43 preview trim identities have 237 accepted evidence rows and 26 distinct source URLs. This documents linked claims, not completeness of the retail trim catalog or clearance of source-specific terms. ([trim evidence](catalog-trim-evidence.csv))

### Source verification

- Static model-year source composition is 3,639 EPA all-years entries, 488 EPA annual-guide entries, 539 selected historical entries, and 6 NHTSA/vPIC supplements. Five current vPIC URLs covered the six supplements. Of the 539 secondary historical entries, 533 are before MY1978 and 6 are within MY1978–1983.
- All 18,764 vehicle-ID references attached to the 3,639 EPA identities were present in the current official file retrieved 2026-10-08; make, year, source model label, and base-model group matched with zero mismatches. **Corrected:** the builder hashes extracted CSV content, and the current CSV exactly matches the catalog hash. The earlier ZIP-to-CSV comparison was incorrect. [@epa-01-download-coverage] ([saved recheck](profile-information-audit/epa-live-recheck.json))
- The 34 MY2027 make/model/year identity fields match the NHTSA vPIC 2027 make/year query for each of the 13 makes: 30 exact-case labels and four capitalization-only variants. One of the 34 profiles (Chrysler Pacifica) also has separate generation information, which this identity check does not verify. [@profile-batch-vpic-2027-buick] [@profile-batch-vpic-2027-cadillac] [@profile-batch-vpic-2027-chevrolet] [@profile-batch-vpic-2027-chrysler] [@profile-batch-vpic-2027-dodge] [@profile-batch-vpic-2027-ford] [@profile-batch-vpic-2027-gmc] [@profile-batch-vpic-2027-jeep] [@profile-batch-vpic-2027-lincoln] [@profile-batch-vpic-2027-lucid] [@profile-batch-vpic-2027-ram] [@profile-batch-vpic-2027-rivian] [@profile-batch-vpic-2027-tesla]
- Ford and Hagerty evidence supports three F-150 intervals across five generation fields and supports make/model/year values on those five MY1975–1979 profiles. Car and Driver captures are excluded after the Hearst terms review; claims that depended on that history are not used. Hagerty's year-specific valuation pages are not a complete sales census; the imported Wikipedia revision, source-use terms, and the catalog locator's narrower “split-grille” wording remain open. [@profile-batch-f150-official-1975] [@profile-batch-f150-hagerty-sixth-generation] [@profile-batch-f150-hagerty-buyers-guide] [@profile-batch-f150-hagerty-1977-model-year] [@profile-batch-f150-hagerty-model-year-1975] [@profile-batch-f150-hagerty-model-year-1976] [@profile-batch-f150-hagerty-model-year-1978] [@profile-batch-f150-hagerty-model-year-1979] ([fact-check matrix](profile-information-audit/f150-profile-fact-check.csv); [current exclusions](sources/publisher-access-terms-review.md))
- Four Ford Model A profiles for MY1928–1931 have bounded make/model/year support. Ford and Smithsonian explicitly identify the 1928 model year; The Henry Ford explicitly calls 1929 the second model year; Hagerty and Hemmings describe the 1928–1931 span and year-specific updates. The 1930 Henry Ford record is snippet-only and its “Date Made” field is not itself a model-year definition. The imported Wikipedia revision, current indexed 1928–1932 span, full-year coverage, and source-use conditions remain unresolved. [@ford-model-a-1928-history] [@smithsonian-model-a-overview] [@henry-ford-model-a-1928] [@henry-ford-model-a-1929] [@henry-ford-model-a-1930] [@hagerty-model-a-years] [@hemmings-model-a-years] [@smithsonian-model-a-1931] ([fact-check matrix](profile-information-audit/model-a-profile-fact-check.csv))
- Twenty-eight Ford Mustang profiles were rechecked for MY1965–1977 and MY1979–1993. Ford and Smithsonian distinguish the 1964 launch/manufacture date from the MY1965 identity; The Henry Ford describes early production-guide ranges. After excluding the Car and Driver capture, all 28 generation labels are unverified, and the four MY1974–1977 identity values also lack currently eligible evidence. EPA records continue to support make/model/year identity for MY1979–1993. Revision provenance and source-use rights remain open; current status is in the [source-exclusion override ledger](profile-information-audit/publisher-exclusion-overrides.csv). [@mustang-ford-worlds-fair] [@mustang-smithsonian-1965] [@mustang-henry-ford-history] [@epa-guide-1979-mustang] [@epa-guide-1980-mustang] [@epa-guide-1981-mustang] [@epa-guide-1982-mustang] [@epa-guide-1983-mustang] [@epa-1984-present-vehicle-data]
- Eleven Chevrolet Camaro profiles for MY1967–1977 retain bounded make/model/year support from GM's year-specific kit index; GM Heritage identifies MY1967 as the new Camaro year. Car and Driver captures are excluded after the Hearst terms review. The kit PDFs themselves were not reviewed for detailed features; exact configuration, Wikipedia revision provenance, and source-use rights remain open. [@gm-01-heritage-vehicle-information-kits] [@camaro-gm-1967-pace-car] ([fact-check matrix](profile-information-audit/camaro-profile-fact-check.csv); [current exclusions](sources/publisher-access-terms-review.md))
- Twelve Chevrolet Chevelle profiles for MY1966–1977 have primary archive-index title support for make/model/year; the individual kits were not opened. Hagerty's secondary guide covers Chevelle SS models from MY1968–1972 only, not the full line. A Volo history candidate was excluded because its page links terms prohibiting automated retrieval/indexing/data mining; no article content or media was retained. Provenance, exact configurations, and source-use rights remain open. [@gm-01-heritage-vehicle-information-kits] [@chevelle-hagerty-1968-72-guide] [@volo-linked-access-terms] ([fact-check matrix](profile-information-audit/chevelle-profile-fact-check.csv))
- The six annual guide files for MY1978–1983 match their recorded checksums. All 908 stored line locators match the model labels in those files. This proves catalog-to-guide linkage, not completeness of EPA guide coverage. [@epa-04-annual-guide-test-data] [@epa-03-fuel-economy-guide-scope]
- A targeted review additionally confirms the six MY1981–1983 EPA entries for Ford F100/F150 2WD and F150 4WD, retaining each publisher grouping exactly as printed. These entries support EPA-record identity only, not retail configuration or a complete sales roster. Four separate F-150 profiles for MY1980–1983 now have bounded identity and generation/refresh support from the annual guides and Hagerty's 1980–1986 F-Series history; source provenance and reuse rights remain open, so all remain on hold. [@epa-guide-1980-mustang] [@epa-guide-1981-mustang] [@epa-guide-1982-mustang] [@epa-guide-1983-mustang] [@hagerty-fseries-1980-86-history] ([fact-check matrix](profile-information-audit/f150-profile-fact-check.csv))
- All six NHTSA model-year supplements match current exact vPIC results across five year-scoped endpoints; response JSON and exact query URLs are saved in `research/sources/catalog-vpic-01..05-identity-check.md`. vPIC's manufacturer-submission/VIN system is not an exhaustive U.S. retail-sales census. [@epa-02-nhtsa-vpic-scope] [@ev-makers-01-nhtsa-vpic-api] [@catalog-vpic-01-identity-check] [@ev-makers-05-tesla-2008-vpic] [@catalog-vpic-03-identity-check] [@catalog-vpic-04-identity-check] [@catalog-vpic-05-identity-check]
- The EPA all-years dataset and annual guide boundary describe EPA fuel-economy data, not a complete inventory of every vehicle sold in the United States. [@epa-01-download-coverage] [@epa-03-fuel-economy-guide-scope] [@gapfill-history-01-epa]

### Historical continuity and future years

- The project source mix is uneven before MY1984. EPA test-car and annual-guide archives offer bounded program data; GM's Vehicle Information Kits and Henry Ford's production-record archive are useful but selected holdings, not make-wide year-by-year censuses. [@gapfill-history-01-epa] [@gm-01-heritage-vehicle-information-kits] [@gapfill-history-02-gm-archive] [@ford-lincoln-05-henry-ford-production-records]
- Ford/Lincoln wartime and nameplate breaks require model-year evidence; factory shutdown dates alone do not determine a retail model year. [@ford-lincoln-01-wartime-production] [@ford-lincoln-04-wwii-production] [@ford-lincoln-05-henry-ford-production-records] [@gm-05-ecfr-model-year]
- Corporate make changes are not identical to model-year changes. The reported Dodge/Ram split must be verified from an eligible primary source; the restricted MotorTrend capture is excluded. EPA historical labels and each model-year catalog name remain separate evidence and must not be collapsed into one date. [@stellantis-03-epa-chrysler-1990] [@epa-01-download-coverage]
- Completed targeted batch: Ford Model A MY1928–1931 (four profiles). All 12 populated make/model/year values have scoped factual support; 1927 introduction and later production dates were kept distinct from model-year identity. Wikipedia revision provenance and source-use clearance remain open.
- Completed targeted fact-check batches: Ford Mustang MY1965–1977 (13 profiles, 52 populated values) and MY1979–1993 (15 profiles, 60 populated values), totaling 28 profiles and 112 identity/generation values. The 1964 debut/production date is not treated as a 1964 model year. After excluding Car and Driver, all 28 generation labels are unverified; the four MY1974–1977 identity labels are also unverified, while Ford, Smithsonian, and The Henry Ford support nine MY1965–1973 identities and EPA supports 15 MY1979–1993 identities. Exact configurations and complete U.S. sales coverage are not established. Wikipedia revision provenance and source-use clearance remain open; every row remains HOLD.
- Completed targeted fact-check batch: Chevrolet Camaro MY1967–1977 (11 profiles, 33 populated values). GM's archive index supports the year labels and GM Heritage identifies MY1967 as the new Camaro year. The Car and Driver capture is excluded and is not used as evidence. The archive index, not the detailed kit PDFs, was checked. Wikipedia revision provenance and source-use clearance remain open.
- Completed targeted fact-check batch: Chevrolet Chevelle MY1966–1977 (12 profiles, 36 populated values). GM's archive index provides year-specific identity titles; Hagerty's guide offers only limited secondary coverage of the SS subset for MY1968–1972. The kit PDFs were not reviewed. A Volo article was excluded because its linked terms prohibit automated retrieval; no Volo text or media was retained. Provenance, exact configurations, and source-use clearance remain open.
- Completed targeted fact-check batch: Chevrolet Corvette MY1956–1963 and MY1966–1977 (20 profiles, 80 populated values). GM's archive index provides year-specific identity titles, but the corresponding PDFs were not reviewed. Chevrolet's official timeline supports the C1/C2 intervals; Chevrolet's timeline, Motor1, and an NCRS reference listing support C3 MY1968–1982. Car and Driver evidence is excluded. All rows remain HOLD for source provenance, exact-configuration limits, and unresolved source-use terms.
- Development model-year extrema and counts are in [the make coverage table](catalog-coverage-by-make.csv). They are observed catalog bounds, not launch/end years for each brand. Within-name gaps total 660 leads across 70 case-insensitive make/model groups; none is presumed an omission or confirmed hiatus. ([gap leads](catalog-year-gap-leads.csv))
- The displayed MY2027 make/model/year values are now cross-checked; this does not claim an exhaustive retail lineup. The separate Chrysler Pacifica generation field is partially checked: official sources support the 2017 start and 2027 refresh, and a 2021 source supports the earlier fascia update, but the available Mopar code table stops at MY2025 and does not validate RU for MY2026–2027. [@profile-batch-pacifica-2017-windsor] [@profile-batch-pacifica-ru-body-code] [@profile-batch-pacifica-2027-orders] [@full-verification-gap-generation-08-page]

### Rights and release decision

- EPA's general open-data statement defaults EPA-produced material to public domain but directs users to check the metadata and limitations for the dataset itself; it does not settle the provenance or rights of every field in every export. [@gapfill-rights-01-epa-license] [@epa-01-download-coverage]
- NHTSA's API Use Policy describes limits on bulk VIN lookups; the current source checks here used exact make/model/year listing endpoints, not bulk VIN lookups. That policy is neither a blanket prohibition nor a blanket license for all vPIC datasets and downstream display. [@gapfill-rights-02-nhtsa-api-policy] [@epa-02-nhtsa-vpic-scope] [@ev-makers-01-nhtsa-vpic-api]
- Wikipedia-derived identities need attribution and source-history review; the CC BY-SA database-rights provision is use- and scope-dependent and does not itself decide whether this normalized catalog triggers obligations. [@gapfill-rights-03-cc-by-sa-legalcode]
- Distinguish factual vehicle names from copied prose, tables, images, and creative presentation. Do not require manufacturer permission merely because a factual record concerns that make; review actual access terms and any restrictions for the specific evidence used. ([source inventory](catalog-source-inventory.csv))
- **Recommendation:** Do not release the catalog. No code or production data was changed, and no publication was made. The project owner must explicitly approve any later release.

## Conflicts & Open Questions

- The initial 4,818/4,672/146 and 4,775/43 totals are superseded by the live API census: 4,818 option rows, 4,715 unique IDs, 4,672 model-year profiles, and 43 trim profiles.
- The EPA live-file match is complete for referenced identity fields and extracted CSV checksum. The earlier alleged version mismatch compared the ZIP with extracted CSV content and is resolved.
- Of the 539 selected historical profiles, 223 now have targeted field-level checks across 716 populated values: 25 Chevrolet Corvette profiles for MY1953–1977, fourteen Chevelle profiles for MY1964–1977, sixteen Chevy II/Nova profiles for MY1962–1977, eighteen Chevrolet C/K profiles for MY1960–1977, nine F-150 profiles for MY1975–1983, four Ford Model A profiles for MY1928–1931, thirteen Mustang profiles for MY1965–1977, 23 Ford Thunderbird profiles for MY1955–1977, eleven Camaro profiles for MY1967–1977, eighteen Eldorado profiles (MY1953, the MY1957 Eldorado Brougham entry, and sixteen additional years), thirteen DeVille profiles, thirteen Series 62 profiles, twenty Impala profiles for MY1958–1977, and 26 Chevrolet Bel Air profiles for MY1950–1975. The original seven Corvette/Chevelle rows use relevant kit sections; twenty additional Corvette and twelve Chevelle identity checks rely on GM archive-index titles, not reviewed kit PDFs. The sixteen Chevy II/Nova and the MY1953/MY1957 Eldorado checks rely on GM Heritage index titles. Bel Air, Impala, C/K, and 42 Cadillac identity checks use relevant text from year-specific GM vehicle-information kits; the Cadillac PDFs were not reviewed in full. Seven indexed Cadillac kits could not be text-extracted and were not used to support profiles. Thunderbird identity checks use 23 exact-year Car Model History guides whose own citations point to period documents; those underlying files were not independently reviewed, and the site disclaims accuracy. The C/K evidence supports the broad C/K family and model year, not exact retail wording or body/trim applicability. The exact retail naming across the early Chevy II/Nova transition remains open. Corvette generation labels have bounded support for C1 MY1953–1962, C2 MY1963–1967, and C3 MY1968–1982. After restricted-source exclusion, 17 Mustang values remain unverified: 13 generation labels and four MY1974–1977 identities. Provenance and source-use clearance remain open; all targeted rows are on hold. The other 316 profiles have not yet received a targeted fact-level check. The cohort is selected evidence, not a complete historical U.S. census; 660 name-year gaps remain leads only. Model A production-end dates conflict across sources and are not used to infer model year.
- Exact retail availability and final MY2027 status are distinct from EPA/vPIC listing. Some current official product pages announce 2027 products, but a listing or preliminary catalog row is not a complete final sales roster.
- The catalog's source metadata marks all source records `allowed`; source-specific rights and access restrictions have not been independently cleared for every retained field or trim URL.

## Gaps

- Moved to report Limitations: no single comprehensive pre-1984 source was found; selected historical source rows and each gap lead still need independent historical review.
- Moved to report Limitations: exact trim evidence is linked but all 26 source URLs have not been independently assessed for access, storage, attribution, and display terms.
- Checksum question resolved: the extracted EPA CSV matches the saved review hash. Moved to report Limitations: MY2027 retail/final-availability claims are not established for every entry.

## Follow-up: all-profile release-readiness review

- **Question:** Which of the 4,715 development profiles, if any, can be considered for a scoped public release, and what evidence or source-use gates remain?
- **Scope:** Audit all 4,672 model-year identities and 43 trim/configuration previews privately. Do not change production data, release settings, or public visibility.
- **Audience:** AutoResearch product owner.
- **Deliverable:** A cited release-readiness report and a row-level CSV with evidence cohort, verification, blockers, and disposition for every profile.
- **Focus areas:** EPA data/guides and source versioning; NHTSA/vPIC; selected historical secondary sources; all trim-evidence sources; per-profile readiness and coverage limits.
- **Coverage checklist:**
  - [x] Reconcile all 4,715 profile rows and map each to its evidence cohort.
  - [x] Review source access, retention, attribution, automation, and public-display terms by source; retain unresolved hosts/files as holds.
  - [x] Separate identity evidence from retail-market completeness and exact-trim proof.
  - [x] Resolve the prior report's 25-versus-26 trim-source URL discrepancy; the verified count is 26.
  - [x] Classify every profile and identify only conditional review cohorts, without implying owner approval.
- **Initial findings:** The profile export contains 4,715 unique profiles (4,672 model-year and 43 trim/configuration); trim evidence has 237 accepted claim rows and 26 exact URLs. All 43 trim profiles have at least two linked URLs; 235 evidence rows are marked moderate strength and two strong. The earlier 25-URL count is corrected in both reports. All 46 bundled-source inventory rows say `allowed`, but that internal status is not a source-rights clearance. The catalog includes 34 MY2027 profiles and 660 unresolved year-gap leads.
- **Disposition:** A 4,099-profile group (3,605 non-2027 EPA all-years, 488 annual-guide, 6 vPIC) is a possible first review cohort only. All 4,715 rows remain `release_ready_now=No`; 539 historical identities, 34 MY2027 identities, and 43 trim previews are explicitly held.
- **MY2027:** The separate preliminary workbook has 363 rows. A make/division plus model/carline name-only crosswalk found 21 of 34 catalog profiles; 13 were not found. No exact EPA vehicle-ID join was established, and unmatched names do not establish lack of U.S. availability. ([saved crosswalk](sources/release-review-whole-catalog-04-my2027-datafile.md))
- **Trim source review:** The 26-URL ledger covers five groups: GM (20 profiles), Ram (12), Ford F-150 (6), Lucid Air (4), and Ford Mustang (1). Source terms and exact retail configuration are not cleared for any group. ([trim source ledger](sources/release-review-trim-source-ledger.md))
- **Outputs:** [Cited Markdown report](catalog-release-readiness.md), [standalone HTML report](catalog-release-readiness.html), and [4,715-row disposition CSV](catalog-release-readiness.csv).
- **Release decision:** Do not publish. No profile is approved by this review; production data, release settings, and public visibility were not changed.
- **Open questions retained as Limitations:** Whether dataset-specific EPA conditions support the intended display; whether the historical Wikipedia revisions can be attributed and verified year by year; whether exact trim source terms can be cleared or replaced; and how to reconcile the 34 MY2027 source IDs to the separate preliminary file.
