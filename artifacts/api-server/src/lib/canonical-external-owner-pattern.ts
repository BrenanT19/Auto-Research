export type ExternalOwnerPatternClaimInput = {
  id: string;
  claimKind: string;
  contentClass: string;
  applicability: "applies" | "does_not_apply" | "unknown";
  scopeDescription: string;
};

export type ExternalOwnerPatternDetailsInput = {
  sourcePopulation: string;
  geography: string | null;
  observationWindow: string;
  sampleSize: number | null;
  collectionMethod: string;
  knownBias: string | null;
  limitations: string;
};

export type ExternalOwnerPatternExcerptInput = {
  relation: string;
  excerpt: string | null;
};

export type ExternalOwnerPatternProfile = {
  claimId: string;
  claimIds: string[];
  patternText: string;
  sourcePopulation: string;
  geography: string | null;
  observationWindow: string;
  sampleSize: number | null;
  collectionMethod: string;
  knownBias: string | null;
  limitations: string;
  applicability: "applies";
  scopeDescription: string;
};

export function projectExternalOwnerPattern(
  claim: ExternalOwnerPatternClaimInput,
  details: ExternalOwnerPatternDetailsInput | undefined,
  evidence: readonly ExternalOwnerPatternExcerptInput[],
): ExternalOwnerPatternProfile | undefined {
  if (
    claim.claimKind !== "owner_pattern" ||
    claim.contentClass !== "external_owner_pattern" ||
    claim.applicability !== "applies" ||
    !details
  ) {
    return undefined;
  }

  const excerpts = evidence
    .filter((item) => item.relation === "supports" || item.relation === "derived_from")
    .map((item) => item.excerpt?.trim())
    .filter((excerpt): excerpt is string => Boolean(excerpt));
  if (!excerpts.length) return undefined;

  return {
    claimId: claim.id,
    claimIds: [claim.id],
    patternText: excerpts.join("\n\n"),
    sourcePopulation: details.sourcePopulation,
    geography: details.geography,
    observationWindow: details.observationWindow,
    sampleSize: details.sampleSize,
    collectionMethod: details.collectionMethod,
    knownBias: details.knownBias,
    limitations: details.limitations,
    applicability: "applies",
    scopeDescription: claim.scopeDescription,
  };
}