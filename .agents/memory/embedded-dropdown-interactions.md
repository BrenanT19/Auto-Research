---
name: Embedded dropdown interaction verification
description: Native popup screenshots can be misleading when verifying mouse selection in a preview browser.
---

Do not treat an enabled native select or a screenshot of its open popup as proof that mouse selection works. Verify the option click and resulting label/URL.

**Why:** In the preview browser, a native select popup was visibly drawn, but page mouse clicks at its apparent option position reached the underlying page instead; keyboard selection worked. This demonstrated an interaction-capture limitation, not a disabled filter, and did not prove how every user's OS popup behaves.

**How to apply:** When an embedded preview reports failed native-dropdown interaction, inspect hit-testing and reproduce actual mouse selection. An in-page, DOM-rendered menu makes visible options hit-testable and regression-testable. Preserve the control appearance and catalog-driven options.