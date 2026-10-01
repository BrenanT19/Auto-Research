import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  addComparisonId,
  buildBrowseLocation,
  buildComparisonLocation,
  buildVehicleListParams,
  calculateOwnershipEstimate,
  clearBrowseFilters,
  optionalVehicleQueryOptions,
  parseBrowseFilters,
  parseComparisonIds,
  removeComparisonId,
} from "../src/shopper-tools.ts";

const apiBase = new URL(
  process.env.AUTO_RESEARCH_API_BASE_URL ?? "http://localhost:80/api",
);
const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

if (!localHosts.has(apiBase.hostname) || apiBase.pathname.replace(/\/$/, "") !== "/api") {
  throw new Error(
    "Auto Research regression checks only allow a local development API at /api.",
  );
}

async function getDevelopmentVehicles(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  const response = await fetch(`${apiBase.origin}/api/vehicles?${query}`);
  assert.equal(response.status, 200, "development vehicle search should succeed");
  return (await response.json()) as Array<{
    id: string;
    make: string;
    makeSlug: string;
    model: string;
    year: number;
    trim: string;
    fuelType: string;
    mpgCombined: number | null;
    isDemo: boolean;
  }>;
}

test("calculator disables optional vehicle detail lookup without an ID", () => {
  const noVehicle = optionalVehicleQueryOptions("", ["/api/vehicles/"]);
  assert.equal(noVehicle.enabled, false);
  assert.deepEqual(noVehicle.queryKey, ["/api/vehicles/"]);

  const selectedVehicle = optionalVehicleQueryOptions("ford-f-150", [
    "/api/vehicles/ford-f-150",
  ]);
  assert.equal(selectedVehicle.enabled, true);
});

test("a missing calculator vehicle ID never runs the detail query", async () => {
  const client = new QueryClient();
  let fetchCount = 0;
  const observer = new QueryObserver(client, {
    ...optionalVehicleQueryOptions("", ["/api/vehicles/"]),
    queryFn: async () => {
      fetchCount += 1;
      return [];
    },
  });
  const unsubscribe = observer.subscribe(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 0));
  unsubscribe();
  client.clear();

  assert.equal(fetchCount, 0, "an empty ID must not fetch the collection URL");
});

test("calculator keeps zero-APR gas and EV electricity estimates finite and correct", () => {
  const base = {
    price: 32_000,
    down: 5_000,
    apr: 0,
    term: 60,
    miles: 12_000,
    gas: 3.65,
    electricity: 0.16,
    insurance: 145,
    maintenance: 110,
    repairs: 55,
  };

  const gasEstimate = calculateOwnershipEstimate({
    ...base,
    mpg: 28,
    vehicleIsElectric: false,
  });
  assert.equal(gasEstimate.payment, 450);
  assert.ok(Math.abs(gasEstimate.fuel - 130.35714285714286) < 1e-9);
  assert.ok(Math.abs(gasEstimate.monthly - 890.3571428571429) < 1e-9);
  assert.ok(Math.abs(gasEstimate.annual - 10_684.285714285715) < 1e-9);

  const evEstimate = calculateOwnershipEstimate({
    ...base,
    mpg: 122,
    vehicleIsElectric: true,
  });
  assert.equal(evEstimate.payment, 450);
  assert.ok(Math.abs(evEstimate.fuel - 44.19672131147541) < 1e-9);
  assert.ok(Math.abs(evEstimate.monthly - 804.1967213114754) < 1e-9);
  assert.ok(Math.abs(evEstimate.annual - 9_650.360655737705) < 1e-9);
});

test("browse URL filters become search parameters and clear back to a clean URL", () => {
  const parsed = parseBrowseFilters(
    "?q=2024+Ford+F-150+XLT&make=ford&model=F-150&year=2024&trim=XLT&sort=ownership-cost",
  );
  assert.deepEqual(buildVehicleListParams(parsed), {
    q: "2024 Ford F-150 XLT",
    makeSlug: "ford",
    model: "F-150",
    year: 2024,
    trim: "XLT",
    sort: "ownership-cost",
    limit: 60,
  });

  const cleared = clearBrowseFilters();
  assert.deepEqual(cleared, {
    q: "",
    make: "",
    model: "",
    trim: "",
    sort: "popular",
    year: "",
  });
  assert.equal(buildBrowseLocation(cleared), "/browse");
});

test("comparison URL state supports removal and stops at four distinct vehicles", () => {
  assert.deepEqual(
    parseComparisonIds("?ids=one,two,three,four,five,,two"),
    ["one", "two", "three", "four"],
  );

  const four = ["one", "two", "three", "four"];
  assert.equal(addComparisonId(four, "two"), four);
  assert.equal(addComparisonId(four, "five"), four);

  const three = removeComparisonId(four, "two");
  assert.deepEqual(three, ["one", "three", "four"]);
  assert.equal(buildComparisonLocation(three), "/compare?ids=one,three,four");
  assert.equal(buildComparisonLocation(removeComparisonId(three, "one")), "/compare?ids=three,four");
  assert.equal(buildComparisonLocation([]), "/compare");
  assert.deepEqual(addComparisonId(three, "five"), ["one", "three", "four", "five"]);
});

test("local seeded demo vehicles support cross-column search with active filters", async () => {
  const results = await getDevelopmentVehicles({
    q: "2024 Ford F-150 XLT",
    makeSlug: "ford",
    model: "F-150",
    year: "2024",
    trim: "XLT",
    limit: "100",
  });

  assert.deepEqual(
    results.map(({ id }) => id),
    ["ford-f-150-2024-xlt"],
    "year, make, model, and trim search terms should match alongside explicit filters",
  );
  assert.ok(results.every((vehicle) => vehicle.isDemo));
});

test("local seeded demo vehicles include an electric MPGe fixture for calculator estimates", async () => {
  const vehicles = await getDevelopmentVehicles({ limit: "100" });
  const modelY = vehicles.find(
    (vehicle) => vehicle.id === "tesla-model-y-2024-long-range",
  );

  assert.ok(modelY, "the seeded Tesla Model Y Long Range fixture should exist");
  assert.equal(modelY.fuelType, "Electric");
  assert.equal(modelY.mpgCombined, 122);
  assert.equal(modelY.isDemo, true);
});