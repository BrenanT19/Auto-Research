# Private research tranche: Chrysler, Dodge, Jeep and Ram U.S. model-year identity

**Status:** private research only; no catalog or production changes made.
**Release:** blocked pending the owner's explicit approval.
**Research date:** 2026-10-08.

## Key Facts

- The development Browse census is reconciled to 4,818 selectable option
  rows and 4,715 distinct profiles. The bundle has 1,239 Chrysler/Dodge/
  Jeep/Ram model-year identities (Chrysler 285, Dodge 680, Jeep 245, Ram 29);
  twelve additional Ram trim previews bring the four makes to 1,251 distinct
  profile IDs. The full option/profile and source-match results are in
  `research/catalog-source-verification.md` and the CSV audit files.
- In that snapshot, the earliest/latest rows by displayed make are:
  Chrysler MY1940–2027; Dodge MY1949–2027; Jeep MY1963–2027; Ram MY2012–2027.
  MY2027 rows are preliminary/forward-looking in the project catalog and are
  not evidence that retail sales occurred.
- Chrysler/Dodge EPA Guide supplements provide partial MY1978–1983 rows;
  Jeep has NHTSA/EPA Guide entries for MY1981–1983 and a specialist-source
  Wagoneer supplement reaching earlier years. The EPA/FuelEconomy.gov series
  takes over in the catalog from MY1984. These source layers document
  selected identities; they do not establish exhaustive histories.
- A fetched EPA FuelEconomy.gov MY1990 Chrysler listing identifies five
  Chrysler model labels for that year (LeBaron, New Yorker, New Yorker
  Fifth Avenue/Imperial, TC, and Town and Country). This is a year-specific
  government vehicle/fuel-economy listing, not evidence about years it omits.
  See `research/sources/stellantis-03-epa-chrysler-1990.md`.
- Ram is a distinct current make in the snapshot from MY2013 onward, while
  Dodge's `Ram 1500 Pickup` grouping persists through MY2012. Contemporary
  MotorTrend reporting dated 2009-10-05 confirms that separation was announced
  in 2009, but does not establish the first vehicle model year sold solely as
  Ram. FuelEconomy.gov search results still identify the 2010 and 2011 1500 as
  “Dodge Ram”; thus announcement date, recorded EPA make/model label, and
  consumer-facing brand transition are separate dates/fields. No one-date
  split should be applied to all records without corroborating year-specific
  evidence. See `research/sources/stellantis-04-motortrend-ram-split.md`.
- The original full-size SJ Wagoneer family is reported in sources as
  MY1963–1991, with Wagoneer/Grand Wagoneer naming changes during that run.
  The catalog separates many earlier `Wagoneer` rows, 1984–1991 `Grand
  Wagoneer` rows, and the modern 2022-era Wagoneer and Grand Wagoneer rows.
  The modern revival is a separate product lineage, not uninterrupted model
  continuity. A 1993 Grand Wagoneer (ZJ) is a credible omission lead that
  requires better corroboration before adding or classifying it.
- The current catalog includes Wagoneer through MY2026 and Grand Wagoneer
  through preliminary MY2027. A search result reports Wagoneer ending after
  MY2025 and being consolidated for MY2026, while other catalog/search
  evidence differs. The final MY2026 U.S. identity and Grand Wagoneer
  relationship remain unresolved.

## Notable Claims Requiring Cross-Reference

- **“Ram split in 2009” is not the same claim as “MY2009 is the first standalone
  Ram.”** The independent contemporary report supports the corporate
  announcement. EPA search results label both MY2010 and MY2011 Ram 1500 rows
  under Dodge. Search snippets from dealer sites inconsistently say 2009 or
  2010, and are not relied on. Establish the exact sales/registration and
  make-label conventions for each model year before normalizing.
