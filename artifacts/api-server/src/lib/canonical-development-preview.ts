import type { CanonicalManifestEntry } from "./canonical-policy";

// Development allowlist only. This does not publish a canonical identity.
// Both IDs must still pass the existing exact-identity/evidence checks.
export const DEVELOPMENT_PREVIEW_MANIFEST: readonly CanonicalManifestEntry[] = [
  { configurationId: 2, identityClaimId: 7 },
  // Manually reviewed U.S. trim identities from american-catalog-batch.sql.
  // These IDs do not authorize public release or owner submissions.
  { configurationId: 3, identityClaimId: 34 },
  { configurationId: 4, identityClaimId: 35 },
  { configurationId: 5, identityClaimId: 36 },
  { configurationId: 6, identityClaimId: 37 },
  { configurationId: 7, identityClaimId: 38 },
  { configurationId: 8, identityClaimId: 39 },
  { configurationId: 9, identityClaimId: 41 },
  { configurationId: 10, identityClaimId: 42 },
  { configurationId: 11, identityClaimId: 43 },
  { configurationId: 12, identityClaimId: 44 },
  { configurationId: 13, identityClaimId: 45 },
  { configurationId: 14, identityClaimId: 46 },
  { configurationId: 15, identityClaimId: 47 },
  { configurationId: 16, identityClaimId: 48 },
  { configurationId: 17, identityClaimId: 49 },
  { configurationId: 18, identityClaimId: 51 },
  { configurationId: 19, identityClaimId: 52 },
  { configurationId: 20, identityClaimId: 53 },
  { configurationId: 21, identityClaimId: 55 },
  { configurationId: 22, identityClaimId: 56 },
  { configurationId: 23, identityClaimId: 57 },
  { configurationId: 24, identityClaimId: 58 },
  { configurationId: 25, identityClaimId: 59 },
  { configurationId: 26, identityClaimId: 60 },
  { configurationId: 27, identityClaimId: 61 },
  { configurationId: 28, identityClaimId: 62 },
  { configurationId: 29, identityClaimId: 64 },
  { configurationId: 30, identityClaimId: 65 },
  { configurationId: 31, identityClaimId: 66 },
  { configurationId: 32, identityClaimId: 67 },
];

export function getDevelopmentPreviewManifest(
  environment: { NODE_ENV?: string; REPLIT_DEPLOYMENT?: string } = process.env,
): readonly CanonicalManifestEntry[] {
  // Fail closed for production, tests, unset environments, and published Repls,
  // including a published process accidentally started in development mode.
  return environment.NODE_ENV === "development" && !environment.REPLIT_DEPLOYMENT
    ? DEVELOPMENT_PREVIEW_MANIFEST
    : [];
}