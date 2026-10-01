import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

type VehicleSummary = {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string;
};

const fixtureDescriptions = [
  { make: "Ford", model: "F-150", trim: "XLT" },
  { make: "Chevrolet", model: "Silverado 1500", trim: "LT" },
  { make: "Tesla", model: "Model Y", trim: "Long Range" },
  { make: "Cadillac", model: "Escalade", trim: "Premium Luxury" },
] as const;

async function readFixtures(request: APIRequestContext) {
  // Read the shared catalog through the proxy; comparison smoke checks must not
  // seed or mutate vehicle data.
  const response = await request.get("/api/vehicles?limit=100");
  expect(response.ok()).toBeTruthy();
  const vehicles = await response.json() as VehicleSummary[];
  return fixtureDescriptions.map((fixture) => {
    const vehicle = vehicles.find((row) =>
      row.make === fixture.make &&
      row.model === fixture.model &&
      row.trim === fixture.trim &&
      row.year === 2024
    );
    expect(vehicle, `Missing comparison fixture: 2024 ${fixture.make} ${fixture.model} ${fixture.trim}`).toBeDefined();
    return vehicle!;
  });
}

async function expectComparison(page: Page, vehicles: VehicleSummary[]) {
  const expectedIds = vehicles.map((vehicle) => vehicle.id);
  await expect(page).toHaveURL((url) => {
    const actualIds = url.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
    return url.pathname === "/compare" && JSON.stringify(actualIds) === JSON.stringify(expectedIds);
  });

  await expect(page.locator("#comparison-selection-status"))
    .toContainText(`${vehicles.length} of 4 vehicles selected`);
  const columns = page.locator(".compare-table thead .compare-vehicle");
  await expect(columns).toHaveCount(vehicles.length);
  const columnIds = await columns.locator("a").evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")?.replace("/vehicles/", ""))
  );
  expect(columnIds).toEqual(expectedIds);
  for (const vehicle of vehicles) {
    const column = page.locator(".compare-table thead th").filter({
      has: page.locator(`a[href="/vehicles/${vehicle.id}"]`),
    });
    await expect(column.locator("a")).toHaveText(`${vehicle.make} ${vehicle.model}`);
    await expect(column.locator("small")).toHaveText(`${vehicle.year} · ${vehicle.trim}`);
  }

  const search = page.getByRole("textbox", { name: "Add a vehicle by make or model" });
  if (vehicles.length === 4) {
    await expect(search).toBeDisabled();
    await expect(page.locator("#comparison-selection-status small"))
      .toHaveText("Remove a vehicle to add another.");
  } else {
    await expect(search).toBeEnabled();
  }
}

test("Compare: selections, deep links, and browser history stay in sync", async ({ page, request }) => {
  const fixtures = await readFixtures(request);
  await page.goto("/compare", { waitUntil: "domcontentloaded" });

  const search = page.getByRole("textbox", { name: "Add a vehicle by make or model" });
  const suggestions = page.locator(".picker-results");
  const selected: VehicleSummary[] = [];

  await expect(search).toBeEnabled();
  for (const vehicle of fixtures) {
    await search.fill(`${vehicle.make} ${vehicle.model}`);
    await expect(suggestions).toBeVisible();

    const option = suggestions.getByRole("button").filter({
      hasText: `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`,
    });
    await expect(option).toHaveCount(1);
    await option.click();
    selected.push(vehicle);

    await expect(suggestions).toHaveCount(0);
    await expect(search).toHaveValue("");
    await expectComparison(page, selected);
  }

  const selectedIds = fixtures.map((vehicle) => vehicle.id);
  const directUrl = `/compare?ids=${selectedIds.join(",")}`;
  await page.goto(directUrl, { waitUntil: "domcontentloaded" });
  await expectComparison(page, fixtures);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expectComparison(page, fixtures);

  const removedVehicle = fixtures[3]!;
  const remainingVehicles = fixtures.slice(0, 3);
  await page.locator(".compare-table thead th").filter({
    has: page.locator(`a[href="/vehicles/${removedVehicle.id}"]`),
  })
    .getByRole("button", { name: "Remove vehicle" })
    .click();
  await expectComparison(page, remainingVehicles);

  await search.fill(`${removedVehicle.make} ${removedVehicle.model}`);
  await expect(suggestions).toBeVisible();
  await expect(suggestions.getByRole("button").filter({
    hasText: `${removedVehicle.year} ${removedVehicle.make} ${removedVehicle.model} ${removedVehicle.trim}`,
  })).toHaveCount(1);
  await search.fill("");
  await expect(suggestions).toHaveCount(0);

  await page.goBack();
  await expectComparison(page, fixtures);
  await expect(search).toHaveValue("");

  await page.goForward();
  await expectComparison(page, remainingVehicles);
  await expect(search).toHaveValue("");
});