- **Don't treat the 2012/2013 handoff in the local snapshot as primary proof.**
  It is an internal source grouping boundary. The EPA label, NHTSA
  manufacturer-reported fields, corporate brand organization, and actual
  U.S. product marketing can diverge. Maintain a source-specific make string
  as evidence and a separately reviewed canonical brand identity.
- **Wagoneer requires multiple identity records, not a continuous single
  nameplate.** Original Wagoneer SJ, Grand Wagoneer name use within SJ, the
  separate 1993 Grand Wagoneer on the ZJ, and the modern Wagoneer/Grand
  Wagoneer products must not be interpolated into one uninterrupted model.
  Official Jeep history search snippets are useful leads but were not fetched
  or independently verified here.
- **A catalog gap is not a sales hiatus.** For example, a list that has
  Chrysler Pacifica MY2004–2008 and then MY2017 onward suggests a real break
  worthy of verification, but the row pattern alone cannot prove all U.S.
  retail years or an absence in MY2009–2016.
- The large gap between New Yorker catalog groups (MY1977 and MY1985 onward)
  aligns with a plausible product-history hiatus, and Chrysler production
  was disrupted by wartime conditions, but neither assertion is established
  solely by the inspected data. Each alleged hiatus needs year-specific
  documentary corroboration and its own start/end definition.
- `Wagoneer` rows absent for 1978–1988 may partly be accounted for by
  renaming and separate catalog labels, rather than a non-sale interval.
  Conversely, `Grand Wagoneer` rows absent after MY1991 until MY2022 do not
  resolve the reported MY1993 special use.
- The project catalog uses uppercase EPA-style labels and revised/combined
  labels (e.g. Dodge Ram 1500, Jeep Cherokee/Wagoneer) alongside normalized
  display names. Matching must preserve source labels and avoid interpreting
  a normalization as proof of the exact retail badge, trim, or body.

## Source Quality Assessment

| Source | Date and tier | Appropriate use | Limits / rights |
|---|---|---|---|
| FuelEconomy.gov, MY1990 Chrysler | MY1990 page; fetched 2026-10-08. **Tier 1:** U.S. government-administered dataset/page. | Verify the specific model labels listed for that year. | Not a complete vehicle-sale registry; omission is not proof of non-sale. Page-level reuse rights for catalog ingestion/public redistribution were not adjudicated. |
| MotorTrend, contemporaneous Ram separation report | Published 2009-10-05; fetched 2026-10-08. **Tier 2:** independent automotive press. | Establish that Ram/Dodge truck-brand separation was announced in 2009 and the reported rationale/organization at that time. | Does not set a definitive first standalone vehicle MY. Copyrighted editorial; cite/link and use only the fact needed, not copied prose/media. |
| NHTSA vPIC About | Publication date not shown; fetched 2026-10-08. **Tier 1:** federal data-service documentation. | Establish the service's own intended scope (MY1981 forward) and its manufacturer-submission/VIN-decoding role. | Does not provide a continuous U.S. retail-sale chronology. NHTSA omissions do not prove non-sale. The page describes public data use, but intended catalog ingestion and redistribution still need rights/terms review. |
| Allpar Chrysler/Dodge/Jeep history index, already in the source workspace | Publication date not surfaced; fetched 2026-10-08. **Tier 3:** independent specialist archive. | Discover year-by-year histories and topic-level secondary sources, especially before EPA's MY1984 series. | It is not a government registry or an exhaustive validated year-by-year data feed. Existing fetched evidence is `research/sources/stellantis-02-allpar-chrysler-history.md`. No bulk reuse right was established; link and verify underlying evidence. |
| Jeep official history pages (search-only) | Dates not surfaced; search captured 2026-10-08. **Tier 3:** manufacturer self-history. | A lead for Jeep's own periodization/naming, e.g. the SJ Wagoneer span and 1980s naming. | Not fetched, and deliberately not used as a data source or bulk extraction. Manufacturer narrative is not independent verification; rights for extraction/reuse unreviewed. |
| MotorTrend Wagoneer termination report (search-only) | 2025-10-14; search captured 2026-10-08. **Tier 2:** independent auto press. | Lead about a MY2026 Wagoneer line/nameplate change. | Search snippet only; final production/model-year facts need follow-up and cross-reference. |

