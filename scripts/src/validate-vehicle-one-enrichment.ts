import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const databasePath = "../../lib/db/src/index.ts";
const routerPath = "../../artifacts/api-server/src/routes/automotive.ts";
const canonicalPath = "../../artifacts/api-server/src/lib/canonical-vehicle-source.ts";
const { pool } = await import(databasePath);
const { createAutomotiveRouter } = await import(routerPath);
const { CANONICAL_RELEASE_MANIFEST, loadCanonicalVehicles } = await import(canonicalPath);
const requireApi = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
const express = requireApi("express");
const app = express();
const slug = "ford-mustang-2024-ecoboost-fastback-us-23l-10at-rwd";
const baselinePath = "/tmp/vehicle-one-enrichment-demo-baseline.json";
app.use("/public", createAutomotiveRouter({ releases: [], developmentPreviews: [] }));
app.use("/private", createAutomotiveRouter({ developmentPreviews: [{ configurationId: 2, identityClaimId: 7 }] }));
const server = await new Promise<any>((resolve, reject) => {
  const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  listener.once("error", reject);
});
const base = `http://127.0.0.1:${server.address().port}`;
async function get<T = any>(path: string): Promise<{ status: number; body: T }> {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(15_000) });
  return { status: response.status, body: await response.json() as T };
}
async function snapshotDemos() {
  const list = await get("/public/vehicles?limit=100");
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 13);
  assert.ok(list.body.every((vehicle: any) => vehicle.isDemo));
  const details = await Promise.all(list.body.map(async (vehicle: any) => ({
    id: vehicle.id,
    detail: await get(`/public/vehicles/${vehicle.id}`),
    owners: await get(`/public/owner-reports?vehicleId=${vehicle.id}`),
  })));
  return { list, details, options: await get("/public/catalog/options") };
}
try {
  assert.deepEqual(CANONICAL_RELEASE_MANIFEST, []);
  if (process.argv.includes("--capture-baseline")) {
    await writeFile(baselinePath, JSON.stringify(await snapshotDemos()));
    console.log("Captured unchanged-development baseline for all 13 demo profiles, owner reports, list and catalog.");
  } else if (process.argv.includes("--apply")) {
    assert.ok(await readFile(baselinePath, "utf8"), "Capture the demo baseline before enrichment.");
    await pool.query(await readFile(fileURLToPath(new URL(
      "../../lib/db/research/vehicle-one-enrichment.sql", import.meta.url)), "utf8"));
    console.log("Applied private enrichment transaction to existing configuration 2 only.");
  } else {
    const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
    assert.deepEqual(await snapshotDemos(), baseline, "All demo payloads must match the pre-enrichment baseline.");
    for (const demo of baseline.details) {
      assert.deepEqual(await get(`/private/vehicles/${demo.id}`), demo.detail);
      assert.deepEqual(await get(`/private/owner-reports?vehicleId=${demo.id}`), demo.owners);
    }
    assert.equal((await get(`/public/vehicles/${slug}`)).status, 404);
    const result = await get(`/private/vehicles/${slug}`);
    assert.equal(result.status, 200);
    const v = result.body;
    assert.equal(v.canonicalConfigurationId, 2);
    assert.equal(v.publicationStatus, "development_preview");
    assert.equal(v.isDemo, false);
    assert.equal(v.fuelTankCapacityGallons, 15.9);
    assert.equal(v.fuelRequirement, "87 AKI minimum; 91+ AKI recommended for best performance, not required.");
    for (const code of ["fuelRequirement", "fuelTankCapacityGallons"]) {
      assert.equal(v.fieldStates[code].state, "known");
      assert.equal(v.fieldStates[code].claimIds.length, 1);
      const claim = v.claims.find((c: any) => c.id === v.fieldStates[code].claimIds[0]);
      assert.equal(claim.contentClass, "source_fact");
      assert.equal(claim.evidenceStrength, "strong");
      assert.equal(claim.applicability, "applies");
      assert.ok(claim.sources.every((s: any) => s.url.includes("fordservicecontent.com") && s.locator && s.retrievedAt));
    }
    const [raw] = await loadCanonicalVehicles({ vehicleId: slug },
      [{ configurationId: 2, identityClaimId: 7 }]);
    const tankClaim = raw.claims.find((c: any) => c.fieldCode === "fuel_tank_capacity_gallons");
    assert.equal(tankClaim.unit, "US gal");
    for (const field of ["mpgCity", "mpgHighway", "mpgCombined", "fuelType", "horsepower", "recallStatus", "safetyStatus"]) {
      assert.equal(v[field], null, `${field} must not be inferred.`);
      assert.equal(v.fieldStates[field].state, "unknown", `${field} was researched but not established.`);
    }
    assert.equal(v.sectionStates.recalls.state, "unknown");
    assert.equal(v.sectionStates.safety.state, "unknown");
    const { rows: kinds } = await pool.query(
      "SELECT id,claim_kind FROM research_claims WHERE id=ANY($1::integer[])",
      [raw.claims.map((c: any) => Number(c.id))]);
    const kindById = new Map(kinds.map((r: any) => [String(r.id), r.claim_kind]));
    const recallClaims = raw.claims.filter((c: any) => kindById.get(c.id) === "recall");
    assert.equal(recallClaims.length, 11, "Manual-transmission campaign must be excluded.");
    assert.ok(recallClaims.every((c: any) => c.applicability === "unknown"));
    assert.ok(raw.claims.filter((c: any) => kindById.get(c.id) === "safety_rating")
      .every((c: any) => c.applicability === "unknown"));
    assert.match(v.overview, /81 reports/);
    assert.match(v.overview, /12 recall campaigns/);
    assert.match(v.overview, /not VIN-specific open recalls/);
    assert.match(v.overview, /24V394000 does not apply/);
    assert.match(v.overview, /not confirmed defects or failure rates/);
    assert.match(v.overview, /not proof that no investigation exists/);
    assert.deepEqual(v.reliability, { score: null, label: null, note: null });
    for (const field of ["commonProblems", "maintenance", "externalOwnerPatterns", "inspectionChecklist"])
      assert.deepEqual(v[field], []);
    for (const field of ["annualOwnershipEstimateUsd", "annualMaintenanceEstimateUsd",
      "annualRepairEstimateUsd", "annualFuelEstimateUsd", "insuranceEstimateUsd",
      "fiveYearDepreciationPercent", "expectedLifespanMiles"]) {
      assert.equal(v[field], null);
      assert.equal(v.fieldStates[field].state, "not_yet_researched");
    }
    const { rows: evidence } = await pool.query(`
      SELECT s.source_key,r.storage_rights_status,r.derivative_use_rights_status,
        r.display_rights_status,r.terms_reviewed_at,r.terms_version,e.excerpt,e.locator
      FROM research_sources s JOIN source_revisions r ON r.research_source_id=s.id
      JOIN evidence_items e ON e.source_revision_id=r.id
      WHERE s.source_key LIKE 'mustang-enrichment-one-%'`);
    assert.equal(evidence.length, 11);
    assert.ok(evidence.every((r: any) => r.excerpt === null && r.locator && r.terms_reviewed_at && r.terms_version));
    assert.ok(evidence.filter((r: any) => !r.source_key.endsWith("epa-candidates"))
      .every((r: any) => r.storage_rights_status === "allowed" &&
        r.derivative_use_rights_status === "allowed" && r.display_rights_status === "allowed"));
    const epa = evidence.find((r: any) => r.source_key.endsWith("epa-candidates"));
    assert.equal(epa.derivative_use_rights_status, "unknown");
    assert.equal(epa.display_rights_status, "unknown");
    assert.ok(!v.claims.flatMap((c: any) => c.sources).some((s: any) => s.url?.includes("fueleconomy.gov")));
    const { rows: scopes } = await pool.query(`
      SELECT f.field_code,a.scope_completeness,a.market_id,a.vehicle_configuration_id
      FROM spec_claim_values f JOIN applicability_sets s ON s.research_claim_id=f.research_claim_id
      JOIN applicability_alternatives a ON a.applicability_set_id=s.id
      WHERE f.field_code IN ('fuel_requirement','fuel_tank_capacity_gallons')
        AND a.vehicle_configuration_id=2`);
    assert.equal(scopes.length, 2);
    assert.ok(scopes.every((r: any) => r.scope_completeness === "complete" && r.market_id !== null));
    assert.deepEqual((await get(`/private/owner-reports?vehicleId=${slug}`)).body, []);
    console.log(JSON.stringify({
      result: "PASS", configurationId: 2, normalizedNewSpecificationFields: 2,
      editorialContext: "Primary-cited, explicitly broader population; no synthesized estimates",
      sourceMetadata: "11 reviewed source records; no source excerpts or complaint narratives",
      applicability: "11 candidate campaigns and NCAP family fail closed; manual campaign excluded",
      sparseState: "Researched unresolved fields unknown; prohibited estimates remain unresearched",
      demoBaselineAndPrivatePublicParity: "13/13 unchanged", unpublished: true,
    }, null, 2));
  }
} finally {
  await new Promise<void>((resolve, reject) => server.close((e: Error | undefined) => e ? reject(e) : resolve()));
  await pool.end();
}