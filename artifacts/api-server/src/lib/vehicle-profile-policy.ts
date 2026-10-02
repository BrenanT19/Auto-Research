const legacyFallbackStatuses = new Set([
  "ambiguous",
  "demo_identity_only",
  "unresolved",
]);

export function shouldKeepLegacyFallbackProfile(
  isDemo: boolean,
  mappingStatuses: readonly string[],
): boolean {
  // Demo rows are a separate public catalog and must not be repointed or hidden
  // when a canonical alias is later attached to the same legacy identity.
  if (isDemo) return true;
  if (mappingStatuses.length === 0) return true;
  if (
    mappingStatuses.some(
      (status) => status === "exact_supported" || status === "retired",
    )
  ) {
    return false;
  }
  return mappingStatuses.some((status) => legacyFallbackStatuses.has(status));
}

export function canResolveLegacyFallbackStatus(
  mappingStatus: string,
  isDemo: boolean,
): boolean {
  return isDemo || legacyFallbackStatuses.has(mappingStatus);
}