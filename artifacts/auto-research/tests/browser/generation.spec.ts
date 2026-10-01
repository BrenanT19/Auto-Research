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

    await page.goto("/browse");
    await page.getByLabel("Manufacturer", { exact: true }).selectOption(option.makeSlug);
    await page.getByLabel("Model", { exact: true }).selectOption(String(option.modelId));

    const trigger = page.getByRole("combobox", { name: "Generation", exact: true });
    await expect(trigger).toBeEnabled();
    await expect(trigger).toHaveText("All generations");
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
    await expect(page.getByLabel("Model year", { exact: true }).locator("option"))
      .toHaveText(["All years", ...[...new Set(modelRows.filter((row) => row.generationId === option.generationId).map((row) => row.year))].sort((a, b) => a - b).map(String)]);

    await page.reload();
    await expect(trigger).toHaveText(option.generation);
    await trigger.click();
    await page.getByRole("option", { name: "All generations", exact: true }).click();
    await expect(trigger).toHaveText("All generations");
    await expect(page).toHaveURL((url) => !url.searchParams.has("generationId"));
  });
}