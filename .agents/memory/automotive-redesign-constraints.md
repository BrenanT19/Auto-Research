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