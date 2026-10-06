import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  catalogPreviewEnabled, loadModelYearVehicles, modelYearCoverage, validateModelYearSelectors,
} from "../../artifacts/api-server/src/lib/model-year-catalog";
import { parseProfileKey } from "../../artifacts/api-server/src/lib/canonical-policy";
import { getCatalogBrowseEras } from "../../artifacts/api-server/src/lib/catalog-browse-eras";
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
  assert.equal(profiles.length, 4672);
  assert.equal(new Set(profiles.map(profile => profile.id)).size, profiles.length);
  assert.equal(new Set(profiles.map(profile => profile.makeSlug)).size, 13);
  for (const profile of profiles) {
    assert.equal(profile.canonicalConfigurationId, undefined);
    assert.equal(profile.trimId, undefined);
    assert.equal(profile.generationId, undefined);
    assert.equal(profile.trim, "");
    const eras = getCatalogBrowseEras(profile);
    assert.equal(Boolean(profile.generation), eras.length > 0);
    assert.equal(profile.fieldStates.identity.state, "known");
    assert.equal(profile.fieldStates.generation.state, eras.length ? "known" : "not_yet_researched");
    for (const field of ["trim", "horsepower", "priceUsd", "mpgCombined", "reliabilityEstimate"]) {
      assert.equal(profile.fieldStates[field].state, "not_yet_researched");
    }
    for (const field of ["ownerReports", "externalOwnerPatterns", "commonProblems", "maintenance", "engines", "transmissions"] as const) {
      assert.deepEqual(profile[field], []);
    }
    assert.equal(profile.claims.length, 1 + eras.length);
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

test("every reviewed supplement year has its own linked profile and exact source", () => {
  process.env.NODE_ENV = "development";
  const reviewed: {
    make: string; model: string; ranges: [number, number][]; url: string;
    publisher?: string; sourceKey?: string;
  }[] = JSON.parse(readFileSync(
    new URL("../../lib/db/research/classic-model-year-identities.json", import.meta.url), "utf8"));
  const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const item of reviewed) {
    for (const [start, end] of item.ranges) {
      for (let year = start; year <= end; year++) {
        const id = `${slug(item.make)}-${slug(item.model)}-${year}-model-year`;
        const [profile] = loadModelYearVehicles({ vehicleId: id });
        assert.ok(profile, id);
        assert.equal(profile.make, item.make);
        assert.equal(profile.model, item.model);
        assert.equal(profile.year, year);
        assert.equal(loadModelYearVehicles({
          modelKey: profile.modelKey, modelYearKey: profile.modelYearKey,
        })[0]?.id, id);
        const source = profile.claims[0].sources[0];
        assert.equal(source.url, item.url);
        assert.equal(source.publisher, item.publisher ?? "Wikipedia contributors");
        assert.equal(source.sourceId, item.sourceKey ?? `classic-${slug(item.make)}-${slug(item.model)}`);
        assert.match(source.sourceVersion, /normalized factual review/);
      }
    }
  }
});

test("new historical ranges do not bridge wars, nameplate hiatuses or foreign-market continuation", () => {
  process.env.NODE_ENV = "development";
  for (const id of [
    "ford-model-a-1927-model-year", "ford-model-a-1932-model-year",
    "ford-galaxie-1975-model-year", "ford-galaxie-1983-model-year",
    "ford-falcon-1971-model-year", "lincoln-capri-1951-model-year",
    "lincoln-premiere-1955-model-year", "chevrolet-corvette-1952-model-year",
    "chevrolet-corvette-1983-model-year", "chevrolet-camaro-1966-model-year",
    "buick-century-1946-model-year", "buick-century-1959-model-year",
    "buick-roadmaster-1943-model-year", "buick-roadmaster-1944-model-year",
    "buick-roadmaster-1945-model-year", "cadillac-series-62-1944-model-year",
    "cadillac-deville-1958-model-year", "chrysler-new-yorker-1939-model-year",
    "chrysler-new-yorker-1943-model-year", "chrysler-newport-1941-model-year",
    "dodge-coronet-1960-model-year", "dodge-coronet-1964-model-year",
    "dodge-challenger-1969-model-year", "dodge-challenger-1975-model-year",
    "jeep-wagoneer-1962-model-year", "tesla-roadster-2012-model-year",
  ]) {
    assert.equal(loadModelYearVehicles({ vehicleId: id }).length, 0, id);
  }
});

test("shared C/K family names retain distinct Chevrolet and GMC identities", () => {
  process.env.NODE_ENV = "development";
  const [chevrolet] = loadModelYearVehicles({ vehicleId: "chevrolet-c-k-1960-model-year" });
  const [gmc] = loadModelYearVehicles({ vehicleId: "gmc-c-k-1960-model-year" });
  assert.ok(chevrolet);
  assert.ok(gmc);
  assert.notEqual(chevrolet.modelKey, gmc.modelKey);
  assert.notEqual(chevrolet.modelYearKey, gmc.modelYearKey);
  assert.equal(loadModelYearVehicles({ modelKey: chevrolet.modelKey, makeSlug: "gmc" }).length, 0);
  assert.throws(() => validateModelYearSelectors({
    modelKey: chevrolet.modelKey, modelYearKey: gmc.modelYearKey,
  }));
  assert.equal(modelYearCoverage().earliestYear, 1928);
});

test("NHTSA vPIC omissions add only the exact U.S. 2024 Ram Heavy Duty model/year identities", () => {
  process.env.NODE_ENV = "development";
  for (const model of ["2500", "3500"]) {
    const id = `ram-${model}-2024-model-year`;
    const [profile] = loadModelYearVehicles({ vehicleId: id });
    assert.ok(profile, id);
    assert.equal(profile.make, "Ram");
    assert.equal(profile.model, model);
    assert.equal(profile.year, 2024);
    assert.equal(profile.trim, "");
    assert.equal(profile.canonicalConfigurationId, undefined);
    assert.equal(profile.fieldStates.trim.state, "not_yet_researched");
    assert.equal(profile.claims[0].sources[0].publisher, "NHTSA vPIC");
    assert.equal(profile.claims[0].sources[0].url,
      "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/RAM?format=json&modelYear=2024");
    assert.match(profile.claims[0].sources[0].locator, new RegExp(`Model_Name=${model}`));
  }
});

test("catalog selectors cannot impersonate database trims or cross models", () => {
  process.env.NODE_ENV = "development";
  const ford = loadModelYearVehicles({ vehicleId: "ford-mustang-1965-model-year" })[0];
  const chevy = loadModelYearVehicles({ vehicleId: "chevrolet-bel-air-1950-model-year" })[0];
  assert.equal(parseProfileKey(ford.modelKey, "model").namespace, "catalog");
  assert.throws(() => parseProfileKey("catalog:trim:12", "trim"));
  assert.equal(parseProfileKey("catalog:generation:12", "generation").namespace, "catalog");
  assert.throws(() => validateModelYearSelectors({ generationKey: "catalog:generation:12" }));
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
