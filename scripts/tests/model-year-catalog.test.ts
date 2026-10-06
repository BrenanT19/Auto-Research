import assert from "node:assert/strict";
import { test } from "node:test";
import {
  catalogPreviewEnabled, loadModelYearVehicles, modelYearCoverage, validateModelYearSelectors,
} from "../../artifacts/api-server/src/lib/model-year-catalog";
import { parseProfileKey } from "../../artifacts/api-server/src/lib/canonical-policy";
import {
  catalogGenerationKey, catalogTrimKey, getBrowseGenerationOptions,
} from "../../artifacts/auto-research/src/shopper-tools";

test("catalog publication fails closed outside an unpublished development server", () => {
  assert.equal(catalogPreviewEnabled({ NODE_ENV: "development" }), true);
  assert.equal(catalogPreviewEnabled({ NODE_ENV: "production" }), false);
  assert.equal(catalogPreviewEnabled({}), false);
  assert.equal(catalogPreviewEnabled({ NODE_ENV: "development", REPLIT_DEPLOYMENT: "1" }), false);
});

test("every reviewed model/year gets a unique sparse profile, not an invented configuration", () => {
  process.env.NODE_ENV = "development";
  const profiles = loadModelYearVehicles();
  assert.equal(profiles.length, 4209);
  assert.equal(new Set(profiles.map(profile => profile.id)).size, profiles.length);
  assert.equal(new Set(profiles.map(profile => profile.makeSlug)).size, 13);
  for (const profile of profiles) {
    assert.equal(profile.canonicalConfigurationId, undefined);
    assert.equal(profile.trimId, undefined);
    assert.equal(profile.generationId, undefined);
    assert.equal(profile.trim, "");
    assert.equal(profile.generation, "");
    assert.equal(profile.fieldStates.identity.state, "known");
    for (const field of ["trim", "generation", "horsepower", "priceUsd", "mpgCombined", "reliabilityEstimate"]) {
      assert.equal(profile.fieldStates[field].state, "not_yet_researched");
    }
    for (const field of ["ownerReports", "externalOwnerPatterns", "commonProblems", "maintenance", "engines", "transmissions"] as const) {
      assert.deepEqual(profile[field], []);
    }
    assert.equal(profile.claims.length, 1);
    assert.equal(profile.claims[0].sources.length, 1);
    assert.ok(profile.claims[0].sources[0].locator);
    assert.equal(profile.isDemo, false);
  }
});

test("Mustang years preserve exact source names and do not invent a preliminary 2027 listing", () => {
  process.env.NODE_ENV = "development";
  const first = loadModelYearVehicles({ vehicleId: "ford-mustang-1965-model-year" })[0];
  assert.ok(first);
  const years = loadModelYearVehicles({ modelKey: first.modelKey });
  assert.deepEqual(years.map(profile => profile.year).sort((a, b) => a - b),
    Array.from({ length: 62 }, (_, index) => index + 1965).filter(year => year !== 1978));
  // The 1978 guide explicitly lists MUSTANG II, not the later Mustang grouping.
  assert.equal(loadModelYearVehicles({ vehicleId: "ford-mustang-ii-1978-model-year" }).length, 1);
  assert.equal(loadModelYearVehicles({ modelKey: first.modelKey, year: 2027 }).length, 0);
  assert.equal(loadModelYearVehicles({ modelKey: first.modelKey, year: 1964 }).length, 0);
  assert.equal(loadModelYearVehicles({ modelKey: first.modelKey, year: 1998 }).length, 1);
  assert.equal(loadModelYearVehicles({ modelKey: first.modelKey, makeSlug: "buick" }).length, 0);
});

test("historical market and wartime gaps are preserved", () => {
  process.env.NODE_ENV = "development";
  assert.equal(loadModelYearVehicles({ vehicleId: "chevrolet-bel-air-1975-model-year" }).length, 1);
  assert.equal(loadModelYearVehicles({ vehicleId: "chevrolet-bel-air-1976-model-year" }).length, 0);
  assert.equal(loadModelYearVehicles({ vehicleId: "lincoln-continental-1943-model-year" }).length, 0);
  assert.equal(loadModelYearVehicles({ vehicleId: "lincoln-continental-1956-model-year" }).length, 0);
});

test("catalog selectors cannot impersonate database trims or cross models", () => {
  process.env.NODE_ENV = "development";
  const ford = loadModelYearVehicles({ vehicleId: "ford-mustang-1965-model-year" })[0];
  const chevy = loadModelYearVehicles({ vehicleId: "chevrolet-bel-air-1950-model-year" })[0];
  assert.equal(parseProfileKey(ford.modelKey, "model").namespace, "catalog");
  assert.throws(() => parseProfileKey("catalog:trim:12", "trim"));
  assert.throws(() => parseProfileKey("catalog:generation:12", "generation"));
  assert.throws(() => validateModelYearSelectors({ modelKey: ford.modelKey, modelYearKey: chevy.modelYearKey }));
  assert.equal(loadModelYearVehicles({ modelKey: "catalog:model:1" }).length, 0);
  assert.equal(loadModelYearVehicles({ trim: "GT" }).length, 0);
});

test("unknown trim and generation do not create fake dropdown options", () => {
  process.env.NODE_ENV = "development";
  const profile = loadModelYearVehicles({ vehicleId: "ford-mustang-1965-model-year" })[0];
  const option = { ...profile, profileId: profile.id };
  assert.equal(catalogTrimKey(option), "");
  assert.equal(catalogGenerationKey(option), "");
  assert.deepEqual(getBrowseGenerationOptions([option]), []);
  assert.equal(modelYearCoverage().completeHistoricalCatalog, false);
});
