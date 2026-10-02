import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canResolveLegacyFallbackStatus,
  shouldKeepLegacyFallbackProfile,
} from "../../artifacts/api-server/src/lib/vehicle-profile-policy";

test("demo profiles keep their legacy fallback regardless of canonical alias status", () => {
  for (const status of ["exact_supported", "retired", "unresolved"]) {
    assert.equal(shouldKeepLegacyFallbackProfile(true, [status]), true);
    assert.equal(canResolveLegacyFallbackStatus(status, true), true);
  }
});

test("non-demo profiles only use an explicit unresolved or ambiguous fallback", () => {
  for (const status of ["ambiguous", "demo_identity_only", "unresolved"]) {
    assert.equal(shouldKeepLegacyFallbackProfile(false, [status]), true);
    assert.equal(canResolveLegacyFallbackStatus(status, false), true);
  }
  assert.equal(shouldKeepLegacyFallbackProfile(false, []), true);
});

test("exact-supported and retired non-demo profiles fail closed without a projection", () => {
  for (const status of ["exact_supported", "retired"]) {
    assert.equal(shouldKeepLegacyFallbackProfile(false, [status]), false);
    assert.equal(canResolveLegacyFallbackStatus(status, false), false);
  }

  assert.equal(
    shouldKeepLegacyFallbackProfile(false, ["unresolved", "exact_supported"]),
    false,
    "one exact-supported alias must not be hidden by a second fallback alias",
  );
});