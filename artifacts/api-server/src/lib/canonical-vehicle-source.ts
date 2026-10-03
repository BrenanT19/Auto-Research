import { and, asc, eq, inArray, or } from "drizzle-orm";
import {
  isCurrentClaim,
  validateCanonicalManifest,
  type CanonicalManifestEntry,
} from "./canonical-policy";
export type { CanonicalManifestEntry } from "./canonical-policy";
import {
  applicabilityAlternativesTable,
  applicabilitySetsTable,
  claimEvidenceTable,
  claimReviewsTable,
  claimSubjectsTable,
  consumerBrandsTable,
  configurationComponentFitmentsTable,
  db,
  evidenceItemsTable,
  marketsTable,
  organizationsTable,
  researchClaimsTable,
  researchSourcesTable,
  sourceRevisionsTable,
  specClaimValuesTable,
  specFieldDefinitionsTable,
  vehicleConfigurationsTable,
  vehicleGenerationsTable,
  vehicleModelYearsTable,
  vehicleModelsTable,
  vehicleProfileAliasesTable,
  vehicleTrimsTable,
  powertrainComponentRevisionsTable,
  powertrainComponentsTable,
  ownershipEstimateDetailsTable,
  recallCampaignDetailsTable,
  safetyRatingDetailsTable,
  externalOwnerPatternDetailsTable,
  trimsTable,
  evaluateApplicability,
  type ApplicabilityAlternative,
  type ExternalOwnerPatternDetails,
  knownIssueDetailsTable,
  maintenanceScheduleDetailsTable,
  reliabilityAssessmentDetailsTable,
} from "@workspace/db";
import {
  projectExternalOwnerPattern,
  type ExternalOwnerPatternProfile,
} from "./canonical-external-owner-pattern";

// Production canonical publication is deliberately opt-in by code review, not env configuration.
export const CANONICAL_RELEASE_MANIFEST: readonly CanonicalManifestEntry[] = [];

export type CanonicalClaimSource = {
  sourceId: string;
  revisionId: string;
  publisher: string | null;
  url: string | null;
  documentIdentifier: string | null;
  sourceVersion: string | null;
  publishedAt: string | null;
  retrievedAt: string;
  locator: string;
  measurementBasis?: string | null;
  unit?: string | null;
};

export type CanonicalClaim = {
  id: string;
  contentClass: string;
  reviewStatus: string;
  evidenceStrength: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  applicability: "applies" | "does_not_apply" | "unknown";
  applicabilityVersion: string;
  scopeDescription: string;
  sources: CanonicalClaimSource[];
  fieldCode?: string;
  value?: string | number | boolean | null;
  valueState?: "known" | "unknown" | "not_applicable";
  measurementBasis?: string | null;
  unit?: string | null;
  claimKind?: string;
};

export type CanonicalExternalOwnerPattern = ExternalOwnerPatternProfile & {
  sources: CanonicalClaimSource[];
};

export type CanonicalVehicle = {
  id: string;
  make: string;
  makeSlug: string;
  makeKey: string;
  makeId: number;
  modelId: number;
  generationId: number;
  modelYearId: number;
  trimId: number;
  modelKey: string;
  generationKey: string;
  modelYearKey: string;
  trimKey: string;
  model: string;
  modelSlug: string;
  year: number;
  generation: string;
  trim: string;
  bodyType: string | null;
  drivetrain: string | null;
  fuelType: string | null;
  mpgCity: number | null;
  mpgHighway: number | null;
  mpgCombined: number | null;
  horsepower: number | null;
  priceUsd: number | null;
  reliabilityEstimate: number | null;
  annualOwnershipEstimateUsd: number | null;
  annualMaintenanceEstimateUsd: number | null;
  annualRepairEstimateUsd: number | null;
  annualFuelEstimateUsd: number | null;
  researchRank: number | null;
  imageKey: string;
  isDemo: false;
  profileKind: "canonical";
  canonicalConfigurationId: number;
  fieldStates: Record<string, { state: "known" | "unknown" | "not_yet_researched" | "not_applicable"; reason?: string | null; claimIds: string[] }>;
  sectionStates: Record<string, { state: "known" | "unknown" | "not_yet_researched" | "not_applicable"; reason?: string | null; claimIds: string[] }>;
  claims: CanonicalClaim[];
  commonProblems: Array<Record<string, unknown>>;
  maintenance: Array<Record<string, unknown>>;
  reliabilityClaimIds: string[];
  overview: string | null;
  engineName: string | null;
  transmissionName: string | null;
  reliabilityLabel: string | null;
  reliabilityNote: string | null;
  insuranceEstimateUsd: number | null;
  fiveYearDepreciationPercent: number | null;
  expectedLifespanMiles: number | null;
  recallStatus: string | null;
  safetyStatus: string | null;
  engines: Array<Record<string, unknown>>;
  transmissions: Array<Record<string, unknown>>;
  siblingTrims: string[];
  inspectionChecklist: string[];
  ownerReports: Array<Record<string, unknown>>;
  externalOwnerPatterns: CanonicalExternalOwnerPattern[];
};

export type CanonicalFilters = {
  q?: string;
  makeSlug?: string;
  model?: string;
  modelId?: number;
  generationId?: number;
  year?: number;
  trim?: string;
  trimId?: number;
  modelKey?: string;
  generationKey?: string;
  modelYearKey?: string;
  trimKey?: string;
  vehicleId?: string;
};

const CANDIDATE_MANIFEST: readonly CanonicalManifestEntry[] = CANONICAL_RELEASE_MANIFEST;
const APPLICABILITY_VERSION = "stage2a-v1";
const FIELD_TO_OUTPUT: Record<string, keyof CanonicalVehicle> = {
  body_type: "bodyType",
  drivetrain: "drivetrain",
  fuel_type: "fuelType",
  mpg_city: "mpgCity",
  mpg_highway: "mpgHighway",
  mpg_combined: "mpgCombined",
  horsepower: "horsepower",
  price_usd: "priceUsd",
  overview: "overview",
  engine_name: "engineName",
  transmission_name: "transmissionName",
  reliability_score: "reliabilityEstimate",
  reliability_label: "reliabilityLabel",
  reliability_note: "reliabilityNote",
  annual_ownership_estimate_usd: "annualOwnershipEstimateUsd",
  annual_maintenance_estimate_usd: "annualMaintenanceEstimateUsd",
  annual_repair_estimate_usd: "annualRepairEstimateUsd",
  annual_fuel_estimate_usd: "annualFuelEstimateUsd",
  insurance_estimate_usd: "insuranceEstimateUsd",
  five_year_depreciation_percent: "fiveYearDepreciationPercent",
  expected_lifespan_miles: "expectedLifespanMiles",
};

