---
name: Report navigation coordination
description: Why report destinations and active tracking must share a boundary and how click feedback hands back.
---

Anchor destinations and manual section tracking must use the same measured activation boundary, including fractional-position rounding and the page-end limit.

**Why:** Different boundaries left a correctly positioned section outside the tracker’s activation rule, creating a persistent one-section lag rather than a simple slow observer.

**How to apply:** When changing report navigation or sticky offsets, verify actual settled section positions, not just which sections intersect. Include short final sections that cannot reach the normal activation line.

Clicked-section feedback is temporary, not a replacement for manual tracking. A generic scroll-completion event must not by itself terminate newer click feedback.

**Why:** A previous native animation’s completion can arrive after a subsequent click, causing an otherwise correct immediate highlight to be overwritten.

**How to apply:** Release click feedback based on the shared destination rule or explicit user interruption. Check repeated and non-sequential real clicks, followed by upward and downward wheel scrolling.