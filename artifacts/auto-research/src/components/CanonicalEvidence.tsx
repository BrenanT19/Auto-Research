import type { ClaimProvenance, ResearchState } from "@workspace/api-client-react";
import { researchStateLabel, safeCitationUrl } from "../shopper-tools";

export function CanonicalEvidence({
  state,
  claimIds,
  claims = [],
}: {
  state?: ResearchState;
  claimIds?: string[];
  claims?: ClaimProvenance[];
}) {
  if (!state && !claimIds?.length) return <small className="canonical-state">Research state unavailable.</small>;
  const matchingClaims = (claimIds || state?.claimIds || [])
    .map((id) => claims.find((claim) => claim.id === id))
    .filter((claim): claim is ClaimProvenance => Boolean(claim));
  return <span className="canonical-state">
    {state && <>{researchStateLabel(state)}{state.reason ? ` — ${state.reason}` : ""}</>}
    {matchingClaims.length > 0 && <details>
      <summary>Provenance ({matchingClaims.length} {matchingClaims.length === 1 ? "claim" : "claims"})</summary>
      <ul>{matchingClaims.map((claim) => <li key={claim.id}>
        <b>{claim.contentClass.replaceAll("_", " ")}</b> · {claim.applicability.replaceAll("_", " ")} · {claim.scopeDescription}
        <div>Review status: {claim.reviewStatus} · Evidence strength: {claim.evidenceStrength}</div>
        {claim.sources.map((source) => <div key={`${claim.id}:${source.sourceId}:${source.revisionId}`}>
          {safeCitationUrl(source.url) ? <a href={safeCitationUrl(source.url)} target="_blank" rel="noreferrer">{source.publisher || source.documentIdentifier || source.sourceId}</a> : source.publisher || source.documentIdentifier || source.sourceId}
          {source.locator ? ` · ${source.locator}` : ""}
          {source.unit ? ` · Unit: ${source.unit}` : ""}
          {source.measurementBasis ? ` · Basis: ${source.measurementBasis}` : ""}
          {source.sourceVersion ? ` · Version: ${source.sourceVersion}` : ""}
          {` · Retrieved: ${source.retrievedAt}`}
        </div>)}
      </li>)}</ul>
    </details>}
  </span>;
}