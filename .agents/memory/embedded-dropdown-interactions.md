---
name: Embedded dropdown interaction verification
description: Native popup screenshots can be misleading when verifying mouse selection in a preview browser.
---

Do not treat an enabled native select or a screenshot of its open popup as proof that mouse selection works. Verify the option click and resulting label/URL.

**Why:** In the preview browser, a native select popup was visibly drawn, but page mouse clicks at its apparent option position reached the underlying page instead; keyboard selection worked. This demonstrated an interaction-capture limitation, not a disabled filter, and did not prove how every user's OS popup behaves.

**How to apply:** When an embedded preview reports failed native-dropdown interaction, inspect hit-testing and reproduce actual mouse selection. An in-page, DOM-rendered menu makes visible options hit-testable and regression-testable. Preserve the control appearance and catalog-driven options.

For browser tests, distinguish a selector failure from a failed interaction. Prefer role/name selectors for selects nested inside labels: exact label text can include option text even when the computed accessible name is correct. A modal dropdown can also temporarily hide its trigger from the accessibility tree.

**Why:** These two behaviors caused tests to time out even though the controls rendered and the Generation popup opened; increasing timeouts did not resolve the selector mismatch.

**How to apply:** Inspect the DOM and accessible roles before changing runtime settings or application code. When checking a modal popup's background trigger while open, allow hidden-role matching for that trigger only; continue requiring visible menus and actual option clicks.