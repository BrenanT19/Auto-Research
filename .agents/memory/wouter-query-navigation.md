---
name: Wouter query-only navigation
description: Keep local state derived from query parameters synchronized during browser history navigation.
---

Wouter's location value did not change when only query parameters changed during browser Back/Forward navigation. Components that initialize local state from `window.location.search` can therefore diverge from the URL unless they listen for `popstate`.

**Why:** Chromium testing showed the comparison URL returning to its prior vehicle IDs while the selected count and columns remained at the later state. An effect keyed only to the route location did not run for that query-only transition.

**How to apply:** When a mounted component mirrors query parameters in React state, subscribe to `popstate` and parse the current search string; continue updating local state immediately for in-app actions.