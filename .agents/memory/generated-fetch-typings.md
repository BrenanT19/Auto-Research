---
name: Generated Fetch typings
description: TypeScript library requirements for generated browser clients using iterable Fetch APIs.
---

When generated browser clients enumerate Fetch headers (for example, with `Headers.entries()`), enable the DOM iterable library alongside the regular DOM library in the package's TypeScript configuration.

**Why:** TypeScript's base DOM declarations omit iterable methods unless the iterable library is included, so generated code can typecheck-fail even when code generation succeeds.

**How to apply:** If generated Fetch code fails on an iterable API, inspect the package's configured TypeScript libraries and add the matching iterable library rather than editing generated files.