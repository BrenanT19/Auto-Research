# All-profile information verification — current results

**Checked:** 2026-10-08 UTC / 2026-10-07 Pacific  
**Sources cited:** 32  
**Status:** Full factual verification is incomplete. No public release was prepared or published.

## What was checked

Every one of the **4,715 distinct development profiles** was retrieved, not just sampled. All profile IDs and make/model/year/trim values matched their Browse records. The census found **14,936 nonempty top-level information fields**, **5,668 claim/source associations**, and **97 distinct external source URLs**. Empty reliability objects with null values were excluded from populated research. These are reproducible local inventory results, not a claim that all facts are verified. [Inventory summary](profile-information-audit/summary.json) · [Field-by-field inventory](profile-information-audit/populated-information.csv)

The request is to verify existing information before publication. Missing research may remain clearly labeled missing; it need not be invented. A model-year identity does not require a complete retail build sheet, and a trim-name preview does not require an exhaustive option matrix unless it claims such facts. Conversely, a populated generation label, fuel specification, or factual overview needs evidence for the actual value and scope displayed.

## Corrected EPA checksum finding

The earlier audit incorrectly compared the ZIP archive checksum with the catalog's extracted-CSV checksum. A fresh download's extracted **vehicles.csv exactly matches the catalog hash**. All **18,764 referenced vehicle rows across 3,639 profiles** were rechecked, with zero ID/make/model/year/base-model mismatches. The source-version discrepancy is therefore resolved, not an outstanding release blocker. [Recheck evidence](profile-information-audit/epa-live-recheck.json) The official dataset page defines its fuel-economy scope; EPA's annual-guide archive and web-services documentation provide their respective file and identifier contexts. [[1]](https://www.fueleconomy.gov/feg/download.shtml) [[2]](https://www.epa.gov/compliance-and-fuel-economy-data/test-data-annual-fuel-economy-guide) [[3]](https://www.fueleconomy.gov/feg/ws/index.shtml)

