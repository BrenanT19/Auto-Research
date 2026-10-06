/**
 * Discovery retirement, not deletion or ownership-evidence transfer.
 * Callers MUST supply only profiles that passed the canonical loader's
 * identity, applicability, rights and release/preview-manifest gates.
 */
export interface EligibleCatalogIdentity {
  id: string;
  makeSlug: string;
  model: string;
  year: number;
  trim: string;
  isDemo: boolean;
}

const EXACT_REPLACEMENTS = [
  {
    legacyId: "chevrolet-silverado-1500-2024-lt",
    canonicalId: "chevrolet-silverado-1500-2024-lt-us-trim-identity",
    makeSlug: "chevrolet", model: "Silverado 1500", year: 2024, trim: "LT",
  },
  {
    legacyId: "gmc-sierra-1500-2024-elevation",
    canonicalId: "gmc-sierra-1500-2024-elevation-us-trim-identity",
    makeSlug: "gmc", model: "Sierra 1500", year: 2024, trim: "Elevation",
  },
] as const;

export function getReplacementCandidate(legacyId: string | undefined) {
  return EXACT_REPLACEMENTS.find((replacement) => replacement.legacyId === legacyId);
}

export function getEligibleReplacement(
  legacyId: string | undefined,
  eligible: readonly EligibleCatalogIdentity[],
): string | undefined {
  const replacement = getReplacementCandidate(legacyId);
  if (!replacement) return undefined;
  return eligible.some((vehicle) =>
    !vehicle.isDemo && vehicle.id === replacement.canonicalId &&
    vehicle.makeSlug === replacement.makeSlug && vehicle.model === replacement.model &&
    vehicle.year === replacement.year && vehicle.trim === replacement.trim,
  ) ? replacement.canonicalId : undefined;
}

export function getRetiredDemoSlugs(eligible: readonly EligibleCatalogIdentity[]): Set<string> {
  const retired = new Set<string>();
  for (const replacement of EXACT_REPLACEMENTS) {
    if (getEligibleReplacement(replacement.legacyId, eligible)) retired.add(replacement.legacyId);
  }
  // Preferred was a fabricated MY2024 Enclave trim. It has NO exact replacement:
  // hide it only once the three actual trims pass the catalog gates. Its original
  // demo URL and relationships remain untouched; never redirect it to Essence.
  const enclaveTrims = new Set(eligible.filter((vehicle) =>
    !vehicle.isDemo && vehicle.makeSlug === "buick" && vehicle.model === "Enclave" &&
    vehicle.year === 2024 &&
    vehicle.id === `buick-enclave-2024-${vehicle.trim.toLowerCase()}-us-trim-identity`,
  ).map((vehicle) => vehicle.trim));
  if (["Essence", "Premium", "Avenir"].every((trim) => enclaveTrims.has(trim))) {
    retired.add("buick-enclave-2024-preferred");
  }
  return retired;
}
