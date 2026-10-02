import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { demoBaseline, seedTask32CanonicalFixtures, seedOwnerReportApplicabilityFixtures } from "../../lib/db/scripts/auto-research-task32-fixtures.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const requireApi = createRequire(resolve(workspaceRoot, "artifacts/api-server/package.json"));
const requireDb = createRequire(resolve(workspaceRoot, "lib/db/package.json"));
const express = requireApi("express");
const { Pool } = requireDb("pg");
const expectedLegacySlugs = demoBaseline.tables.trims.map(({ slug }) => slug).sort();
const expectedLegacyMakeSlugs = demoBaseline.tables.makes.map(({ slug }) => slug).sort();
const databaseUrl = process.env.DATABASE_URL;

function assertDisposableDatabaseUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw ?? "");
  } catch {
    throw new Error("Task32 HTTP acceptance tests require DATABASE_URL for their isolated disposable database.");
  }
  const name = decodeURIComponent(parsed.pathname.slice(1));
  assert.ok(["postgres:", "postgresql:"].includes(parsed.protocol), "Task32 tests require PostgreSQL.");
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname), "Task32 tests require local PostgreSQL.");
  assert.match(name, /^auto_research_task32_\d+_[a-f0-9]{8}$/, "Refusing a non-disposable Task32 database.");
  return parsed;
}

assertDisposableDatabaseUrl(databaseUrl);

const pool = new Pool({ connectionString: databaseUrl });
let server;
let apiBaseUrl;
let baselineResponses;
let synthetic;

const routePaths = [
  "/catalog/options",
  "/vehicles?limit=100",
  "/makes",
  "/makes/ford",
  "/discovery/stats",
  ...expectedLegacySlugs.flatMap((slug) => [
    `/vehicles/${encodeURIComponent(slug)}`,
    `/owner-reports?vehicleId=${encodeURIComponent(slug)}`,
  ]),
];

async function responseAt(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(10_000) });
  const bodyText = await response.text();
  let body = bodyText;
  try {
    body = JSON.parse(bodyText);
  } catch {
    // Keep error text to make a failed assertion useful.
  }
  return { status: response.status, body };
}

async function captureLegacyRows(baseUrl) {
  const [list, options, ...others] = await Promise.all([
    responseAt(baseUrl, "/vehicles?limit=100"),
    responseAt(baseUrl, "/catalog/options"),
    ...routePaths.slice(2).map((path) => responseAt(baseUrl, path)),
  ]);
  assert.equal(list.status, 200);
  assert.equal(options.status, 200);
  const legacyList = list.body.filter((vehicle) => expectedLegacySlugs.includes(vehicle.id));
  const legacyOptions = options.body.filter((option) => expectedLegacySlugs.includes(option.profileId));
  assert.deepEqual(legacyList.map(({ id }) => id).sort(), expectedLegacySlugs);
  assert.deepEqual(legacyOptions.map(({ profileId }) => profileId).sort(), expectedLegacySlugs);
  const result = new Map();
  for (const [index, path] of routePaths.slice(2).entries()) {
    const response = others[index];
    assert.equal(response.status, 200, `${path} should retain a successful legacy response`);
    if (path === "/makes") {
      const legacyMakes = response.body.filter((make) => expectedLegacyMakeSlugs.includes(make.slug));
      assert.deepEqual(legacyMakes.map(({ slug }) => slug).sort(), expectedLegacyMakeSlugs);
      result.set(path, legacyMakes.sort((a, b) => a.slug.localeCompare(b.slug)));
    } else if (path === "/discovery/stats") {
      assert.equal(response.body.reportCount, demoBaseline.tables.owner_reports.length);
      result.set(path, {
        reportCount: response.body.reportCount,
        demoLabel: response.body.demoLabel,
      });
    } else {
      result.set(path, response.body);
    }
  }
  result.set("/vehicles?limit=100", legacyList.sort((a, b) => a.id.localeCompare(b.id)));
  result.set("/catalog/options", legacyOptions.sort((a, b) => a.profileId.localeCompare(b.profileId)));
  return result;
}

