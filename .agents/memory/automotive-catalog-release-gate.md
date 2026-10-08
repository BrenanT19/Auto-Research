---
name: Automotive catalog release gate
description: Verification of every current profile and its information must precede preparation for public release.
---

Keep automotive catalog research in development until verification is complete. The owner's subsequent instruction is to verify all existing profiles and their information, then prepare publication. This is conditional release intent, not approval to expose unresolved profiles as-is.

An identity match verifies only the identity fields. It does not verify other populated specifications, generation labels, or recall details on the same profile; maintain separate field-level dispositions.

**Why:** The owner first requested private review, then explicitly requested verification before publication. Reconciling a census or matching source rows does not establish that every displayed claim is factually supported and usable. A vehicle can match an official make/year listing while a separate populated field remains unsupported.

**How to apply:** Finish fact, applicability, provenance, and source-use checks before production preparation. When using a make/year identity endpoint, inspect the other populated fields on those profiles and report any that the endpoint does not cover. Missing research may remain labeled missing; never fill it with invented/demo data. Do not quietly omit requested profiles or publish unresolved claims. Present the Publish action only when ready; the owner performs publication.

For manually authored fact-check matrices, validate the CSV with a strict parser and exact joins to the catalog's populated facts and source registry before rendering the report. A successful render alone does not prove that quoted fields were parsed into the intended columns.

**Why:** Standard CSV parsing can shift values when comma-containing prose is left unquoted or whitespace precedes an opening quote, even when a permissive consumer appears to render the matrix.

**How to apply:** Quote every text cell containing commas, quotes, or newlines; keep opening quotes at the start of a field. Check headers, row counts, every profile's exact field/value set, evidence-key resolution, and HOLD/release disposition before running the report generator.
