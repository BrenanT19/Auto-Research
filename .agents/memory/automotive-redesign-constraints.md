---
name: Automotive redesign constraints
description: User-defined boundaries for visual changes and truthful vehicle media.
---

Visual redesign work must preserve existing routes, APIs, vehicle data structures, search, comparison, calculator formulas, and interactions unless the user explicitly requests a behavior change.

**Why:** The user specifically scoped the automotive redesign as presentation work and emphasized not replacing working functionality.

**How to apply:** Start from the actual components, change their presentation, and regression-check the research journey rather than rebuilding the product.

Use licensed/usable real vehicle photography when available; otherwise use clearly labeled photo placeholders, not invented images that might be mistaken for the specific vehicle.

**Why:** This research product informs expensive purchase decisions, and the user explicitly prohibited misleading vehicle imagery.

**How to apply:** Verify rights and vehicle identity before assigning a photograph to a model/trim; retain honest placeholders when suitable images are unavailable.

Browse autocomplete suggestions are limited to Manufacturer and Model results; do not add individual vehicle/configuration/trim suggestions without an explicit request. Keep result labels clean and show the entity type as secondary metadata.

**Why:** The user wants high-level discovery first and does not want per-configuration matches cluttering search suggestions.

**How to apply:** Keep autocomplete to the current make/model discovery level while preserving the existing cascading filters. Vehicle report navigation remains available through the vehicle cards.

Generation selection must remain explicit, including when a model has only one catalog generation. Keep the same enabled dropdown for one or many generations; do not infer the selection from the option count.

**Why:** The user explicitly wants a consistent manual-selection interaction that continues to work when the catalog grows, and rejected sole-generation auto-selection.

**How to apply:** Model selection alone must not add a generation to the URL. Verify physical menu opening and option clicks, not just filter-state assertions.

Browse returns to the page top only after an explicit Clear all filters action, with reduced motion respected. Individual filter refinements and history restoration must not acquire that return-to-top behavior.

**Why:** Clearing begins a new search, while individual refinements should preserve the user's browsing context.

**How to apply:** Keep reset-specific scrolling separate from general filter or URL synchronization.

Focused desktop Browse UX refinements are not authorization for a new mobile interface. Preserve the existing responsive layout and usable control sizes; internal sidebar scrolling is a fallback for content that cannot fit, not the normal fitting-panel behavior.

**Why:** The user explicitly prioritized the existing desktop/laptop website and rejected separate mobile interfaces or major responsive-layout changes for this work.

**How to apply:** Scope desktop density/sticky adjustments to the existing desktop breakpoint. Check both fitting and short-window panels with real wheel input, and ensure filter access does not depend on the length of the results list.