async function startExpressHarness(router) {
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  const listener = await new Promise((resolvePromise, reject) => {
    const candidate = app.listen(0, "127.0.0.1", () => resolvePromise(candidate));
    candidate.once("error", reject);
  });
  const address = listener.address();
  assert.ok(address && typeof address !== "string");
  return { listener, baseUrl: `http://127.0.0.1:${address.port}/api` };
}

async function stopExpressHarness() {
  if (!server) return;
  await new Promise((resolvePromise, reject) =>
    server.listener.close((error) => (error ? reject(error) : resolvePromise())),
  );
  server = undefined;
}

async function openRouter(releases) {
  const { createAutomotiveRouter } = await import("../../artifacts/api-server/src/routes/automotive.ts");
  assert.equal(typeof createAutomotiveRouter, "function", "automotive.ts must export its injected router factory.");
  const injected = releases?.map(({ configurationId, identityClaimId }) => ({
    configurationId,
    identityClaimId,
  }));
  return createAutomotiveRouter(releases === undefined ? undefined : { releases: injected });
}

before(async () => {
  const router = await openRouter();
  server = await startExpressHarness(router);
  apiBaseUrl = server.baseUrl;
  baselineResponses = await captureLegacyRows(apiBaseUrl);
});

after(async () => {
  await stopExpressHarness();
  await pool.end();
  const databaseModule = await import("../../lib/db/src/index.ts");
  await databaseModule.pool.end();
});

test("the production router factory defaults to an empty canonical release set", async () => {
  const policy = await import("../../artifacts/api-server/src/lib/canonical-policy.ts");
  const source = await import("../../artifacts/api-server/src/lib/canonical-vehicle-source.ts");
  const productionManifest = policy.CANONICAL_RELEASE_MANIFEST ?? source.CANONICAL_RELEASE_MANIFEST;
  assert.deepEqual(productionManifest, [], "The checked-in production release manifest must remain empty.");
  const canonical = await responseAt(apiBaseUrl, "/vehicles/task32-synthetic-alpha");
  assert.equal(canonical.status, 404, "An identity must not be publicly released by the default factory.");
  assert.deepEqual(await captureLegacyRows(apiBaseUrl), baselineResponses);
});

test("all 13 legacy demo profiles retain their API parity before and after canonical fixture writes", async () => {
  const fixturesClient = await pool.connect();
  try {
    // Seed helper receives a connected client; keep fixture setup outside an open transaction.
    synthetic = await seedTask32CanonicalFixtures(fixturesClient);
  } finally {
    fixturesClient.release();
  }

  await stopExpressHarness();
  server = await startExpressHarness(await openRouter(synthetic.releases));
  apiBaseUrl = server.baseUrl;
  const afterInsert = await captureLegacyRows(apiBaseUrl);
  assert.deepEqual(afterInsert, baselineResponses, "Canonical rows must not rewrite any legacy profile, child response, ID, or demo marker.");
  assert.equal(baselineResponses.get("/vehicles?limit=100").length, 13);
  assert.ok(baselineResponses.get("/vehicles?limit=100").every((vehicle) => vehicle.isDemo === true));
});