EPA's default public-domain statement is favorable for EPA-produced data, subject to stated exceptions and dataset metadata. It does not create a blanket requirement for manufacturer permission merely because facts concern their products. Copyright limitations on factual material and source-specific contractual restrictions are different questions. [[4]](https://edg.epa.gov/EPA_Data_License.htm) [[5]](https://www.copyright.gov/circs/circ33.pdf) vPIC's public-use FAQ and API documentation support a narrow agency-query use, not a complete national retail-sales census. [[6]](https://vpic.nhtsa.dot.gov/api/home/index/faq) [[7]](https://vpic.nhtsa.dot.gov/api)

## Remaining factual checks

| Information | Exact result | Remaining issue |
|---|---|---|
| EPA identities | 3,639 profiles / 18,764 reference rows match and CSV hash matches | Record support is scoped to EPA's dataset, not every retail offering |
| Annual-guide identities | Prior check: 488 profiles / 908 locators and six file hashes match | Preserve guide scope and source-specific conditions |
| Historical identities | Seven GM archive-kit titles corroborated; underlying PDFs not inspected | The other 532 identities are not independently corroborated; exact article revisions remain missing |
| MY2027 | 34 all-years identities match; separate workbook has 21 name matches and 13 misses | No exact workbook-ID join established; misses do not mean unavailable vehicles |
| Trim names | Fresh document support for 17 Chevrolet/GMC, 12 Ram and four Lucid labels | Ten other previews lack new original-document checks; exact claimed market scope and source-use conditions remain open |
| Generation information | 699 profiles contain it; 142 bundled era rows were inventoried | No complete interval in that 142-row batch was fully re-verified; three onset claims received limited corroboration |
| Mustang specifications | Final-year EPA evidence supports RWD and 10-speed automatic in its own record scope | Fastback applicability/EcoBoost naming remain partial; exact octane wording and 15.9 U.S. gallons unresolved |

The historical matches are **archive-index titles**, not inspected specification kits. GM's collection and The Henry Ford's bounded production-record holdings cannot by themselves establish every historical year/nameplate claim. [[8]](https://www.gm.com/heritage/archive/vehicle-information-kits) [[9]](https://www.thehenryford.org/collections/explore/popular-research-topics/vehicle-production-records) Wikimedia reuse guidance and the relevant license explain attribution obligations; they do not identify the particular revisions used by this catalog. [[10]](https://www.mediawiki.org/wiki/Wikimedia_APIs/Content_reuse) [[11]](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en)

The separate 2027 workbook remains preliminary-source evidence. Name matching does not establish an exact identifier join, and absence from that workbook cannot prove no U.S. offering. [[12]](https://www.fueleconomy.gov/feg/epadata/27data.zip) The all-years row checks remain valid; the unresolved question is what the profile can truthfully claim about status and scope.

## Trim-source evidence and limits

| Source inspected | What it supports in this pass |
|---|---|
| 2024 Chevrolet Silverado PDF | Nine named trim labels and model year; not an exhaustive configuration matrix [[13]](https://media.chevrolet.com/content/dam/Media/images/US/Vehicles/Chevrolet/Trucks/Silverado/2024/2024-Chevrolet-Silverado-033023.pdf) |
| 2024 GMC Sierra PDF | Eight named trim labels and model year; not every compatible option combination [[14]](https://media.gmc.com/content/dam/Media/images/US/Vehicles/GMC/Sierra/2024/2024-GMC-Sierra-1500.pdf) |
| Ram Heavy Duty press kit and off-road announcement | Seven 2500 / five 3500 grade identities in stated North American scope [[15]](https://media.stellantisnorthamerica.com/newsrelease.do?id=25278&mid=69) [[16]](https://media.stellantisnorthamerica.com/newsrelease.do?id=25278&fIId=25845&mid=69) |
| Ram availability matrix | Combined 2500/3500 cab/bed evidence, not a model-separated U.S. build-sheet matrix [[17]](https://s3.amazonaws.com/chryslermedia.iconicweb.com/mediasite/specs/2024_RAM_2500_3500_HD_FA.pdf) |
| Lucid announcement | Four named Air variants and North American context, with model-year limitations [[18]](https://ir.lucidmotors.com/news-releases/news-release-details/lucid-air-model-line-updates-offer-customers-more-freedom-power) |
| Four EPA Lucid examples | MY2024 Pure RWD, Touring AWD, G Touring XR AWD, Sapphire AWD examples—not every build [[19]](https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47454) [[20]](https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47839) [[21]](https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47836) [[22]](https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47456) |

Source-host conditions must be applied to the actual site and intended use, not transferred indiscriminately between sibling hosts. The inspected Stellantis North America media terms restrict copying for commercial distribution and distinguish editorial access. [[23]](https://media.stellantisnorthamerica.com/page.do?file=legal) The inspected From The Road terms address that Ford site. [[24]](https://www.fromtheroad.ford.com/us/en/terms-and-conditions) The Lucid IR homepage did not establish a reuse grant; absence of visible terms is not permission. [[25]](https://ir.lucidmotors.com/) These observations do not prove that ordinary normalized vehicle facts need a blanket brand license.

## Generation and Mustang information

Limited independent corroboration supports three refresh onsets: Model S in 2016, U.S. Model 3 Highland in 2024, and Pacifica in MY2021. It does **not** verify their complete end dates or all 142 era intervals. [[26]](https://www.consumerreports.org/hybrids-evs/tesla-model-s-gets-facelift-upgraded-equipment) [[27]](https://www.theverge.com/2024/1/10/24032562/tesla-model-3-2024-refresh-us-available-highland) [[28]](https://www.motor1.com/news/397218/2021-chrysler-pacifica-facelift-debut) Tesla's Model 3 manual selector supports a 2024+ U.S. manual grouping, not every transition detail. [[29]](https://www.tesla.com/ownersmanual/index-model-3.html) Calendar announcement/production dates must not be substituted for model years. [[30]](https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-85/subpart-X/section-85.2302) A prohibited PR Newswire capture and a failed fleet-page retrieval were excluded from evidence.

The final-year EPA Mustang record supplies 2.3L/four-cylinder, 10-speed automatic and rear-drive attributes; it does not establish the retail Fastback-versus-convertible mapping or minimum AKI. [[31]](https://fueleconomy.gov/feg/noframes/46646.shtml) The manual capture exposed relevant headings but not the necessary octane and tank-capacity passages. A second, direct PDF inspection attempt received HTTP 403 despite successful HEAD metadata; its pages were not inspected and no access-control bypass was attempted. [Retrieval result](profile-information-audit/mustang-manual-inspection.json) Neither value is newly verified from that incomplete extraction, and a secondary 16.0-gallon claim is not a basis to silently replace 15.9. [[32]](https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2024_Ford_Mustang_Owners_Manual_version_1_om_EN-US.pdf)

The Mustang overview is an authored historical research snapshot. Current government requests again returned **12 recall campaigns**, but now **82 complaints**, compared with its October 3 snapshot's 81. NCAP still returns five-star overall and InvestigationCount 0 for the two-door RWD family. These are not exact-configuration recalls, defect rates, VIN-open status, or a transferred EcoBoost safety rating. A visible snapshot date must accompany the older total. [Saved current responses](profile-information-audit/mustang-complaints-live.json) · [Recall response](profile-information-audit/mustang-recalls-live.json) · [NCAP response](profile-information-audit/mustang-safety-live.json)

## Flag triage and release decision

The 19 automated flags all concern the private Mustang: five unknown-field references whose claims are not exposed, twelve claims with unresolved applicability, and two internally authored notes without external URLs. There are **zero missing claim references on known fields**. Unknown recall/safety/MPG values remain withheld; these flags are not 19 incorrect displayed facts. [Raw flags](profile-information-audit/structural-issues.csv)

Full factual verification remains incomplete, particularly for existing generation information, historical identities, claimed market scope and Mustang details. Missing research and lack of an exhaustive national sales census are **not**, by themselves, reasons to reject a correctly scoped identity profile. The problem is unresolved support for information actually present and its usable provenance. No profile was removed, no optional fact invented, no production data changed, and no publication attempted.

The per-profile output keeps factual-verification completion and release readiness at **No** until the required checks are complete. It records the owner's conditional verification-then-publication instruction rather than an approval to publish unresolved rows. Publishing the current development-preview build would not make these profiles a verified production catalog. [All 4,715 profile dispositions](profile-information-audit/profile-dispositions.csv)

## Sources

1. [Download Fuel Economy Data](https://www.fueleconomy.gov/feg/download.shtml) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-government-01-page.md`.
2. [Test Data for Annual Fuel Economy Guide | US EPA](https://www.epa.gov/compliance-and-fuel-economy-data/test-data-annual-fuel-economy-guide) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-government-02-page.md`.
3. [Fuel Economy Web Services](https://www.fueleconomy.gov/feg/ws/index.shtml) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-my2027-02-page.md`.
4. [EPA Standard Open Data License](https://edg.epa.gov/EPA_Data_License.htm) — Published: not surfaced; Tier 1; evidence: `research/sources/release-review-epa-fuel-economy-01-epa-license.md`.
5. [Circular 33 Works Not Protected by Copyright](https://www.copyright.gov/circs/circ33.pdf) — Published: not surfaced; Tier 1; evidence: `research/sources/release-review-historical-model-year-identities-03-copyright-circular-33.md`.
6. [NHTSA vPIC Frequently Asked Questions](https://vpic.nhtsa.dot.gov/api/home/index/faq) — Published: not surfaced; Tier 1; evidence: `research/sources/release-review-nhtsa-vpic-02-vpic-faq.md`.
7. [NHTSA Product Information Catalog Vehicle Listing API documentation](https://vpic.nhtsa.dot.gov/api) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-government-03-page.md`.
8. [GM Heritage Archive: Vehicle Info Kits | General Motors](https://www.gm.com/heritage/archive/vehicle-information-kits) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-historical-02-gm-vehicle-kits.md`.
9. [Ford Vehicle Production Records - The Henry Ford](https://www.thehenryford.org/collections/explore/popular-research-topics/vehicle-production-records) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-historical-01-ford-production-records.md`.
10. [Wikimedia APIs/Content reuse - MediaWiki](https://www.mediawiki.org/wiki/Wikimedia_APIs/Content_reuse) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-historical-03-wikimedia-revision-reuse.md`.
11. [Creative Commons Attribution-ShareAlike 4.0 International Legal Code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en) — Published: 2013-11-25; Tier 1; evidence: `research/sources/gapfill-rights-03-cc-by-sa-legalcode.md`.
12. [2027 EPA Fuel Economy Guide datafile (download linked from FuelEconomy.gov)](https://www.fueleconomy.gov/feg/epadata/27data.zip) — Published: not surfaced; Tier 1; evidence: `research/sources/release-review-whole-catalog-04-my2027-datafile.md`.
13. [Chevrolet title: SILVERADO FAST FACTS - Chevrolet.](https://media.chevrolet.com/content/dam/Media/images/US/Vehicles/Chevrolet/Trucks/Silverado/2024/2024-Chevrolet-Silverado-033023.pdf) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-gm-ford-01-page.md`.
14. [GMC title: 2024 SIERRA 1500 - GMC.](https://media.gmc.com/content/dam/Media/images/US/Vehicles/GMC/Sierra/2024/2024-GMC-Sierra-1500.pdf) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-gm-ford-02-page.md`.
15. [2024 Ram 2500 & 3500 Heavy Duty official press kit](https://media.stellantisnorthamerica.com/newsrelease.do?id=25278&mid=69) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-ram-lucid-01-page.md`.
16. [2024 Ram 2500 off-road lineup announcement](https://media.stellantisnorthamerica.com/newsrelease.do?id=25278&fIId=25845&mid=69) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-ram-lucid-03-page.md`.
17. [2024 Ram 2500 and 3500 Heavy Duty feature-availability matrix](https://s3.amazonaws.com/chryslermedia.iconicweb.com/mediasite/specs/2024_RAM_2500_3500_HD_FA.pdf) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-ram-lucid-02-page.md`.
18. [Official IR release](https://ir.lucidmotors.com/news-releases/news-release-details/lucid-air-model-line-updates-offer-customers-more-freedom-power) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-ram-lucid-04-page.md`.
19. [2024 Lucid Air Pure RWD with 19 inch wheels](https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47454) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-ram-lucid-09-page.md`.
20. [2024 Lucid Air Touring AWD with 19 inch wheels](https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47839) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-ram-lucid-10-page.md`.
21. [2024 Lucid Air G Touring XR AWD with19 inch wheels](https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47836) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-ram-lucid-11-page.md`.
22. [2024 Lucid Air Sapphire AWD](https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47456) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-ram-lucid-12-page.md`.
23. [Direct legal page search result: Stellantis Media - Legal Notices and Terms,](https://media.stellantisnorthamerica.com/page.do?file=legal) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-ram-lucid-07-page.md`.
24. [Terms & Conditions](https://www.fromtheroad.ford.com/us/en/terms-and-conditions) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-gm-ford-03-page.md`.
25. [Investor Relations | Lucid Group, Inc.](https://ir.lucidmotors.com/) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-ram-lucid-06-page.md`.
26. [Tesla Model S Gets a Face-Lift and Upgraded Equipment - Consumer Reports](https://www.consumerreports.org/hybrids-evs/tesla-model-s-gets-facelift-upgraded-equipment) — Published: 2016-04-12; Tier 2; evidence: `research/sources/full-verification-gap-generation-07-page.md`.
27. [Tesla’s upgraded 2024 Model 3 is now available in the US | The Verge](https://www.theverge.com/2024/1/10/24032562/tesla-model-3-2024-refresh-us-available-highland) — Published: 2024-01-10; Tier 2; evidence: `research/sources/full-verification-gap-generation-04-page.md`.
28. [2021 Chrysler Pacifica Debuts Facelift, Pinnacle Trim, And AWD Option](https://www.motor1.com/news/397218/2021-chrysler-pacifica-facelift-debut) — Published: 2020-09-04; Tier 2; evidence: `research/sources/full-verification-gap-generation-08-page.md`.
29. [Model 3 2024+ - Locale Selector](https://www.tesla.com/ownersmanual/index-model-3.html) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-gap-generation-03-page.md`.
30. [eCFR :: 40 CFR 85.2302 -- Definition of model year.](https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-85/subpart-X/section-85.2302) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-gap-generation-01-page.md`.
31. [Fuel Economy of the 2024 Ford Mustang](https://fueleconomy.gov/feg/noframes/46646.shtml) — Published: not surfaced; Tier 1; evidence: `research/sources/full-verification-gap-mustang-01-epa-record.md`.
32. [Ford Motor Company](https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2024_Ford_Mustang_Owners_Manual_version_1_om_EN-US.pdf) — Published: not surfaced; Tier 3; evidence: `research/sources/full-verification-gap-mustang-02-owner-manual.md`.
