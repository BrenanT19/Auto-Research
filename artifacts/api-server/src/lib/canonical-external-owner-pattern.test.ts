import assert from "node:assert/strict";
import test from "node:test";
import { projectExternalOwnerPattern } from "./canonical-external-owner-pattern";

const claim = {
  id: "synthetic-claim-44001",
  claimKind: "owner_pattern",
  contentClass: "external_owner_pattern",
  applicability: "applies" as const,
  scopeDescription: "Synthetic reviewed model-year scope evaluated against the selected configuration.",
};

const details = {
  sourcePopulation: "Synthetic public owner survey participants",
  geography: "Synthetic region",
  observationWindow: "Synthetic 2024–2025 collection window",
  sampleSize: 23,
  collectionMethod: "Synthetic opt-in questionnaire",
  knownBias: "Synthetic self-selection bias",
  limitations: "Synthetic fixture; not a population-wide estimate.",
};

test("projects applicable external patterns with their sample limitations and source excerpts", () => {
  const projected = projectExternalOwnerPattern(claim, details, [
    { relation: "supports", excerpt: " Synthetic observation from an outside source. " },
    { relation: "qualifies", excerpt: "A qualifier is not presented as the pattern itself." },
    { relation: "derived_from", excerpt: "A second synthetic supporting excerpt." },
  ]);

  assert.deepEqual(projected, {
    claimId: "synthetic-claim-44001",
    claimIds: ["synthetic-claim-44001"],
    patternText: "Synthetic observation from an outside source.\n\nA second synthetic supporting excerpt.",
    sourcePopulation: details.sourcePopulation,
    geography: details.geography,
    observationWindow: details.observationWindow,
    sampleSize: details.sampleSize,
    collectionMethod: details.collectionMethod,
    knownBias: details.knownBias,
    limitations: details.limitations,
    applicability: "applies",
    scopeDescription: claim.scopeDescription,
  });
});

test("does not project a direct owner experience as an external pattern", () => {
  assert.equal(
    projectExternalOwnerPattern(
      { ...claim, claimKind: "owner_experience", contentClass: "direct_owner_experience" },
      details,
      [{ relation: "supports", excerpt: "Synthetic firsthand text." }],
    ),
    undefined,
  );
});

test("does not project patterns whose reviewed applicability is unknown or does not apply", () => {
  assert.equal(
    projectExternalOwnerPattern({ ...claim, applicability: "unknown" }, details, [
      { relation: "supports", excerpt: "Synthetic text." },
    ]),
    undefined,
  );
  assert.equal(
    projectExternalOwnerPattern({ ...claim, applicability: "does_not_apply" }, details, [
      { relation: "supports", excerpt: "Synthetic text." },
    ]),
    undefined,
  );
});

test("fails closed when details or eligible supporting excerpts are missing", () => {
  assert.equal(
    projectExternalOwnerPattern(claim, undefined, [
      { relation: "supports", excerpt: "Synthetic text." },
    ]),
    undefined,
  );
  assert.equal(
    projectExternalOwnerPattern(claim, details, [
      { relation: "qualifies", excerpt: "Only a qualifier is available." },
      { relation: "supports", excerpt: "   " },
    ]),
    undefined,
  );
});