test("a released supported sparse profile has nullable research, explicit state maps, provenance, and no synthetic demo fallback", async () => {
  const { release } = synthetic;
  const [detailResponse, listResponse, optionsResponse, ownersResponse, makeListResponse, makeResponse, statsResponse] = await Promise.all([
    responseAt(apiBaseUrl, `/vehicles/${encodeURIComponent(release.slug)}`),
    responseAt(apiBaseUrl, "/vehicles?limit=100"),
    responseAt(apiBaseUrl, "/catalog/options"),
    responseAt(apiBaseUrl, `/owner-reports?vehicleId=${encodeURIComponent(release.slug)}`),
    responseAt(apiBaseUrl, "/makes"),
    responseAt(apiBaseUrl, `/makes/${canonicalVehicleMakeSlug()}`),
    responseAt(apiBaseUrl, "/discovery/stats"),
  ]);
  assert.equal(detailResponse.status, 200);
  const detail = detailResponse.body;
  assert.equal(detail.id, release.slug);
  assert.equal(detail.profileKind, "canonical");
  assert.equal(detail.isDemo, false);
  assert.equal(detail.priceUsd, null);
  assert.equal(detail.horsepower, 123);
  assert.equal(detail.mpgCombined, null);
  assert.equal(detail.transmissionName, null);
  assert.equal(detail.reliabilityEstimate, null);
  assert.equal(detail.recallStatus, null);
  assert.equal(detail.safetyStatus, null);
  assert.deepEqual(detail.reliability, { score: null, label: null, note: null });

  for (const stateMapName of ["fieldStates", "sectionStates"]) {
    const states = detail[stateMapName];
    assert.ok(states && typeof states === "object" && !Array.isArray(states), `${stateMapName} must be an object map`);
    for (const [key, fieldState] of Object.entries(states)) {
      assert.ok(key.length > 0);
      assert.ok(fieldState && typeof fieldState.state === "string");
      assert.ok(fieldState.reason === undefined || fieldState.reason === null || typeof fieldState.reason === "string");
      assert.ok(Array.isArray(fieldState.claimIds));
    }
  }

  assert.ok(Array.isArray(detail.claims), "Canonical detail must disclose claim/provenance metadata.");
  const identityClaim = detail.claims.find((claim) =>
    String(claim.id) === String(release.identityClaimId) || String(claim.claimId) === String(release.identityClaimId));
  assert.ok(identityClaim, "The accepted identity claim that gated this release must be disclosed.");
  const provenance = JSON.stringify(identityClaim);
  assert.match(provenance, /task32\.synthetic|example\.invalid/i, "At least one source or approval reference must be included.");
  assert.match(provenance, /evidence|source|locator|approval/i, "Claim metadata must include source/evidence provenance.");
  assert.ok(Array.isArray(detail.commonProblems) && detail.commonProblems.length === 0);
  assert.ok(Array.isArray(detail.maintenance) && detail.maintenance.length === 0);
  assert.ok(Array.isArray(detail.ownerReports) ? detail.ownerReports.length === 0 : ownersResponse.body.length === 0);
  assert.equal(ownersResponse.status, 200);
  assert.deepEqual(ownersResponse.body, [], "Canonical identity does not imply classified owner experience.");

  assert.equal(listResponse.status, 200);
  const listProfile = listResponse.body.find((vehicle) => vehicle.id === release.slug);
  assert.ok(listProfile, "A released canonical identity must be a Browse choice.");
  assert.equal(listProfile.profileKind, "canonical");
  assert.equal(listProfile.isDemo, false);
  assert.equal(listProfile.priceUsd, null);
  assert.equal(optionsResponse.status, 200);
  assert.ok(optionsResponse.body.some((option) => option.profileId === release.slug));
  assert.equal(makeListResponse.status, 200);
  const canonicalMakeSummary = makeListResponse.body.find((make) => make.slug === canonicalVehicleMakeSlug());
  assert.ok(canonicalMakeSummary);
  assert.equal(canonicalMakeSummary.vehicleCount, synthetic.releases.length);
  assert.equal(makeResponse.status, 200, "A released canonical manufacturer must resolve through its public slug.");
  assert.ok(makeResponse.body.vehicles.some((vehicle) => vehicle.id === release.slug));
  const canonicalManufacturerVehicles = makeResponse.body.vehicles.filter((vehicle) => vehicle.profileKind === "canonical");
  assert.equal(canonicalManufacturerVehicles.length, synthetic.releases.length, "Canonical aliases must not duplicate a released configuration.");
  assert.equal(new Set(canonicalManufacturerVehicles.map((vehicle) => vehicle.canonicalConfigurationId)).size, synthetic.releases.length);
  assert.equal(makeResponse.body.make.vehicleCount, synthetic.releases.length);
  assert.equal(statsResponse.status, 200);
  assert.equal(statsResponse.body.reportCount, baselineResponses.get("/discovery/stats").reportCount);
});

