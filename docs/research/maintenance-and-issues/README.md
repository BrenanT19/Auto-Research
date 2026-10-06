# Maintenance and reported-problem research — first partial batch

Reviewed 2026-10-05. **Private review only; no app ingestion or public release.**

## What was actually checked

- **12 maintenance facts:** eight from the official 2024 Silverado 1500 gasoline owner manual, four from Tesla's current North American Model 3 2024+ online manual.
- **Six selected complaint records:** two 2024 Mustang, three 2024 Silverado 1500, one 2024 Model 3. Each explicit failure-mileage value was checked against its NHTSA record.
- **Official source directories covering all 13 brands.** A directory check is not a manual, interval, applicability, or rights verification.
- **4,661 coverage rows**, one for each existing catalog profile. Only three have partial evidence drafts; **4,658 are untouched**. This is not completed all-catalog research.

## Files

- `research-review.pdf`: readable findings and exact source/use-right links.
- `batch-2026-10-05.json`: full structured ledger, limits, and independent review gates.
- `maintenance-facts.csv`: normalized intervals, calendar triggers, service conditions, qualifiers, source editions and locators.
- `reported-problem-evidence.csv`: de-identified factual observations with ODI identifiers, dates, and explicit unresolved unit checks.
- `source-directories.csv`: official maintenance-source directory links and actual review depth.
- `catalog-research-coverage.csv`: all existing profiles, including unresearched status.
- `research-review-bundle.zip`: these original research files, not the source documents.

## Interpretation and publication limits

“Source-checked” means the cited statement exists, not that a submitted allegation is proven. These six complaints are not representative and establish no typical onset, prevalence, reliability rating, or repair cost.

The selected failure-mileage clauses omit explicit units; the API has no structured failure-mileage field. Values are preserved exactly, with units unresolved pending confirmation before any miles-labeled publication. The unusual value **4** is not silently changed to 4,000.

The Silverado manual concerns **1500**, not every vehicle under the catalog's broader Silverado family. Engine, gasoline/diesel, four-wheel-drive, severe-use, calendar and whichever-first qualifiers must survive any later integration.

Tesla's checked manual root identifies **2024+, North America, software 2026.32**. This is a current recommendation, not an archived 2024 factory edition. Its extracted brake-fluid interval loses the numeric value and is omitted, not guessed. Full PDF retrieval returned HTTP 403. Mustang maintenance is not verified: direct PDF retrieval returned unrelated HTML, and the extracted PDF text available did not reach the maintenance chapter.

NHTSA's Data.gov dataset declares a public-domain license. This supports conservative reuse of normalized factual record fields; it does not establish rights to manufacturer documents, consumer prose or personal information. Ford, Chevrolet and Tesla website copying/reuse restrictions were inspected. OEM commercial factual-normalization and publication decisions remain unresolved and separate from factual validity. No blanket manufacturer license is imposed on unrelated independently supported facts.

No manufacturer PDFs, screenshots, images, logos, complaint narratives, VINs, names, or consumer medical details are retained or packaged. Attribution alone is not permission. This is a source-use review, not a legal guarantee.

## Rebuild and validation

With the installed PyMuPDF dependency:

```sh
python scripts/build-maintenance-review.py
```

The script checks complete inventory membership, independent publication holds, maintenance qualifiers, complaint classification and unknown units before building the PDF and bundle.

Before any app integration, review the existing canonical maintenance read-model: it currently exposes mileage but not calendar intervals or service conditions. Preserve those facts rather than turning unknown mileage into an invented interval. No migration, UI redesign, real-claim ingestion or public publication is authorized by this file.
