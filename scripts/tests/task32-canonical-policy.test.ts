import assert from "node:assert/strict";
import test from "node:test";
import {
  isCurrentClaim,
  parseProfileKey,
  validateCanonicalManifest,
} from "../../artifacts/api-server/src/lib/canonical-policy";

test("canonical release manifest entries require unique positive configuration ids", () => {
  validateCanonicalManifest([]);
  validateCanonicalManifest([{ configurationId: 7, identityClaimId: 20 }]);
  assert.throws(
    () => validateCanonicalManifest([
      { configurationId: 7, identityClaimId: 20 },
      { configurationId: 7, identityClaimId: 21 },
    ]),
    /invalid or duplicate identity/,
  );
  assert.throws(
    () => validateCanonicalManifest([{ configurationId: 0, identityClaimId: 20 }]),
    /invalid or duplicate identity/,
  );
});

test("claim policy requires researched, accepted, current, non-demo content", () => {
  const eligible = {
    researchStatus: "researched",
    reviewStatus: "accepted",
    effectiveFrom: "2024-01-01",
    effectiveTo: "2026-01-01",
    contentClass: "source_fact",
  };
  assert.equal(isCurrentClaim(eligible, "2025-01-01"), true);
  assert.equal(isCurrentClaim({ ...eligible, researchStatus: "researching" }, "2025-01-01"), false);
  assert.equal(isCurrentClaim({ ...eligible, reviewStatus: "in_review" }, "2025-01-01"), false);
  assert.equal(isCurrentClaim({ ...eligible, contentClass: "demo_fixture" }, "2025-01-01"), false);
  assert.equal(isCurrentClaim({ ...eligible, effectiveFrom: "2025-02-01" }, "2025-01-01"), false);
  assert.equal(isCurrentClaim({ ...eligible, effectiveTo: "2024-12-31" }, "2025-01-01"), false);
});

test("namespace keys are parsed strictly with an explicit profile namespace", () => {
  assert.deepEqual(parseProfileKey("canonical:model:42", "model"), {
    namespace: "canonical",
    id: 42,
  });
  assert.deepEqual(parseProfileKey("legacy:model-year:4", "model-year"), {
    namespace: "legacy",
    id: 4,
  });
  assert.throws(() => parseProfileKey("model:42", "model"), /malformed/);
  assert.throws(() => parseProfileKey("canonical:generation:42", "model"), /malformed/);
  assert.throws(() => parseProfileKey("legacy:model:0", "model"), /malformed/);
  assert.throws(() => parseProfileKey(["legacy:model:2"], "model"), /single namespaced key/);
});