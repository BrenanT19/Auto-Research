import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const baseline = JSON.parse(
  readFileSync(
    new URL("../../lib/db/fixtures/auto-research-demo-baseline.json", import.meta.url),
    "utf8",
  ),
);
const tables = baseline.tables;
const expectedProfiles = [
  [4, "ram-1500-2024-big-horn"],
  [5, "gmc-sierra-1500-2024-elevation"],
  [6, "tesla-model-y-2024-performance"],
  [7, "tesla-model-y-2024-long-range"],
  [8, "cadillac-escalade-2024-premium-luxury"],
  [9, "chevrolet-silverado-1500-2024-lt"],
  [10, "chrysler-pacifica-2024-touring"],
  [11, "lincoln-navigator-2023-reserve"],
  [12, "ford-f-150-2024-xlt"],
  [13, "ford-f-150-2024-lariat"],
  [14, "buick-enclave-2024-preferred"],
  [15, "dodge-charger-2023-gt"],
  [16, "jeep-grand-cherokee-2024-laredo"],
];

function localApiBaseUrl() {
  const rawUrl = process.env.AUTO_RESEARCH_API_BASE_URL;
  assert.ok(rawUrl, "AUTO_RESEARCH_API_BASE_URL must point to the temporary local API");
  const url = new URL(rawUrl);
  assert.ok(
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname.toLowerCase()),
    "Auto Research fixture checks must use a local temporary API",
  );
  assert.equal(url.pathname.replace(/\/+$/, ""), "/api");
  return `${url.origin}/api`;
}

