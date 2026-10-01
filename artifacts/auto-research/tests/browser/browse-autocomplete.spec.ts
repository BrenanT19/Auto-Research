import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import type { CatalogOption } from "../../src/shopper-tools";

async function readCatalog(request: APIRequestContext) {
  // Read the real catalog through the same proxy as the browser; never seed,
  // mutate, or stub catalog data or the autocomplete implementation.
  const response = await request.get("/api/catalog/options");
  expect(response.ok()).toBeTruthy();
  const catalog = await response.json() as CatalogOption[];
  const vehicle = catalog.find((row) => row.make === "Tesla" && row.model === "Model Y" && row.trim === "Long Range");
  expect(vehicle, "The catalog must contain the Tesla Model Y Long Range regression fixture").toBeDefined();
  return { catalog, vehicle: vehicle! };
}

async function expectSelection(page: Page, vehicle: CatalogOption, kind: "Manufacturer" | "Model") {
  const expectedParams: Record<string, string> = { make: vehicle.makeSlug, sort: "reliability" };
  if (kind === "Model") expectedParams.modelId = String(vehicle.modelId);
  await expect(page).toHaveURL((url) =>
    url.pathname === "/browse" &&
    JSON.stringify(Object.fromEntries([...url.searchParams].sort())) ===
      JSON.stringify(Object.fromEntries(Object.entries(expectedParams).sort())),
  );
  await expect(page.getByTestId("input-search-vehicles")).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Manufacturer", exact: true })).toHaveValue(vehicle.makeSlug);
  const model = page.getByRole("combobox", { name: "Model", exact: true });
  await expect(model).toBeEnabled();
  await expect(model).toHaveValue(kind === "Model" ? String(vehicle.modelId) : "");
  const generation = page.getByRole("combobox", { name: "Generation", exact: true });
  await expect(generation).toHaveText("All generations");
  if (kind === "Model") await expect(generation).toBeEnabled();
  else await expect(generation).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "Model year", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Trim", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Order by", exact: true })).toHaveValue("reliability");
}

for (const kind of ["Manufacturer", "Model"] as const) {
  test(`Browse: clicking a ${kind} suggestion applies only high-level filters`, async ({ page, request }) => {
    const { catalog, vehicle } = await readCatalog(request);
    const initial = new URLSearchParams({
      q: `${vehicle.make} ${vehicle.model}`,
      make: vehicle.makeSlug,
      modelId: String(vehicle.modelId),
      generationId: String(vehicle.generationId),
      year: String(vehicle.year),
      trimId: String(vehicle.trimId),
      sort: "reliability",
    });
    await page.goto(`/browse?${initial}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("combobox", { name: "Trim", exact: true })).toHaveValue(String(vehicle.trimId));
    await expect(page.getByRole("combobox", { name: "Generation", exact: true })).toHaveText(vehicle.generation);
    await expect(page.getByRole("combobox", { name: "Model year", exact: true })).toHaveValue(String(vehicle.year));

    const search = page.getByTestId("input-search-vehicles");
    await search.fill(vehicle.make);
    const list = page.getByRole("listbox", { name: "Manufacturer and model suggestions" });
    await expect(list).toBeVisible();
    const options = list.getByRole("option");
    // Independent expectations from catalog entities, not getBrowseSuggestions:
    // exact clean labels and metadata catch configurations disguised as Models,
    // duplicates per trim, and added Generation/Year/Trim suggestion types.
    const expected = [
      { label: vehicle.make, type: "Manufacturer" },
      ...[...new Map(catalog.filter((row) => row.makeSlug === vehicle.makeSlug)
        .map((row) => [row.modelId, { label: `${row.make} ${row.model}`, type: "Model" }])).values()]
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
    expect(expected.length, "Keep this fixture within the visible suggestion limit").toBeLessThanOrEqual(8);
    await expect(options).toHaveCount(expected.length);
    await expect(options.locator("span")).toHaveText(expected.map((entry) => entry.label));
    await expect(options.locator("small")).toHaveText(expected.map((entry) => entry.type));

    const label = kind === "Manufacturer" ? vehicle.make : `${vehicle.make} ${vehicle.model}`;
    const suggestion = options.filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) });
    await expect(suggestion).toHaveCount(1);
    await expect(suggestion).toBeVisible();
    await suggestion.click(); // Real visible DOM click, never injected selection state.
    await expect(list).toBeHidden();
    await expect(search).toHaveAttribute("aria-expanded", "false");
    await expectSelection(page, vehicle, kind);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectSelection(page, vehicle, kind);
  });
}

test("Browse: generation, year, trim, and vehicle-configuration searches do not become suggestions", async ({ page, request }) => {
  const { catalog, vehicle } = await readCatalog(request);
  await page.goto("/browse", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("combobox", { name: "Manufacturer", exact: true })).toBeEnabled();
  const search = page.getByTestId("input-search-vehicles");
  const entityLabels = catalog.flatMap((row) => [row.make, `${row.make} ${row.model}`]);
  for (const query of [
    vehicle.generation,
    String(vehicle.year),
    vehicle.trim,
    `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`,
  ]) {
    await test.step(`No lower-level suggestions for "${query}"`, async () => {
      expect(entityLabels.some((label) => label.toLowerCase().includes(query.toLowerCase())),
        "The negative fixture must not also name a manufacturer or model").toBe(false);
      await search.fill(query);
      await expect(search).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByRole("status")).toHaveText("No catalog suggestions. Press Enter to search this text.");
      await expect(page.getByRole("listbox", { name: "Manufacturer and model suggestions" })).toHaveCount(0);
      await expect(page.locator(".browse-suggestions").getByRole("option")).toHaveCount(0);
      // Typing is a draft, not an applied filter or a detail-page navigation.
      await expect(page).toHaveURL(/\/browse$/);
    });
  }
});