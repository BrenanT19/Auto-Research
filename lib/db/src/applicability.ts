export type ApplicabilityResult = "applies" | "does_not_apply" | "unknown";
export type ApplicabilityPredicateKey =
  | "marketId"
  | "vehicleModelId"
  | "vehicleGenerationId"
  | "vehicleModelYearId"
  | "vehicleTrimId"
  | "vehicleConfigurationId"
  | "componentRevisionId"
  | "packageCode"
  | "buildDate";

export type ApplicabilityPredicateValue = number | string;
export type ApplicabilityAlternative = {
  completeness: "complete" | "partial" | "unknown";
  predicates: Partial<Record<ApplicabilityPredicateKey, ApplicabilityPredicateValue>>;
  buildDateFrom?: string;
  buildDateTo?: string;
};

export type ApplicabilityEvaluationInput = {
  scopeState: "restricted" | "explicit_unrestricted" | "unknown";
  researchStatus: "not_researched" | "researching" | "researched" | "blocked";
  reviewStatus: "not_reviewed" | "in_review" | "accepted" | "rejected" | "stale" | "superseded";
  contentClass: string;
  hasSupportingEvidence: boolean;
  hasConflictingEvidence?: boolean;
  alternatives: ApplicabilityAlternative[];
  candidate: Partial<Record<ApplicabilityPredicateKey, ApplicabilityPredicateValue>>;
};

function candidateMatches(
  alternative: ApplicabilityAlternative,
  candidate: ApplicabilityEvaluationInput["candidate"],
): ApplicabilityResult {
  if (alternative.completeness !== "complete") return "unknown";
  const predicateEntries = Object.entries(alternative.predicates) as [
    ApplicabilityPredicateKey,
    ApplicabilityPredicateValue,
  ][];
  const hasBuildDateRange =
    alternative.buildDateFrom !== undefined || alternative.buildDateTo !== undefined;
  if (predicateEntries.length === 0 && !hasBuildDateRange) return "unknown";
  const needsMarket =
    predicateEntries.some(([key]) => key !== "marketId") || hasBuildDateRange;
  if (needsMarket && alternative.predicates.marketId === undefined) return "unknown";

  let missingPredicate = false;
  for (const [key, expected] of predicateEntries) {
    const actual = candidate[key];
    if (actual === undefined) {
      missingPredicate = true;
      continue;
    }
    if (actual !== expected) return "does_not_apply";
  }
  if (hasBuildDateRange) {
    const buildDate = candidate.buildDate;
    if (
      typeof buildDate !== "string" ||
      !isIsoDate(buildDate) ||
      (alternative.buildDateFrom !== undefined && !isIsoDate(alternative.buildDateFrom)) ||
      (alternative.buildDateTo !== undefined && !isIsoDate(alternative.buildDateTo))
    ) {
      missingPredicate = true;
    } else if (
      (alternative.buildDateFrom !== undefined && buildDate < alternative.buildDateFrom) ||
      (alternative.buildDateTo !== undefined && buildDate > alternative.buildDateTo)
    ) {
      return "does_not_apply";
    }
  }
  return missingPredicate ? "unknown" : "applies";
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Evaluate an evidenced applicability set without treating absent scope as a wildcard.
 * This helper is intentionally not wired into legacy API reads during Stage 2A.
 */
export function evaluateApplicability(
  input: ApplicabilityEvaluationInput,
): ApplicabilityResult {
  if (
    input.contentClass === "demo_fixture" ||
    input.researchStatus !== "researched" ||
    input.reviewStatus !== "accepted" ||
    !input.hasSupportingEvidence ||
    input.hasConflictingEvidence
  ) {
    return "unknown";
  }

  if (input.scopeState === "explicit_unrestricted") return "applies";
  if (input.scopeState !== "restricted" || input.alternatives.length === 0) {
    return "unknown";
  }

  const results = input.alternatives.map((alternative) =>
    candidateMatches(alternative, input.candidate),
  );
  if (results.includes("applies")) return "applies";
  if (results.every((result) => result === "does_not_apply")) return "does_not_apply";
  return "unknown";
}