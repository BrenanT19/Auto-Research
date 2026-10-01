# OEM, Maintenance, Reliability and Commercial-Data Source Snippets

Search checked: 2026-10-01. Published/update dates were not returned by search unless stated; do not treat access date as source publication date. Snippets below support only the specific claims they state.

## [oem-04-motor-daas-2015]
- Title: DATA AS A SERVICE — MOTOR Information Systems (PDF)
- URL: https://www.motor.com/wp-content/uploads/2015/11/daas-product-description.pdf
- Date: 2015-11 path; document publication date not confirmed; age makes present availability/terms unverified.
- Tier: 3 (commercial provider product material)
- Snippet: “RESTful web services that connect to the MOTOR API to deliver quality MOTOR data”; “Supports domestic and import light-duty vehicles for the US market”; “YMME and ACES vehicle lookup”; formats “XML, JSON, or BSON”.
- Supports: a historical MOTOR product description claimed an API/service and U.S. light-duty YMME lookup/formats at that time.
- Does not establish: current product availability, exact coverage, terms, contractual reuse rights, historic completeness or current endpoints.
- Freshness path: obtain current written product sheet, sample, terms and coverage from MOTOR before adoption.

## [oem-05-autocare-standards]
- Title: Data Standards Documentation — Auto Care Association
- URL: https://digital.autocare.org/standards
- Date: not returned; accessed 2026-10-01.
- Tier: 2 (industry standards organization)
- Snippet: “Access to technical documentation is free upon sign-in with your autocare.org login credentials.”
- Supports: standards documentation is gated by sign-in; access to docs is not proof that vehicle facts are supplied under a reusable database license.
- Does not establish: API entitlements, rights to redistribute reference data, fees, field coverage, versions or update SLAs.
- Freshness path: read current ACES/PIES/VCdb documentation and the applicable API/data-use agreement; verify with association.

## [oem-06-autocare-api-news]
- Title: Auto Care Association Releases API for ACES, PIES, IPO Reference Databases | MOTOR
- URL: https://www.motor.com/2025/01/auto-care-association-releases-api-for-aces-pies-ipo-reference-databases
- Date: 2025-01 from URL; exact article date not returned.
- Tier: 3 (industry trade/vendor publication)
- Snippet: API announced for “ACES, PIES, IPO Reference Databases”; quotation describes “real time exchange of content between partners” and the “reference data we all consume from Auto Care”.
- Supports: a reported partner API for those industry reference databases.
- Does not establish: that the API is a broad OEM specification, maintenance, reliability, or owner-research data source, nor actual public access or rights.
- Freshness path: verify the current Auto Care official developer / licensing docs.

## [oem-07-repairpal-estimator]
- Title: Free Car Repair Estimate — RepairPal
- URL: https://repairpal.com/estimate
- Date: not returned; accessed 2026-10-01.
- Tier: 3 (commercial estimate provider)
- Snippet: “The Estimator brings together automotive industry standard data for parts pricing and labor times, combined with a proprietary labor rate model to deliver fair price ranges for common repairs and services.”
- Supports: RepairPal publicly describes its estimates as modeled ranges using parts prices, labor times and a proprietary labor-rate model.
- Does not establish: API access, exact source data, regional/model/configuration coverage, time/version semantics, right to store or redistribute estimates.
- Freshness path: require field-level methodology, sample payload, geography, source date, coverage and commercial data license before planning ingestion.

## [oem-08-repairpal-partners]
- Title: Website and App Integrations — RepairPal Partner Resource Center
- URL: https://partnersuccess.repairpal.com/article/302-website-integrations
- Date: not returned; accessed 2026-10-01.
- Tier: 3 (commercial partner documentation)
- Snippet: “RepairPal offers multiple integration options for partners, making it easy to provide consumers with access to our car care”.
- Supports: a partner integration program exists.
- Does not establish: an open developer API, an automotive specification feed or redistribution rights.
- Freshness path: obtain current partner documentation and terms directly.

## [oem-09-jdp-ev-api]
- Title: EV Data & API — J.D. Power
- URL: https://www.jdpower.com/business/ev-data-api
- Date: not returned; accessed 2026-10-01.
- Tier: 3 (commercial product page)
- Snippet: “Plug-and-play REST API with clean JSON responses”; “Tailored fields”; “Request a Demo”.
- Supports: J.D. Power markets an EV-data API and sales-gated access.
- Does not establish: exact fields, vehicle/year/configuration coverage, rights to retain or redistribute data, provenance granularity, pricing or update cadence.
- Freshness path: require a current demo/data dictionary/sample and negotiated agreement; verify rights for each output use.

