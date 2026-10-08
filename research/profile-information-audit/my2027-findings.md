> **Checksum correction:** The original ZIP-versus-snapshot discussion below compared different payloads. The extracted CSV exactly matches the catalog hash. This does not resolve the separate preliminary-workbook identifier join. See [corrected recheck](epa-live-recheck.json).

## Key Facts

- **Exact join outcome: 0/34 resolved.** The saved workbook review reports that the 2027 workbook has 363 MY2027 rows and an `EPA FE Label Dataset ID` field, but no documented crosswalk to FuelEconomy.gov vehicle `id`. FuelEconomy.gov’s web-services documentation describes `id` as the vehicle-record identifier used to link other datasets; it does not document a label-dataset-ID crosswalk. Scope: structural identifier relationship only; no MY2027 profile has an exact workbook-to-catalog resolution. URLs: https://www.fueleconomy.gov/feg/ws/index.shtml and https://www.fueleconomy.gov/feg/epadata/27data.zip. Evidence: `research/sources/full-verification-my2027-02-page.md`; `research/sources/release-review-whole-catalog-04-my2027-datafile.md`.
- **Prior name-only crosswalk: 21/34 found, 13/34 not found.** The 21 workbook make/division + carline name matches are Buick Enclave, Cadillac Escalade, Chevrolet Corvette/Equinox/Suburban/Tahoe/Traverse, Chrysler Pacifica, Dodge Durango, Ford Expedition/Explorer, GMC Acadia/Terrain/Yukon, Jeep Gladiator/Grand Cherokee/Grand Wagoneer/Wrangler, Lincoln Aviator/Navigator, and Ram 1500. Their profile IDs are `buick-enclave-2027-model-year`, `cadillac-escalade-2027-model-year`, `chevrolet-corvette-2027-model-year`, `chevrolet-equinox-2027-model-year`, `chevrolet-suburban-2027-model-year`, `chevrolet-tahoe-2027-model-year`, `chevrolet-traverse-2027-model-year`, `chrysler-pacifica-2027-model-year`, `dodge-durango-2027-model-year`, `ford-expedition-2027-model-year`, `ford-explorer-2027-model-year`, `gmc-acadia-2027-model-year`, `gmc-terrain-2027-model-year`, `gmc-yukon-2027-model-year`, `jeep-gladiator-2027-model-year`, `jeep-grand-cherokee-2027-model-year`, `jeep-grand-wagoneer-2027-model-year`, `jeep-wrangler-2027-model-year`, `lincoln-aviator-2027-model-year`, `lincoln-navigator-2027-model-year`, `ram-1500-2027-model-year`. These are **not exact resolutions**. Source: https://www.fueleconomy.gov/feg/epadata/27data.zip; saved crosswalk evidence above.
- The 13 name-crosswalk misses are `cadillac-lyriq-2027-model-year`, `cadillac-optiq-2027-model-year`, `cadillac-vistiq-2027-model-year`, `chevrolet-bolt-2027-model-year`, `chevrolet-blazer-2027-model-year`, `dodge-charger-2027-model-year`, `lucid-air-2027-model-year`, `lucid-gravity-2027-model-year`, `rivian-r1s-2027-model-year`, `rivian-r1t-2027-model-year`, `rivian-r2-2027-model-year`, `tesla-model-3-2027-model-year`, `tesla-model-y-2027-model-year`. A missing workbook name is not evidence of no sale or unavailability.
- The saved catalog audit reports all 34 profiles have FuelEconomy `vehicles.csv.zip` vehicle-ID locators and matched rows in the live file checked 2026-10-08. This confirms those linked EPA identity rows but not an exact join to the separate guide workbook, a finalized configuration, or a U.S. sales determination. **Checksum correction:** extracted `vehicles.csv` bytes, not the ZIP archive, match the catalog source hash. An independent NHTSA vPIC make/year query now also confirms every displayed make/model/year identity; see the follow-up section below.
- FuelEconomy.gov labels the all-years file MY1984–2026 and separately links a 2027 datafile and “2027 Guide (Preliminary).” The guide listing says “updated weekly.” Scope: file/guide status, not 2027 retail availability. URLs: https://www.fueleconomy.gov/feg/download.shtml and https://fueleconomy.gov/feg/guides.shtml.

## Notable Claims Requiring Cross-Reference

- Whether/how each workbook `EPA FE Label Dataset ID` maps to catalog vehicle `id`; none established by inspected official documentation or saved crosswalk evidence.
- Whether the 34 vehicle IDs in the catalog’s recorded snapshot are from the same data version/lineage as the separate preliminary workbook; checksums/source IDs do not resolve this.
- Exact configurations and final U.S. retail availability remain unverified. A dataset listing/name is not proof of sale, delivery, or complete coverage.
- Rights, retention, and display permission were not evaluated here; this is distinct from identifier matching.

## Source Quality Assessment

