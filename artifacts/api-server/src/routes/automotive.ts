import { and, asc, count, desc, eq, ilike, inArray, isNull, or, type SQL, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetDiscoveryStatsResponse,
  GetCatalogOptionsResponse,
  GetMakeParams,
  GetMakeResponse,
  GetVehicleParams,
  GetVehicleResponse,
  ListMakesResponse,
  ListOwnerReportsQueryParams,
  ListOwnerReportsResponse,
  ListPopularVehiclesResponse,
  ListTrendingVehiclesResponse,
  ListVehiclesQueryParams,
  ListVehiclesResponse,
} from "@workspace/api-zod";
import {
  commonProblemsTable,
  db,
  enginesTable,
  generationsTable,
  makesTable,
  maintenanceItemsTable,
  modelYearsTable,
  modelsTable,
  ownerReportsTable,
  ownershipEstimatesTable,
  transmissionsTable,
  trimsTable,
  consumerBrandsTable,
  vehicleGenerationsTable,
  vehicleModelYearsTable,
  vehicleModelsTable,
  vehicleTrimsTable,
} from "@workspace/db";
import {
  getLegacyPublicSlugs,
  getLegacyFallbackTrimIds,
  resolveLegacyFallbackTrimId,
  usesCatalogProfileReads,
} from "../lib/vehicle-profile-source";
import {
  CANONICAL_RELEASE_MANIFEST,
  loadCanonicalVehicles,
  type CanonicalManifestEntry,
} from "../lib/canonical-vehicle-source";
import { parseProfileKey } from "../lib/canonical-policy";

const vehicleSelection = {
  id: trimsTable.slug,
  make: makesTable.name,
  makeSlug: makesTable.slug,
  model: modelsTable.name,
  modelSlug: modelsTable.slug,
  year: modelYearsTable.year,
  generation: generationsTable.name,
  trim: trimsTable.name,
  bodyType: generationsTable.bodyType,
  drivetrain: trimsTable.drivetrain,
  fuelType: trimsTable.fuelType,
  mpgCity: trimsTable.mpgCity,
  mpgHighway: trimsTable.mpgHighway,
  mpgCombined: trimsTable.mpgCombined,
  horsepower: trimsTable.horsepower,
  priceUsd: trimsTable.priceUsd,
  reliabilityEstimate: ownershipEstimatesTable.reliabilityScore,
  annualOwnershipEstimateUsd: ownershipEstimatesTable.annualOwnershipUsd,
  annualMaintenanceEstimateUsd: ownershipEstimatesTable.annualMaintenanceUsd,
  annualRepairEstimateUsd: ownershipEstimatesTable.annualRepairUsd,
  annualFuelEstimateUsd: ownershipEstimatesTable.annualFuelUsd,
  researchRank: trimsTable.researchRank,
  imageKey: trimsTable.imageKey,
  isDemo: trimsTable.isDemo,
  trimDbId: trimsTable.id,
  makeId: makesTable.id,
  modelYearId: modelYearsTable.id,
  engineId: enginesTable.id,
  engineName: enginesTable.name,
  engineHorsepower: enginesTable.horsepower,
  engineFuelType: enginesTable.fuelType,
  engineAvailability: enginesTable.availability,
  transmissionId: transmissionsTable.id,
  transmissionName: transmissionsTable.name,
  transmissionGears: transmissionsTable.gears,
  transmissionAvailability: transmissionsTable.availability,
  reliabilityLabel: ownershipEstimatesTable.reliabilityLabel,
  reliabilityNote: ownershipEstimatesTable.reliabilityNote,
  annualInsuranceUsd: ownershipEstimatesTable.annualInsuranceUsd,
  fiveYearDepreciationPercent: ownershipEstimatesTable.fiveYearDepreciationPercent,
  expectedLifespanMiles: ownershipEstimatesTable.expectedLifespanMiles,
} as const;

type VehicleSort = "popular" | "reliability" | "ownership-cost";
class InvalidVehicleFilterError extends Error {}

function invalidVehicleFilter(error: unknown): InvalidVehicleFilterError {
  return new InvalidVehicleFilterError(error instanceof Error ? error.message : "Invalid vehicle filter.");
}

