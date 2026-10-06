import snapshot from "../data/model-year-catalog.json";
import type { CanonicalClaim, CanonicalFilters, CanonicalVehicle } from "./canonical-vehicle-source";
import { catalogBrowseEraClaims, catalogEraKey, getCatalogBrowseEra, getCatalogBrowseEras } from "./catalog-browse-eras";

/** Catalog IDs are not database configuration, trim, or generation IDs. */
export type ModelYearVehicle = Omit<CanonicalVehicle,
  "canonicalConfigurationId" | "generationId" | "trimId" | "generationKey" | "trimKey"> & {
  identityLevel: "model_year";
  canonicalConfigurationId?: never;
  generationId?: never;
  trimId?: never;
  generationKey?: never;
  trimKey?: never;
};

export type CatalogVehicle = CanonicalVehicle | ModelYearVehicle;

const optionalFields = [
  "bodyType", "drivetrain", "fuelType", "mpgCity", "mpgHighway", "mpgCombined",
  "horsepower", "priceUsd", "reliabilityEstimate", "annualOwnershipEstimateUsd",
  "annualMaintenanceEstimateUsd", "annualRepairEstimateUsd", "annualFuelEstimateUsd",
  "overview", "fuelRequirement", "fuelTankCapacityGallons", "engineName", "transmissionName",
  "reliabilityLabel", "reliabilityNote", "insuranceEstimateUsd", "fiveYearDepreciationPercent",
  "expectedLifespanMiles", "recallStatus", "safetyStatus", "generation", "trim",
];
const sections = [
  "specifications", "engines", "transmissions", "reliability", "knownIssues", "commonProblems",
  "maintenance", "ownership", "ownerReports", "externalOwnerPatterns", "recalls", "safety",
  "inspectionChecklist", "siblingTrims",
];
const unresearched = {
  state: "not_yet_researched" as const,
  reason: "Only the model/year identity has been cataloged. Detailed research awaits authorization.",
  claimIds: [] as string[],
};
const sources = new Map(snapshot.sources.map(source => [source.id, source]));
const profileIds = new Set<string>();
const modelYears = new Map<number, { modelId: number }>();

if (snapshot.market !== "US" || snapshot.rights.status !== "allowed" ||
    !snapshot.rights.url || !snapshot.reviewedAt) {
  throw new Error("Model-year catalog has no reviewed source-use decision.");
}

const vehicles: ModelYearVehicle[] = snapshot.entries.map(entry => {
  const source = sources.get(entry.source);
  if (!source || !source.sha256 || source.rightsStatus !== "allowed" || !source.rightsUrl ||
      !entry.records.length || profileIds.has(entry.id) ||
      !Number.isSafeInteger(entry.modelId) || !Number.isSafeInteger(entry.modelYearId)) {
    throw new Error(`Invalid reviewed model-year identity: ${entry.id}`);
  }
  profileIds.add(entry.id);
  modelYears.set(entry.modelYearId, { modelId: entry.modelId });
  const claimId = `catalog:identity:${entry.id}`;
  const locators = entry.records.map(record =>
    "id" in record ? `vehicle ID ${record.id}: ${record.model}` :
      "line" in record ? `line ${record.line}: ${record.model}` : record.locator);
  const claim: CanonicalClaim = {
    id: claimId, contentClass: "source_fact", reviewStatus: "accepted",
    evidenceStrength: "moderate", effectiveFrom: null, effectiveTo: null,
    applicability: "applies", applicabilityVersion: "model-year-catalog-v1",
    scopeDescription: `${entry.year} ${entry.make} ${entry.model} model/year identity. ${source.limitations} No retail trim, generation, or detailed research is established.`,
    sources: [{
      sourceId: entry.source, revisionId: source.sha256,
      publisher: source.publisher,
      url: source.url, documentIdentifier: source.document,
      sourceVersion: `${source.checksumScope}; SHA-256 ${source.sha256}`,
      retrievedAt: `${snapshot.reviewedAt}T00:00:00Z`, publishedAt: null,
      locator: `Make ${entry.make}; model year ${entry.year}; publisher model grouping ${entry.model}. ${locators.join("; ")}`,
    }],
  };
  const eras = getCatalogBrowseEras(entry);
  const eraClaims = catalogBrowseEraClaims(entry);
  return {
    id: entry.id, identityLevel: "model_year", make: entry.make, makeSlug: entry.makeSlug,
    makeId: entry.makeId, makeKey: `catalog:make:${entry.makeId}`,
    model: entry.model, modelSlug: entry.modelSlug, modelId: entry.modelId,
    modelKey: `catalog:model:${entry.modelId}`, modelYearId: entry.modelYearId,
    modelYearKey: `catalog:model-year:${entry.modelYearId}`, year: entry.year,
    generation: eras.map(era => era.name).join(" / ") + (eras.length > 1 ? " (transition / overlapping year)" : ""),
    trim: "", bodyType: null, drivetrain: null, fuelType: null,
    mpgCity: null, mpgHighway: null, mpgCombined: null, horsepower: null,
    priceUsd: null, reliabilityEstimate: null, annualOwnershipEstimateUsd: null,
    annualMaintenanceEstimateUsd: null, annualRepairEstimateUsd: null, annualFuelEstimateUsd: null,
    researchRank: null, imageKey: "vehicle-placeholder", isDemo: false, profileKind: "canonical",
    fieldStates: {
      ...Object.fromEntries(optionalFields.map(field => [field, unresearched])),
      identity: { state: "known", claimIds: [claimId] },
      ...(eraClaims.length ? { generation: { state: "known" as const, claimIds: eraClaims.map(claim => claim.id),
        reason: "Broad generation/refresh candidates, not an exact build or configuration assignment." } } : {}),
    },
    sectionStates: Object.fromEntries(sections.map(section => [section, unresearched])),
    claims: [claim, ...eraClaims], commonProblems: [], maintenance: [], reliabilityClaimIds: [],
    overview: null, fuelRequirement: null, fuelTankCapacityGallons: null,
    engineName: null, transmissionName: null, reliabilityLabel: null, reliabilityNote: null,
    insuranceEstimateUsd: null, fiveYearDepreciationPercent: null, expectedLifespanMiles: null,
    recallStatus: null, safetyStatus: null, engines: [], transmissions: [], siblingTrims: [],
    inspectionChecklist: [], ownerReports: [], externalOwnerPatterns: [],
  };
});

