Source: https://vpic.nhtsa.dot.gov/api/
Title: NHTSA vPIC Vehicle API documentation
Source date: Version 4.06; documentation reports last code change 2026-06-13.
Retrieved: 2026-10-08
Tier: 1, U.S. government technical documentation.

Question addressed: Which vPIC methods and limitations matter for exact make/model/model-year identity?

Normalized evidence (paraphrase): vPIC is populated from manufacturer submissions under 49 CFR Part 565 and provides make/model/year and VIN-decoding methods. The documented ID-based methods accept an exact Make_ID; name-based lookup accepts partial name matching, so it can return multiple matches. API requests are subject to automated rate control. The API offers current database lookups, but these docs do not establish a versioned historical registry of Make_ID assignments or prove retail sales. A response naming a model for a year is a manufacturer-reported regulatory/decoder listing, not a retail trim, sale, volume, or delivery record.

Rights/use note: Retain only normalized factual identifiers and minimal provenance; verify current API/bulk-access terms and rate policy before any automated production reuse. No source prose, tables, or images retained.
