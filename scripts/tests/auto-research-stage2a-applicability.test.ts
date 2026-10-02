import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateApplicability,
  type ApplicabilityEvaluationInput,
} from "../../lib/db/src/applicability";

const supportedScope: ApplicabilityEvaluationInput = {
  scopeState: "restricted",
  researchStatus: "researched",
  reviewStatus: "accepted",
  contentClass: "source_fact",
  hasSupportingEvidence: true,
  alternatives: [
    {
      completeness: "complete",
      predicates: { marketId: 1, vehicleConfigurationId: 42 },
    },
  ],
  candidate: { marketId: 1, vehicleConfigurationId: 42 },
};

test("a complete accepted alternative applies when every AND predicate matches", () => {
  assert.equal(evaluateApplicability(supportedScope), "applies");
});

test("a complete supported mismatch means the claim does not apply", () => {
  assert.equal(
    evaluateApplicability({
      ...supportedScope,
      candidate: { marketId: 1, vehicleConfigurationId: 43 },
    }),
    "does_not_apply",
  );
});

test("independently evidenced OR alternatives apply when any complete alternative matches", () => {
  assert.equal(
    evaluateApplicability({
      ...supportedScope,
      alternatives: [
        { completeness: "complete", predicates: { marketId: 2, vehicleConfigurationId: 42 } },
        { completeness: "complete", predicates: { marketId: 1, vehicleConfigurationId: 42 } },
      ],
    }),
    "applies",
  );
});

test("a partial alternative never becomes a wildcard", () => {
  assert.equal(
    evaluateApplicability({
      ...supportedScope,
      alternatives: [{ completeness: "partial", predicates: { marketId: 1 } }],
      candidate: { marketId: 1, vehicleConfigurationId: 42 },
    }),
    "unknown",
  );
});

test("missing candidate predicates remain unknown instead of broadening scope", () => {
  assert.equal(
    evaluateApplicability({
      ...supportedScope,
      candidate: { marketId: 1 },
    }),
    "unknown",
  );
});

test("a complete vehicle- or package-scoped alternative without a market stays unknown", () => {
  assert.equal(
    evaluateApplicability({
      ...supportedScope,
      alternatives: [
        { completeness: "complete", predicates: { vehicleConfigurationId: 42 } },
      ],
      candidate: { vehicleConfigurationId: 42 },
    }),
    "unknown",
  );
  assert.equal(
    evaluateApplicability({
      ...supportedScope,
      alternatives: [{ completeness: "complete", predicates: { packageCode: "PKG-A" } }],
      candidate: { packageCode: "PKG-A" },
    }),
    "unknown",
  );
});

test("mixed mismatch and unresolved alternatives remain unknown", () => {
  assert.equal(
    evaluateApplicability({
      ...supportedScope,
      alternatives: [
        { completeness: "complete", predicates: { marketId: 2 } },
        { completeness: "unknown", predicates: { marketId: 1 } },
      ],
    }),
    "unknown",
  );
});

test("empty, unknown, or partial scope fails closed", () => {
  assert.equal(evaluateApplicability({ ...supportedScope, alternatives: [] }), "unknown");
  assert.equal(
    evaluateApplicability({ ...supportedScope, scopeState: "unknown" }),
    "unknown",
  );
  assert.equal(
    evaluateApplicability({
      ...supportedScope,
      alternatives: [{ completeness: "unknown", predicates: { marketId: 1 } }],
    }),
    "unknown",
  );
});

test("build-date ranges are inclusive and a missing or invalid date is unknown", () => {
  const dateScope: ApplicabilityEvaluationInput = {
    ...supportedScope,
    alternatives: [
      {
        completeness: "complete",
        predicates: { marketId: 1 },
        buildDateFrom: "2024-01-01",
        buildDateTo: "2024-12-31",
      },
    ],
  };
  assert.equal(
    evaluateApplicability({
      ...dateScope,
      candidate: { marketId: 1, buildDate: "2024-01-01" },
    }),
    "applies",
  );
  assert.equal(
    evaluateApplicability({
      ...dateScope,
      candidate: { marketId: 1, buildDate: "2025-01-01" },
    }),
    "does_not_apply",
  );
  assert.equal(
    evaluateApplicability({ ...dateScope, candidate: { marketId: 1, buildDate: "2024-02-30" } }),
    "unknown",
  );
  assert.equal(
    evaluateApplicability({ ...dateScope, candidate: { marketId: 1 } }),
    "unknown",
  );
});

test("unrestricted applicability needs reviewed, evidenced, non-demo research", () => {
  const unrestricted = { ...supportedScope, scopeState: "explicit_unrestricted" as const };
  assert.equal(evaluateApplicability(unrestricted), "applies");
  assert.equal(
    evaluateApplicability({ ...unrestricted, hasSupportingEvidence: false }),
    "unknown",
  );
  assert.equal(
    evaluateApplicability({ ...unrestricted, reviewStatus: "not_reviewed" }),
    "unknown",
  );
  assert.equal(
    evaluateApplicability({ ...unrestricted, contentClass: "demo_fixture" }),
    "unknown",
  );
});

test("conflicted, unresearched, or unreviewed claims remain unknown", () => {
  assert.equal(
    evaluateApplicability({ ...supportedScope, hasConflictingEvidence: true }),
    "unknown",
  );
  assert.equal(
    evaluateApplicability({ ...supportedScope, researchStatus: "researching" }),
    "unknown",
  );
  assert.equal(
    evaluateApplicability({ ...supportedScope, reviewStatus: "in_review" }),
    "unknown",
  );
});