---
name: Source checksum basis
description: Compare hashes for the same payload when reviewing compressed government datasets.
---

Record whether each source checksum covers the downloaded archive, an extracted member, or a normalized representation. Compare only hashes with the same basis.

**Why:** A source audit incorrectly reported a version discrepancy after comparing the EPA ZIP hash with the catalog's extracted CSV hash. The actual CSV content was identical.

**How to apply:** Inspect the producer's hashing operation before treating a mismatch as provenance drift. Report container and content hashes separately; preserve the distinction in evidence exports.
