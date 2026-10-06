// Read-only live verification. Never writes to either database.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const base = "http://localhost:80/api";
const snapshot = JSON.parse(readFileSync(new URL("../../artifacts/api-server/src/data/model-year-catalog.json", import.meta.url)));
async function get(path, status = 200) {
  const response = await fetch(base + path);
  assert.equal(response.status, status, path);
  return response.json();
}
const [options, stats, makes, coverage] = await Promise.all([
  get("/catalog/options"), get("/discovery/stats"), get("/makes"), get("/catalog/coverage"),
]);
const yearOptions = options.filter(option => option.identityLevel === "model_year");
assert.equal(yearOptions.length, snapshot.entries.length);
assert.deepEqual(new Set(yearOptions.map(option => option.profileId)), new Set(snapshot.entries.map(entry => entry.id)));
assert.equal(stats.vehicleCount, options.length);
assert.equal(stats.makeCount, makes.length);
assert.equal(makes.reduce((sum, make) => sum + make.vehicleCount, 0), options.length);
assert.equal(coverage.completeHistoricalCatalog, false);
assert.equal(coverage.earliestYear, 1928);
const first = await get("/vehicles/search?limit=24&offset=0");
const second = await get("/vehicles/search?limit=24&offset=24");
assert.equal(first.total, options.length);
assert.equal(second.total, first.total);
assert.equal(first.items.length, 24);
assert.equal(second.items.length, 24);
assert.ok(first.items.every(item => !second.items.some(other => item.id === other.id)));
const lastOffset = Math.floor((first.total - 1) / 24) * 24;
const last = await get(`/vehicles/search?limit=24&offset=${lastOffset}`);
assert.equal(last.items.length, first.total - lastOffset);
const mustang = yearOptions.find(option => option.profileId === "ford-mustang-1965-model-year");
const belAir = yearOptions.find(option => option.profileId === "chevrolet-bel-air-1950-model-year");
const search = await get(`/vehicles/search?modelKey=${mustang.modelKey}&year=1998`);
assert.equal(search.total, 1);
assert.equal(search.items[0].id, "ford-mustang-1998-model-year");
await get(`/vehicles/search?modelKey=${mustang.modelKey}&modelYearKey=${belAir.modelYearKey}`, 400);
await get(`/vehicles/search?modelKey=${mustang.modelKey}&trimKey=canonical:trim:1`, 400);
await get("/vehicles/search?offset=-1", 400);
for (const make of makes) {
  const representative = yearOptions.find(option => option.makeSlug === make.slug);
  assert.ok(representative);
  const profile = await get(`/vehicles/${representative.profileId}`);
  assert.equal(profile.identityLevel, "model_year");
  assert.equal(profile.canonicalConfigurationId, undefined);
  assert.equal(profile.publicationStatus, "development_preview");
  assert.equal(profile.fieldStates.identity.state, "known");
  assert.equal(profile.fieldStates.trim.state, "not_yet_researched");
  assert.deepEqual(profile.commonProblems, []);
  assert.deepEqual(profile.maintenance, []);
  assert.deepEqual(profile.externalOwnerPatterns, []);
  assert.deepEqual(await get(`/owner-reports?vehicleId=${profile.id}`), []);
}
for (const id of ["ford-mustang-1965-model-year", "ford-mustang-1980-model-year", "ford-mustang-1998-model-year",
  "chevrolet-bel-air-1950-model-year", "lincoln-continental-1940-model-year", "dodge-dart-1967-model-year",
  "tesla-model-3-2019-model-year", "rivian-r1t-2022-model-year",
  "ford-model-a-1928-model-year", "ford-thunderbird-1955-model-year",
  "lincoln-capri-1952-model-year", "chevrolet-camaro-1967-model-year",
  "buick-roadmaster-1936-model-year", "gmc-c-k-1960-model-year",
  "cadillac-eldorado-1953-model-year", "chrysler-new-yorker-1940-model-year",
  "dodge-challenger-1970-model-year", "jeep-wagoneer-1963-model-year",
  "tesla-roadster-2008-model-year", "tesla-roadster-2011-model-year"]) {
  const profile = await get(`/vehicles/${id}`);
  assert.equal(profile.id, id);
  assert.equal(profile.fieldStates.reliabilityEstimate.state, "not_yet_researched");
  assert.equal(profile.annualOwnershipEstimateUsd, null);
  const option = yearOptions.find(option => option.profileId === id);
  assert.ok(option, id);
  const results = await get(`/vehicles/search?modelKey=${option.modelKey}&year=${option.year}`);
  assert.ok(results.items.some(item => item.id === id), id);
}
console.log(`PASS: ${yearOptions.length} model/year profiles, ${makes.length} brands, pagination, historical and current links, exact filters, sparse research, and no owner-report leakage.`);
