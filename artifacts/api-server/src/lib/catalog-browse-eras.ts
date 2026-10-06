import { createHash } from "node:crypto";
import snapshot from "../data/catalog-browse-eras.json";
import type { CanonicalClaim } from "./canonical-vehicle-source";

type Subject = { make: string; model: string; year: number };
export type BrowseEra = typeof snapshot.eras[number];
const byId = new Map<number, BrowseEra>();
const byModel = new Map<string, BrowseEra[]>();
// EPA historical labels can be uppercase while vPIC uses title case for the
// same browse identity. Preserve display/provenance names; compare case only.
const modelIdentity = (subject: Pick<Subject, "make" | "model">) =>
  `${subject.make.toLocaleLowerCase()}\0${subject.model.toLocaleLowerCase()}`;
if (snapshot.market !== "US" || snapshot.publicationStatus !== "development_preview_only") {
  throw new Error("Catalog browse-era review scope is invalid.");
}
for (const era of snapshot.eras) {
  if (!Number.isSafeInteger(era.id) || era.id <= 0 || byId.has(era.id) ||
      !Number.isInteger(era.startYear) || !Number.isInteger(era.endYear) ||
      era.endYear < era.startYear || !era.sourceUrl.startsWith("https://en.wikipedia.org/wiki/") ||
      !["generation", "refresh"].includes(era.kind) || !era.name || !era.locator) {
    throw new Error(`Invalid reviewed catalog browse era: ${era.id}`);
  }
  byId.set(era.id, era);
  const identity = modelIdentity(era);
  byModel.set(identity, [...(byModel.get(identity) ?? []), era]);
}

export const catalogEraKey = (era: BrowseEra) => `catalog:generation:${era.id}`;
export function getCatalogBrowseEras(subject: Subject): BrowseEra[] {
  return (byModel.get(modelIdentity(subject)) ?? []).filter(era =>
    subject.year >= era.startYear && subject.year <= era.endYear);
}

export function getCatalogBrowseErasForModel(subject: Pick<Subject, "make" | "model">): BrowseEra[] {
  return byModel.get(modelIdentity(subject)) ?? [];
}

export function getCatalogBrowseEra(key: string): BrowseEra | undefined {
  const match = /^catalog:generation:([1-9]\d*)$/.exec(key);
  return match ? byId.get(Number(match[1])) : undefined;
}

/** Broad browse metadata is not a database generation/configuration identity. */
export function catalogBrowseEraClaims(subject: Subject): CanonicalClaim[] {
  return getCatalogBrowseEras(subject).map(era => {
    const revision = createHash("sha256").update(JSON.stringify(era)).digest("hex");
    return {
      id: `catalog:era:${era.id}:${subject.year}`, contentClass: "source_fact",
      reviewStatus: "accepted", evidenceStrength: "moderate",
      effectiveFrom: null, effectiveTo: null, applicability: "applies",
      applicabilityVersion: "catalog-browse-era-v1",
      scopeDescription: `${subject.year} ${subject.make} ${subject.model}: candidate ${era.kind} grouping. ${era.note}`,
      sources: [{
        sourceId: `catalog-era:${era.id}`, revisionId: revision,
        publisher: "Wikipedia contributors", url: era.sourceUrl,
        documentIdentifier: era.locator,
        sourceVersion: `Reviewed normalized metadata checksum (not original document): ${revision}`,
        retrievedAt: snapshot.reviewedAt, publishedAt: null, locator: era.locator,
      }],
    };
  });
}