- **Tier 1 — government/official:** FuelEconomy.gov/DOE-EPA download, web-services, guide listing and preliminary-data links; EPA annual-guide test-data page; EPA/DOE guide-program description. Publication dates were not surfaced in the fetched pages or search snippets. These establish agency data scope, published schema/documentation and preliminary labeling; they do not establish the missing ID join.
- No Tier 2 or Tier 3 evidence was used to resolve profile identity. No source-use permission conclusion is made.

## Gaps & Unanswered Questions

- The 34 populated MY2027 **make/model/year fields** now match current NHTSA vPIC make/year listings (case-insensitive); all 34 also match their previously checked EPA all-years source rows. The separate preliminary guide still has no exact vehicle-ID join, but it is no longer the only identity evidence. Neither check asserts actual sales, delivery, or final configuration.
- Mark only these three identity fields verified for this cohort. Keep any separate availability claim, final-configuration claim, and publication-use decision distinct; the identity cross-check alone does not make the entire catalog release-ready.

## Sources

1. “Download Fuel Economy Data,” https://www.fueleconomy.gov/feg/download.shtml, publication date not surfaced; Tier 1; fetched 2026-10-08; `research/sources/full-verification-my2027-01-page.md`.
2. “Fuel Economy Web Services,” https://www.fueleconomy.gov/feg/ws/index.shtml, publication date not surfaced; Tier 1; fetched 2026-10-08; `research/sources/full-verification-my2027-02-page.md`.
3. “Test Data for Annual Fuel Economy Guide | US EPA,” https://www.epa.gov/compliance-and-fuel-economy-data/test-data-annual-fuel-economy-guide, publication date not surfaced; Tier 1; fetched 2026-10-08; `research/sources/full-verification-my2027-03-page.md`.
4. “Help Promote Fuel Economy,” https://fueleconomy.gov/feg/guides.shtml, publication date not surfaced; Tier 1; search snippet captured 2026-10-08; `research/sources/full-verification-my2027-04-page.md`.
5. “EPA's Fuel Economy Programs,” https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P1005GVF.TXT, publication date not surfaced; Tier 1; search snippet captured 2026-10-08; `research/sources/full-verification-my2027-04-page.md`.
6. “2027 EPA Fuel Economy Guide datafile,” https://www.fueleconomy.gov/feg/epadata/27data.zip, publication date not surfaced; Tier 1; checked 2026-10-08; `research/sources/release-review-whole-catalog-04-my2027-datafile.md`.

## Follow-up: independent MY2027 vPIC identity cross-check

**Result: 34/34** catalog make/model/year identities are present in their corresponding official NHTSA vPIC 2027 make/year listings. Case-insensitive model-name matching resolves every record; 30 labels are text-identical and four differ only in capitalization (Cadillac LYRIQ/Lyriq, OPTIQ/Optiq, VISTIQ/Vistiq; Chevrolet BOLT/Bolt). This independently corroborates the already-rechecked EPA all-years rows. Neither result claims a retail-sale count, delivery, or final national lineup. The separate preliminary workbook still lacks an exact ID join, but it is not the sole evidence for these profile identities.

| Make | MY2027 catalog models present in vPIC | Source response |
|---|---|---|
| Buick | Enclave | `research/sources/profile-batch-vpic-2027-buick.md` |
| Cadillac | Escalade, Lyriq, Optiq, Vistiq | `research/sources/profile-batch-vpic-2027-cadillac.md` |
| Chevrolet | Blazer, Bolt, Corvette, Equinox, Suburban, Tahoe, Traverse | `research/sources/profile-batch-vpic-2027-chevrolet.md` |
| Chrysler | Pacifica | `research/sources/profile-batch-vpic-2027-chrysler.md` |
| Dodge | Charger, Durango | `research/sources/profile-batch-vpic-2027-dodge.md` |
| Ford | Expedition, Explorer | `research/sources/profile-batch-vpic-2027-ford.md` |
| GMC | Acadia, Terrain, Yukon | `research/sources/profile-batch-vpic-2027-gmc.md` |
| Jeep | Gladiator, Grand Cherokee, Grand Wagoneer, Wrangler | `research/sources/profile-batch-vpic-2027-jeep.md` |
| Lincoln | Aviator, Navigator | `research/sources/profile-batch-vpic-2027-lincoln.md` |
| Lucid | Air, Gravity | `research/sources/profile-batch-vpic-2027-lucid.md` |
| Ram | 1500 | `research/sources/profile-batch-vpic-2027-ram.md` |
| Rivian | R1S, R1T, R2 | `research/sources/profile-batch-vpic-2027-rivian.md` |
| Tesla | Model 3, Model Y | `research/sources/profile-batch-vpic-2027-tesla.md` |

This cross-check verifies make/model/year identity only. It does not certify other populated profile fields; the separate MY2027 Chrysler Pacifica generation field is assessed in `research/profile-information-verification.md`.