async function getJson(path) {
  const response = await fetch(`${localApiBaseUrl()}${path}`, {
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json();
  assert.equal(response.status, 200, `${path} should return 200; response: ${JSON.stringify(body)}`);
  return body;
}

function mapById(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

test("the checked-in baseline pins all 13 legacy IDs, slugs, demo flags, and child links", () => {
  assert.equal(baseline.format, "auto-research-demo-baseline.v1");
  assert.equal(baseline.classification, "demo_fixture");
  assert.deepEqual(
    tables.trims.map(({ id, slug }) => [id, slug]),
    expectedProfiles,
  );
  assert.ok(tables.trims.every((row) => row.is_demo === true));

  for (const table of [
    "ownership_estimates",
    "maintenance_items",
    "common_problems",
    "owner_reports",
  ]) {
    assert.ok(tables[table].every((row) => row.is_demo === true), `${table} must remain demo`);
  }
  assert.equal(tables.recalls.length, 0);
  assert.equal(tables.safety_ratings.length, 0);
  assert.deepEqual(
    Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
    baseline.counts,
  );
});

test("legacy list, catalog, make, and discovery endpoints retain all 13 profiles", async () => {
  const [vehicles, options, makes, stats, popular, trending] = await Promise.all([
    getJson("/vehicles?limit=100"),
    getJson("/catalog/options"),
    getJson("/makes"),
    getJson("/discovery/stats"),
    getJson("/vehicles/popular"),
    getJson("/vehicles/trending"),
  ]);
  const expectedSlugs = expectedProfiles.map(([, slug]) => slug).sort();

  assert.equal(vehicles.length, 13);
  assert.deepEqual(vehicles.map((vehicle) => vehicle.id).sort(), expectedSlugs);
  assert.deepEqual(options.map((option) => option.profileId).sort(), expectedSlugs);
  assert.equal(makes.length, 11);
  assert.equal(makes.reduce((total, make) => total + make.vehicleCount, 0), 13);
  assert.deepEqual(stats, {
    makeCount: 11,
    vehicleCount: 13,
    reportCount: 13,
    demoLabel: "Illustrative demo catalog",
  });

  for (const rows of [vehicles, popular, trending]) {
    assert.ok(rows.every((vehicle) => expectedSlugs.includes(vehicle.id)));
    assert.ok(rows.every((vehicle) => vehicle.isDemo === true));
  }
  assert.equal(popular.length, 8);
  assert.equal(trending.length, 8);
});

test("Browse make, model, and year filters resolve the same public profile choices", async () => {
  const modelById = mapById(tables.models);
  const generationById = mapById(tables.generations);
  const modelYearById = mapById(tables.model_years);
  const makeById = mapById(tables.makes);
  const profileMetadata = tables.trims.map((trim) => {
    const modelYear = modelYearById.get(trim.model_year_id);
    const generation = generationById.get(modelYear.generation_id);
    const model = modelById.get(generation.model_id);
    const make = makeById.get(model.make_id);
    return {
      slug: trim.slug,
      makeSlug: make.slug,
      model: model.name,
      year: modelYear.year,
    };
  });

  for (const make of tables.makes) {
    const vehicles = await getJson(
      `/vehicles?makeSlug=${encodeURIComponent(make.slug)}&limit=100`,
    );
    const expected = profileMetadata
      .filter((profile) => profile.makeSlug === make.slug)
      .map((profile) => profile.slug)
      .sort();
    assert.deepEqual(
      vehicles.map((vehicle) => vehicle.id).sort(),
      expected,
      `${make.slug} Browse results must keep the existing profiles`,
    );

    const makePage = await getJson(`/makes/${encodeURIComponent(make.slug)}`);
    assert.deepEqual(
      makePage.vehicles.map((vehicle) => vehicle.id).sort(),
      expected,
      `${make.slug} manufacturer page must keep the same profile links`,
    );
  }

  const fordF150 = await getJson(
    "/vehicles?makeSlug=ford&model=F-150&year=2024&limit=100",
  );
  assert.deepEqual(
    fordF150.map((vehicle) => vehicle.id).sort(),
    profileMetadata
      .filter(
        (profile) =>
          profile.makeSlug === "ford" &&
          profile.model === "F-150" &&
          profile.year === 2024,
      )
      .map((profile) => profile.slug)
      .sort(),
  );
});

test("Compare selections and Calculator prefill resolve public slugs to unchanged profile data", async () => {
  const list = await getJson("/vehicles?limit=100");
  const listById = new Map(list.map((vehicle) => [vehicle.id, vehicle]));
  const compareSlugs = [
    "ford-f-150-2024-xlt",
    "tesla-model-y-2024-performance",
    "jeep-grand-cherokee-2024-laredo",
  ];

  for (const slug of compareSlugs) {
    const detail = await getJson(`/vehicles/${encodeURIComponent(slug)}`);
    const listVehicle = listById.get(slug);
    assert.ok(listVehicle, `${slug} must remain selectable for Compare`);
    assert.equal(detail.id, slug);
    assert.deepEqual(
      [
        detail.priceUsd,
        detail.fuelType,
        detail.mpgCity,
        detail.mpgHighway,
        detail.mpgCombined,
      ],
      [
        listVehicle.priceUsd,
        listVehicle.fuelType,
        listVehicle.mpgCity,
        listVehicle.mpgHighway,
        listVehicle.mpgCombined,
      ],
      `${slug} Compare detail must match the Browse choice`,
    );
  }

  const calculatorPrefill = await getJson(
    "/vehicles/tesla-model-y-2024-performance",
  );
  assert.equal(calculatorPrefill.id, "tesla-model-y-2024-performance");
  assert.equal(calculatorPrefill.isDemo, true);
  assert.equal(calculatorPrefill.priceUsd, 52000);
  assert.equal(calculatorPrefill.fuelType, "Electric");
  assert.equal(calculatorPrefill.mpgCombined, 111);
  assert.equal(calculatorPrefill.horsepower, 456);
});

test("every demo summary keeps the original numeric estimates after nullable contract changes", async () => {
  const list = await getJson("/vehicles?limit=100");
  const estimates = new Map(tables.ownership_estimates.map((row) => [row.trim_id, row]));
  for (const trim of tables.trims) {
    const summary = list.find((vehicle) => vehicle.id === trim.slug);
    assert.ok(summary);
    const estimate = estimates.get(trim.id);
    assert.deepEqual(
      [
        summary.priceUsd, summary.mpgCombined, summary.reliabilityEstimate,
        summary.annualOwnershipEstimateUsd, summary.annualMaintenanceEstimateUsd,
        summary.annualRepairEstimateUsd, summary.annualFuelEstimateUsd,
      ],
      [
        trim.price_usd, trim.mpg_combined, estimate.reliability_score,
        estimate.annual_ownership_usd, estimate.annual_maintenance_usd,
        estimate.annual_repair_usd, estimate.annual_fuel_usd,
      ],
      `${trim.slug} must retain its demo values rather than sparse-profile defaults`,
    );
  }
});

test("each legacy profile and its existing demo child rows resolve through the API", async () => {
  const makeById = mapById(tables.makes);
  const modelById = mapById(tables.models);
  const generationById = mapById(tables.generations);
  const modelYearById = mapById(tables.model_years);
  const engineById = mapById(tables.engines);
  const transmissionById = mapById(tables.transmissions);
  const estimateByTrimId = new Map(tables.ownership_estimates.map((row) => [row.trim_id, row]));

  for (const trim of tables.trims) {
    const modelYear = modelYearById.get(trim.model_year_id);
    const generation = generationById.get(modelYear.generation_id);
    const model = modelById.get(generation.model_id);
    const make = makeById.get(model.make_id);
    const engine = engineById.get(trim.engine_id);
    const transmission = transmissionById.get(trim.transmission_id);
    const estimate = estimateByTrimId.get(trim.id);

    const detail = await getJson(`/vehicles/${encodeURIComponent(trim.slug)}`);
    assert.equal(detail.id, trim.slug);
    assert.equal(detail.isDemo, true);
    assert.deepEqual(
      [detail.make, detail.makeSlug, detail.model, detail.modelSlug, detail.year, detail.trim],
      [make.name, make.slug, model.name, model.slug, modelYear.year, trim.name],
    );
    assert.deepEqual(
      [detail.horsepower, detail.priceUsd, detail.mpgCity, detail.mpgHighway, detail.mpgCombined],
      [trim.horsepower, trim.price_usd, trim.mpg_city, trim.mpg_highway, trim.mpg_combined],
    );
    assert.equal(detail.engineName, engine.name);
    assert.equal(detail.transmissionName, transmission.name);
    assert.deepEqual(detail.reliability, {
      score: estimate.reliability_score,
      label: estimate.reliability_label,
      note: estimate.reliability_note,
    });

    const expectedSiblings = tables.trims
      .filter((candidate) => candidate.model_year_id === trim.model_year_id)
      .sort((left, right) => left.price_usd - right.price_usd)
      .map((candidate) => candidate.name);
    assert.deepEqual(detail.siblingTrims, expectedSiblings);

    const expectedEngines = tables.engines
      .filter((candidate) => candidate.model_year_id === trim.model_year_id)
      .sort((left, right) => left.horsepower - right.horsepower)
      .map(({ name, horsepower, fuel_type, availability }) => ({
        name,
        horsepower,
        fuelType: fuel_type,
        availability,
      }));
    assert.deepEqual(detail.engines, expectedEngines);

    const expectedTransmissions = tables.transmissions
      .filter((candidate) => candidate.model_year_id === trim.model_year_id)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(({ name, gears, availability }) => ({ name, gears, availability }));
    assert.deepEqual(detail.transmissions, expectedTransmissions);

    const expectedProblems = tables.common_problems
      .filter(
        (problem) =>
          problem.model_year_id === trim.model_year_id &&
          (problem.engine_id === null || problem.engine_id === trim.engine_id),
      )
      .sort((left, right) => left.title.localeCompare(right.title))
      .map((problem) => ({
        title: problem.title,
        description: problem.description,
        applicability: problem.engine_id === trim.engine_id ? "applies" : "unknown",
        typicalMileageStart: problem.typical_mileage_start,
        typicalMileageEnd: problem.typical_mileage_end,
        repairCostLowUsd: problem.repair_cost_low_usd,
        repairCostHighUsd: problem.repair_cost_high_usd,
        severity: problem.severity,
      }));
    assert.deepEqual(detail.commonProblems, expectedProblems);

    const expectedMaintenance = tables.maintenance_items
      .filter((item) => item.trim_id === trim.id)
      .sort((left, right) => left.interval_miles - right.interval_miles)
      .map(({ item, interval_miles, estimated_cost_usd }) => ({
        item,
        intervalMiles: interval_miles,
        estimatedCostUsd: estimated_cost_usd,
      }));
    assert.deepEqual(detail.maintenance, expectedMaintenance);

    const reports = await getJson(`/owner-reports?vehicleId=${encodeURIComponent(trim.slug)}`);
    const expectedReports = tables.owner_reports
      .filter((report) => report.trim_id === trim.id)
      .map((report) => ({ id: report.id, vehicleId: trim.slug, isDemo: report.is_demo }));
    assert.deepEqual(
      reports.map(({ id, vehicleId, isDemo }) => ({ id, vehicleId, isDemo })),
      expectedReports,
    );
    assert.ok(reports.every((report) => report.isDemo === true), "Legacy reports remain visibly illustrative.");
    assert.ok(reports.every((report) => report.vehicleId === trim.slug), "A saved report link must not change vehicle identity.");
  }
});