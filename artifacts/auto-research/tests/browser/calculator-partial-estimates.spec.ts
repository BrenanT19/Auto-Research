import { expect, test } from "@playwright/test";

test("financing and a clearly labeled partial total survive missing energy inputs", async ({ page }) => {
  await page.goto("/calculator");

  await page.getByLabel("Miles driven per year").fill("");
  await page.getByLabel("Combined fuel economy").fill("");
  await page.getByLabel("Fuel price").fill("");

  await expect(page.getByTestId("purchase-breakdown")).toBeVisible();
  await expect(page.getByTestId("financing-analysis")).toBeVisible();

  const results = page.locator(".calc-result");
  await expect(results.getByText("PARTIAL MONTHLY ESTIMATE")).toBeVisible();
  await expect(results.getByText("Add annual mileage to estimate energy cost.")).toBeVisible();
  await expect(results.getByText("Partial estimate. Not included: Fuel cost.")).toBeVisible();
  await expect(results.locator("strong").first()).not.toHaveText("Not calculated");

  await page.getByLabel("Insurance").fill("0");
  await expect(results.locator(".result-breakdown")).toContainText("$0");
  await expect(results.getByText("PARTIAL MONTHLY ESTIMATE")).toBeVisible();
});

test("electricity input is labeled in cents and calculates 32¢/kWh for 50 kWh as $16", async ({ page }) => {
  await page.goto("/calculator");
  const energySource = page.getByLabel("Energy source");
  await expect(energySource).toHaveValue("gasoline");
  await expect(page.getByLabel("Fuel price")).toBeVisible();
  await energySource.selectOption("electric");

  const price = page.getByLabel("Electricity price");
  await expect(page.getByLabel("Fuel price")).not.toBeVisible();
  await expect(price).toBeVisible();
  await expect(page.getByText("¢/kWh", { exact: true })).toBeVisible();
  await expect(page.getByText("32¢/kWh is $0.32/kWh.")).toBeVisible();
  await page.getByLabel("Miles driven per year").fill("600");
  await page.getByLabel("Combined fuel economy").fill("33.7");
  await price.fill("32");

  await expect(page.locator(".calc-result .result-breakdown > div").nth(1).locator("b"))
    .toHaveText("$16");
});
