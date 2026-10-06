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

async function requestJson(path) {
  const response = await fetch(`${localApiBaseUrl()}${path}`, {
    signal: AbortSignal.timeout(10_000),
  });
  return { status: response.status, body: await response.json() };
}

async function getJson(path) {
  const result = await requestJson(path);
  assert.equal(result.status, 200, `${path} should return 200; response: ${JSON.stringify(result.body)}`);
  return result.body;
}

test("the checked-in baseline retains all 13 demo profiles and their illustrative child records", () => {
  assert.equal(baseline.format, "auto-research-demo-baseline.v1");
  assert.equal(baseline.classification, "demo_fixture");
  assert.deepEqual(
    tables.trims.map(({ id, slug }) => [id, slug]),
    expectedProfiles,
  );
  assert.ok(tables.trims.every((row) => row.is_demo === true));

  const trimIds = new Set(tables.trims.map(({ id }) => id));
  for (const table of [
    "ownership_estimates",
    "maintenance_items",
    "common_problems",
    "owner_reports",
  ]) {
    assert.ok(tables[table].every((row) => row.is_demo === true), `${table} must remain demo`);
  }
  assert.ok(tables.ownership_estimates.every((row) => trimIds.has(row.trim_id)));
  assert.ok(tables.maintenance_items.every((row) => trimIds.has(row.trim_id)));
  assert.ok(tables.owner_reports.every((row) => trimIds.has(row.trim_id)));
  assert.equal(tables.recalls.length, 0);
  assert.equal(tables.safety_ratings.length, 0);
  assert.deepEqual(
    Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
    baseline.counts,
  );
});

test("shopper catalog, search, discovery, comparison, and report endpoints exclude demo records", async () => {
  const [
    vehicles,
    search,
    options,
    makes,
    stats,
    popular,
    trending,
    reports,
  ] = await Promise.all([
    getJson("/vehicles?limit=100"),
    getJson("/vehicles/search?limit=100"),
    getJson("/catalog/options"),
    getJson("/makes"),
    getJson("/discovery/stats"),
    getJson("/vehicles/popular"),
    getJson("/vehicles/trending"),
    getJson("/owner-reports"),
  ]);

  for (const rows of [vehicles, search.items, popular, trending]) {
    assert.ok(rows.every((vehicle) => vehicle.isDemo !== true), "vehicle lists must not expose demo profiles");
  }
  assert.ok(options.every((option) => option.isDemo !== true), "catalog filters must not expose demo profiles");
  assert.ok(makes.every((make) => make.vehicleCount > 0), "manufacturers with only hidden demo vehicles must not appear");
  assert.ok(reports.every((report) => report.isDemo !== true), "sample owner reports must not be public");
  assert.doesNotMatch(stats.demoLabel, /demo|illustrative/i);

  for (const [, slug] of expectedProfiles) {
    const [detail, reportsForDemo, filtered] = await Promise.all([
      requestJson(`/vehicles/${encodeURIComponent(slug)}`),
      getJson(`/owner-reports?vehicleId=${encodeURIComponent(slug)}`),
      getJson(`/vehicles?vehicleId=${encodeURIComponent(slug)}&limit=10`),
    ]);
    assert.ok(
      detail.status === 404 || (detail.status === 200 && detail.body.isDemo !== true),
      `${slug} must be hidden or resolve only to a non-demo replacement`,
    );
    assert.ok(reportsForDemo.every((report) => report.isDemo !== true));
    assert.ok(filtered.every((vehicle) => vehicle.isDemo !== true));
  }
});
