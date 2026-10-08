# Buick, Cadillac, Chevrolet & GMC: U.S. model-year continuity research

**Status:** private preliminary research; not approved for public release  
**Scope:** source suitability and continuity traps for four GM makes, in the
context of the 4,818-entry development Browse catalog. No code, catalog data,
or production setting was changed.

## Key Facts

- The development Browse census is now reconciled to 4,818 selectable
  option rows and 4,715 distinct profile IDs: 4,672 model-year identities and
  43 trim/configuration previews. The extra 103 options are overlapping era
  memberships across 102 model-year IDs. The 2,244 Buick, Cadillac,
  Chevrolet and GMC model-year identities (plus 20 trim previews) are listed
  in the profile and make-coverage audits. See
  `research/catalog-source-verification.md`.
- GM's Vehicle Information Kits index is a useful primary source for selected
  historical GM product documentation. Its fetched index shows 906 results,
  asks users to search by year, brand or model, and offers kits filed under
  Chevrolet, Cadillac, Oldsmobile and GEO. In the visible result list,
  Cadillac kits range from 1902 to 1974 and Chevrolet kits from 1913 to 2007.
  Those are archive-list bounds, not proof that every intervening year or
  every U.S.-market model is covered.
- That index does **not** show Buick or GMC as filter brands or listed kit
  families. It therefore cannot by itself support pre-1984 Buick/GMC
  continuity. GM's Heritage Archive overview says the wider collection spans
  current and historic North American brands, but that broad description is
  not a year-by-year listing for these makes.
- GM's historical index distinguishes brands and model names: e.g., LaSalle
  kits appear in the Cadillac filing path as separately named products. Keep
  LaSalle distinct from Cadillac nameplates unless a source explicitly
  establishes the relationship being modeled. GM's heritage navigation also
  separately presents Chevrolet, Chevy Trucks and GMC; navigation categories
  alone do not settle historical make assignment.
- 40 CFR §85.2302 defines model year around the manufacturer's annual
  production period that includes January 1 of the designated calendar year.
  Section 85.2304 separately defines the production period. Calendar build
  dates therefore cannot be substituted for model-year labels. GM's 2023
  Camaro announcement is a concrete illustration: final sixth-generation
  cars were expected off the line in January 2024, while GM identified the
  final model year as MY2024.
- No fetched source in this pass establishes a complete four-make timeline or
  a fully documented historical nameplate hiatus/return. The report therefore
  does not interpolate any nameplate years or treat gaps in an index as proof
  of either non-sale or a catalog omission.

## Notable Claims Requiring Cross-Reference

- **Archive years vs. historical availability:** The VIK list has pre-1984
  records for Cadillac and Chevrolet, but absence of a year/model from that
  curated list is not proof it was not sold. Validate each gap with a
  model-year brochure, sales literature, manufacturer record, contemporary
  registration/market evidence, or another independently documented source.
- **Cadillac/LaSalle identity:** The archive organizes LaSalle material beside
  Cadillac material, but labels LaSalle separately. Do not normalize it to
  Cadillac without a documented scope rule.
- **Chevrolet/Chevy Trucks/GMC:** The heritage site exposes these as separate
  labels. Check primary year-specific source language for the actual make
  before merging or splitting a vehicle identity; shared corporate ownership
  or platform does not establish make equivalence.
- **Camaro endpoint:** GM's MY2024 retirement notice supports the endpoint for
  the sixth generation, and says no immediate successor was being announced
  at that time. It does not, alone, prove the duration of a nameplate hiatus
  or rule out a later revival.
- **Dataset count composition:** The option/profile split and four-make
  counts are reconciled in the development API export. That does not make the
  historical source set exhaustive or validate all retail-availability
  claims.

## Source Quality Assessment

- **Strongest for legal meaning:** 40 CFR Part 85 Subpart X on the eCFR
  (Tier 1, government legal source; current online text identifies itself as
  authoritative but unofficial and points to the official annual CFR).
  It settles the regulatory definition, not which vehicles were sold or the
  retail nameplate history of any particular make.
- **Strongest GM historical discovery source:** GM Heritage Vehicle
  Information Kits/index and archive overview (Tier 3 under the project's
  existing manufacturer-source convention; first-party for its own archive
  and labeling). Useful for product literature locators and source discovery,
  but explicitly a selected archive rather than a complete vehicle registry.