async function loadLegacyVehicles(options: {
  q?: string;
  makeSlug?: string;
  model?: string;
  modelId?: number;
  generationId?: number;
  modelYearId?: number;
  year?: number;
  trim?: string;
  trimId?: number;
  vehicleId?: string;
  sort?: VehicleSort;
  limit?: number;
}) {
  const conditions: SQL[] = [];
  const fallbackTrimIds = await getLegacyFallbackTrimIds();
  if (fallbackTrimIds.length === 0) return [];

  if (options.q?.trim()) {
    // A shopper's phrase can span year, make, model, and trim columns.
    for (const token of options.q.trim().split(/\s+/)) {
      const term = `%${token}%`;
      const search = or(
        ilike(makesTable.name, term),
        ilike(modelsTable.name, term),
        ilike(trimsTable.name, term),
        ilike(sql`${modelYearsTable.year}::text`, term),
      );
      if (search) conditions.push(search);
    }
  }
  if (options.makeSlug) conditions.push(eq(makesTable.slug, options.makeSlug));
  if (options.model) conditions.push(ilike(modelsTable.name, `%${options.model}%`));
  if (options.modelId) conditions.push(eq(modelsTable.id, options.modelId));
  if (options.generationId) conditions.push(eq(generationsTable.id, options.generationId));
  if (options.modelYearId) conditions.push(eq(modelYearsTable.id, options.modelYearId));
  if (options.year) conditions.push(eq(modelYearsTable.year, options.year));
  if (options.trim) conditions.push(ilike(trimsTable.name, `%${options.trim}%`));
  if (options.trimId) conditions.push(eq(trimsTable.id, options.trimId));
  if (options.vehicleId) {
    if (usesCatalogProfileReads()) {
      const legacyTrimId = await resolveLegacyFallbackTrimId(options.vehicleId);
      if (legacyTrimId === undefined) return [];
      conditions.push(eq(trimsTable.id, legacyTrimId));
    } else {
      conditions.push(eq(trimsTable.slug, options.vehicleId));
    }
  }
  conditions.push(inArray(trimsTable.id, fallbackTrimIds));

  const sort = options.sort ?? "popular";
  const order =
    sort === "reliability"
      ? desc(ownershipEstimatesTable.reliabilityScore)
      : sort === "ownership-cost"
        ? asc(ownershipEstimatesTable.annualOwnershipUsd)
        : asc(trimsTable.researchRank);

  const rows = await db
    .select(vehicleSelection)
    .from(trimsTable)
    .innerJoin(modelYearsTable, eq(trimsTable.modelYearId, modelYearsTable.id))
    .innerJoin(generationsTable, eq(modelYearsTable.generationId, generationsTable.id))
    .innerJoin(modelsTable, eq(generationsTable.modelId, modelsTable.id))
    .innerJoin(makesTable, eq(modelsTable.makeId, makesTable.id))
    .innerJoin(enginesTable, eq(trimsTable.engineId, enginesTable.id))
    .innerJoin(transmissionsTable, eq(trimsTable.transmissionId, transmissionsTable.id))
    .innerJoin(ownershipEstimatesTable, eq(ownershipEstimatesTable.trimId, trimsTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(order)
    .limit(options.limit ?? 1000);
  if (!usesCatalogProfileReads()) return rows;

  const publicSlugs = await getLegacyPublicSlugs(
    rows.map((row) => row.trimDbId),
  );
  return rows.map((row) => ({
    ...row,
    id: publicSlugs.get(row.trimDbId) ?? row.id,
  }));
}

function toVehicleDetail(
  row: Awaited<ReturnType<typeof loadLegacyVehicles>>[number],
  engines: Array<typeof enginesTable.$inferSelect>,
  transmissions: Array<typeof transmissionsTable.$inferSelect>,
  siblingTrims: string[],
  problems: Array<typeof commonProblemsTable.$inferSelect>,
  maintenance: Array<typeof maintenanceItemsTable.$inferSelect>,
) {
  return {
    ...row,
    overview: `This illustrative ${row.year} ${row.make} ${row.model} ${row.trim} profile shows how specifications and ownership information can be organized. Confirm the exact configuration using the vehicle identification number and manufacturer records.`,
    engineName: row.engineName,
    transmissionName: row.transmissionName,
    engines: engines.map((engine) => ({
      name: engine.name,
      horsepower: engine.horsepower,
      fuelType: engine.fuelType,
      availability: engine.availability,
    })),
    transmissions: transmissions.map((transmission) => ({
      name: transmission.name,
      gears: transmission.gears,
      availability: transmission.availability,
    })),
    siblingTrims,
    reliability: {
      score: row.reliabilityEstimate,
      label: row.reliabilityLabel,
      note: row.reliabilityNote,
    },
    commonProblems: problems.map((problem) => ({
      title: problem.title,
      description: problem.description,
      applicability: problem.engineId === row.engineId ? "applies" : "unknown",
      typicalMileageStart: problem.typicalMileageStart,
      typicalMileageEnd: problem.typicalMileageEnd,
      repairCostLowUsd: problem.repairCostLowUsd,
      repairCostHighUsd: problem.repairCostHighUsd,
      severity: problem.severity,
    })),
    maintenance: maintenance.map((item) => ({
      item: item.item,
      intervalMiles: item.intervalMiles,
      estimatedCostUsd: item.estimatedCostUsd,
    })),
    insuranceEstimateUsd: row.annualInsuranceUsd,
    fiveYearDepreciationPercent: row.fiveYearDepreciationPercent,
    expectedLifespanMiles: row.expectedLifespanMiles,
    inspectionChecklist: [
      "Match the VIN on the vehicle, title, and service records.",
      "Review maintenance receipts and ask about overdue service.",
      "Check tires, brakes, glass, lights, and signs of uneven wear.",
      "Test electronic features and warning lights during a drive.",
      "Arrange an independent pre-purchase inspection.",
      "Check open recalls for this exact VIN with an official source.",
    ],
    recallStatus: "Not verified — check the VIN with NHTSA",
    safetyStatus: "Official rating not loaded in this demo",
  };
}

async function loadVehicles(
  options: {
    q?: string;
    makeSlug?: string;
    model?: string;
    modelId?: number;
    generationId?: number;
    year?: number;
    trim?: string;
    trimId?: number;
    vehicleId?: string;
    sort?: VehicleSort;
    limit?: number;
    modelKey?: string;
    generationKey?: string;
    modelYearKey?: string;
    trimKey?: string;
  },
  releases: readonly CanonicalManifestEntry[],
) {
  const parseKey = (key: string | undefined, kind: "model" | "generation" | "model-year" | "trim") => {
    if (!key) return undefined;
    try {
      return parseProfileKey(key, kind);
    } catch (error) {
      throw invalidVehicleFilter(error);
    }
  };
  const modelKey = parseKey(options.modelKey, "model");
  const generationKey = parseKey(options.generationKey, "generation");
  const modelYearKey = parseKey(options.modelYearKey, "model-year");
  const trimKey = parseKey(options.trimKey, "trim");
  const keyNamespaces = new Set([modelKey, generationKey, modelYearKey, trimKey]
    .filter((key): key is NonNullable<typeof key> => Boolean(key))
    .map((key) => key.namespace));
  const hasLegacyNumericSelector = options.modelId !== undefined ||
    options.generationId !== undefined || options.trimId !== undefined;
  if (keyNamespaces.size > 1 ||
      (hasLegacyNumericSelector && keyNamespaces.has("canonical"))) {
    throw new InvalidVehicleFilterError("Canonical and legacy selectors cannot be mixed.");
  }
  const selectedNamespace = keyNamespaces.values().next().value ??
    (hasLegacyNumericSelector ? "legacy" : undefined);
  if ((modelKey?.namespace === "legacy" && options.modelId !== undefined && modelKey.id !== options.modelId) ||
      (generationKey?.namespace === "legacy" && options.generationId !== undefined && generationKey.id !== options.generationId) ||
      (trimKey?.namespace === "legacy" && options.trimId !== undefined && trimKey.id !== options.trimId)) {
    throw new InvalidVehicleFilterError("A namespaced key contradicts its numeric legacy filter.");
  }
  if (selectedNamespace === "legacy") {
    const modelId = modelKey?.id ?? options.modelId;
    const generationId = generationKey?.id ?? options.generationId;
    const modelYearId = modelYearKey?.id;
    const trimId = trimKey?.id ?? options.trimId;
    const [modelRows, generationRows, modelYearRows, trimRows] = await Promise.all([
      modelId === undefined ? [] : db.select({ id: modelsTable.id }).from(modelsTable).where(eq(modelsTable.id, modelId)),
      generationId === undefined ? [] : db.select({ id: generationsTable.id, modelId: generationsTable.modelId }).from(generationsTable).where(eq(generationsTable.id, generationId)),
      modelYearId === undefined ? [] : db.select({
        id: modelYearsTable.id,
        generationId: modelYearsTable.generationId,
        modelId: generationsTable.modelId,
      }).from(modelYearsTable)
        .innerJoin(generationsTable, eq(modelYearsTable.generationId, generationsTable.id))
        .where(eq(modelYearsTable.id, modelYearId)),
      trimId === undefined ? [] : db.select({
        id: trimsTable.id,
        modelYearId: trimsTable.modelYearId,
        generationId: modelYearsTable.generationId,
        modelId: generationsTable.modelId,
      }).from(trimsTable)
        .innerJoin(modelYearsTable, eq(trimsTable.modelYearId, modelYearsTable.id))
        .innerJoin(generationsTable, eq(modelYearsTable.generationId, generationsTable.id))
        .where(eq(trimsTable.id, trimId)),
    ]);
    const generation = generationRows[0];
    const modelYear = modelYearRows[0];
    const trim = trimRows[0];
    const contradiction =
      (modelId !== undefined && generation && generation.modelId !== modelId) ||
      (generationId !== undefined && modelYear && modelYear.generationId !== generationId) ||
      (modelId !== undefined && modelYear && modelYear.modelId !== modelId) ||
      (modelId !== undefined && trim && trim.modelId !== modelId) ||
      (generationId !== undefined && trim && trim.generationId !== generationId) ||
      (modelYearId !== undefined && trim && trim.modelYearId !== modelYearId);
    // Unknown IDs remain ordinary empty searches; only known conflicting identities are invalid.
    if (modelId !== undefined && modelRows.length && contradiction ||
        generationId !== undefined && generationRows.length && contradiction ||
        modelYearId !== undefined && modelYearRows.length && contradiction ||
        trimId !== undefined && trimRows.length && contradiction) {
      throw new InvalidVehicleFilterError("Namespaced selectors describe conflicting vehicle identities.");
    }
  }
  if (selectedNamespace === "canonical" && (modelKey || generationKey || modelYearKey || trimKey)) {
    const [modelRows, generationRows, modelYearRows, trimRows] = await Promise.all([
      modelKey ? db.select({ id: vehicleModelsTable.id }).from(vehicleModelsTable).where(eq(vehicleModelsTable.id, modelKey.id)) : [],
      generationKey ? db.select({ id: vehicleGenerationsTable.id, modelId: vehicleGenerationsTable.vehicleModelId }).from(vehicleGenerationsTable).where(eq(vehicleGenerationsTable.id, generationKey.id)) : [],
      modelYearKey ? db.select({
        id: vehicleModelYearsTable.id,
        generationId: vehicleModelYearsTable.vehicleGenerationId,
        modelId: vehicleGenerationsTable.vehicleModelId,
      }).from(vehicleModelYearsTable)
        .innerJoin(vehicleGenerationsTable, eq(vehicleModelYearsTable.vehicleGenerationId, vehicleGenerationsTable.id))
        .where(eq(vehicleModelYearsTable.id, modelYearKey.id)) : [],
      trimKey ? db.select({
        id: vehicleTrimsTable.id,
        modelYearId: vehicleTrimsTable.vehicleModelYearId,
        generationId: vehicleModelYearsTable.vehicleGenerationId,
        modelId: vehicleGenerationsTable.vehicleModelId,
      }).from(vehicleTrimsTable)
        .innerJoin(vehicleModelYearsTable, eq(vehicleTrimsTable.vehicleModelYearId, vehicleModelYearsTable.id))
        .innerJoin(vehicleGenerationsTable, eq(vehicleModelYearsTable.vehicleGenerationId, vehicleGenerationsTable.id))
        .where(eq(vehicleTrimsTable.id, trimKey.id)) : [],
    ]);
    const generation = generationRows[0];
    const modelYear = modelYearRows[0];
    const trim = trimRows[0];
    const contradiction =
      (modelKey && generation && generation.modelId !== modelKey.id) ||
      (generationKey && modelYear && modelYear.generationId !== generationKey.id) ||
      (modelKey && modelYear && modelYear.modelId !== modelKey.id) ||
      (modelKey && trim && trim.modelId !== modelKey.id) ||
      (generationKey && trim && trim.generationId !== generationKey.id) ||
      (modelYearKey && trim && trim.modelYearId !== modelYearKey.id);
    if (contradiction && (
      (modelKey && modelRows.length) || (generationKey && generationRows.length) ||
      (modelYearKey && modelYearRows.length) || (trimKey && trimRows.length)
    )) {
      throw new InvalidVehicleFilterError("Namespaced selectors describe conflicting vehicle identities.");
    }
  }
  const canonicalFilters = {
    q: options.q,
    makeSlug: options.makeSlug,
    model: options.model,
    year: options.year,
    trim: options.trim,
    vehicleId: options.vehicleId,
    modelYearKey: modelYearKey?.namespace === "canonical" ? `canonical:model-year:${modelYearKey.id}` : undefined,
    modelKey: modelKey?.namespace === "canonical" ? `canonical:model:${modelKey.id}` : undefined,
    generationKey: generationKey?.namespace === "canonical" ? `canonical:generation:${generationKey.id}` : undefined,
    trimKey: trimKey?.namespace === "canonical" ? `canonical:trim:${trimKey.id}` : undefined,
  };
  const canonical = selectedNamespace === "legacy" ? [] : await loadCanonicalVehicles(canonicalFilters, releases);
  const legacy = selectedNamespace === "canonical" ? [] : await loadLegacyVehicles({
    ...options,
    modelId: modelKey?.namespace === "legacy" ? modelKey.id : options.modelId,
    generationId: generationKey?.namespace === "legacy" ? generationKey.id : options.generationId,
    modelYearId: modelYearKey?.namespace === "legacy" ? modelYearKey.id : undefined,
    trimId: trimKey?.namespace === "legacy" ? trimKey.id : options.trimId,
    vehicleId: options.vehicleId,
  });
  const combined = options.vehicleId
    ? canonical.length ? canonical : legacy
    : [...legacy, ...canonical];
  const sort = options.sort ?? "popular";
  const metric = (row: (typeof combined)[number]): number | null =>
    sort === "reliability" ? row.reliabilityEstimate :
      sort === "ownership-cost" ? row.annualOwnershipEstimateUsd : row.researchRank;
  combined.sort((left, right) => {
    const a = metric(left);
    const b = metric(right);
    if (a === null && b !== null) return 1;
    if (b === null && a !== null) return -1;
    if (a !== null && b !== null && a !== b) return sort === "reliability" ? b - a : a - b;
    // Preserve the legacy query's tie order, including the existing popular list.
    const leftLegacy = "trimDbId" in left;
    const rightLegacy = "trimDbId" in right;
    if (leftLegacy && rightLegacy) return 0;
    if (leftLegacy !== rightLegacy) return leftLegacy ? -1 : 1;
    return left.make.localeCompare(right.make) || left.model.localeCompare(right.model) ||
      left.year - right.year || left.trim.localeCompare(right.trim) || left.id.localeCompare(right.id);
  });
  return combined.slice(0, options.limit ?? 100);
}

export function createAutomotiveRouter(options: {
  releases?: readonly CanonicalManifestEntry[];
} = {}): IRouter {
const router: IRouter = Router();
const releases = options.releases ?? CANONICAL_RELEASE_MANIFEST;

function routeNamespaceFilters(query: Record<string, unknown>): {
  modelKey?: string;
  generationKey?: string;
  modelYearKey?: string;
  trimKey?: string;
} {
  const result: { modelKey?: string; generationKey?: string; modelYearKey?: string; trimKey?: string } = {};
  for (const key of ["modelKey", "generationKey", "modelYearKey", "trimKey"] as const) {
    if (query[key] !== undefined) {
      if (typeof query[key] !== "string") {
        throw new InvalidVehicleFilterError(`${key} must be a single namespaced key.`);
      }
      result[key] = query[key];
    }
  }
  return result;
}

function respondBadQuery(error: unknown, res: import("express").Response): void {
  if (!(error instanceof InvalidVehicleFilterError)) throw error;
  res.status(400).json({ error: error instanceof Error ? error.message : "Invalid vehicle filter." });
}

function toCanonicalSummary(vehicle: Awaited<ReturnType<typeof loadCanonicalVehicles>>[number]) {
  const {
    makeKey,
    makeId,
    modelId,
    generationId,
    modelYearId,
    trimId,
    modelKey,
    generationKey,
    modelYearKey,
    trimKey,
    commonProblems,
    maintenance,
    reliabilityClaimIds,
    overview,
    engineName,
    transmissionName,
    reliabilityLabel,
    reliabilityNote,
    insuranceEstimateUsd,
    fiveYearDepreciationPercent,
    expectedLifespanMiles,
    recallStatus,
    safetyStatus,
    engines,
    transmissions,
    siblingTrims,
    inspectionChecklist,
    ownerReports,
    ...summary
  } = vehicle;
  return {
    ...summary,
    claims: summary.claims.map(({ fieldCode, value, valueState, measurementBasis, unit, claimKind, ...claim }) => claim),
  };
}

function serializeVehicleList(
  vehicles: Awaited<ReturnType<typeof loadVehicles>>,
  responseSchema: typeof ListVehiclesResponse | typeof ListPopularVehiclesResponse | typeof ListTrendingVehiclesResponse = ListVehiclesResponse,
): unknown[] {
  return vehicles.map((vehicle) => {
    const dto = "profileKind" in vehicle ? toCanonicalSummary(vehicle) : vehicle;
    return (responseSchema.parse([dto]) as unknown[])[0];
  });
}

router.get("/makes", async (_req, res): Promise<void> => {
  const fallbackTrimIds = await getLegacyFallbackTrimIds();
  const visibleVehicleCount = count(
    sql`CASE WHEN ${inArray(trimsTable.id, fallbackTrimIds)} THEN ${trimsTable.id} END`,
  );
  const makes = await db
    .select({
      id: makesTable.id,
      name: makesTable.name,
      slug: makesTable.slug,
      mark: makesTable.mark,
      vehicleCount: visibleVehicleCount,
    })
    .from(makesTable)
    .leftJoin(modelsTable, eq(modelsTable.makeId, makesTable.id))
    .leftJoin(generationsTable, eq(generationsTable.modelId, modelsTable.id))
    .leftJoin(modelYearsTable, eq(modelYearsTable.generationId, generationsTable.id))
    .leftJoin(trimsTable, eq(trimsTable.modelYearId, modelYearsTable.id))
    .groupBy(makesTable.id)
    .orderBy(asc(makesTable.name));

  const canonical = await loadCanonicalVehicles({}, releases);
  const canonicalMakes = new Map<string, { id: number; name: string; slug: string; mark: string; vehicleCount: number; makeKey: string; profileKind: "canonical" }>();
  for (const vehicle of canonical) {
    const item = canonicalMakes.get(vehicle.makeKey);
    if (item) item.vehicleCount += 1;
    else canonicalMakes.set(vehicle.makeKey, {
      id: vehicle.makeId,
      name: vehicle.make,
      slug: vehicle.makeSlug,
      mark: "",
      vehicleCount: 1,
      makeKey: vehicle.makeKey,
      profileKind: "canonical",
    });
  }
  const makesBySlug = new Map(makes.map((make) => [make.slug, { ...make }]));
  for (const canonicalMake of canonicalMakes.values()) {
    const existing = makesBySlug.get(canonicalMake.slug);
    if (existing) existing.vehicleCount += canonicalMake.vehicleCount;
    else makesBySlug.set(canonicalMake.slug, canonicalMake);
  }
  res.json([...makesBySlug.values()].sort((left, right) => left.name.localeCompare(right.name) || left.slug.localeCompare(right.slug)));
});

router.get("/catalog/options", async (_req, res): Promise<void> => {
  const fallbackTrimIds = await getLegacyFallbackTrimIds();
  const queriedOptions = await db
    .select({
      profileId: trimsTable.slug,
      makeId: makesTable.id,
      make: makesTable.name,
      makeSlug: makesTable.slug,
      modelId: modelsTable.id,
      model: modelsTable.name,
      generationId: generationsTable.id,
      generation: generationsTable.name,
      modelYearId: modelYearsTable.id,
      year: modelYearsTable.year,
      trimId: trimsTable.id,
      trim: trimsTable.name,
    })
    .from(trimsTable)
    .innerJoin(modelYearsTable, eq(trimsTable.modelYearId, modelYearsTable.id))
    .innerJoin(generationsTable, eq(modelYearsTable.generationId, generationsTable.id))
    .innerJoin(modelsTable, eq(generationsTable.modelId, modelsTable.id))
    .innerJoin(makesTable, eq(modelsTable.makeId, makesTable.id))
    .where(inArray(trimsTable.id, fallbackTrimIds))
    .orderBy(asc(makesTable.name), asc(modelsTable.name), asc(modelYearsTable.year), asc(trimsTable.name));

  const publicSlugs = await getLegacyPublicSlugs(
    queriedOptions.map((option) => option.trimId),
  );
  const legacyOptions = queriedOptions.map((option) => ({
    ...option,
    profileId: publicSlugs.get(option.trimId) ?? option.profileId,
    makeKey: `legacy:make:${option.makeId}`,
    modelKey: `legacy:model:${option.modelId}`,
    generationKey: `legacy:generation:${option.generationId}`,
    modelYearKey: `legacy:model-year:${option.modelYearId}`,
    trimKey: `legacy:trim:${option.trimId}`,
    profileKind: "legacy" as const,
  }));
  const canonical = await loadCanonicalVehicles({}, releases);
  const canonicalOptions = canonical.map((option) => ({
    profileId: option.id,
    makeId: option.makeId,
    make: option.make,
    makeSlug: option.makeSlug,
    modelId: option.modelId,
    model: option.model,
    generationId: option.generationId,
    generation: option.generation,
    modelYearId: option.modelYearId,
    year: option.year,
    trimId: option.trimId,
    trim: option.trim,
    makeKey: option.makeKey,
    modelKey: option.modelKey,
    generationKey: option.generationKey,
    modelYearKey: option.modelYearKey,
    trimKey: option.trimKey,
    profileKind: "canonical" as const,
  }));
  res.json([...legacyOptions, ...canonicalOptions]);
});

router.get("/makes/:makeSlug", async (req, res): Promise<void> => {
  const parsed = GetMakeParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const fallbackTrimIds = await getLegacyFallbackTrimIds();
  const [make] = await db
    .select({
      id: makesTable.id,
      name: makesTable.name,
      slug: makesTable.slug,
      mark: makesTable.mark,
      vehicleCount: count(
        sql`CASE WHEN ${inArray(trimsTable.id, fallbackTrimIds)} THEN ${trimsTable.id} END`,
      ),
    })
    .from(makesTable)
    .leftJoin(modelsTable, eq(modelsTable.makeId, makesTable.id))
    .leftJoin(generationsTable, eq(generationsTable.modelId, modelsTable.id))
    .leftJoin(modelYearsTable, eq(modelYearsTable.generationId, generationsTable.id))
    .leftJoin(trimsTable, eq(trimsTable.modelYearId, modelYearsTable.id))
    .where(eq(makesTable.slug, parsed.data.makeSlug))
    .groupBy(makesTable.id);

  if (!make) {
    const canonical = await loadCanonicalVehicles({ makeSlug: parsed.data.makeSlug }, releases);
    const canonicalMake = canonical[0];
    if (!canonicalMake) {
      res.status(404).json({ error: "Manufacturer not found" });
      return;
    }
    res.json({
      make: {
        id: canonicalMake.makeId,
        name: canonicalMake.make,
        slug: canonicalMake.makeSlug,
        mark: "",
        vehicleCount: canonical.length,
        makeKey: canonicalMake.makeKey,
        profileKind: "canonical",
      },
      description: "",
      vehicles: serializeVehicleList(canonical),
    });
    return;
  }

  const canonical = await loadCanonicalVehicles({ makeSlug: make.slug }, releases);
  const combinedMake = {
    ...make,
    vehicleCount: make.vehicleCount + canonical.length,
  };
  const vehicles = await loadVehicles({ makeSlug: make.slug, limit: 100 }, releases);
  res.json({
      make: combinedMake,
      description: `${make.name} sample vehicle profiles for ownership research. All figures and problem descriptions in this demo are illustrative, not verified manufacturer or reliability data.`,
      vehicles: serializeVehicleList(vehicles),
  });
});

router.get("/vehicles", async (req, res): Promise<void> => {
  const parsed = ListVehiclesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let vehicles;
  try {
    vehicles = await loadVehicles(
      { ...parsed.data, ...routeNamespaceFilters(req.query as Record<string, unknown>), limit: parsed.data.limit },
      releases,
    );
  } catch (error) {
    respondBadQuery(error, res);
    return;
  }
  res.json(serializeVehicleList(vehicles));
});

router.get("/vehicles/popular", async (_req, res): Promise<void> => {
  const vehicles = await loadVehicles({ sort: "reliability", limit: 8 }, releases);
  res.json(serializeVehicleList(vehicles, ListPopularVehiclesResponse));
});

router.get("/vehicles/trending", async (_req, res): Promise<void> => {
  const vehicles = await loadVehicles({ sort: "popular", limit: 8 }, releases);
  res.json(serializeVehicleList(vehicles, ListTrendingVehiclesResponse));
});

router.get("/vehicles/:vehicleId", async (req, res): Promise<void> => {
  const parsed = GetVehicleParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let row: Awaited<ReturnType<typeof loadVehicles>>[number] | undefined;
  try {
    [row] = await loadVehicles({ vehicleId: parsed.data.vehicleId, limit: 1 }, releases);
  } catch (error) {
    respondBadQuery(error, res);
    return;
  }
  if (!row) {
    res.status(404).json({ error: "Vehicle profile not found" });
    return;
  }

  if (!("trimDbId" in row)) {
    const detail = {
      ...toCanonicalSummary(row),
      overview: row.overview,
      engineName: row.engineName,
      transmissionName: row.transmissionName,
      engines: row.engines,
      transmissions: row.transmissions,
      siblingTrims: row.siblingTrims,
      reliability: {
        score: row.reliabilityEstimate,
        label: row.reliabilityLabel,
        note: row.reliabilityNote,
      },
      fieldStates: {
        ...row.fieldStates,
        "reliability.score": row.fieldStates.reliabilityEstimate,
        "reliability.label": row.fieldStates.reliabilityLabel,
        "reliability.note": row.fieldStates.reliabilityNote,
      },
      commonProblems: row.commonProblems,
      maintenance: row.maintenance,
      insuranceEstimateUsd: row.insuranceEstimateUsd,
      fiveYearDepreciationPercent: row.fiveYearDepreciationPercent,
      expectedLifespanMiles: row.expectedLifespanMiles,
      inspectionChecklist: row.inspectionChecklist,
      recallStatus: row.recallStatus,
      safetyStatus: row.safetyStatus,
    };
    res.json(GetVehicleResponse.parse(detail));
    return;
  }

  const [engines, transmissions, siblings, problems, maintenance] = await Promise.all([
    db.select().from(enginesTable).where(eq(enginesTable.modelYearId, row.modelYearId)).orderBy(asc(enginesTable.horsepower)),
    db.select().from(transmissionsTable).where(eq(transmissionsTable.modelYearId, row.modelYearId)).orderBy(asc(transmissionsTable.name)),
    db.select({ name: trimsTable.name }).from(trimsTable).where(eq(trimsTable.modelYearId, row.modelYearId)).orderBy(asc(trimsTable.priceUsd)),
    db.select().from(commonProblemsTable).where(and(
      eq(commonProblemsTable.modelYearId, row.modelYearId),
      or(isNull(commonProblemsTable.engineId), eq(commonProblemsTable.engineId, row.engineId)),
    )).orderBy(asc(commonProblemsTable.title)),
    db.select().from(maintenanceItemsTable).where(eq(maintenanceItemsTable.trimId, row.trimDbId)).orderBy(asc(maintenanceItemsTable.intervalMiles)),
  ]);

  res.json(
    GetVehicleResponse.parse(
      toVehicleDetail(
        row,
        engines,
        transmissions,
        siblings.map((sibling) => sibling.name),
        problems,
        maintenance,
      ),
    ),
  );
});

router.get("/owner-reports", async (req, res): Promise<void> => {
  const parsed = ListOwnerReportsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let reportFilter: SQL | undefined;
  if (usesCatalogProfileReads()) {
    if (parsed.data.vehicleId) {
      const legacyTrimId = await resolveLegacyFallbackTrimId(parsed.data.vehicleId);
      reportFilter =
        legacyTrimId === undefined
          ? sql`false`
          : eq(ownerReportsTable.trimId, legacyTrimId);
    } else {
      reportFilter = inArray(
        ownerReportsTable.trimId,
        await getLegacyFallbackTrimIds(),
      );
    }
  } else if (parsed.data.vehicleId) {
    reportFilter = eq(trimsTable.slug, parsed.data.vehicleId);
  }

  const reports = await db
    .select({
      id: ownerReportsTable.id,
      trimDbId: ownerReportsTable.trimId,
      vehicleId: trimsTable.slug,
      vehicleLabel: sql<string>`${modelYearsTable.year}::text || ' ' || ${makesTable.name} || ' ' || ${modelsTable.name} || ' ' || ${trimsTable.name}`,
      displayName: ownerReportsTable.displayName,
      ownershipMonths: ownerReportsTable.ownershipMonths,
      milesDriven: ownerReportsTable.milesDriven,
      rating: ownerReportsTable.rating,
      title: ownerReportsTable.title,
      body: ownerReportsTable.body,
      reportedProblem: ownerReportsTable.reportedProblem,
      isDemo: ownerReportsTable.isDemo,
    })
    .from(ownerReportsTable)
    .innerJoin(trimsTable, eq(ownerReportsTable.trimId, trimsTable.id))
    .innerJoin(modelYearsTable, eq(trimsTable.modelYearId, modelYearsTable.id))
    .innerJoin(generationsTable, eq(modelYearsTable.generationId, generationsTable.id))
    .innerJoin(modelsTable, eq(generationsTable.modelId, modelsTable.id))
    .innerJoin(makesTable, eq(modelsTable.makeId, makesTable.id))
    .where(reportFilter)
    .orderBy(desc(ownerReportsTable.createdAt), asc(ownerReportsTable.id));

  const publicSlugs = await getLegacyPublicSlugs(
    reports.map((report) => report.trimDbId),
  );
  const canonicalProfiles = await loadCanonicalVehicles(
    parsed.data.vehicleId ? { vehicleId: parsed.data.vehicleId } : {},
    releases,
  );
  const canonicalReports = canonicalProfiles.flatMap((profile) => profile.ownerReports);
  res.json(
    ListOwnerReportsResponse.parse(
      [...reports.map(({ trimDbId, ...report }) => ({
        ...report,
        vehicleId: publicSlugs.get(trimDbId) ?? report.vehicleId,
      })), ...canonicalReports],
    ),
  );
});

router.get("/discovery/stats", async (_req, res): Promise<void> => {
  const fallbackTrimIds = await getLegacyFallbackTrimIds();
  const [makeStats, vehicleStats, reportStats, canonicalVehicles] = await Promise.all([
    usesCatalogProfileReads()
      ? db.select({ value: count() }).from(consumerBrandsTable)
      : db.select({ value: count() }).from(makesTable),
    Promise.resolve([{ value: fallbackTrimIds.length }]),
    db
      .select({ value: count() })
      .from(ownerReportsTable)
      .where(inArray(ownerReportsTable.trimId, fallbackTrimIds)),
    loadCanonicalVehicles({}, releases),
  ]);
  const stats = {
    makeCount: makeStats[0]?.value ?? 0,
    vehicleCount: (vehicleStats[0]?.value ?? 0) + canonicalVehicles.length,
    reportCount: (reportStats[0]?.value ?? 0) + canonicalVehicles.reduce((total, vehicle) => total + vehicle.ownerReports.length, 0),
    demoLabel: "Illustrative demo catalog",
  };
  res.json(GetDiscoveryStatsResponse.parse(stats));
});

return router;
}

export default createAutomotiveRouter();