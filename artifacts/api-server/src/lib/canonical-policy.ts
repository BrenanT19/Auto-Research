export type CanonicalManifestEntry = {
  configurationId: number;
  identityClaimId: number;
};

export function validateCanonicalManifest(
  manifest: readonly CanonicalManifestEntry[],
): void {
  const ids = new Set<number>();
  for (const entry of manifest) {
    if (!Number.isInteger(entry.configurationId) || entry.configurationId < 1 ||
        !Number.isInteger(entry.identityClaimId) || entry.identityClaimId < 1 ||
        ids.has(entry.configurationId)) {
      throw new Error("Canonical release manifest contains an invalid or duplicate identity.");
    }
    ids.add(entry.configurationId);
  }
}

export function isCurrentClaim(claim: {
  researchStatus: string;
  reviewStatus: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  contentClass: string;
}, today = new Date().toISOString().slice(0, 10)): boolean {
  return claim.researchStatus === "researched" &&
    claim.reviewStatus === "accepted" &&
    claim.contentClass !== "demo_fixture" &&
    (!claim.effectiveFrom || claim.effectiveFrom <= today) &&
    (!claim.effectiveTo || claim.effectiveTo >= today);
}

export function parseProfileKey(
  raw: unknown,
  kind: "model" | "generation" | "model-year" | "trim",
): { namespace: "legacy" | "canonical" | "catalog"; id: number } {
  if (typeof raw !== "string") throw new Error(`${kind}Key must be a single namespaced key.`);
  const match = /^(legacy|canonical|catalog):(model|generation|model-year|trim):([1-9]\d*)$/.exec(raw);
  if (!match || match[2] !== kind || !Number.isSafeInteger(Number(match[3]))) {
    throw new Error(`${kind}Key is malformed; expected legacy:${kind}:ID or canonical:${kind}:ID.`);
  }
  if (match[1] === "catalog" && (kind === "generation" || kind === "trim")) {
    throw new Error("Catalog generations and trims have not yet been verified.");
  }
  return { namespace: match[1] as "legacy" | "canonical" | "catalog", id: Number(match[3]) };
}