## [oem-10-jdp-terms]
- Title: JD Power Terms & Conditions — J.D. Power
- URL: https://www.jdpower.com/business/terms-conditions
- Date: not returned; accessed 2026-10-01.
- Tier: 3 (commercial provider terms index)
- Snippet: lists product-specific agreements such as “Darwin Automotive End User License Agreement United States & Canada” and “Product terms”.
- Supports: access/use is product-specific rather than a single assumed open-data grant.
- Does not establish: terms for a specific future AutoResearch feed unless that exact agreement is obtained.
- Freshness path: obtain current named product terms and legal approval.

## [oem-11-jdp-legal]
- Title: Autodata Legal Disclaimer — J.D. Power
- URL: https://www.jdpower.com/business/autodata-legal-disclaimer
- Date: not returned; accessed 2026-10-01.
- Tier: 3 (commercial provider legal page)
- Snippet: “Certain products containing vehicle configuration may be licensed under one or more patents, including United States Patent No. 5,825,651.”
- Supports: some product configurations may carry additional patent licensing considerations.
- Does not establish: product scope, what data is available to AutoResearch, or a blanket restriction/permission.
- Freshness path: identify relevant products and obtain their specific license/legal review.

## [oem-12-spglobal]
- Title: Automotive Mobility | S&P Global Data Lake
- URL: https://www.spglobal.com/mobility/en/products/automotive-mobility-data-lake.html
- Date: not returned; accessed 2026-10-01.
- Tier: 3 (commercial data product page)
- Snippet: “Discover the Universe of S&P Global Data”.
- Supports: only that S&P markets automotive data products.
- Does not establish: the specific vehicle configuration, maintenance, issue, source/provenance, API, terms or update fields AutoResearch needs.
- Freshness path: do not select on a landing page; request exact data dictionary, coverage matrix, sample, contract and update SLA.

## [oem-13-nhtsa-tsb-2025]
- Title: Service Bulletin (PDF hosted by NHTSA, static.nhtsa.gov)
- URL: https://static.nhtsa.gov/odi/tsbs/2025/MC-11013302-0001.pdf
- Date: document is in a 2025 path; exact bulletin date not returned.
- Tier: 1 for the public federal repository location, but the bulletin itself is manufacturer-authored service information—not a federal finding that a defect exists.
- Snippet: bulletin text: “Important: This technical service bulletin (TSB) can only be completed by BrightDrop dealers or BrightDrop certified repair facilities”.
- Supports: at least some posted service bulletins are explicitly restricted to professional/certified repair facilities and cannot be repackaged as casual consumer repair instructions.
- Does not establish: NHTSA repository completeness, universal bulletin applicability or issue frequency.
- Freshness path: verify each bulletin's date, manufacturer, affected population, supersession and legal use; treat it as a document/evidence lead.

## [oem-14-nastf]
- Title: NASTF | Secure Vehicle Service Credentials & SDRM
- URL: https://www.nastf.org/
- Date: not returned; accessed 2026-10-01.
- Tier: 2 (industry/nonprofit service-information coordination organization)
- Snippet: NASTF is “a not for profit 501(c)(6) organization established through collaboration between automakers and the aftermarket to provide secure access to vehicle service and security information.”
- Supports: the access ecosystem includes security-sensitive/service credentials and controlled information.
- Does not establish: a source of public bulk maintenance schedules or a general catalog license.
- Freshness path: review current NASTF membership, credential and access rules if future security/service workflows are planned.

## [oem-15-uscode-compilations]
- Title: 17 USC §103 — U.S. Code (House of Representatives)
- URL: https://uscode.house.gov/view.xhtml?req=(title%3A17%20section%3A103%20edition%3Aprelim)
- Date: search snippet states text contains laws in effect August 25, 2026; accessed 2026-10-01.
- Tier: 1 (primary law publication)
- Snippet: “Subject matter of copyright: Compilations and derivative works”.
- Supports: compilation rights are a material legal issue to analyze, not a source rights grant.
- Does not establish: AutoResearch's legal ability to scrape, store, reproduce or redistribute specific OEM/vendor databases. This is not legal advice.
- Freshness path: confirm current law, site/database terms and counsel review before acquisition/use.