test("identity-only vehicles remain discoverable and comparable without any optional research", async () => {
  // This released fixture has identity evidence only, unlike the primary fixture
  // which has some known specifications and several withheld research attempts.
  const id = synthetic.collision.aliasSlug;
  const [detailResponse, listResponse, optionsResponse] = await Promise.all([
    responseAt(apiBaseUrl, `/vehicles/${encodeURIComponent(id)}`),
    responseAt(apiBaseUrl, `/vehicles?modelKey=canonical:model:${synthetic.collision.modelId}`),
    responseAt(apiBaseUrl, "/catalog/options"),
  ]);
  assert.equal(detailResponse.status, 200);
  assert.equal(listResponse.status, 200);
  assert.equal(optionsResponse.status, 200);
  const detail = detailResponse.body;
  const summary = listResponse.body.find((vehicle) => vehicle.id === id);
  assert.ok(summary, "Identity-only vehicles must be selectable in Browse and Compare.");
  assert.ok(optionsResponse.body.some((option) => option.profileId === id));
  assert.equal(detail.id, summary.id, "Detail and calculator URLs retain the exact public ID.");
  assert.equal(detail.isDemo, false);
  assert.equal(detail.profileKind, "canonical");
  for (const field of [
    "priceUsd", "reliabilityEstimate", "annualOwnershipEstimateUsd",
    "annualMaintenanceEstimateUsd", "annualRepairEstimateUsd",
    "annualFuelEstimateUsd", "mpgCombined", "horsepower", "fuelType",
  ]) {
    assert.equal(detail[field], null, `${field} must not invent a value.`);
    assert.equal(summary[field], null);
    assert.equal(detail.fieldStates[field].state, "not_yet_researched");
    assert.deepEqual(summary.fieldStates[field], detail.fieldStates[field]);
  }
  for (const field of [
    "overview", "engineName", "transmissionName", "insuranceEstimateUsd",
    "fiveYearDepreciationPercent", "expectedLifespanMiles", "recallStatus", "safetyStatus",
  ]) assert.equal(detail[field], null, `${field} must stay explicitly unavailable.`);
  assert.deepEqual(detail.reliability, { score: null, label: null, note: null });
  for (const section of ["engines", "transmissions", "commonProblems", "maintenance", "inspectionChecklist"]) {
    assert.deepEqual(detail[section], []);
    assert.equal(detail.sectionStates[section].state, "not_yet_researched");
  }
  for (const sort of ["popular", "reliability", "ownership-cost"]) {
    const sorted = await responseAt(apiBaseUrl, `/vehicles?sort=${sort}&limit=100`);
    assert.equal(sorted.status, 200);
    assert.ok(sorted.body.some((vehicle) => vehicle.id === id), `${sort} cannot hide missing research.`);
  }
});

test("rejected, stale, demo, rights-pending, conflicting, wrong-unit/type, mismatched, and empty-scope claims fail closed", async () => {
  const response = await responseAt(apiBaseUrl, `/vehicles/${encodeURIComponent(synthetic.release.slug)}`);
  assert.equal(response.status, 200);
  const detail = response.body;
  const expectedUnavailableFields = [
    "priceUsd",
    "mpgCity",
    "mpgHighway",
    "bodyType",
  ];
  for (const code of expectedUnavailableFields) {
    const state = detail.fieldStates?.[code];
    assert.equal(detail[code], null, `${code} from a rejected, stale, rights-pending, or conflicting claim must not leak.`);
    if (state) {
      assert.notEqual(state.state, "known", `${code} must not be promoted to an accepted fact.`);
      assert.ok(Array.isArray(state.claimIds));
    }
  }
  assert.equal(detail.horsepower, 123);
  assert.equal(detail.fieldStates?.horsepower?.state, "known");
  assert.deepEqual(detail.fieldStates?.horsepower?.claimIds, [String(synthetic.knownClaimId)]);
  assert.equal(detail.fieldStates?.mpgCombined?.state, "unknown");
  assert.equal(detail.fieldStates?.fuelType?.state, "not_applicable");
  assert.notEqual(detail.fieldStates?.transmissionName?.state, "known");
  assert.equal(detail.drivetrain, null, "Partial, empty, and mismatched applicability must not broaden a claim.");
  assert.equal(detail.engineName, null, "A numeric field definition cannot be projected as a textual engine name.");
  assert.equal(detail.fieldStates?.engineName?.state, "unknown");
  assert.ok(detail.claims.every((claim) => claim.contentClass !== "demo_fixture"));
  assert.ok(
    detail.claims.every((claim) => claim.id !== String(synthetic.staleLatestAcceptedClaimId)),
    "A stale claim row remains ineligible even if its latest review event says accepted.",
  );
  for (const field of ["recallStatus", "safetyStatus"]) {
    assert.notEqual(detail.fieldStates?.[field]?.state, "known", `${field} must not be presented as verified without evidence.`);
  }
});

