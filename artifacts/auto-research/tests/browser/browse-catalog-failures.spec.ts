import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import type { CatalogOption } from "../../src/shopper-tools";

async function readCatalogFixture(request: APIRequestContext) {
  // Keep the fixture tied to the existing catalog; this suite never writes it.
  const response = await request.get("/api/catalog/options");
  expect(response.ok()).toBeTruthy();
  const catalog = await response.json() as CatalogOption[];
  const vehicle = catalog.find((row) =>
    row.make === "Tesla" && row.model === "Model Y" && row.trim === "Long Range",
  );
  expect(vehicle, "The catalog must contain the Tesla Model Y Long Range fixture").toBeDefined();
  return vehicle!;
}

function suggestionStatus(page: Page) {
  return page.locator(".browse-suggestions").getByRole("status");
}

async function expectVehicleSuggestion(page: Page, vehicle: CatalogOption) {
  const list = page.getByRole("listbox", { name: "Manufacturer and model suggestions" });
  const label = `${vehicle.make} ${vehicle.model}`;
  const modelSuggestion = list.getByRole("option").filter({
    has: page.locator("span", { hasText: new RegExp(`^${label}$`) }),
  });
  await expect(list).toBeVisible();
  await expect(modelSuggestion).toBeVisible();
}

test("Browse shows loading while catalog suggestions are delayed, then displays real suggestions", async ({ page, request }) => {
  const vehicle = await readCatalogFixture(request);
  let releaseCatalogRequest!: () => void;
  const catalogRequestGate = new Promise<void>((resolve) => {
    releaseCatalogRequest = resolve;
  });

  // Hold the real read so the visible loading branch can be exercised.
  await page.route("**/api/catalog/options", async (route) => {
    await catalogRequestGate;
    await route.continue();
  });

  try {
    await page.goto("/browse", { waitUntil: "domcontentloaded" });
    const search = page.getByTestId("input-search-vehicles");
    await search.fill(vehicle.make);
    await expect(suggestionStatus(page)).toHaveText("Loading catalog suggestions…");

    releaseCatalogRequest();
    await expectVehicleSuggestion(page, vehicle);
  } finally {
    releaseCatalogRequest();
  }
});

test("Browse Retry recovers suggestions after the catalog request fails", async ({ page, request }) => {
  const vehicle = await readCatalogFixture(request);
  let failCatalogRequests = true;
  let catalogRequestCount = 0;

  await page.route("**/api/catalog/options", async (route) => {
    catalogRequestCount += 1;
    if (failCatalogRequests) {
      // Simulate an unavailable response without replacing or changing catalog data.
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporarily unavailable for this browser test." }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/browse", { waitUntil: "domcontentloaded" });
  const search = page.getByTestId("input-search-vehicles");
  await search.fill(vehicle.make);
  const status = suggestionStatus(page);
  await expect(status).toContainText("Catalog suggestions are unavailable.", { timeout: 20_000 });
  await expect(page.locator(".catalog-options-error")).toContainText("Catalog filters could not be loaded.");

  const retryButton = status.getByRole("button", { name: "Retry", exact: true });
  await expect(retryButton).toBeVisible();
  failCatalogRequests = false;
  const retryResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/api/catalog/options") &&
    response.request().method() === "GET",
  );
  await retryButton.click();
  expect((await retryResponse).ok()).toBeTruthy();
  expect(catalogRequestCount).toBeGreaterThan(1);
  await expectVehicleSuggestion(page, vehicle);
});

test("Browse submits typed text with Enter while catalog suggestions are unavailable", async ({ page }) => {
  await page.route("**/api/catalog/options", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Temporarily unavailable for this browser test." }),
    });
  });

  await page.goto("/browse", { waitUntil: "domcontentloaded" });
  const search = page.getByTestId("input-search-vehicles");
  await search.fill("1999 Unlisted Coupe");
  await expect(suggestionStatus(page)).toContainText("Catalog suggestions are unavailable.", { timeout: 20_000 });
  await expect(page.getByRole("listbox", { name: "Manufacturer and model suggestions" })).toHaveCount(0);

  await search.press("Enter");

  await expect(page).toHaveURL((url) =>
    url.pathname === "/browse" && url.searchParams.get("q") === "1999 Unlisted Coupe",
  );
  await expect(search).toHaveValue("1999 Unlisted Coupe");
  await expect(page.locator(".browse-suggestions")).toHaveCount(0);
});