Research snippets and links: `research/sources/stellantis-search-snippets.md`.
The fetched evidence is limited to two historical/identity sources and one
scope statement; none grants blanket permission to store or redistribute
third-party material. The research retains no copied tables or images.

## Gaps & Unanswered Questions

- The development API and distinct-profile counts are now reconciled. Source
  matching covers the bundle's EPA, annual-guide and vPIC rows. This
  four-make report still does not independently verify every selected
  historical identity or establish a complete U.S. sales history. Case-by-
  case year-gap dispositions and source-use review remain incomplete.
- Pre-1984 coverage is incomplete and source-layer dependent. Chrysler and
  Dodge have selected EPA Guide years from 1978; Jeep has selected
  1981–1983 EPA Guide years plus limited classic coverage. No reviewed source
  here independently verifies each U.S. model/make/year before MY1978.
  For Ram, historical trucks were marketed under Dodge; the modern `Ram`
  make's lack of pre-transition rows must not be interpreted as absence of
  trucks or as proof a distinct Ram brand existed then.
- Complete U.S. MY-by-MY identity lists remain needed for all four marques,
  particularly model/make aliases, full-size truck changes, Jeep generations,
  and Chrysler models. Search results or catalog records alone are not enough
  to fill them.
- Resolve Dodge-to-Ram identity year by year around MY2009–2013 using
  contemporary U.S. brochures, government year-specific records, and
  independent reporting. The corporate announcement in 2009 cannot alone
  assign consumer/model identities.
- Find authoritative, compatible records for the MY1993 Grand Wagoneer ZJ,
  the exact MY2021/22 modern Wagoneer introduction, and the status of
  Wagoneer versus Grand Wagoneer for MY2026 and MY2027. Check final order
  guides/retail evidence; do not infer a retail year from preliminary EPA,
  NHTSA, or catalog rows.
- Verify each apparent within-name gap separately; calendars are not model
  years, changed model labels are not hiatuses, and a registry omission does
  not prove U.S. non-sale. No nameplate continuity has been interpolated.
- Document source-use terms before any ingestion or public display. Public
  availability, a search result, or a government-hosted page is not itself a
  blanket rights decision for derived catalogs.
- Public release remains blocked until the owner reviews and explicitly
  approves the broader audit and rights decisions.

## Sources

- **Fetched evidence**
  - `research/sources/stellantis-03-epa-chrysler-1990.md` — FuelEconomy.gov,
    MY1990 Chrysler listing; fetched 2026-10-08; Tier 1.
  - `research/sources/stellantis-04-motortrend-ram-split.md` — MotorTrend,
    2009-10-05; fetched 2026-10-08; Tier 2, contemporary reporting.
  - `research/sources/stellantis-05-vpic-scope.md` — NHTSA vPIC About;
    date not shown, fetched 2026-10-08; Tier 1.
- **Previously fetched evidence**
  - `research/sources/stellantis-01-nhtsa-vpic-about.md` — NHTSA vPIC scope;
    fetched 2026-10-08; Tier 1.
  - `research/sources/stellantis-02-allpar-chrysler-history.md` — Allpar
    history index; fetched 2026-10-08; Tier 3.
- **Search-only evidence (snippets and URLs recorded)**
  - `research/sources/stellantis-search-snippets.md` — EPA MY2009 Dodge and
    MY2010/2011 Dodge Ram listings, Jeep history leads, Ram separation, and
    Wagoneer leads, with dates/tier/limitations.
- **Project-local scope context**
  - `research/notes.md` — full audit remains open; historic, completeness,
    rights, and release checks remain pending.
