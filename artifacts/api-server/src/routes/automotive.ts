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
} from "@workspace/db";
import {
  getLegacyPublicSlugs,
  getLegacyFallbackTrimIds,
  resolveLegacyFallbackTrimId,
  usesCatalogProfileReads,
} from "../lib/vehicle-profile-source";

const router: IRouter = Router();

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

async function loadVehicles(options: {
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
    .limit(options.limit ?? 100);
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
  row: Awaited<ReturnType<typeof loadVehicles>>[number],
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

  res.json(ListMakesResponse.parse(makes));
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
  const options = queriedOptions.map((option) => ({
    ...option,
    profileId: publicSlugs.get(option.trimId) ?? option.profileId,
  }));
  res.json(GetCatalogOptionsResponse.parse(options));
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
    res.status(404).json({ error: "Manufacturer not found" });
    return;
  }

  const vehicles = await loadVehicles({ makeSlug: make.slug, limit: 100 });
  res.json(
    GetMakeResponse.parse({
      make,
      description: `${make.name} sample vehicle profiles for ownership research. All figures and problem descriptions in this demo are illustrative, not verified manufacturer or reliability data.`,
      vehicles,
    }),
  );
});

router.get("/vehicles", async (req, res): Promise<void> => {
  const parsed = ListVehiclesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const vehicles = await loadVehicles({ ...parsed.data, limit: parsed.data.limit });
  res.json(ListVehiclesResponse.parse(vehicles));
});

router.get("/vehicles/popular", async (_req, res): Promise<void> => {
  const vehicles = await loadVehicles({ sort: "reliability", limit: 8 });
  res.json(ListPopularVehiclesResponse.parse(vehicles));
});

router.get("/vehicles/trending", async (_req, res): Promise<void> => {
  const vehicles = await loadVehicles({ sort: "popular", limit: 8 });
  res.json(ListTrendingVehiclesResponse.parse(vehicles));
});

router.get("/vehicles/:vehicleId", async (req, res): Promise<void> => {
  const parsed = GetVehicleParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await loadVehicles({ vehicleId: parsed.data.vehicleId, limit: 1 });
  if (!row) {
    res.status(404).json({ error: "Vehicle profile not found" });
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
  res.json(
    ListOwnerReportsResponse.parse(
      reports.map(({ trimDbId, ...report }) => ({
        ...report,
        vehicleId: publicSlugs.get(trimDbId) ?? report.vehicleId,
      })),
    ),
  );
});

router.get("/discovery/stats", async (_req, res): Promise<void> => {
  const fallbackTrimIds = await getLegacyFallbackTrimIds();
  const [makeStats, vehicleStats, reportStats] = await Promise.all([
    usesCatalogProfileReads()
      ? db.select({ value: count() }).from(consumerBrandsTable)
      : db.select({ value: count() }).from(makesTable),
    Promise.resolve([{ value: fallbackTrimIds.length }]),
    db
      .select({ value: count() })
      .from(ownerReportsTable)
      .where(inArray(ownerReportsTable.trimId, fallbackTrimIds)),
  ]);
  const stats = {
    makeCount: makeStats[0]?.value ?? 0,
    vehicleCount: vehicleStats[0]?.value ?? 0,
    reportCount: reportStats[0]?.value ?? 0,
    demoLabel: "Illustrative demo catalog",
  };
  res.json(GetDiscoveryStatsResponse.parse(stats));
});

export default router;