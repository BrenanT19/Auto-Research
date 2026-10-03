import type { CanonicalManifestEntry } from "./canonical-policy";

// Development allowlist only. This does not publish a canonical identity.
// Both IDs must still pass the existing exact-identity/evidence checks.
export const DEVELOPMENT_PREVIEW_MANIFEST: readonly CanonicalManifestEntry[] = [
  { configurationId: 2, identityClaimId: 7 },
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