function numericValue(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const FIELD_VALUE_CONTRACT: Record<string, { valueType: "numeric" | "text" | "boolean"; unit: string | null }> = {
  body_type: { valueType: "text", unit: null },
  drivetrain: { valueType: "text", unit: null },
  fuel_type: { valueType: "text", unit: null },
  mpg_city: { valueType: "numeric", unit: "mpg" },
  mpg_highway: { valueType: "numeric", unit: "mpg" },
  mpg_combined: { valueType: "numeric", unit: "mpg" },
  horsepower: { valueType: "numeric", unit: "hp" },
  price_usd: { valueType: "numeric", unit: "USD" },
  overview: { valueType: "text", unit: null },
  engine_name: { valueType: "text", unit: null },
  transmission_name: { valueType: "text", unit: null },
  reliability_score: { valueType: "numeric", unit: "score" },
  reliability_label: { valueType: "text", unit: null },
  reliability_note: { valueType: "text", unit: null },
  annual_ownership_estimate_usd: { valueType: "numeric", unit: "USD/year" },
  annual_maintenance_estimate_usd: { valueType: "numeric", unit: "USD/year" },
  annual_repair_estimate_usd: { valueType: "numeric", unit: "USD/year" },
  annual_fuel_estimate_usd: { valueType: "numeric", unit: "USD/year" },
  insurance_estimate_usd: { valueType: "numeric", unit: "USD/year" },
  five_year_depreciation_percent: { valueType: "numeric", unit: "%" },
  expected_lifespan_miles: { valueType: "numeric", unit: "mile" },
};

function classAllowsField(claim: { claimKind: string; contentClass: string }, code: string): boolean {
  const detailFields = new Set([
    "annual_ownership_estimate_usd", "annual_maintenance_estimate_usd",
    "annual_repair_estimate_usd", "annual_fuel_estimate_usd",
    "insurance_estimate_usd", "five_year_depreciation_percent",
    "expected_lifespan_miles",
  ]);
  if (detailFields.has(code)) {
    return (claim.claimKind === "ownership_estimate" || claim.claimKind === "calculation") &&
      (claim.contentClass === "estimate" || claim.contentClass === "calculation");
  }
  if (code === "overview" || code === "reliability_note") {
    return claim.claimKind === "editorial" && claim.contentClass === "editorial_synthesis";
  }
  if (code === "reliability_score" || code === "reliability_label") {
    return claim.claimKind === "reliability" &&
      (claim.contentClass === "source_fact" || claim.contentClass === "estimate");
  }
  if (code === "engine_name" || code === "transmission_name") {
    return claim.contentClass === "source_fact" &&
      (claim.claimKind === "fitment" || claim.claimKind === "specification");
  }
  return claim.contentClass === "source_fact" && claim.claimKind === "specification";
}

function specValue(spec: {
  valueState: string;
  valueType: string;
  numericValue: string | null;
  textValue: string | null;
  booleanValue: boolean | null;
}): string | number | boolean | null {
  if (spec.valueState !== "known") return null;
  if (spec.valueType === "numeric") return numericValue(spec.numericValue);
  if (spec.valueType === "text") return spec.textValue;
  return spec.booleanValue;
}

function isValidSpec(spec: {
  fieldCode: string;
  valueType: string;
  unit: string | null;
  normalizedUnit: string | null;
  originalSourceUnit: string | null;
  valueState: string;
}): boolean {
  const expected = FIELD_VALUE_CONTRACT[spec.fieldCode];
  if (!expected || spec.valueType !== expected.valueType) return false;
  const actualUnit = spec.unit?.trim().toLowerCase() ?? null;
  const expectedUnit = expected.unit?.trim().toLowerCase() ?? null;
  // Deliberately do not coerce equivalent-looking units: e.g. MPGe is not mpg.
  if (actualUnit !== expectedUnit) return false;
  const normalizedUnit = spec.normalizedUnit?.trim().toLowerCase() ?? null;
  const sourceUnit = spec.originalSourceUnit?.trim().toLowerCase() ?? null;
  if (expected.unit !== null && spec.valueState === "known" &&
      normalizedUnit !== expectedUnit) return false;
  if (expectedUnit === "mpg" &&
      [normalizedUnit, sourceUnit].some((unit) => unit === "mpge" || unit === "mpg-e")) return false;
  return true;
}

function subjectAllowed(
  subjectType: string,
  subject: (typeof claimSubjectsTable)["$inferSelect"],
): boolean {
  const matchingSubject: Record<string, number | null> = {
    organization: subject.organizationId,
    consumer_brand: subject.consumerBrandId,
    vehicle_model: subject.vehicleModelId,
    vehicle_generation: subject.vehicleGenerationId,
    vehicle_model_year: subject.vehicleModelYearId,
    vehicle_trim: subject.vehicleTrimId,
    vehicle_configuration: subject.vehicleConfigurationId,
    component_revision: subject.componentRevisionId,
    market: subject.marketId,
    production_site: subject.productionSiteId,
  };
  return matchingSubject[subjectType] !== undefined && matchingSubject[subjectType] !== null;
}

function dateString(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function scopeText(set: { scopeState: string }, alternatives: Array<{ scopeCompleteness: string }>): string {
  if (set.scopeState === "explicit_unrestricted") return "Explicitly unrestricted scope";
  if (set.scopeState !== "restricted") return "Scope not established";
  return alternatives.length ? "Restricted scope evaluated against this configuration" : "Restricted scope has no alternatives";
}

type ResearchStateValue = "known" | "unknown" | "not_yet_researched" | "not_applicable";
type ResearchStateMap = Record<string, { state: ResearchStateValue; reason?: string | null; claimIds: string[] }>;
const FIELD_STATE_CODES = [
  "bodyType", "drivetrain", "fuelType", "mpgCity", "mpgHighway", "mpgCombined",
  "horsepower", "priceUsd", "reliabilityEstimate", "annualOwnershipEstimateUsd",
  "annualMaintenanceEstimateUsd", "annualRepairEstimateUsd", "annualFuelEstimateUsd",
  "overview", "engineName", "transmissionName", "reliabilityLabel", "reliabilityNote",
  "insuranceEstimateUsd", "fiveYearDepreciationPercent", "expectedLifespanMiles",
  "recallStatus", "safetyStatus",
];
const SECTION_STATE_CODES = [
  "engines", "transmissions", "siblingTrims", "commonProblems", "maintenance",
  "ownerReports", "recalls", "safety", "inspectionChecklist", "externalOwnerPatterns",
];
const NOT_RESEARCHED_REASON = "No eligible reviewed research is available.";

function makeStates(codes: readonly string[]): ResearchStateMap {
  return Object.fromEntries(codes.map((code) => [code, {
    state: "not_yet_researched",
    reason: NOT_RESEARCHED_REASON,
    claimIds: [],
  }]));
}

/**
 * Reads only the canonical identity hierarchy. No legacy demo trim or ownership
 * estimate table participates in this projection.
 */
export async function loadCanonicalVehicles(
  filters: CanonicalFilters = {},
  manifest: readonly CanonicalManifestEntry[] = CANDIDATE_MANIFEST,
): Promise<CanonicalVehicle[]> {
  validateCanonicalManifest(manifest);
  if (!manifest.length) return [];
  const configIds = manifest.map(({ configurationId }) => configurationId);

  const hierarchy = await db
    .select({
      configurationId: vehicleConfigurationsTable.id,
      configurationStatus: vehicleConfigurationsTable.identityStatus,
      configurationDemo: vehicleConfigurationsTable.isDemo,
      displayLabel: vehicleConfigurationsTable.displayLabel,
      alias: vehicleProfileAliasesTable.slug,
      aliasKind: vehicleProfileAliasesTable.aliasKind,
      aliasStatus: vehicleProfileAliasesTable.mappingStatus,
      legacyTrimId: vehicleProfileAliasesTable.legacyTrimId,
      brandId: consumerBrandsTable.id,
      make: consumerBrandsTable.canonicalName,
      makeSlug: consumerBrandsTable.slug,
      modelId: vehicleModelsTable.id,
      model: vehicleModelsTable.name,
      modelSlug: vehicleModelsTable.slug,
      generationId: vehicleGenerationsTable.id,
      generation: vehicleGenerationsTable.name,
      modelYearId: vehicleModelYearsTable.id,
      year: vehicleModelYearsTable.modelYear,
      yearStatus: vehicleModelYearsTable.identityStatus,
      marketId: vehicleModelYearsTable.marketId,
      marketType: marketsTable.marketType,
      trimId: vehicleTrimsTable.id,
      trim: vehicleTrimsTable.salesName,
    })
    .from(vehicleConfigurationsTable)
    .innerJoin(vehicleTrimsTable, eq(vehicleConfigurationsTable.vehicleTrimId, vehicleTrimsTable.id))
    .innerJoin(vehicleModelYearsTable, eq(vehicleTrimsTable.vehicleModelYearId, vehicleModelYearsTable.id))
    .innerJoin(vehicleGenerationsTable, eq(vehicleModelYearsTable.vehicleGenerationId, vehicleGenerationsTable.id))
    .innerJoin(vehicleModelsTable, eq(vehicleGenerationsTable.vehicleModelId, vehicleModelsTable.id))
    .innerJoin(consumerBrandsTable, eq(vehicleModelsTable.consumerBrandId, consumerBrandsTable.id))
    .innerJoin(marketsTable, eq(vehicleModelYearsTable.marketId, marketsTable.id))
    .innerJoin(vehicleProfileAliasesTable, and(
      eq(vehicleProfileAliasesTable.vehicleConfigurationId, vehicleConfigurationsTable.id),
      eq(vehicleProfileAliasesTable.aliasKind, "canonical_profile"),
      eq(vehicleProfileAliasesTable.mappingStatus, "exact_supported"),
    ))
    .where(inArray(vehicleConfigurationsTable.id, configIds))
    .orderBy(asc(vehicleProfileAliasesTable.slug), asc(vehicleConfigurationsTable.id));

  const manifestByConfig = new Map(manifest.map((entry) => [entry.configurationId, entry]));
  const eligible = hierarchy.filter((row) =>
    manifestByConfig.has(row.configurationId) &&
    row.configurationStatus === "supported" && !row.configurationDemo &&
    row.yearStatus === "supported" && row.marketId !== null &&
    row.aliasKind === "canonical_profile" && row.aliasStatus === "exact_supported" &&
    row.legacyTrimId === null &&
    manifestByConfig.get(row.configurationId)?.identityClaimId,
  );
  if (!eligible.length) return [];

  const [legacyTrims, legacyAliases] = await Promise.all([
    db.select({ slug: trimsTable.slug }).from(trimsTable),
    db.select({ slug: vehicleProfileAliasesTable.slug, legacyTrimId: vehicleProfileAliasesTable.legacyTrimId })
      .from(vehicleProfileAliasesTable),
  ]);
  const protectedLegacySlugs = new Set([
    ...legacyTrims.map(({ slug }) => slug),
    ...legacyAliases.filter(({ legacyTrimId }) => legacyTrimId !== null).map(({ slug }) => slug),
  ]);
  const preferredByConfiguration = new Map<number, (typeof eligible)[number]>();
  for (const row of eligible) {
    if (protectedLegacySlugs.has(row.alias)) continue;
    if (!preferredByConfiguration.has(row.configurationId)) {
      preferredByConfiguration.set(row.configurationId, row);
    }
  }
  const deduplicated = [...preferredByConfiguration.values()];
  let aliasConfigurationId: number | undefined;
  if (filters.vehicleId) {
    const [alias] = await db.select({
      configurationId: vehicleProfileAliasesTable.vehicleConfigurationId,
      aliasKind: vehicleProfileAliasesTable.aliasKind,
      mappingStatus: vehicleProfileAliasesTable.mappingStatus,
      legacyTrimId: vehicleProfileAliasesTable.legacyTrimId,
    }).from(vehicleProfileAliasesTable)
      .where(eq(vehicleProfileAliasesTable.slug, filters.vehicleId))
      .limit(1);
    if (alias?.aliasKind === "canonical_profile" && alias.mappingStatus === "exact_supported" &&
        alias.legacyTrimId === null && alias.configurationId !== null &&
        manifestByConfig.has(alias.configurationId) && deduplicated.some((row) => row.configurationId === alias.configurationId)) {
      aliasConfigurationId = alias.configurationId;
    }
  }

  let rows = deduplicated.filter((row) =>
    (!filters.makeSlug || row.makeSlug === filters.makeSlug) &&
    (!filters.model || row.model.toLowerCase().includes(filters.model.toLowerCase())) &&
    (!filters.year || row.year === filters.year) &&
    (!filters.trim || row.trim.toLowerCase().includes(filters.trim.toLowerCase())) &&
    (!filters.modelYearKey || filters.modelYearKey === `canonical:model-year:${row.modelYearId}`) &&
    (!filters.modelKey || filters.modelKey === `canonical:model:${row.modelId}`) &&
    (!filters.generationKey || filters.generationKey === `canonical:generation:${row.generationId}`) &&
    (!filters.trimKey || filters.trimKey === `canonical:trim:${row.trimId}`) &&
    (!filters.q || filters.q.trim().split(/\s+/).every((token) =>
      [row.make, row.model, row.generation, row.trim, String(row.year)].join(" ").toLowerCase().includes(token.toLowerCase()),
    )),
  );
  if (filters.modelKey || filters.generationKey || filters.modelYearKey || filters.trimKey) {
    rows = rows.filter((row) =>
      (!filters.modelKey || filters.modelKey === `canonical:model:${row.modelId}`) &&
      (!filters.generationKey || filters.generationKey === `canonical:generation:${row.generationId}`) &&
      (!filters.modelYearKey || filters.modelYearKey === `canonical:model-year:${row.modelYearId}`) &&
      (!filters.trimKey || filters.trimKey === `canonical:trim:${row.trimId}`),
    );
  }
  if (!rows.length) return [];

  const fitments = await db.select({
    configurationId: configurationComponentFitmentsTable.vehicleConfigurationId,
    componentRevisionId: configurationComponentFitmentsTable.componentRevisionId,
    role: configurationComponentFitmentsTable.role,
    positionCode: configurationComponentFitmentsTable.positionCode,
    fitmentStatus: configurationComponentFitmentsTable.fitmentStatus,
    supportingClaimId: configurationComponentFitmentsTable.supportingClaimId,
    revisionKey: powertrainComponentRevisionsTable.revisionKey,
    componentType: powertrainComponentsTable.componentType,
  }).from(configurationComponentFitmentsTable)
    .innerJoin(powertrainComponentRevisionsTable, eq(
      configurationComponentFitmentsTable.componentRevisionId,
      powertrainComponentRevisionsTable.id,
    ))
    .innerJoin(powertrainComponentsTable, eq(
      powertrainComponentRevisionsTable.componentId,
      powertrainComponentsTable.id,
    ))
    .where(inArray(configurationComponentFitmentsTable.vehicleConfigurationId, rows.map((row) => row.configurationId)));
  const componentRevisionIds = [...new Set(fitments.map((fitment) => fitment.componentRevisionId))];

  const claims = await db.select({
    id: researchClaimsTable.id,
    claimKind: researchClaimsTable.claimKind,
    contentClass: researchClaimsTable.contentClass,
    researchStatus: researchClaimsTable.researchStatus,
    reviewStatus: researchClaimsTable.reviewStatus,
    evidenceStrength: researchClaimsTable.evidenceStrength,
    effectiveFrom: researchClaimsTable.effectiveFrom,
    effectiveTo: researchClaimsTable.effectiveTo,
    supersedesClaimId: researchClaimsTable.supersedesClaimId,
    subject: claimSubjectsTable,
  }).from(researchClaimsTable)
    .innerJoin(claimSubjectsTable, eq(claimSubjectsTable.researchClaimId, researchClaimsTable.id))
    .where(or(
      inArray(claimSubjectsTable.vehicleConfigurationId, rows.map((row) => row.configurationId)),
      inArray(claimSubjectsTable.vehicleModelId, rows.map((row) => row.modelId)),
      inArray(claimSubjectsTable.vehicleGenerationId, rows.map((row) => row.generationId)),
      inArray(claimSubjectsTable.vehicleModelYearId, rows.map((row) => row.modelYearId)),
      inArray(claimSubjectsTable.vehicleTrimId, rows.map((row) => row.trimId)),
      inArray(claimSubjectsTable.componentRevisionId, componentRevisionIds),
    ));
  const claimIds = [...new Set(claims.map((claim) => claim.id))];
  const [reviews, evidences, specs, applicabilitySets] = await Promise.all([
    db.select().from(claimReviewsTable).where(inArray(claimReviewsTable.researchClaimId, claimIds)).orderBy(asc(claimReviewsTable.reviewedAt), asc(claimReviewsTable.id)),
    db.select({
      claimId: claimEvidenceTable.researchClaimId,
      relation: claimEvidenceTable.evidenceRelation,
      evidenceId: evidenceItemsTable.id,
      excerpt: evidenceItemsTable.excerpt,
      locator: evidenceItemsTable.locator,
      sourceId: researchSourcesTable.id,
      revisionId: sourceRevisionsTable.id,
      publisher: organizationsTable.legalName,
      sourceKind: researchSourcesTable.sourceKind,
      url: researchSourcesTable.canonicalUrl,
      documentIdentifier: sourceRevisionsTable.documentIdentifier,
      sourceVersion: sourceRevisionsTable.sourceVersion,
      publishedAt: sourceRevisionsTable.publishedAt,
      retrievedAt: sourceRevisionsTable.retrievedAt,
      storageRightsStatus: sourceRevisionsTable.storageRightsStatus,
      derivativeUseRightsStatus: sourceRevisionsTable.derivativeUseRightsStatus,
      displayRightsStatus: sourceRevisionsTable.displayRightsStatus,
      termsReviewedAt: sourceRevisionsTable.termsReviewedAt,
      termsVersion: sourceRevisionsTable.termsVersion,
    }).from(claimEvidenceTable)
      .innerJoin(evidenceItemsTable, eq(claimEvidenceTable.evidenceItemId, evidenceItemsTable.id))
      .innerJoin(sourceRevisionsTable, eq(evidenceItemsTable.sourceRevisionId, sourceRevisionsTable.id))
      .innerJoin(researchSourcesTable, eq(sourceRevisionsTable.researchSourceId, researchSourcesTable.id))
      .leftJoin(organizationsTable, eq(organizationsTable.id, researchSourcesTable.publisherOrganizationId))
      .where(inArray(claimEvidenceTable.researchClaimId, claimIds)),
    db.select({
      claimId: specClaimValuesTable.researchClaimId,
      fieldCode: specClaimValuesTable.fieldCode,
      valueType: specClaimValuesTable.valueType,
      valueState: specClaimValuesTable.valueState,
      numericValue: specClaimValuesTable.numericValue,
      textValue: specClaimValuesTable.textValue,
      booleanValue: specClaimValuesTable.booleanValue,
      normalizedUnit: specClaimValuesTable.normalizedUnit,
      originalSourceUnit: specClaimValuesTable.originalSourceUnit,
      measurementBasis: specClaimValuesTable.measurementBasis,
      unit: specFieldDefinitionsTable.canonicalUnit,
      allowedSubjectType: specFieldDefinitionsTable.allowedSubjectType,
    }).from(specClaimValuesTable)
      .innerJoin(specFieldDefinitionsTable, and(
        eq(specClaimValuesTable.fieldCode, specFieldDefinitionsTable.code),
        eq(specClaimValuesTable.valueType, specFieldDefinitionsTable.valueType),
      ))
      .where(inArray(specClaimValuesTable.researchClaimId, claimIds)),
    db.select().from(applicabilitySetsTable).where(inArray(applicabilitySetsTable.researchClaimId, claimIds)),
  ]);
  const supersedingClaims = claimIds.length
    ? await db.select({ supersedesClaimId: researchClaimsTable.supersedesClaimId })
      .from(researchClaimsTable)
      .where(inArray(researchClaimsTable.supersedesClaimId, claimIds))
    : [];
  const [
    issueDetails,
    maintenanceDetails,
    reliabilityDetails,
    estimateDetails,
    recallDetails,
    safetyDetails,
    externalOwnerPatternDetails,
  ] = claimIds.length
    ? await Promise.all([
        db.select().from(knownIssueDetailsTable).where(inArray(knownIssueDetailsTable.researchClaimId, claimIds)),
        db.select().from(maintenanceScheduleDetailsTable).where(inArray(maintenanceScheduleDetailsTable.researchClaimId, claimIds)),
        db.select().from(reliabilityAssessmentDetailsTable).where(inArray(reliabilityAssessmentDetailsTable.researchClaimId, claimIds)),
        db.select().from(ownershipEstimateDetailsTable).where(inArray(ownershipEstimateDetailsTable.researchClaimId, claimIds)),
        db.select().from(recallCampaignDetailsTable).where(inArray(recallCampaignDetailsTable.researchClaimId, claimIds)),
        db.select().from(safetyRatingDetailsTable).where(inArray(safetyRatingDetailsTable.researchClaimId, claimIds)),
        db.select().from(externalOwnerPatternDetailsTable).where(inArray(externalOwnerPatternDetailsTable.researchClaimId, claimIds)),
      ])
    : [[], [], [], [], [], [], []];
  const alternatives = applicabilitySets.length
    ? await db.select().from(applicabilityAlternativesTable)
      .where(inArray(applicabilityAlternativesTable.applicabilitySetId, applicabilitySets.map((set) => set.id)))
    : [];

  const latestReview = new Map<number, string>();
  for (const review of reviews) latestReview.set(review.researchClaimId, review.decision);
  const evidenceByClaim = new Map<number, typeof evidences>();
  for (const evidence of evidences) {
    const matches = evidenceByClaim.get(evidence.claimId) ?? [];
    matches.push(evidence);
    evidenceByClaim.set(evidence.claimId, matches);
  }
  const specsByClaim = new Map(specs.map((spec) => [spec.claimId, spec]));
  const issuesByClaim = new Map(issueDetails.map((detail) => [detail.researchClaimId, detail]));
  const maintenanceByClaim = new Map(maintenanceDetails.map((detail) => [detail.researchClaimId, detail]));
  const reliabilityByClaim = new Map(reliabilityDetails.map((detail) => [detail.researchClaimId, detail]));
  const estimatesByClaim = new Map(estimateDetails.map((detail) => [detail.researchClaimId, detail]));
  const recallsByClaim = new Map(recallDetails.map((detail) => [detail.researchClaimId, detail]));
  const safetyByClaim = new Map(safetyDetails.map((detail) => [detail.researchClaimId, detail]));
  const externalOwnerPatternsByClaim = new Map<number, ExternalOwnerPatternDetails>(
    externalOwnerPatternDetails.map((detail) => [detail.researchClaimId, detail]),
  );
  const isDisplayableEvidence = (item: (typeof evidences)[number]) =>
    item.relation !== "contradicts" &&
    ["government", "oem_document", "standards_body", "peer_reviewed_research", "insurer", "survey", "internal_calculation", "other_reviewed", "owner_forum"].includes(item.sourceKind) &&
    item.storageRightsStatus === "allowed" &&
    item.derivativeUseRightsStatus === "allowed" &&
    item.displayRightsStatus === "allowed" &&
    item.termsReviewedAt !== null &&
    item.termsVersion !== null;
  const setByClaim = new Map(applicabilitySets.map((set) => [set.researchClaimId, set]));
  const alternativesBySet = new Map<number, typeof alternatives>();
  for (const alternative of alternatives) {
    const matches = alternativesBySet.get(alternative.applicabilitySetId) ?? [];
    matches.push(alternative);
    alternativesBySet.set(alternative.applicabilitySetId, matches);
  }
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));
  const projectedClaim = new Map<number, CanonicalClaim>();
  const supersededClaims = new Set(supersedingClaims.flatMap(({ supersedesClaimId }) =>
    supersedesClaimId === null ? [] : [supersedesClaimId],
  ));
  for (const claim of claims) {
    const claimEvidence = evidenceByClaim.get(claim.id) ?? [];
    const participatingEvidence = claimEvidence.filter((item) =>
      item.relation === "supports" || item.relation === "qualifies" || item.relation === "derived_from",
    );
    const evidence = claimEvidence.filter(isDisplayableEvidence);
    const hasConflict = claimEvidence.some((item) => item.relation === "contradicts");
    const hasSupportingEvidence = evidence.some((item) => item.relation === "supports" || item.relation === "derived_from");
    const effectiveClaim = claim;
    const allParticipatingEvidenceAllowed = participatingEvidence.length > 0 &&
      participatingEvidence.every((item) => evidence.includes(item));
    if (claim.reviewStatus !== "accepted" || latestReview.get(claim.id) !== "accepted" ||
        !isCurrentClaim(effectiveClaim) || supersededClaims.has(claim.id) ||
        hasConflict || !hasSupportingEvidence || !allParticipatingEvidenceAllowed ||
        (evidence.some((item) => item.sourceKind === "owner_forum") &&
          claim.contentClass !== "external_owner_pattern")) continue;
    const appSet = setByClaim.get(claim.id);
    const appAlternatives = appSet ? alternativesBySet.get(appSet.id) ?? [] : [];
    const spec = specsByClaim.get(claim.id);
    projectedClaim.set(claim.id, {
      id: String(claim.id),
      contentClass: claim.contentClass,
      reviewStatus: effectiveClaim.reviewStatus,
      evidenceStrength: claim.evidenceStrength,
      effectiveFrom: claim.effectiveFrom,
      effectiveTo: claim.effectiveTo,
      applicability: "unknown",
      applicabilityVersion: APPLICABILITY_VERSION,
      scopeDescription: appSet ? scopeText(appSet, appAlternatives) : "No reviewed applicability scope",
      sources: evidence.map((item) => ({
        sourceId: String(item.sourceId),
        revisionId: String(item.revisionId),
        publisher: item.publisher,
        url: item.url,
        documentIdentifier: item.documentIdentifier,
        sourceVersion: item.sourceVersion,
        publishedAt: dateString(item.publishedAt),
        retrievedAt: item.retrievedAt.toISOString(),
        locator: item.locator,
        measurementBasis: spec?.measurementBasis ?? null,
        unit: spec?.unit ?? null,
      })),
      ...(spec ? {
        fieldCode: spec.fieldCode,
        claimKind: claim.claimKind,
        valueState: isValidSpec(spec) && subjectAllowed(spec.allowedSubjectType, claim.subject) &&
          classAllowsField(claim, spec.fieldCode)
          ? spec.valueState as "known" | "unknown" | "not_applicable"
          : "unknown",
        value: isValidSpec(spec) && subjectAllowed(spec.allowedSubjectType, claim.subject) &&
          classAllowsField(claim, spec.fieldCode)
          ? specValue(spec)
          : null,
        measurementBasis: spec.measurementBasis,
        unit: spec.unit,
      } : {}),
    });
  }

  const evaluateForCandidate = (
    claimId: number,
    row: (typeof rows)[number],
    componentRevisionId?: number,
  ): CanonicalClaim | undefined => {
    const base = projectedClaim.get(claimId);
    const claim = claimsById.get(claimId);
    if (!base || !claim) return undefined;
    const appSet = setByClaim.get(claimId);
    if (!appSet || !appSet.reviewedAt) return { ...base, applicability: "unknown" };
    const appAlternatives = alternativesBySet.get(appSet.id) ?? [];
    const applicability = evaluateApplicability({
      scopeState: appSet.scopeState as "restricted" | "explicit_unrestricted" | "unknown",
      researchStatus: claim.researchStatus as "not_researched" | "researching" | "researched" | "blocked",
      reviewStatus: base.reviewStatus as "not_reviewed" | "in_review" | "accepted" | "rejected" | "stale" | "superseded",
      contentClass: claim.contentClass,
      hasSupportingEvidence: base.sources.length > 0,
      hasConflictingEvidence: false,
      alternatives: appAlternatives.map((item): ApplicabilityAlternative => ({
        completeness: item.scopeCompleteness as "complete" | "partial" | "unknown",
        predicates: {
          ...(item.marketId == null ? {} : { marketId: item.marketId }),
          ...(item.vehicleModelId == null ? {} : { vehicleModelId: item.vehicleModelId }),
          ...(item.vehicleGenerationId == null ? {} : { vehicleGenerationId: item.vehicleGenerationId }),
          ...(item.vehicleModelYearId == null ? {} : { vehicleModelYearId: item.vehicleModelYearId }),
          ...(item.vehicleTrimId == null ? {} : { vehicleTrimId: item.vehicleTrimId }),
          ...(item.vehicleConfigurationId == null ? {} : { vehicleConfigurationId: item.vehicleConfigurationId }),
          ...(item.componentRevisionId == null ? {} : { componentRevisionId: item.componentRevisionId }),
          ...(item.packageCode == null ? {} : { packageCode: item.packageCode }),
        },
        ...(item.buildDateFrom ? { buildDateFrom: item.buildDateFrom } : {}),
        ...(item.buildDateTo ? { buildDateTo: item.buildDateTo } : {}),
      })),
      candidate: {
        marketId: row.marketId!,
        vehicleModelId: row.modelId,
        vehicleGenerationId: row.generationId,
        vehicleModelYearId: row.modelYearId,
        vehicleTrimId: row.trimId,
        vehicleConfigurationId: row.configurationId,
        ...(componentRevisionId === undefined ? {} : { componentRevisionId }),
      },
    });
    return { ...base, applicability };
  };

  const projectedVehicles = rows.flatMap((row) => {
    const manifestEntry = manifestByConfig.get(row.configurationId)!;
    const identityClaim = evaluateForCandidate(manifestEntry.identityClaimId, row);
    const identityRow = claimsById.get(manifestEntry.identityClaimId);
    // Release requires the named identity claim to be accepted, source-backed, applicable, and scoped to this exact config.
    const identitySubjectMatches = identityRow?.subject.vehicleConfigurationId === row.configurationId;
    if (!identityClaim || identityClaim.applicability !== "applies" || !identitySubjectMatches ||
        identityRow?.claimKind !== "identity" || identityRow.contentClass !== "source_fact") return [];
    const relevant = claims.flatMap((claim) => {
      const matchingFitment = fitments.find((fitment) =>
        fitment.configurationId === row.configurationId &&
        fitment.componentRevisionId === claim.subject.componentRevisionId,
      );
      if (claim.subject.vehicleConfigurationId !== row.configurationId &&
          claim.subject.vehicleTrimId !== row.trimId &&
          claim.subject.vehicleModelYearId !== row.modelYearId &&
          claim.subject.vehicleGenerationId !== row.generationId &&
          claim.subject.vehicleModelId !== row.modelId &&
          !matchingFitment) return [];
      const projected = evaluateForCandidate(claim.id, row, matchingFitment?.componentRevisionId);
      return projected ? [projected] : [];
    });
    const fieldStates = makeStates(FIELD_STATE_CODES);
    const sectionStates = makeStates(SECTION_STATE_CODES);
    fieldStates.identity = { state: "known", claimIds: [identityClaim.id] };
    const output: Record<string, unknown> = {};
    const attemptedClaims = claims.filter((claim) => {
      const matchingFitment = fitments.some((fitment) =>
        fitment.configurationId === row.configurationId &&
        fitment.componentRevisionId === claim.subject.componentRevisionId,
      );
      return claim.subject.vehicleConfigurationId === row.configurationId ||
        claim.subject.vehicleTrimId === row.trimId ||
        claim.subject.vehicleModelYearId === row.modelYearId ||
        claim.subject.vehicleGenerationId === row.generationId ||
        claim.subject.vehicleModelId === row.modelId ||
        matchingFitment;
    });
    const attemptedSpecClaims = specs.filter((spec) =>
      attemptedClaims.some((claim) => claim.id === spec.claimId) &&
      FIELD_TO_OUTPUT[spec.fieldCode] !== undefined &&
      attemptedClaims.some((claim) => claim.id === spec.claimId &&
        subjectAllowed(spec.allowedSubjectType, claim.subject)),
    );
    const fieldCodes = new Set([
      ...relevant.map((claim) => claim.fieldCode),
      ...attemptedSpecClaims.map((spec) => spec.fieldCode),
    ].filter((code): code is string => Boolean(code && FIELD_TO_OUTPUT[code])));
    for (const fieldCode of fieldCodes) {
      const key = FIELD_TO_OUTPUT[fieldCode];
      const fieldClaims = relevant.filter((claim) => claim.fieldCode === fieldCode);
      const applicableClaims = fieldClaims.filter((claim) => claim.applicability === "applies");
      const knownClaims = applicableClaims.filter((claim) => claim.valueState === "known");
      const distinctValues = new Set(knownClaims.map((claim) => JSON.stringify(claim.value)));
      const attemptedIds = attemptedSpecClaims.flatMap((spec) => spec.fieldCode === fieldCode
        ? [String(spec.claimId)] : []);
      const excludedAlternative = attemptedIds.some((id) => !fieldClaims.some((claim) => claim.id === id));
      const conflict = distinctValues.size > 1 || excludedAlternative ||
        (knownClaims.length > 0 && applicableClaims.some((claim) => claim.valueState !== "known"));
      const state: ResearchStateValue = !applicableClaims.length
        ? attemptedIds.length ? "unknown" : "not_yet_researched"
        : conflict
          ? "unknown"
          : knownClaims.length
            ? "known"
            : applicableClaims.every((claim) => claim.valueState === "not_applicable")
              ? "not_applicable"
              : "unknown";
      output[key] = state === "known" ? knownClaims[0]?.value ?? null : null;
      fieldStates[String(key)] = {
        state,
        reason: state === "not_yet_researched"
          ? NOT_RESEARCHED_REASON
          : !applicableClaims.length
            ? "A researched claim is not eligible or applicability has not been established for this configuration."
          : conflict
            ? "Multiple eligible claims disagree about this field."
            : state === "known"
              ? null
              : "The reviewed claim does not provide a known value.",
        claimIds: [...new Set([...fieldClaims.map((claim) => claim.id), ...attemptedIds])],
      };
    }
    const applicable = relevant.filter((claim) => claim.applicability === "applies");
    const commonProblems = applicable.flatMap((claim) => {
      const detail = issuesByClaim.get(Number(claim.id));
      const sourceClaim = claimsById.get(Number(claim.id));
      if (!detail || sourceClaim?.claimKind !== "known_issue" ||
          (sourceClaim.contentClass !== "source_fact" && sourceClaim.contentClass !== "estimate")) return [];
      const costAllowed = sourceClaim.contentClass === "estimate" && detail.currencyCode === "USD" &&
        detail.costLowMinorUnits !== null && detail.costHighMinorUnits !== null;
      return [{
        title: detail.issueSystemCode,
        description: detail.symptomSummary,
        applicability: claim.applicability,
        typicalMileageStart: detail.supportedMileageStart,
        typicalMileageEnd: detail.supportedMileageEnd,
        repairCostLowUsd: costAllowed
          ? Number(detail.costLowMinorUnits) / 100 : null,
        repairCostHighUsd: costAllowed
          ? Number(detail.costHighMinorUnits) / 100 : null,
        severity: detail.severityAssessment === "unassessed" ? null : detail.severityAssessment,
        claimIds: [claim.id],
        fieldStates: {
          title: { state: "known" as const, claimIds: [claim.id] },
          description: { state: "known" as const, claimIds: [claim.id] },
          applicability: { state: "known" as const, claimIds: [claim.id] },
          typicalMileageStart: { state: detail.supportedMileageStart === null ? "unknown" as const : "known" as const, claimIds: [claim.id] },
          typicalMileageEnd: { state: detail.supportedMileageEnd === null ? "unknown" as const : "known" as const, claimIds: [claim.id] },
          repairCostLowUsd: {
            state: costAllowed ? "known" as const : "unknown" as const,
            reason: costAllowed ? null : "No eligible reviewed USD estimate is available.",
            claimIds: [claim.id],
          },
          repairCostHighUsd: {
            state: costAllowed ? "known" as const : "unknown" as const,
            reason: costAllowed ? null : "No eligible reviewed USD estimate is available.",
            claimIds: [claim.id],
          },
          severity: { state: detail.severityAssessment === null || detail.severityAssessment === "unassessed" ? "unknown" as const : "known" as const, claimIds: [claim.id] },
        },
      }];
    });
    const maintenance = relevant.filter((claim) => claim.applicability === "applies").flatMap((claim) => {
      const detail = maintenanceByClaim.get(Number(claim.id));
      const sourceClaim = claimsById.get(Number(claim.id));
      if (!detail || sourceClaim?.claimKind !== "maintenance" || sourceClaim.contentClass !== "source_fact") return [];
      const interval = detail.distanceInterval === null ? null : Number(detail.distanceInterval);
      return [{
        item: detail.description,
        intervalMiles: detail.distanceUnit?.toLowerCase() === "mile" ||
          detail.distanceUnit?.toLowerCase() === "miles" ? interval : null,
        estimatedCostUsd: null,
        claimIds: [claim.id],
        fieldStates: {
          item: { state: "known" as const, claimIds: [claim.id] },
          intervalMiles: {
            state: interval !== null && (detail.distanceUnit?.toLowerCase() === "mile" ||
              detail.distanceUnit?.toLowerCase() === "miles") ? "known" as const : "unknown" as const,
            reason: interval !== null ? null : "No reviewed mileage interval is available.",
            claimIds: [claim.id],
          },
          estimatedCostUsd: { state: "not_yet_researched" as const, reason: "No eligible reviewed maintenance cost estimate is available.", claimIds: [] },
        },
      }];
    });
    const reliabilityAttempts = attemptedClaims.filter((claim) => claim.claimKind === "reliability");
    const reliabilityClaimIds = relevant.filter((claim) =>
      claim.applicability === "applies" &&
      claimsById.get(Number(claim.id))?.claimKind === "reliability" &&
      claimsById.get(Number(claim.id))?.contentClass === "source_fact",
    ).map((claim) => claim.id);
    const reliabilityNotes = [...new Set(reliabilityClaimIds.map((id) => {
      const detail = reliabilityByClaim.get(Number(id));
      return detail?.limitations?.trim() || detail?.method.trim() || null;
    }).filter((value): value is string => Boolean(value)))];
    if (reliabilityNotes.length === 1) {
      if (fieldStates.reliabilityNote.state === "not_yet_researched") {
        output.reliabilityNote = reliabilityNotes[0];
        fieldStates.reliabilityNote = { state: "known", claimIds: reliabilityClaimIds };
      } else if (fieldStates.reliabilityNote.state === "known" &&
          output.reliabilityNote !== reliabilityNotes[0]) {
        output.reliabilityNote = null;
        fieldStates.reliabilityNote = {
          state: "unknown",
          reason: "Reviewed reliability notes disagree.",
          claimIds: reliabilityClaimIds,
        };
      }
    } else if (reliabilityNotes.length > 1 && fieldStates.reliabilityNote.state === "not_yet_researched") {
      fieldStates.reliabilityNote = {
        state: "unknown",
        reason: "Reviewed reliability notes disagree.",
        claimIds: reliabilityClaimIds,
      };
    }
    if (reliabilityAttempts.some((claim) => !reliabilityClaimIds.includes(String(claim.id)))) {
      for (const field of ["reliabilityLabel", "reliabilityNote"] as const) {
        output[field] = null;
        fieldStates[field] = {
          state: "unknown",
          reason: "Additional reliability research is not eligible for display.",
          claimIds: [...new Set([...fieldStates[field].claimIds, ...reliabilityAttempts.map((claim) => String(claim.id))])],
        };
      }
    } else if (reliabilityAttempts.length) {
      if (fieldStates.reliabilityLabel.state === "not_yet_researched") {
        fieldStates.reliabilityLabel = {
          state: "unknown",
          reason: "Eligible reliability research does not provide a reviewed label field.",
          claimIds: reliabilityClaimIds,
        };
      }
      if (!reliabilityNotes.length && fieldStates.reliabilityNote.state === "not_yet_researched") {
        fieldStates.reliabilityNote = {
          state: "unknown",
          reason: "Eligible reliability research does not provide a reviewed note.",
          claimIds: reliabilityClaimIds,
        };
      }
    }
    const supportedFitments = fitments.filter((fitment) =>
      fitment.configurationId === row.configurationId &&
      fitment.fitmentStatus === "supported" &&
      fitment.supportingClaimId !== null &&
      relevant.some((claim) => claim.id === String(fitment.supportingClaimId) &&
        claim.applicability === "applies" &&
        claimsById.get(fitment.supportingClaimId!)?.claimKind === "fitment" &&
        claimsById.get(fitment.supportingClaimId!)?.contentClass === "source_fact"),
    );
    const componentScalar = (fitment: (typeof supportedFitments)[number], fieldCode: string) => {
      const matchingSpecs = specs.filter((spec) =>
        spec.fieldCode === fieldCode &&
        spec.allowedSubjectType === "component_revision" &&
        claimsById.get(spec.claimId)?.subject.componentRevisionId === fitment.componentRevisionId,
      );
      const matchingIds = new Set(matchingSpecs.map((spec) => String(spec.claimId)));
      const fieldClaims = relevant.filter((claim) => matchingIds.has(claim.id));
      const applicableClaims = fieldClaims.filter((claim) => claim.applicability === "applies");
      const knownClaims = applicableClaims.filter((claim) => claim.valueState === "known");
      const distinctValues = new Set(knownClaims.map((claim) => JSON.stringify(claim.value)));
      const excludedAttempt = [...matchingIds].some((id) => !fieldClaims.some((claim) => claim.id === id));
      const conflict = excludedAttempt || distinctValues.size > 1 ||
        (knownClaims.length > 0 && applicableClaims.some((claim) => claim.valueState !== "known"));
      const state: ResearchStateValue = !applicableClaims.length
        ? matchingIds.size ? "unknown" : "not_yet_researched"
        : conflict
          ? "unknown"
          : knownClaims.length
            ? "known"
            : applicableClaims.every((claim) => claim.valueState === "not_applicable")
              ? "not_applicable"
              : "unknown";
      return {
        value: state === "known" ? knownClaims[0]?.value ?? null : null,
        fieldState: {
          state,
          reason: state === "not_yet_researched"
            ? NOT_RESEARCHED_REASON
            : conflict
              ? "Eligible component claims disagree about this field."
              : state === "known"
                ? null
                : "Component research is not eligible or applicability has not been established.",
          claimIds: [...new Set([...fieldClaims.map((claim) => claim.id), ...matchingIds])],
        },
      };
    };
    const engines = supportedFitments.filter((fitment) => fitment.role === "engine").map((fitment) => {
      const horsepower = componentScalar(fitment, "horsepower");
      const fuelType = componentScalar(fitment, "fuel_type");
      return {
        name: fitment.revisionKey,
        horsepower: horsepower.value,
        fuelType: fuelType.value,
        availability: null,
        claimIds: [...new Set([
          String(fitment.supportingClaimId),
          ...horsepower.fieldState.claimIds,
          ...fuelType.fieldState.claimIds,
        ])],
        fieldStates: {
          name: { state: "known", claimIds: [String(fitment.supportingClaimId)] },
          horsepower: horsepower.fieldState,
          fuelType: fuelType.fieldState,
          availability: { state: "not_yet_researched", reason: NOT_RESEARCHED_REASON, claimIds: [] },
        },
      };
    });
    const transmissions = supportedFitments.filter((fitment) => fitment.role === "transmission").map((fitment) => ({
      name: fitment.revisionKey,
      gears: null,
      availability: null,
      claimIds: [String(fitment.supportingClaimId)],
      fieldStates: {
        name: { state: "known", claimIds: [String(fitment.supportingClaimId)] },
        gears: { state: "not_yet_researched", reason: NOT_RESEARCHED_REASON, claimIds: [] },
        availability: { state: "not_yet_researched", reason: NOT_RESEARCHED_REASON, claimIds: [] },
      },
    }));
    const engineNames = [...new Set(engines.map((engine) => engine.name as string))];
    const transmissionNames = [...new Set(transmissions.map((transmission) => transmission.name as string))];
    const engineAttemptIds = attemptedClaims.filter((claim) =>
      fitments.some((fitment) => fitment.configurationId === row.configurationId &&
        fitment.role === "engine" && fitment.supportingClaimId === claim.id),
    ).map((claim) => String(claim.id));
    const transmissionAttemptIds = attemptedClaims.filter((claim) =>
      fitments.some((fitment) => fitment.configurationId === row.configurationId &&
        fitment.role === "transmission" && fitment.supportingClaimId === claim.id),
    ).map((claim) => String(claim.id));
    if (engineNames.length === 1) {
      if (fieldStates.engineName.state === "known" && output.engineName !== engineNames[0]) {
        output.engineName = null;
        fieldStates.engineName = { state: "unknown", reason: "Eligible claims disagree about the engine name.", claimIds: engines.flatMap((engine) => engine.claimIds as string[]) };
      } else {
        output.engineName = engineNames[0];
        fieldStates.engineName = { state: "known", claimIds: engines.flatMap((engine) => engine.claimIds as string[]) };
      }
    }
    if (transmissionNames.length === 1) {
      if (fieldStates.transmissionName.state === "known" && output.transmissionName !== transmissionNames[0]) {
        output.transmissionName = null;
        fieldStates.transmissionName = { state: "unknown", reason: "Eligible claims disagree about the transmission name.", claimIds: transmissions.flatMap((item) => item.claimIds as string[]) };
      } else {
        output.transmissionName = transmissionNames[0];
        fieldStates.transmissionName = { state: "known", claimIds: transmissions.flatMap((item) => item.claimIds as string[]) };
      }
    }
    if (engineNames.length > 1 && fieldStates.engineName.state !== "known") {
      fieldStates.engineName = {
        state: "unknown",
        reason: "Multiple eligible engine fitments do not identify one scalar engine name.",
        claimIds: engines.flatMap((engine) => engine.claimIds as string[]),
      };
    }
    if (transmissionNames.length > 1 && fieldStates.transmissionName.state !== "known") {
      fieldStates.transmissionName = {
        state: "unknown",
        reason: "Multiple eligible transmission fitments do not identify one scalar name.",
        claimIds: transmissions.flatMap((item) => item.claimIds as string[]),
      };
    }
    if (engineAttemptIds.some((id) => !engines.some((engine) => (engine.claimIds as string[]).includes(id)))) {
      output.engineName = null;
      fieldStates.engineName = {
        state: "unknown",
        reason: "Additional engine fitment research is not eligible for display.",
        claimIds: [...new Set([...fieldStates.engineName.claimIds, ...engineAttemptIds])],
      };
    }
    if (transmissionAttemptIds.some((id) => !transmissions.some((item) => (item.claimIds as string[]).includes(id)))) {
      output.transmissionName = null;
      fieldStates.transmissionName = {
        state: "unknown",
        reason: "Additional transmission fitment research is not eligible for display.",
        claimIds: [...new Set([...fieldStates.transmissionName.claimIds, ...transmissionAttemptIds])],
      };
    }
    const ownerReports = applicable.flatMap((claim) => {
      const sourceClaim = claimsById.get(Number(claim.id));
      // A firsthand experience belongs to one configuration, not a label,
      // model-year, trim, or shared component. Broad externally researched
      // patterns have their own evidence class and must never become reports.
      if (sourceClaim?.claimKind !== "owner_experience" ||
          sourceClaim.contentClass !== "direct_owner_experience" ||
          sourceClaim.subject.vehicleConfigurationId !== row.configurationId) return [];
      const evidence = (evidenceByClaim.get(Number(claim.id)) ?? [])
        .filter((item) => item.relation === "supports" || item.relation === "derived_from");
      const excerpts = evidence.map((item) => item.excerpt?.trim()).filter((item): item is string => Boolean(item));
      if (!excerpts.length) return [];
      return [{
        id: Number(claim.id),
        vehicleId: row.alias,
        vehicleLabel: `${row.year} ${row.make} ${row.model} ${row.displayLabel ?? row.trim}`,
        displayName: "Owner experience",
        ownershipMonths: null,
        milesDriven: null,
        rating: null,
        title: evidence.find((item) => item.documentIdentifier)?.documentIdentifier ?? "Owner experience",
        body: excerpts.join("\n"),
        reportedProblem: null,
        isDemo: false,
        claimIds: [claim.id],
        fieldStates: {
          ownershipMonths: { state: "not_yet_researched", reason: NOT_RESEARCHED_REASON, claimIds: [] },
          milesDriven: { state: "not_yet_researched", reason: NOT_RESEARCHED_REASON, claimIds: [] },
          rating: { state: "not_yet_researched", reason: NOT_RESEARCHED_REASON, claimIds: [] },
          reportedProblem: { state: "not_yet_researched", reason: NOT_RESEARCHED_REASON, claimIds: [] },
          body: { state: "known", claimIds: [claim.id] },
        },
      }];
    });
    const externalOwnerPatterns: CanonicalExternalOwnerPattern[] = applicable.flatMap((claim) => {
      const detail = externalOwnerPatternsByClaim.get(Number(claim.id));
      const sourceClaim = claimsById.get(Number(claim.id));
      if (!detail || !sourceClaim) return [];
      const evidence = (evidenceByClaim.get(Number(claim.id)) ?? [])
        .filter((item) => isDisplayableEvidence(item) &&
          (item.relation === "supports" || item.relation === "derived_from"));
      const projected = projectExternalOwnerPattern(
        {
          id: claim.id,
          claimKind: sourceClaim.claimKind,
          contentClass: sourceClaim.contentClass,
          applicability: claim.applicability,
          scopeDescription: claim.scopeDescription,
        },
        detail,
        evidence.map((item) => ({ relation: item.relation, excerpt: item.excerpt })),
      );
      return projected ? [{ ...projected, sources: claim.sources }] : [];
    });
    const recallClaims = applicable.filter((claim) =>
      claimsById.get(Number(claim.id))?.claimKind === "recall" &&
      claimsById.get(Number(claim.id))?.contentClass === "source_fact" &&
      recallsByClaim.has(Number(claim.id)),
    );
    const safetyClaims = applicable.filter((claim) =>
      claimsById.get(Number(claim.id))?.claimKind === "safety_rating" &&
      claimsById.get(Number(claim.id))?.contentClass === "source_fact" &&
      safetyByClaim.has(Number(claim.id)),
    );
    const recallStatus = recallClaims.length
      ? `Reviewed recall campaigns recorded: ${recallClaims.map((claim) => {
          const detail = recallsByClaim.get(Number(claim.id))!;
          return `${detail.issuingAuthority} ${detail.campaignIdentifier}`;
        }).join("; ")}`
      : null;
    const safetyStatus = safetyClaims.length
      ? safetyClaims.map((claim) => {
          const detail = safetyByClaim.get(Number(claim.id))!;
          const authority = [detail.authority, detail.program, detail.testYear].filter(Boolean).join(" ");
          const result = detail.result ?? (detail.score === null
            ? null
            : `${detail.score} ${detail.scoreUnit ?? ""}`.trim());
          return result ? `${authority}: ${result}` : authority;
        }).join("; ")
      : null;
    const estimateFieldByCategory: Record<string, string> = {
      ownership: "annualOwnershipEstimateUsd",
      annual_ownership: "annualOwnershipEstimateUsd",
      maintenance: "annualMaintenanceEstimateUsd",
      annual_maintenance: "annualMaintenanceEstimateUsd",
      repair: "annualRepairEstimateUsd",
      annual_repair: "annualRepairEstimateUsd",
      fuel: "annualFuelEstimateUsd",
      annual_fuel: "annualFuelEstimateUsd",
      insurance: "insuranceEstimateUsd",
      annual_insurance: "insuranceEstimateUsd",
    };
    for (const claim of applicable) {
      const sourceClaim = claimsById.get(Number(claim.id));
      const detail = estimatesByClaim.get(Number(claim.id));
      const field = detail ? estimateFieldByCategory[detail.costCategory.trim().toLowerCase()] : undefined;
      if (!detail || !field ||
          (sourceClaim?.claimKind !== "ownership_estimate" && sourceClaim?.claimKind !== "calculation") ||
          (sourceClaim.contentClass !== "estimate" && sourceClaim.contentClass !== "calculation")) continue;
      const claimIds = [...new Set([...fieldStates[field].claimIds, claim.id])];
      const annual = ["annual", "year"].includes(detail.period.trim().toLowerCase());
      const scalarUsd = detail.currencyCode === "USD" &&
        detail.costLowMinorUnits === detail.costHighMinorUnits &&
        annual;
      if (!scalarUsd) {
        output[field] = null;
        fieldStates[field] = {
          state: "unknown",
          reason: detail.currencyCode !== "USD"
            ? "A point estimate in USD/year is not available."
            : !annual
              ? "The eligible estimate does not use an annual period."
              : "The reviewed estimate is a range; no point value is inferred.",
          claimIds,
        };
      } else {
        const amount = Number(detail.costLowMinorUnits) / 100;
        if (fieldStates[field].state === "known" && output[field] !== amount) {
          output[field] = null;
          fieldStates[field] = {
            state: "unknown",
            reason: "Eligible claims disagree about this field.",
            claimIds,
          };
        } else if (fieldStates[field].state === "not_yet_researched") {
          output[field] = amount;
          fieldStates[field] = { state: "known", claimIds };
        }
      }
    }
    if (recallStatus) fieldStates.recallStatus = { state: "known", claimIds: recallClaims.map((claim) => claim.id) };
    if (safetyStatus) fieldStates.safetyStatus = { state: "known", claimIds: safetyClaims.map((claim) => claim.id) };
    const updateSection = (
      code: string,
      attempts: Array<{ id: number }>,
      displayedIds: string[],
    ) => {
      const uniqueDisplayedIds = [...new Set(displayedIds)];
      const hasExcludedAttempt = attempts.some(({ id }) => !uniqueDisplayedIds.includes(String(id)));
      if (uniqueDisplayedIds.length && !hasExcludedAttempt) sectionStates[code] = {
        state: "known",
        claimIds: uniqueDisplayedIds,
      };
      else if (uniqueDisplayedIds.length || attempts.length) sectionStates[code] = {
        state: "unknown",
        reason: uniqueDisplayedIds.length
          ? "Additional researched records are not eligible for display."
          : "Researched records are not eligible for display.",
        claimIds: [...new Set([...uniqueDisplayedIds, ...attempts.map(({ id }) => String(id))])],
      };
    };
    const issueAttempts = attemptedClaims.filter((claim) => claim.claimKind === "known_issue");
    const maintenanceAttempts = attemptedClaims.filter((claim) => claim.claimKind === "maintenance");
    const ownerAttempts = attemptedClaims.filter((claim) => claim.contentClass === "direct_owner_experience");
    const recallAttempts = attemptedClaims.filter((claim) => claim.claimKind === "recall");
    const safetyAttempts = attemptedClaims.filter((claim) => claim.claimKind === "safety_rating");
    const componentAttempts = attemptedClaims.filter((claim) => claim.claimKind === "fitment");
    const engineClaimIds = engines.flatMap((engine) => engine.claimIds as string[]);
    const transmissionClaimIds = transmissions.flatMap((item) => item.claimIds as string[]);
    const unmatchedComponentAttempts = componentAttempts.filter((claim) =>
      !engineAttemptIds.includes(String(claim.id)) && !transmissionAttemptIds.includes(String(claim.id)),
    );
    updateSection("engines", [
      ...componentAttempts.filter((claim) => engineAttemptIds.includes(String(claim.id))),
      ...unmatchedComponentAttempts,
    ], engineClaimIds);
    updateSection("transmissions", [
      ...componentAttempts.filter((claim) => transmissionAttemptIds.includes(String(claim.id))),
      ...unmatchedComponentAttempts,
    ], transmissionClaimIds);
    updateSection("commonProblems", issueAttempts, commonProblems.flatMap((problem) => problem.claimIds as string[]));
    updateSection("maintenance", maintenanceAttempts, maintenance.flatMap((item) => item.claimIds as string[]));
    updateSection("ownerReports", ownerAttempts, ownerReports.flatMap((report) => report.claimIds as string[]));
    updateSection("recalls", recallAttempts, recallClaims.map((claim) => claim.id));
    updateSection("safety", safetyAttempts, safetyClaims.map((claim) => claim.id));
    updateSection("externalOwnerPatterns",
      attemptedClaims.filter((claim) => claim.contentClass === "external_owner_pattern"),
      externalOwnerPatterns.flatMap((pattern) => pattern.claimIds));
    const displayedReliability = fieldStates.reliabilityEstimate.state === "known" ||
      fieldStates.reliabilityLabel.state === "known" ||
      fieldStates.reliabilityNote.state === "known";
    if (displayedReliability &&
        reliabilityAttempts.every((claim) => reliabilityClaimIds.includes(String(claim.id)))) {
      sectionStates.reliability = { state: "known", claimIds: reliabilityClaimIds };
    } else if (reliabilityClaimIds.length || reliabilityAttempts.length) {
      sectionStates.reliability = {
        state: "unknown",
        reason: "Reliability research is not sufficiently eligible or complete for display.",
        claimIds: [...new Set([...reliabilityClaimIds, ...reliabilityAttempts.map((claim) => String(claim.id))])],
      };
    }
    return [{
      id: row.alias,
      make: row.make,
      makeSlug: row.makeSlug,
      makeKey: `canonical:make:${row.brandId}`,
      makeId: row.brandId,
      modelId: row.modelId,
      generationId: row.generationId,
      modelYearId: row.modelYearId,
      trimId: row.trimId,
      modelKey: `canonical:model:${row.modelId}`,
      generationKey: `canonical:generation:${row.generationId}`,
      modelYearKey: `canonical:model-year:${row.modelYearId}`,
      trimKey: `canonical:trim:${row.trimId}`,
      model: row.model,
      modelSlug: row.modelSlug,
      year: row.year,
      generation: row.generation,
      trim: row.displayLabel ?? row.trim,
      bodyType: null,
      drivetrain: null,
      fuelType: null,
      mpgCity: null,
      mpgHighway: null,
      mpgCombined: null,
      horsepower: null,
      priceUsd: null,
      reliabilityEstimate: null,
      annualOwnershipEstimateUsd: null,
      annualMaintenanceEstimateUsd: null,
      annualRepairEstimateUsd: null,
      annualFuelEstimateUsd: null,
      researchRank: null,
      ...output,
      imageKey: "vehicle-placeholder",
      isDemo: false as const,
      profileKind: "canonical" as const,
      canonicalConfigurationId: row.configurationId,
      fieldStates,
      sectionStates,
      claims: [identityClaim, ...relevant.filter((claim) => claim.id !== identityClaim.id)],
      commonProblems,
      maintenance,
      reliabilityClaimIds,
      overview: (output.overview as string | null | undefined) ?? null,
      engineName: (output.engineName as string | null | undefined) ?? null,
      transmissionName: (output.transmissionName as string | null | undefined) ?? null,
      reliabilityLabel: (output.reliabilityLabel as string | null | undefined) ?? null,
      reliabilityNote: (output.reliabilityNote as string | null | undefined) ?? null,
      insuranceEstimateUsd: (output.insuranceEstimateUsd as number | null | undefined) ?? null,
      fiveYearDepreciationPercent: (output.fiveYearDepreciationPercent as number | null | undefined) ?? null,
      expectedLifespanMiles: (output.expectedLifespanMiles as number | null | undefined) ?? null,
      recallStatus,
      safetyStatus,
      engines,
      transmissions,
      siblingTrims: [] as string[],
      inspectionChecklist: [],
      ownerReports,
      externalOwnerPatterns,
    }];
  });
  for (const vehicle of projectedVehicles) {
    const siblings = projectedVehicles.filter((candidate) =>
      candidate.modelYearId === vehicle.modelYearId && candidate.trimId !== vehicle.trimId,
    );
    if (siblings.length) {
      vehicle.siblingTrims = siblings.map((sibling) => sibling.trim);
      vehicle.sectionStates.siblingTrims = {
        state: "known",
        claimIds: siblings.flatMap((sibling) =>
          sibling.claims.filter((claim) => claimsById.get(Number(claim.id))?.claimKind === "identity")
            .map((claim) => claim.id),
        ),
      };
    }
  }
  return filters.vehicleId
    ? projectedVehicles.filter((vehicle) => vehicle.canonicalConfigurationId === aliasConfigurationId)
    : projectedVehicles;
}