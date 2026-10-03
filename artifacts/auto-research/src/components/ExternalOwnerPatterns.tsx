import type { ClaimProvenance, ExternalOwnerPattern, ResearchState } from "@workspace/api-client-react";
import { safeCitationUrl } from "../shopper-tools";
import { CanonicalEvidence } from "./CanonicalEvidence";

export function ExternalOwnerPatterns({
  patterns,
  state,
  claims,
}: {
  patterns: ExternalOwnerPattern[];
  state?: ResearchState;
  claims?: ClaimProvenance[];
}) {
  if (!patterns.length) {
    return <CanonicalEvidence state={state} claims={claims}/>;
  }

  return <div className="external-pattern-list" data-testid="list-external-owner-patterns">
    <p className="external-pattern-intro">
      These are patterns described in outside sources, not firsthand reports submitted to AutoResearch.
      Applicability is evaluated against this selected configuration; sample and source limitations are shown below.
    </p>
    {patterns.map((pattern) => <article className="external-pattern-card" key={pattern.claimId} data-testid={`card-external-owner-pattern-${pattern.claimId}`}>
      <span className="external-pattern-label">EXTERNAL RESEARCH · NOT A USER SUBMISSION</span>
      <blockquote data-testid={`text-external-owner-pattern-${pattern.claimId}`}>{pattern.patternText}</blockquote>
      <p className="external-pattern-scope">
        <b>Reviewed applicability:</b> Applies to this selected configuration — {pattern.scopeDescription}
      </p>
      <dl className="external-pattern-details">
        <div><dt>Source population</dt><dd>{pattern.sourcePopulation}</dd></div>
        <div><dt>Geography</dt><dd>{pattern.geography || "Not specified"}</dd></div>
        <div><dt>Observation window</dt><dd>{pattern.observationWindow}</dd></div>
        <div><dt>Sample size</dt><dd>{pattern.sampleSize == null ? "Not reported" : `n = ${pattern.sampleSize.toLocaleString()}`}</dd></div>
        <div><dt>Collection method</dt><dd>{pattern.collectionMethod}</dd></div>
      </dl>
      {pattern.knownBias && <p className="external-pattern-limitation"><b>Known bias:</b> {pattern.knownBias}</p>}
      <p className="external-pattern-limitation"><b>Limitations:</b> {pattern.limitations}</p>
      <div className="external-pattern-citations">
        <b>Sources</b>
        <ul>{pattern.sources.map((source) => {
          const url = safeCitationUrl(source.url);
          const title = source.publisher || source.documentIdentifier || source.sourceId;
          return <li key={`${source.sourceId}:${source.revisionId}`}>
            {url ? <a href={url} target="_blank" rel="noreferrer" data-testid={`link-external-pattern-source-${pattern.claimId}-${source.sourceId}`}>{title}</a> : title}
            {source.locator && ` · ${source.locator}`}
            {` · Retrieved ${source.retrievedAt}`}
          </li>;
        })}</ul>
        <CanonicalEvidence claimIds={pattern.claimIds} claims={claims}/>
      </div>
    </article>)}
  </div>;
}