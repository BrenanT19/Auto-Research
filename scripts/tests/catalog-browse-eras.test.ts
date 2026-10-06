import assert from "node:assert/strict";
import { test } from "node:test";
import snapshot from "../../artifacts/api-server/src/data/catalog-browse-eras.json";
import { ListVehiclesQueryParams } from "../../lib/api-zod/src";
import { catalogEraKey, getCatalogBrowseEras } from "../../artifacts/api-server/src/lib/catalog-browse-eras";
import { loadModelYearVehicles, validateModelYearSelectors } from "../../artifacts/api-server/src/lib/model-year-catalog";
import {
  buildVehicleListParams, clearBrowseFilters, getBrowseGenerationOptions,
  hasInvalidBrowseSelection, isGenerationFilterEnabled,
} from "../../artifacts/auto-research/src/shopper-tools";

process.env.NODE_ENV = "development";
const profiles = loadModelYearVehicles();
const options = profiles.flatMap(profile => {
  const base = { ...profile, profileId: profile.id };
  const eras = getCatalogBrowseEras(profile);
  return eras.length ? eras.map(era => ({
    ...base, generationId: era.id, generationKey: catalogEraKey(era),
    generation: `${era.name} (${era.startYear}–${era.endYear})`,
  })) : [base];
});

test("the generated API query contract accepts catalog generation/refresh keys", () => {
  assert.equal(ListVehiclesQueryParams.safeParse({ generationKey: catalogEraKey(snapshot.eras[0]) }).success, true);
  assert.equal(ListVehiclesQueryParams.safeParse({ generationKey: "catalog:trim:12" }).success, false);
});

test("every available catalog era filters exact members across all 13 brands", () => {
  const brands = new Set<string>();
  for (const era of snapshot.eras) {
    const expected = profiles.filter(v => v.make.toLocaleLowerCase() === era.make.toLocaleLowerCase() &&
      v.model.toLocaleLowerCase() === era.model.toLocaleLowerCase() &&
      v.year >= era.startYear && v.year <= era.endYear);
    if (!expected.length) continue;
    brands.add(era.make);
    const generationKey = catalogEraKey(era);
    const modelKey = expected[0].modelKey;
    validateModelYearSelectors({ modelKey, generationKey });
    const results = loadModelYearVehicles({ modelKey, generationKey });
    assert.deepEqual(results.map(v => v.id), expected.map(v => v.id), generationKey);
    assert.equal(new Set(results.map(v => v.id)).size, results.length);
    const selections = getBrowseGenerationOptions(options.filter(v => v.modelKey === modelKey));
    assert.ok(selections.some(v => v.key === generationKey));
    const filters = { ...clearBrowseFilters(), modelKey, generationKey };
    assert.equal(hasInvalidBrowseSelection(filters, options), false);
    assert.equal(buildVehicleListParams(filters).generationKey, generationKey);
  }
  assert.equal(brands.size, 13);
});

test("Model S refreshes narrow years and transition years remain candidates in both groups", () => {
  const eras = snapshot.eras.filter(era => era.make === "Tesla" && era.model === "Model S");
  assert.equal(eras.length, 3);
  assert.deepEqual(eras.map(era => loadModelYearVehicles({ generationKey: catalogEraKey(era) }).map(v => v.year)),
    [[2012, 2013, 2014, 2015, 2016], [2016, 2017, 2018, 2019, 2020, 2021], [2021, 2022, 2023, 2024, 2025, 2026]]);
  assert.equal(loadModelYearVehicles({ makeSlug: "tesla", model: "Model S" }).length, 15);
  for (const year of [2016, 2021]) {
    const profile = loadModelYearVehicles({ makeSlug: "tesla", model: "Model S", year })[0];
    assert.match(profile.generation, /transition/);
    assert.equal(getCatalogBrowseEras(profile).length, 2);
    assert.ok(profile.claims.slice(1).every(claim => claim.sources[0].url && claim.sources[0].locator));
  }
});

test("source-label capitalization does not omit historical years sharing a model identity", () => {
  const era = snapshot.eras.find(era => era.make === "Ford" && era.name === "Third generation (Fox)")!;
  const rows = loadModelYearVehicles({ generationKey: catalogEraKey(era) });
  assert.deepEqual(rows.map(row => row.year).sort((a, b) => a - b),
    Array.from({ length: 15 }, (_, index) => index + 1979));
  assert.ok(rows.some(row => row.model === "MUSTANG"));
  assert.ok(rows.some(row => row.model === "Mustang"));
});

test("unknown eras and mismatched model/year selectors fail without widening the search", () => {
  const era = snapshot.eras.find(era => era.make === "Tesla" && era.model === "Model S")!;
  const generationKey = catalogEraKey(era);
  const ford = profiles.find(v => v.make === "Ford")!;
  assert.throws(() => validateModelYearSelectors({ generationKey, modelKey: ford.modelKey }));
  assert.throws(() => validateModelYearSelectors({ generationKey, year: 2026 }));
  assert.throws(() => validateModelYearSelectors({ generationKey: "catalog:generation:99999999" }));
  assert.deepEqual(loadModelYearVehicles({ generationKey: "catalog:generation:99999999" }), []);
  assert.equal(isGenerationFilterEnabled({ catalogReady: true, modelSelected: true, generationCount: 0 }), false);
  assert.equal(isGenerationFilterEnabled({ catalogReady: true, modelSelected: true, generationCount: 1 }), true);
  const unknown = profiles.find(v => !getCatalogBrowseEras(v).length)!;
  assert.equal(unknown.fieldStates.generation.state, "not_yet_researched");
  assert.deepEqual(getBrowseGenerationOptions(options.filter(v => v.modelKey === unknown.modelKey)
    .filter(v => !getCatalogBrowseEras(v).length)), []);
});