export function catalogPreviewEnabled(environment = process.env): boolean {
  return environment.NODE_ENV === "development" && !environment.REPLIT_DEPLOYMENT;
}

export function validateModelYearSelectors(filters: CanonicalFilters): void {
  const modelId = filters.modelKey?.startsWith("catalog:model:")
    ? Number(filters.modelKey.split(":")[2]) : undefined;
  const yearId = filters.modelYearKey?.startsWith("catalog:model-year:")
    ? Number(filters.modelYearKey.split(":")[2]) : undefined;
  const year = yearId === undefined ? undefined : modelYears.get(yearId);
  if (modelId !== undefined && year && year.modelId !== modelId) {
    throw new Error("Model and model-year selectors describe different catalog identities.");
  }
  if (filters.generationKey) {
    const era = getCatalogBrowseEra(filters.generationKey);
    if (!era) throw new Error("Generation/refresh selector is not a reviewed catalog grouping.");
    const matches = vehicles.filter(vehicle => getCatalogBrowseEras(vehicle).some(candidate => candidate.id === era.id));
    if ((filters.modelKey && !matches.some(vehicle => vehicle.modelKey === filters.modelKey)) ||
        (filters.makeSlug && !matches.some(vehicle => vehicle.makeSlug === filters.makeSlug)) ||
        (filters.model && !matches.some(vehicle => vehicle.model.toLocaleLowerCase() === filters.model!.toLocaleLowerCase())) ||
        (filters.modelYearKey && !matches.some(vehicle => vehicle.modelYearKey === filters.modelYearKey)) ||
        (filters.year && !matches.some(vehicle => vehicle.year === filters.year))) {
      throw new Error("Generation/refresh selector contradicts the selected model or year.");
    }
  }
}

export function loadModelYearVehicles(filters: CanonicalFilters = {}): ModelYearVehicle[] {
  if (!catalogPreviewEnabled()) return [];
  const normalizeSearch = (text: string) => text.toLocaleLowerCase().replace(/[-‐‑–]/g, "");
  const query = filters.q?.trim() && normalizeSearch(filters.q.trim());
  return vehicles.filter(vehicle =>
    (!filters.vehicleId || vehicle.id === filters.vehicleId) &&
    (!filters.makeSlug || vehicle.makeSlug === filters.makeSlug) &&
    (!filters.model || vehicle.model.toLocaleLowerCase() === filters.model.toLocaleLowerCase()) &&
    (!filters.year || vehicle.year === filters.year) &&
    (!filters.modelKey || vehicle.modelKey === filters.modelKey) &&
    (!filters.modelYearKey || vehicle.modelYearKey === filters.modelYearKey) &&
    (!filters.generationKey || getCatalogBrowseEras(vehicle).some(era => catalogEraKey(era) === filters.generationKey)) &&
    !filters.trimKey && !filters.trim &&
    (!query || query.split(/\s+/).every(term =>
      normalizeSearch(`${vehicle.make} ${vehicle.model} ${vehicle.year}`).includes(term))),
  );
}

export function modelYearCoverage() {
  return {
    profileCount: vehicles.length, earliestYear: Math.min(...vehicles.map(v => v.year)),
    latestYear: Math.max(...vehicles.map(v => v.year)),
    completeHistoricalCatalog: false,
    scope: snapshot.identityScope,
    missingCoverage: "Pre-1978 coverage is limited to the reviewed classic supplement. Selected EPA omissions have separately reviewed NHTSA identity listings. Other unlisted vehicles and exact retail trims remain unverified. Historical guide coverage is partial. MY2027 may be preliminary.",
    brands: [...new Set(vehicles.map(v => v.make))].map(make => {
      const entries = vehicles.filter(v => v.make === make);
      return { make, profileCount: entries.length,
        firstYear: Math.min(...entries.map(v => v.year)), lastYear: Math.max(...entries.map(v => v.year)) };
    }),
  };
}
