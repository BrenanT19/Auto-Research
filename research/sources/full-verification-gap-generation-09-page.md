# Generation/refresh evidence gap-fill (bounded sample)

> **Main-review correction:** The PR Newswire capture was removed and excluded because its automated-access terms are incompatible. It is not evidence for this verification. The Pacifica onset has only the retained independent Motor1 corroboration in this bounded pass; no complete interval is cleared. The failed fleet-page capture is also ineligible factual evidence. Manufacturer materials are first-party promotional sources, not Tier 1 government evidence.

**Scope:** Evidence gap-fill only for three selected refresh claims in the bundled U.S. era data. This is not verification of all generations or refreshes. No database, application, or release data was changed.

## Inventory and source-metadata count

Inspected `artifacts/api-server/src/data/catalog-browse-eras.json`:

- 142 era rows: 100 generation rows and 42 refresh rows.
- 35 distinct `sourceUrl` values.
- Missing `sourceUrl`: **0/142**.
- Missing `locator`: **0/142**.
- Missing `note`: **0/142**.
- The row schema contains only `id`, `make`, `model`, `startYear`, `endYear`, `name`, `kind`, `sourceUrl`, `locator`, and `note`. It has no structured `sourceTitle`, source publication/access date, source tier, independent corroborating URL, or rights/use-status fields: **142/142 rows lack each of those fields**. A populated URL and locator are provenance pointers, not evidence that a fact or permission has been verified.

## Key facts: narrowly scoped corroboration

**Three of three selected refresh-onset/design claims are supported by the captured evidence; zero of 142 complete era intervals have been fully re-verified in this bounded task.** For the selected rows below, the corroborated part is the named refresh and its onset/model-year claim—not every year in the inclusive `startYear`–`endYear` range, every configuration, or all claims in the row.

1. **Era `8000002` — Tesla Model S, “2016 exterior refresh,” start year 2016.** Consumer Reports’ April 12, 2016 report independently describes a freshened Model S exterior, facelifted front, and redesigned headlamps. This supports the 2016 refresh claim. It does not establish that every 2016–2021 vehicle has the same exterior, or verify the row’s 2021 endpoint.
2. **Era `8000102` — Tesla Model 3, “Highland refresh (U.S.),” start year 2024.** The Verge (January 10, 2024) identifies the refreshed 2024 Model 3 as available in the U.S. that day. Tesla’s official 2024+ Model 3 owner-manual selector includes the United States. Together these support the U.S. 2024 Highland refresh/model-year grouping. They do not verify that every 2024–2026 vehicle is Highland, or establish the row’s 2026 endpoint.
3. **Era `8000902` — Chrysler Pacifica, “2021 exterior and interior-technology refresh,” start year 2021.** Chrysler’s release carried by PR Newswire identifies a redesigned 2021 Pacifica and describes refreshed exterior styling and Uconnect 5/10.1-inch touchscreen; the independent Motor1 report (updated September 4, 2020) also identifies the 2021 facelift and describes the exterior and equipment changes. These support the 2021 refresh claim, not every year through 2026 or the full details of each trim.

Accordingly, **3 selected onset/design facts have independent corroboration** (Tesla 2016, Tesla 2024 U.S., Pacifica 2021). **139 rows have no selected evidence in this pass**, and the remaining scope of all three selected rows remains unverified. This evidence must not be generalized to the other 139 rows or interpreted as publication clearance.

## Notable claims requiring cross-reference

- **Model year is not a simple calendar launch/production date.** The federal definition at 40 CFR §85.2302 defines model year by the manufacturer’s annual production period, with a January 1 inclusion rule. A calendar-year announcement, first production, first sale, and model year can therefore differ. This matters to boundary claims such as Ford F-150’s MY1975 introduction in era `8001611`; that particular era was not independently checked here.
- **Tesla transition years and names need version-level qualification.** Tesla’s North American Model 3 manual has a 2024+ version, while the independent U.S. availability report dates Highland’s U.S. arrival to January 10, 2024. That evidence establishes U.S. availability/model-year grouping, not a universal first-production date or a U.S. 2023 MY Highland. Tesla’s Model S service-manual page is titled “Global Refresh for 2021+ Model S” but says changes enabling international sales started in 2022. Do not treat the title alone as proving all refresh content began with 2021 MY. “Highland,” “Palladium,” and “Global Refresh” should be distinguished as names/codenames or service terminology from a verified U.S. model-year boundary.
- **Overlapping generations / carryover products remain unresolved outside this sample.** The era JSON itself flags GMC Acadia era `8000702` (first-generation refresh/Limited, through 2017) and `8000703` (second generation, from 2017) as coexisting in MY2017. This is a potential valid overlap, not a contradiction resolved by the three selected checks. Both exact versions and availability need independent sourcing before treating the shared year as one unambiguous generation.
- **Pacifica range:** era `8000901` describes the minivan line as MY2017–2027, while `8000902` ends in 2026. The sampled sources support the 2021 onset only; the reviewed-through-2027 endpoint and the next refresh boundary require separate dated evidence.

## Source quality assessment

- **Tier 1 / primary:** eCFR regulation is authoritative for the federal model-year definition (general regulatory scope, not a specific vehicle). Tesla service and owner manuals are primary manufacturer materials. Chrysler/FCA’s release reproduced by PR Newswire is a primary manufacturer announcement hosted by a distribution service. These establish what the issuer says; they are not independent editorial corroboration.
- **Tier 2 / independent editorial:** Consumer Reports is an independent consumer-testing/editorial source for the 2016 Model S facelift; The Verge is an independent technology/news outlet for the U.S. 2024 Model 3 availability; Motor1 is an independent automotive news outlet for the Pacifica facelift and equipment. They provide useful corroboration, but do not replace vehicle-configuration, VIN/build-date, or full lifecycle research.
- **Evidence vs. use permission:** This note assesses support for scoped factual claims only. It does not determine copyright, license compatibility, terms of use, scraping/republication permission, or rights to reuse source text/media. Independently normalized facts and source-use permission require separate review.