- **Strongest exact retirement claim in this pass:** GM's March 22, 2023
  Camaro news release (Tier 3; first-party for the company's stated MY2024
  sixth-generation endpoint). It is not independent evidence of all later
  production or a revival.
- **Reuse:** No bulk-data license or broad republication permission was
  established. Keep these materials private, use only minimal factual
  citations, and do not copy expressive brochure text, tables, or images into
  the catalog. Confirm rights before any future production or redistribution.
- Four required questions were searched before any page fetch. Search-result
  leads and paraphrased snippets are retained at
  `research/sources/gm-search-snippets.md`; fetched page captures and query
  notes are in the source paths below.

## Gaps & Unanswered Questions

- The four-make profiles and make/year counts are now in the profile audit.
  The EPA all-years, guide and vPIC crosswalk checks are documented
  separately. This report remains a scoped archive and continuity review,
  not a full historical U.S. sales census or an independent check of every
  selected pre-1978 source fact.
- Buick and GMC pre-1984 coverage remains unresolved by the fetched VIK
  index. Locate compatible, attributable year-specific primary sources for
  both makes; do not substitute a current lineup or sibling make's evidence.
- The Chevrolet/Cadillac VIK list has uneven model-by-model granularity and
  ends at different visible years. Missing years in the index need source
  cross-reference, not interpolation.
- Candidate wartime and other historical gaps need model- and make-specific
  evidence. A factory pause, incomplete archive, model renaming, market
  unavailability, and a true nameplate hiatus are different claims.
- Further independent or primary sources are needed for specific first/last
  U.S. model years, nameplate revivals, regional naming, overlaps and any
  apparent within-name gaps. EPA test-car listings and NHTSA/vPIC omissions
  must not be used as proof of retail non-sale.
- None of this research authorizes public exposure. Release remains blocked
  pending owner approval and rights review.

## Sources

1. **GM Heritage Archive & Special Collections** — https://www.gm.com/heritage/archive  
   Date: page publication date not surfaced; fetched source dated 2026-10-08.
   Tier 3. Broad repository scope; no exhaustive four-make annual coverage.
   Evidence already held in `research/sources/gm-02-heritage-archive-coverage.md`.
2. **GM Heritage Archive: Vehicle Information Kits** —
   https://www.gm.com/heritage/archive/vehicle-information-kits  
   Date: publication date not surfaced; fetched 2026-10-08. Tier 3.
   Evidence: `research/sources/gm-04-vehicle-information-kits.md` (index and
   result links; selected-list limits apply).
3. **40 CFR Part 85, Subpart X, Determination of Model Year** —
   https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-85/subpart-X  
   Rule source: 60 FR 4738, 1995-01-24; current eCFR view up to date
   2026-10-06, fetched 2026-10-08. Tier 1. Evidence:
   `research/sources/gm-05-ecfr-model-year.md`.
4. **GM to retire Camaro at the end of the 2024 model year** —
   https://news.gm.com/home.detail.html/Pages/news/us/en/2023/mar/0322-camaro.html  
   Published 2023-03-22. Tier 3. First-party statement for sixth-generation
   endpoint only. Evidence: `research/sources/gm-06-camaro-hiatus.md`.
5. **GM Heritage: An Iconic Legacy** — https://www.gm.com/heritage  
   Date: not surfaced; accessed 2026-10-08. Tier 3; search-result evidence
   only, retained in `research/sources/gm-search-snippets.md`.
6. **Pontiac | GM Heritage Collection** —
   https://www.gm.com/heritage/collection/pontiac  
   Date: not surfaced; accessed 2026-10-08. Tier 3; search-result evidence
   only, retained in `research/sources/gm-search-snippets.md`.

## Search Record

Four calls were made, each with a full-question `query` and two variant
`searchQueries`, before any fetch:

1. Compatible pre-1984 Buick/Cadillac/Chevrolet/GMC source coverage.
2. Historical GM make and model-name distinctions.
3. Documented nameplate hiatuses vs. apparent omissions.
4. Evidence for model-year labels vs. calendar production dates.

Each fetched item was requested with its question and a `research/sources/`
path; `savedTo` returned the expected path for all three fetched pages. These
searches identify leads; they do not complete the requested full-catalog audit.
