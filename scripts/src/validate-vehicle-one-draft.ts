/**
 * Read-only verification of the private development draft through the existing
 * canonical API. Release entries are injected into an ephemeral local harness;
 * no checked-in manifest, running service, or database rows are modified.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Runtime-only harness imports, like the existing API acceptance tests. Keep
// backend source files outside this standalone scripts package's compile root.
const databaseModulePath = "../../lib/db/src/index.ts";
const routerModulePath = "../../artifacts/api-server/src/routes/automotive.ts";
const sourceModulePath = "../../artifacts/api-server/src/lib/canonical-vehicle-source.ts";
const { pool } = await import(databaseModulePath);
const { createAutomotiveRouter } = await import(routerModulePath);
const { CANONICAL_RELEASE_MANIFEST } = await import(sourceModulePath);

const requireApi = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
const express = requireApi("express");
const slug = "ford-mustang-2024-ecoboost-fastback-us-23l-10at-rwd";
let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

async function main() {
  assert.deepEqual(CANONICAL_RELEASE_MANIFEST, [], "Draft must not enter the public release manifest.");
  const { rows } = await pool.query(`
    SELECT c.id AS configuration_id, s.research_claim_id AS identity_claim_id,
      c.is_demo,c.identity_status,a.legacy_trim_id,y.market_id,y.model_year,
      (SELECT sy.research_claim_id FROM claim_subjects sy
       JOIN research_claims ry ON ry.id=sy.research_claim_id
       WHERE sy.vehicle_model_year_id=y.id AND ry.claim_kind='identity' LIMIT 1) AS year_claim_id
    FROM vehicle_profile_aliases a
    JOIN vehicle_configurations c ON c.id=a.vehicle_configuration_id
    JOIN vehicle_trims t ON t.id=c.vehicle_trim_id
    JOIN vehicle_model_years y ON y.id=t.vehicle_model_year_id
    JOIN claim_subjects s ON s.vehicle_configuration_id=c.id
    JOIN research_claims r ON r.id=s.research_claim_id AND r.claim_kind='identity'
    WHERE a.slug=$1`, [slug]);
  assert.equal(rows.length, 1);
  const identity = rows[0];
  assert.equal(identity.is_demo, false);
  assert.equal(identity.identity_status, "supported");
  assert.equal(identity.legacy_trim_id, null);
  assert.equal(identity.model_year, 2024);
  const release = { configurationId: identity.configuration_id, identityClaimId: identity.identity_claim_id };
  const app = express();
  app.use("/api", createAutomotiveRouter());
  app.use("/public", createAutomotiveRouter());
  app.use("/private", createAutomotiveRouter({ developmentPreviews: [release] }));
  app.use("/wrong-scope", createAutomotiveRouter({ releases: [
    { ...release, identityClaimId: identity.year_claim_id },
  ] }));
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.once("error", reject);
  });
  const address = server!.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  async function get<T = any>(path: string): Promise<{ status: number; body: T }> {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(15_000) });
    return { status: response.status, body: await response.json() as T };
  }
  assert.equal((await get(`/public/vehicles/${slug}`)).status, 404);
  assert.equal((await get(`/wrong-scope/vehicles/${slug}`)).status, 404,
    "A model-year identity cannot substitute for the exact configuration identity.");
  const result = await get(`/private/vehicles/${slug}`);
  assert.equal(result.status, 200);
  const profile = result.body;
  assert.equal(profile.profileKind, "canonical");
  assert.equal(profile.publicationStatus, "development_preview");
  assert.equal(profile.isDemo, false);
  assert.equal(profile.canonicalConfigurationId, release.configurationId);
  assert.equal(profile.make, "Ford");
  assert.equal(profile.model, "Mustang");
  assert.equal(profile.year, 2024);
  assert.equal(profile.trim, "EcoBoost Fastback — 2.3L turbo I4 / 10-speed automatic / RWD");
  assert.equal(profile.bodyType, "Fastback coupe");
  assert.equal(profile.engineName, "2.3L EcoBoost turbocharged inline-four");
  assert.equal(profile.transmissionName, "10-speed automatic");
  assert.equal(profile.drivetrain, "RWD");
  for (const field of ["bodyType", "engineName", "transmissionName", "drivetrain"]) {
    assert.equal(profile.fieldStates[field].state, "known");
    assert.equal(profile.fieldStates[field].claimIds.length, 1);
  }
  for (const field of [
    "mpgCity", "mpgHighway", "mpgCombined", "horsepower", "priceUsd", "fuelType",
    "reliabilityEstimate", "annualOwnershipEstimateUsd", "annualMaintenanceEstimateUsd",
    "annualRepairEstimateUsd", "annualFuelEstimateUsd", "insuranceEstimateUsd",
    "fiveYearDepreciationPercent", "expectedLifespanMiles", "recallStatus", "safetyStatus",
  ]) {
    assert.equal(profile[field], null, `${field} must not invent a value.`);
    assert.equal(profile.fieldStates[field].state,
      ["mpgCity", "mpgHighway", "mpgCombined", "horsepower", "fuelType", "recallStatus", "safetyStatus"].includes(field)
        ? "unknown" : "not_yet_researched");
  }
  assert.deepEqual(profile.reliability, { score: null, label: null, note: null });
  for (const field of ["commonProblems", "maintenance", "inspectionChecklist", "externalOwnerPatterns"]) {
    assert.deepEqual(profile[field], [], `${field} must not inherit demo research.`);
  }
  assert.ok(profile.claims.length >= 5);
  assert.ok(profile.claims.every((claim: any) =>
    claim.contentClass === "source_fact" || (claim.contentClass === "editorial_synthesis" &&
      profile.fieldStates.overview.claimIds.includes(claim.id))));
  const sources = profile.claims.flatMap((claim: any) => claim.sources);
  assert.ok(sources.some((source: any) => /media\.ford\.com/.test(source.url) &&
    /preliminary.*2022-09-22.*subject to change/i.test(source.sourceVersion)));
  assert.ok(sources.some((source: any) => /epa\.gov/.test(source.url) &&
    /R5100029/.test(source.locator)));
  const { rows: provenance } = await pool.query(`
    SELECT r.format,r.update_behavior,e.excerpt
    FROM research_sources s JOIN source_revisions r ON r.research_source_id=s.id
    JOIN evidence_items e ON e.source_revision_id=r.id
    WHERE s.source_key IN ('ford-us-my2024-mustang-preliminary-tech-specs','epa-us-my2024-test-car-list-may2025')`);
  assert.equal(provenance.length, 2);
  assert.ok(provenance.every((row: { excerpt: string | null }) => row.excerpt === null));
  assert.ok(provenance.some((row: { format: string; update_behavior: string }) => /PDF not directly inspected/.test(row.format) &&
    /redirected.*2026-10-03/.test(row.update_behavior)));
  const publicList = await get("/public/vehicles?limit=100");
  const privateList = await get("/private/vehicles?limit=100");
  assert.equal(publicList.status, 200);
  assert.equal(privateList.status, 200);
  assert.equal(publicList.body.length, 13);
  assert.ok(publicList.body.every((vehicle: any) => vehicle.isDemo === true));
  assert.deepEqual(privateList.body.filter((vehicle: any) => vehicle.isDemo), publicList.body);
  for (const demo of publicList.body) {
    assert.deepEqual(await get(`/private/vehicles/${demo.id}`), await get(`/public/vehicles/${demo.id}`));
    assert.deepEqual(await get(`/private/owner-reports?vehicleId=${demo.id}`),
      await get(`/public/owner-reports?vehicleId=${demo.id}`));
  }
  const publicOptions = await get("/public/catalog/options");
  assert.equal(publicOptions.body.length, 13);
  assert.ok(!publicOptions.body.some((option: any) => option.profileId === slug));
  assert.deepEqual((await get(`/private/owner-reports?vehicleId=${slug}`)).body, []);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["--test",
      fileURLToPath(new URL("../tests/auto-research-api-fixture.test.mjs", import.meta.url))], {
      env: { ...process.env, AUTO_RESEARCH_API_BASE_URL: `${base}/api` },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() :
      reject(new Error(`Existing demo API regression checks failed (${code}).`)));
  });
  console.log(JSON.stringify({
    result: "PASS", slug, ...release, unpublished: true,
    demoApiParity: "13/13", originalNormalizedIdentitySpecFields: 4,
    unsupportedResearch: "null / unknown or not_yet_researched",
    provenance: "Original identity evidence remains preliminary indexed Ford + corroborated EPA; enrichment has separate validation",
    applicability: "exact-configuration gate passes; wrong-scope identity fails closed",
  }, null, 2));
}

try {
  await main();
} finally {
  if (server) await new Promise<void>((resolve, reject) =>
    server!.close((error: Error | undefined) => error ? reject(error) : resolve()));
  await pool.end();
}