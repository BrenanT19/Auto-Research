---
name: Dynamic OEM manual rendering
description: Verify the selected manual chapter and model year when text extraction returns navigation or fallback content.
---

For Ford's online manuals, ordinary text extraction can return the entire navigation and a Contacting Us fallback even when the selected chapter renders correctly in a browser. Do not treat that extracted body as the requested chapter or as evidence that the specification is absent.

**Why:** Repeated retrieval of the MY2024 Mustang fuel-tank chapter returned unrelated fallback content. A normal browser render showed the selected 2.3L chapter, its all-variants applicability, and the MY2024 manual footer.

**How to apply:** Check the selected chapter title, engine/body predicates, market/units, and manual-year footer in the rendered page before accepting a fact. Use complete chapter links, including the navigation's UID. Keep only normalized facts and citation metadata, not screenshots or copied manual content in deliverables.

Extracted OEM chapters can omit individual dynamic numbers even when the surrounding service list is readable. A missing interval stays unknown; do not supply a plausible number from recollection or another manual version.

**Why:** Tesla's service chapter extraction returned a brake-fluid interval as “every years” while preserving neighboring numeric intervals.

**How to apply:** Confirm the missing value in the exact rendered chapter and edition before accepting it. Current software-versioned manuals must be labeled current, not silently treated as archived factory-year schedules.