test("removing optional evidence withdraws its value while preserving the canonical identity", async () => {
  await pool.query("DELETE FROM spec_claim_values WHERE research_claim_id = $1", [synthetic.knownClaimId]);
  const response = await responseAt(apiBaseUrl, `/vehicles/${encodeURIComponent(synthetic.release.slug)}`);
  assert.equal(response.status, 200, "Removing one optional research claim must not remove the released profile.");
  assert.equal(response.body.id, synthetic.release.slug);
  assert.notEqual(response.body.fieldStates?.horsepower?.state, "known");
  assert.equal(response.body.horsepower, null);
});

test("duplicate aliases and qualified hierarchy collisions do not merge public identities", async () => {
  const response = await responseAt(apiBaseUrl, `/vehicles/${encodeURIComponent(synthetic.release.slug)}`);
  assert.equal(response.status, 200);
  const body = response.body;
  assert.equal(body.make, "Task32 Synthetic Motor");
  assert.equal(body.model, "Synthetic Alpha");
  assert.equal(body.year, 2025);
  assert.equal(body.trim, "Sparse Test");
  const choices = await responseAt(apiBaseUrl, "/catalog/options");
  const releasedChoices = choices.body.filter((option) => option.profileId === synthetic.release.slug);
  assert.equal(releasedChoices.length, 1, "A model alias collision cannot duplicate the released vehicle choice.");
  const duplicateModelNames = choices.body.filter((option) => option.profileKind === "canonical" && option.model === "Synthetic Shared Name");
  assert.equal(duplicateModelNames.length, 2);
  assert.equal(new Set(duplicateModelNames.map((option) => option.modelKey)).size, 2);
  assert.equal(new Set(duplicateModelNames.map((option) => option.profileId)).size, 2);
  const canonicalChoices = choices.body.filter((option) => option.profileKind === "canonical");
  const hierarchyTuple = (option) =>
    [option.makeId, option.modelId, option.generationId, option.modelYearId, option.trimId].join(":");
  assert.equal(
    new Set(canonicalChoices.map(hierarchyTuple)).size,
    canonicalChoices.length,
    "Multiple exact-supported slugs for one configuration must not duplicate catalog options.",
  );
  const alternateAlias = await responseAt(apiBaseUrl, `/vehicles/${encodeURIComponent(synthetic.duplicateAliasSlug)}`);
  assert.equal(alternateAlias.status, 200, "Exact-supported aliases remain valid links even when deduplicated from Browse.");
  assert.equal(alternateAlias.body.canonicalConfigurationId, synthetic.primary.configurationId);
  const primaryRows = (await responseAt(apiBaseUrl, "/vehicles?limit=100")).body.filter(
    (vehicle) => vehicle.canonicalConfigurationId === synthetic.primary.configurationId,
  );
  assert.equal(primaryRows.length, 1, "A configuration with multiple aliases appears once in the vehicle list.");
  const primaryHierarchy = await responseAt(
    apiBaseUrl,
    `/vehicles?limit=100&modelKey=${encodeURIComponent(`canonical:model:${synthetic.primary.modelId}`)}`,
  );
  const collisionHierarchy = await responseAt(
    apiBaseUrl,
    `/vehicles?limit=100&modelKey=${encodeURIComponent(`canonical:model:${synthetic.collision.modelId}`)}`,
  );
  assert.deepEqual(primaryHierarchy.body.map((vehicle) => vehicle.id), [synthetic.primary.aliasSlug]);
  assert.deepEqual(collisionHierarchy.body.map((vehicle) => vehicle.id), [synthetic.collision.aliasSlug]);
  const contradictoryKey = await responseAt(
    apiBaseUrl,
    `/vehicles?limit=100&modelKey=${encodeURIComponent(`canonical:model:${synthetic.primary.modelId}`)}&modelId=${synthetic.collision.modelId}`,
  );
  assert.equal(contradictoryKey.status, 400, "A namespace-qualified hierarchy collision must fail closed.");

  const hierarchyFilters = [
    ["modelKey", "model", synthetic.primary.modelId],
    ["generationKey", "generation", synthetic.primary.generationId],
    ["modelYearKey", "model-year", synthetic.primary.modelYearId],
    ["trimKey", "trim", synthetic.primary.trimId],
  ];
  for (const [queryName, keyKind, id] of hierarchyFilters) {
    const filtered = await responseAt(
      apiBaseUrl,
      `/vehicles?limit=100&${queryName}=${encodeURIComponent(`canonical:${keyKind}:${id}`)}`,
    );
    assert.equal(filtered.status, 200, `${queryName} must be accepted as a qualified hierarchy filter.`);
    assert.ok(filtered.body.length > 0);
    assert.ok(filtered.body.every((vehicle) => vehicle.profileKind === "canonical"));
    assert.ok(filtered.body.every((vehicle) => vehicle.canonicalConfigurationId === synthetic.primary.configurationId));
    assert.equal(
      new Set(filtered.body.map((vehicle) => vehicle.canonicalConfigurationId)).size,
      filtered.body.length,
      `${queryName} must return one row per canonical configuration.`,
    );
  }

  assert.ok(
    demoBaseline.tables.models.some(({ id }) => id === synthetic.primary.modelId),
    "The fixture must contain a legacy/canonical model numeric-ID collision.",
  );
  const legacyCollisionProfileIds = baselineResponses.get("/catalog/options")
    .filter((option) => option.modelId === synthetic.primary.modelId)
    .map((option) => option.profileId)
    .sort();
  assert.ok(legacyCollisionProfileIds.length > 0);
  const numericNamespaceCollision = await responseAt(
    apiBaseUrl,
    `/vehicles?limit=100&modelKey=${encodeURIComponent(`legacy:model:${synthetic.primary.modelId}`)}`,
  );
  assert.equal(numericNamespaceCollision.status, 200);
  assert.deepEqual(numericNamespaceCollision.body.map((vehicle) => vehicle.id).sort(), legacyCollisionProfileIds);
  assert.ok(numericNamespaceCollision.body.every((vehicle) =>
    vehicle.profileKind !== "canonical" && vehicle.canonicalConfigurationId == null));

  const globallySorted = await responseAt(apiBaseUrl, "/vehicles?sort=ownership-cost&limit=100");
  const globallyLimited = await responseAt(apiBaseUrl, "/vehicles?sort=ownership-cost&limit=1");
  assert.equal(globallySorted.status, 200);
  assert.equal(globallyLimited.status, 200);
  assert.equal(globallySorted.body[0].id, synthetic.aliasCollisionA.aliasSlug);
  assert.equal(globallyLimited.body[0].id, globallySorted.body[0].id, "Global sorting must precede the requested page limit.");

  const unreleasedIdentity = await responseAt(apiBaseUrl, `/vehicles/${encodeURIComponent(synthetic.unreleased.aliasSlug)}`);
  assert.equal(unreleasedIdentity.status, 404, "A supported identity without a release record must not become public.");
});

