---
name: Optional detail lookups
description: Why optional resource IDs need explicit query gating in generated API hooks.
---

Disable a generated detail query when its optional resource identifier is empty, and use detail data only when the identifier is present. Do not assume the generated hook's default prevents an empty-string request.

**Why:** The generated client treats an empty string as a valid identifier. A missing-ID detail request can resolve to the collection endpoint, returning a list where the UI expects a single profile and causing a runtime crash.

**How to apply:** For optional profile lookups, explicitly set query enablement from identifier presence while retaining the generated query key. Keep this guard in application code rather than modifying generated clients.