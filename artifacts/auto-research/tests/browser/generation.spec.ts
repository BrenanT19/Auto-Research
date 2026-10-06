import { expect, test } from "@playwright/test";
import type { CatalogOption } from "../../src/shopper-tools";

for (const { make, model } of [
  { make: "Tesla", model: "Model Y" },
  { make: "Dodge", model: "Charger" },
  { make: "Ram", model: "1500" },
]) {
  test(`${make} ${model}: mouse opens Generation and clicks its catalog option`, async ({ page, request }) => {
    const response = await request.get("/api/catalog/options");
    expect(response.ok()).toBeTruthy();
    const catalog = await response.json() as CatalogOption[];
    const modelRows = catalog.filter((option) => option.make === make && option.model === model);
    expect(modelRows.length).toBeGreaterThan(0);
    const option = modelRows[0]!;

    await page.goto("/browse", { waitUntil: "domcontentloaded" });
    await page.getByRole("combobox", { name: "Manufacturer", exact: true }).selectOption(option.makeSlug);
    await page.getByRole("combobox", { name: "Model", exact: true }).selectOption(String(option.modelId));

    // Radix hides the background from the accessibility tree while its popup
    // is open; keep locating the same trigger for the aria-expanded assertion.
    const trigger = page.getByRole("combobox", { name: "Generation", exact: true, includeHidden: true });
    await expect(trigger).toBeEnabled();
    await expect(trigger).toHaveText("All generations / refreshes");
    expect(new URL(page.url()).searchParams.has("generationId")).toBe(false);

    // Real DOM mouse clicks, not selectOption(), keyboard substitution, or state injection.
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const generation = menu.getByRole("option", { name: option.generation, exact: true });
    await expect(generation).toBeVisible();
    await generation.click();

    await expect(menu).toBeHidden();
    await expect(trigger).toHaveText(option.generation);
    await expect(page).toHaveURL((url) => url.searchParams.get("generationId") === String(option.generationId));
    await expect(page.getByRole("combobox", { name: "Model year", exact: true }).locator("option"))
      .toHaveText(["All years", ...[...new Set(modelRows.filter((row) => row.generationId === option.generationId).map((row) => row.year))].sort((a, b) => a - b).map(String)]);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(trigger).toHaveText(option.generation);
    await trigger.click();
    await page.getByRole("option", { name: "All generations / refreshes", exact: true }).click();
    await expect(trigger).toHaveText("All generations / refreshes");
    await expect(page).toHaveURL((url) => !url.searchParams.has("generationId"));
  });
}

for (const { make, model } of [
  { make: "Tesla", model: "Model S" },
  { make: "Ford", model: "Mustang" },
]) {
  test(`${make} ${model}: reviewed catalog eras filter real results by mouse, survive reload and clear`, async ({ page, request }) => {
    const response = await request.get("/api/catalog/options");
    expect(response.ok()).toBeTruthy();
    const catalog = await response.json() as CatalogOption[];
    const namedRows = catalog.filter(row =>
      row.make === make && row.model === model && row.identityLevel === "model_year");
    const era = namedRows.find(row => row.generationKey?.startsWith("catalog:generation:") && row.year >= 2021)!;
    expect(era).toBeTruthy();
    const rows = catalog.filter(row => row.modelKey === era.modelKey);
    await page.goto(`/browse?make=${era.makeSlug}&modelKey=${encodeURIComponent(era.modelKey!)}`);
    const trigger = page.getByRole("combobox", { name: "Generation", exact: true, includeHidden: true });
    await expect(trigger).toBeEnabled();
    await expect(trigger).toHaveText("All generations / refreshes");
    const resultPromise = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.endsWith("/api/vehicles/search") && url.searchParams.get("generationKey") === era.generationKey;
    });
    await trigger.click();
    await page.getByRole("listbox").getByRole("option", { name: era.generation, exact: true }).click();
    const results = await resultPromise;
    expect(results.ok()).toBeTruthy();
    const body = await results.json();
    const expected = rows.filter(row => row.generationKey === era.generationKey);
    expect(body.total).toBe(new Set(expected.map(row => row.profileId)).size);
    expect(new Set(body.items.map((item: { id: string }) => item.id)).size).toBe(body.items.length);
    expect(body.items.every((item: { id: string }) => expected.some(row => row.profileId === item.id))).toBeTruthy();
    const years = ["All years", ...[...new Set(expected.map(row => row.year))].sort((a, b) => a - b).map(String)];
    await expect(page.getByRole("combobox", { name: "Model year", exact: true }).locator("option")).toHaveText(years);
    await expect(page).toHaveURL(url => url.searchParams.get("generationKey") === era.generationKey);
    await page.reload();
    await expect(trigger).toHaveText(era.generation);
    await expect(page.getByRole("combobox", { name: "Model year", exact: true }).locator("option")).toHaveText(years);
    await trigger.click();
    await page.getByRole("option", { name: "All generations / refreshes", exact: true }).click();
    await expect(page).toHaveURL(url => !url.searchParams.has("generationKey"));
    await expect(page.getByRole("combobox", { name: "Model year", exact: true }).locator("option"))
      .toHaveText(["All years", ...[...new Set(rows.map(row => row.year))].sort((a, b) => a - b).map(String)]);
  });
}