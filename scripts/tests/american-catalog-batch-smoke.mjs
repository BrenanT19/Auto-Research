// Read-only verification against a running local development API.
// Usage: node scripts/tests/american-catalog-batch-smoke.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const api = new URL(process.argv[2] ?? "http://localhost:80/api");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(api.hostname), "Only a local development API is allowed");
assert.equal(api.pathname.replace(/\/$/, ""), "/api");
const sql = readFileSync(new URL("../../lib/db/research/american-catalog-batch.sql", import.meta.url), "utf8");
const groups = JSON.parse(sql.match(/\$identities\$(\[[\s\S]*?\])\$identities\$/)[1]);
const slug = (group, trim) =>
  `${group.brandSlug}-${group.modelSlug}-${group.year}-${trim.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-us-trim-identity`;
async function get(path, status = 200) {
  const response = await fetch(`${api.origin}/api${path}`);
  assert.equal(response.status, status, path);
  return response.json();
}
const [options, makes, stats] = await Promise.all([
  get("/catalog/options"), get("/makes"), get("/discovery/stats"),
]);
assert.equal(options.length, stats.vehicleCount, "Discovery and options counts agree");
assert.equal(makes.reduce((sum, make) => sum + make.vehicleCount, 0), options.length);
assert.equal(makes.length, stats.makeCount, "Manufacturer count agrees with discovery");
const expected = groups.flatMap((group) => group.trims.map((trim) => ({ group, trim, id: slug(group, trim) })));
assert.equal(expected.length, 30);
for (const id of [
  "chevrolet-silverado-1500-2024-lt", "gmc-sierra-1500-2024-elevation", "buick-enclave-2024-preferred",
]) assert.ok(!options.some((option) => option.profileId === id), `${id} is retired from discovery`);

for (const group of groups) {
  const first = options.find((option) => option.profileId === slug(group, group.trims[0]));
  assert.ok(first, `${group.brand} ${group.model} has a catalog option`);
  const filter = new URLSearchParams({
    makeSlug: group.brandSlug, modelKey: first.modelKey, generationKey: first.generationKey,
    modelYearKey: first.modelYearKey, year: String(group.year), limit: "100",
  });
  const vehicles = await get(`/vehicles?${filter}`);
  assert.equal(vehicles.length, group.trims.length, `${group.model}: exact reviewed batch, without inferred trims`);
  assert.ok(vehicles.every((vehicle) =>
    !vehicle.isDemo && vehicle.makeSlug === group.brandSlug && vehicle.model === group.model &&
    vehicle.year === group.year && vehicle.generation === group.generation,
  ), "Manufacturer → model → generation → year stays scoped");
  for (const trim of group.trims) assert.equal(vehicles.filter((vehicle) => vehicle.trim === trim).length, 1);
  const last = options.find((option) => option.profileId === slug(group, group.trims.at(-1)));
  filter.set("trimKey", last.trimKey);
  const leaf = await get(`/vehicles?${filter}`);
  assert.deepEqual(leaf.map((vehicle) => vehicle.id), [last.profileId], "Actual trim is selected, not a sibling fallback");
  assert.deepEqual(await get(`/owner-reports?vehicleId=${last.profileId}`), [], "No demo reports on a real trim");
  const make = await get(`/makes/${group.brandSlug}`);
  assert.equal(make.make.vehicleCount, make.vehicles.length);
  assert.ok(make.description.includes("source-backed"), "A real or mixed manufacturer is not labeled all-demo");
}
const ford = options.find((option) => option.profileId === slug(groups[0], groups[0].trims[0]));
const chevrolet = options.find((option) => option.profileId === slug(groups[1], groups[1].trims[0]));
await get(`/vehicles?modelKey=${ford.modelKey}&generationKey=${chevrolet.generationKey}`, 400);
assert.deepEqual(await get("/vehicles?q=Preferred"), [], "Text search cannot restore the fabricated Enclave trim");
assert.deepEqual(await get("/vehicles?makeSlug=buick&trim=Preferred"), []);

const unresearched = [
  "bodyType", "drivetrain", "fuelType", "mpgCity", "mpgHighway", "mpgCombined",
  "horsepower", "priceUsd", "reliabilityEstimate", "annualOwnershipEstimateUsd",
  "annualMaintenanceEstimateUsd", "annualRepairEstimateUsd", "annualFuelEstimateUsd",
];
for (let offset = 0; offset < expected.length; offset += 5) {
  await Promise.all(expected.slice(offset, offset + 5).map(async ({ group, trim, id }) => {
    const profile = await get(`/vehicles/${id}`);
    assert.equal(profile.id, id);
    assert.equal(profile.makeSlug, group.brandSlug);
    assert.equal(profile.model, group.model);
    assert.equal(profile.year, group.year);
    assert.equal(profile.trim, trim);
    assert.equal(profile.generation, group.generation);
    assert.equal(profile.isDemo, false);
    assert.equal(profile.publicationStatus, "development_preview");
    assert.equal(profile.fieldStates.identity.state, "known");
    for (const field of unresearched) {
      assert.equal(profile[field], null, `${id}: ${field} has no invented value`);
      assert.equal(profile.fieldStates[field].state, "not_yet_researched", `${id}: ${field} remains sparse`);
    }
    for (const field of ["engines", "transmissions", "commonProblems", "maintenance", "inspectionChecklist", "externalOwnerPatterns"]) {
      assert.deepEqual(profile[field], [], `${id}: no demo ${field} transferred`);
    }
  }));
}
for (const [oldId, newId] of [
  ["chevrolet-silverado-1500-2024-lt", "chevrolet-silverado-1500-2024-lt-us-trim-identity"],
  ["gmc-sierra-1500-2024-elevation", "gmc-sierra-1500-2024-elevation-us-trim-identity"],
]) {
  const profile = await get(`/vehicles/${oldId}`);
  assert.equal(profile.id, newId, "Saved link resolves to its exact real trim");
  assert.equal(profile.isDemo, false);
  assert.deepEqual(await get(`/owner-reports?vehicleId=${oldId}`), [], "Archived demo reports cannot leak through the saved alias");
}
const archive = await get("/vehicles/buick-enclave-2024-preferred");
assert.equal(archive.isDemo, true);
assert.equal(archive.trim, "Preferred", "Invalid demo is never relabeled as Essence");
assert.equal(archive.id, "buick-enclave-2024-preferred");
console.log("PASS: all 30 identities, cascading and contradictory filters, sparse fields, discovery counts, saved links, and demo-report separation.");