## Gaps & unanswered questions

- No evidence was collected for the other **139/142** era IDs. The inventory contains 142 rows and none are fully re-verified here.
- For all 142 rows, the JSON lacks source publication/access dates, source titles/tiers, independent source references, and rights-status fields. All 142 still need those metadata and fact-support checks.
- The selected three have support for the stated onset/refresh fact, but their entire year intervals and exact trims/configurations are not verified. **0/3 complete row intervals** are cleared by this research.
- No independent verification was done for Ford F-Series/Mustang, model-year introduction boundaries, other Tesla transition years, the Acadia MY2017 coexistence, or any other overlap.
- The official Stellantis Fleet buyer-guide URL returned a 404 error when fetched; it was not used as factual support.
- Source-use permission and publication eligibility remain unanswered and must be reviewed separately.

## Searches and saved evidence

At least four searches were run before the first fetch, covering: (1) model-year versus production/generation boundaries, (2) Tesla refresh/model-year sources, (3) Ford F-Series facelift/model-year archive, and (4) Chrysler Pacifica 2021 refresh/model-year sources. Additional targeted searches located independent corroboration and publication-date snippets. Search-result snippets are recorded in the source entries below; fetched results were saved to the numbered evidence paths.

## Sources

1. **eCFR, “40 CFR 85.2302 — Definition of model year.”** Date: current regulation; page did not state a publication date in the captured result. Tier 1, U.S. federal regulation. Snippet: model year means the manufacturer’s annual production period that includes January 1 (or calendar year if there is no annual period). URL: https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-85/subpart-X/section-85.2302. Saved fetch: `research/sources/full-verification-gap-generation-01-page.md`.
2. **Tesla Service Manual, “Global Refresh for 2021+ Model S.”** Date: not stated in captured page. Tier 1, manufacturer technical source. Snippet: title identifies a global refresh for 2021+; fetched answer says changes enabling international sales were introduced starting in 2022, and “Global” labels certain procedures/parts. URL: https://service.tesla.com/docs/ModelS/ServiceManual/Palladium/en-us/GUID-140CD6C1-7CBA-4F3F-A42B-34FA0084F185.html. Saved fetch: `research/sources/full-verification-gap-generation-02-page.md`.
3. **Tesla, “Model 3 2024+ — Locale Selector.”** Date: not stated in captured page. Tier 1, manufacturer owner-manual selector. Snippet: identifies a 2024+ Model 3 manual and includes the United States locale. URL: https://www.tesla.com/ownersmanual/index-model-3.html. Saved fetch: `research/sources/full-verification-gap-generation-03-page.md`.
4. **The Verge, “Tesla’s upgraded 2024 Model 3 is now available in the US.”** Date: January 10, 2024. Tier 2, independent technology/news reporting. Snippet: the refreshed/highland 2024 Model 3 became available in the U.S. on January 10, 2024. URL: https://www.theverge.com/2024/1/10/24032562/tesla-model-3-2024-refresh-us-available-highland. Saved fetch: `research/sources/full-verification-gap-generation-04-page.md`.
5. **Chrysler via PR Newswire, “Chrysler Opens Orders for New, Redesigned 2021 Chrysler Pacifica, Announces Minivan Lineup Pricing.”** Date: September 4, 2020 (orders opened that date; release content reports fourth-quarter 2020 dealer arrivals). Tier 1 issuer statement hosted by a press-release wire, not independent reporting. Snippet: calls it the redesigned 2021 Pacifica and describes refreshed exterior, standard Uconnect 5, and a 10.1-inch screen. URL: https://www.prnewswire.com/news-releases/chrysler-opens-orders-for-new-redesigned-2021-chrysler-pacifica-announces-minivan-lineup-pricing-301124594.html. Saved fetch: `research/sources/full-verification-gap-generation-05-page.md`.
6. **Stellantis Fleet, “2021 Chrysler Pacifica” buyer guide.** Date: 2021 model-year document; exact issue date not captured. Tier 1, manufacturer fleet material, but fetch returned a 404 error page and provides no usable factual evidence. Search snippet identified a 2021 Chrysler Pacifica buyer guide. URL: https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/chrysler/2021/buyers-guide/2021_Chrysler_Pacifica_Buyers-guide.pdf. Saved failed-fetch evidence: `research/sources/full-verification-gap-generation-06-page.md`.
7. **Consumer Reports, Jeff S. Bartlett, “Tesla Model S Gets a Face-Lift and Upgraded Equipment.”** Date: last updated April 12, 2016. Tier 2, independent consumer editorial/testing source. Snippet: reports a freshened exterior, facelifted front, redesigned headlamps, and 2016 Model S updates. URL: https://www.consumerreports.org/hybrids-evs/tesla-model-s-gets-facelift-upgraded-equipment. Saved fetch: `research/sources/full-verification-gap-generation-07-page.md`.
8. **Motor1, Anthony Alaniz, “2021 Chrysler Pacifica Debuts Facelift, Pinnacle Trim, And AWD Option.”** Date: updated September 4, 2020. Tier 2, independent automotive reporting. Snippet: identifies the refresh as the 2021 model and covers revised front/rear styling, Uconnect 5, and the Pinnacle trim. URL: https://www.motor1.com/news/397218/2021-chrysler-pacifica-facelift-debut. Saved fetch: `research/sources/full-verification-gap-generation-08-page.md`.
