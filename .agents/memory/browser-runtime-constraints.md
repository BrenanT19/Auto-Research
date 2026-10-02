---
name: Browser runtime constraints
description: Playwright browser selection in this NixOS workspace.
---

Prefer the available Replit-managed Chromium executable over a downloaded Playwright browser when running local UI acceptance tests.

**Why:** The downloaded browser could not load Linux shared libraries, while the installed Chromium wrapper supplied a working runtime. Browser-launch failures did not exercise application assertions.

**How to apply:** Locate and verify the installed Chromium executable, then pass it through the existing test runner's executable-path override for that command only. Do not treat a launch failure as an application regression or install dependencies before checking the available runtime.