test("unknown sort values are rejected instead of silently changing profile selection", async () => {
  const response = await responseAt(apiBaseUrl, "/vehicles?limit=100&sort=task32-unrecognized");
  assert.equal(response.status, 400);
});

test("owner experiences require exact reviewed identities and never inherit demo or external reports", async () => {
  const statsBefore = await responseAt(apiBaseUrl, "/discovery/stats");
  const legacyBefore = await Promise.all(expectedLegacySlugs.map((slug) =>
    responseAt(apiBaseUrl, `/owner-reports?vehicleId=${encodeURIComponent(slug)}`)));
  const { acceptedId, excludedIds } = await seedOwnerReportApplicabilityFixtures(pool, synthetic);
  // A non-demo legacy row has no canonical subject or review. It must not be
  // published just because it sits next to an existing illustrative report.
  await pool.query(
    `INSERT INTO owner_reports
       (trim_id, display_name, ownership_months, miles_driven, rating, title, body, is_demo)
     VALUES ($1, 'Synthetic unreviewed owner', 12, 100, 4,
             'Unreviewed synthetic experience', 'Synthetic test only', false)`,
    [demoBaseline.tables.trims[0].id],
  );
  // Deliberately make all visible identity labels match one legacy demo.
  // Only canonical keys, not these labels, may govern report applicability.
  const legacyTrim = demoBaseline.tables.trims[0];
  const legacyYear = demoBaseline.tables.model_years.find((row) => row.id === legacyTrim.model_year_id);
  const legacyGeneration = demoBaseline.tables.generations.find((row) => row.id === legacyYear.generation_id);
  const legacyModel = demoBaseline.tables.models.find((row) => row.id === legacyGeneration.model_id);
  const legacyMake = demoBaseline.tables.makes.find((row) => row.id === legacyModel.make_id);
  await pool.query(
    `UPDATE consumer_brands SET canonical_name = $1 WHERE id = (
       SELECT consumer_brand_id FROM vehicle_models WHERE id = $2
     )`, [legacyMake.name, synthetic.primary.modelId],
  );
  await pool.query("UPDATE vehicle_models SET name = $1 WHERE id = $2", [legacyModel.name, synthetic.primary.modelId]);
  await pool.query("UPDATE vehicle_model_years SET model_year = $1 WHERE id = $2", [legacyYear.year, synthetic.primary.modelYearId]);
  await pool.query("UPDATE vehicle_trims SET sales_name = $1 WHERE id = $2", [legacyTrim.name, synthetic.primary.trimId]);
  await pool.query("UPDATE vehicle_configurations SET display_label = $1 WHERE id = $2", [legacyTrim.name, synthetic.primary.configurationId]);

  const reports = await responseAt(apiBaseUrl, `/owner-reports?vehicleId=${encodeURIComponent(synthetic.release.slug)}`);
  assert.equal(reports.status, 200);
  assert.deepEqual(reports.body.map(({ id }) => id), [acceptedId]);
  assert.equal(reports.body[0].isDemo, false);
  assert.equal(reports.body[0].vehicleId, synthetic.release.slug);
  assert.deepEqual(reports.body[0].claimIds, [String(acceptedId)]);
  const detail = await responseAt(apiBaseUrl, `/vehicles/${encodeURIComponent(synthetic.release.slug)}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.sectionStates.ownerReports.state, "unknown", "Excluded research must not imply a complete section.");
  assert.ok(detail.body.sectionStates.ownerReports.claimIds.includes(String(acceptedId)));
  const acceptedClaim = detail.body.claims.find(({ id }) => id === String(acceptedId));
  assert.equal(acceptedClaim.contentClass, "direct_owner_experience");
  assert.equal(acceptedClaim.applicability, "applies");
  assert.ok(acceptedClaim.scopeDescription);
  assert.ok(acceptedClaim.sources.length > 0);
  for (const other of [synthetic.collision, synthetic.aliasCollisionA, synthetic.aliasCollisionB]) {
    const otherReports = await responseAt(apiBaseUrl, `/owner-reports?vehicleId=${encodeURIComponent(other.aliasSlug)}`);
    assert.equal(otherReports.status, 200);
    assert.deepEqual(otherReports.body, [], "No experience may transfer to a different canonical configuration.");
  }
  for (const [index, slug] of expectedLegacySlugs.entries()) {
    assert.deepEqual(
      await responseAt(apiBaseUrl, `/owner-reports?vehicleId=${encodeURIComponent(slug)}`),
      legacyBefore[index],
      "Existing demo URLs must retain exactly their original reports.",
    );
  }
  const unknown = await responseAt(apiBaseUrl, "/owner-reports?vehicleId=unknown-owner-profile");
  assert.deepEqual(unknown, { status: 200, body: [] });
  const all = await responseAt(apiBaseUrl, "/owner-reports");
  assert.equal(all.status, 200);
  assert.equal(all.body.filter(({ isDemo }) => !isDemo).length, 1);
  assert.deepEqual(all.body.filter(({ isDemo }) => !isDemo).map(({ id }) => id), [acceptedId]);
  assert.ok(all.body.filter(({ isDemo }) => !isDemo).every(({ id }) => !excludedIds.includes(id)));
  const statsAfter = await responseAt(apiBaseUrl, "/discovery/stats");
  assert.equal(statsAfter.body.reportCount, statsBefore.body.reportCount + 1);
});

function canonicalVehicleMakeSlug() {
  return "task32-synthetic-motor";
}