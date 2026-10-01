import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __clearFilterScrollBehaviors: ScrollBehavior[];
  }
}

const teslaModelYUrl = "/browse?q=Tesla%20Model%20Y&make=tesla&modelId=14&generationId=14&year=2024&sort=reliability";

async function captureScrollBehaviors(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.__clearFilterScrollBehaviors = [];
    const originalScrollTo = window.scrollTo.bind(window);
    window.scrollTo = ((optionsOrX?: ScrollToOptions | number, y?: number) => {
      if (typeof optionsOrX === "object" && optionsOrX) {
        window.__clearFilterScrollBehaviors.push(optionsOrX.behavior ?? "auto");
        originalScrollTo(optionsOrX);
      } else if (typeof optionsOrX === "number") {
        originalScrollTo(optionsOrX, y ?? 0);
      } else {
        originalScrollTo();
      }
    }) as typeof window.scrollTo;
  });
}

async function makeClearVisible(page: import("@playwright/test").Page) {
  await page.goto(teslaModelYUrl, { waitUntil: "domcontentloaded" });
  const clearButton = page.getByRole("button", { name: "Clear all search filters" });
  await expect(clearButton).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Manufacturer", exact: true })).toHaveValue("tesla");
  await expect(page.getByRole("combobox", { name: "Model", exact: true })).toHaveValue("14");
  await expect(page.getByRole("combobox", { name: "Generation", exact: true })).toHaveText("First generation");
  await expect(page.getByRole("combobox", { name: "Model year", exact: true })).toHaveValue("2024");
  await expect(page.getByRole("combobox", { name: "Order by", exact: true })).toHaveValue("reliability");
  await expect(page.getByTestId("input-search-vehicles")).toHaveValue("Tesla Model Y");
  return clearButton;
}

test("Clear all filters returns the desktop Browse page to the top without scrolling on individual changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await captureScrollBehaviors(page);
  const clearButton = await makeClearVisible(page);

  await page.evaluate(() => window.scrollTo({ top: 420, behavior: "instant" }));
  await page.waitForFunction(() => window.scrollY > 0);
  await page.evaluate(() => { window.__clearFilterScrollBehaviors = []; });
  await clearButton.click();

  await expect(page).toHaveURL(/\/browse$/);
  await expect(clearButton).toHaveCount(0);
  await expect(page.getByTestId("input-search-vehicles")).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Manufacturer", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Model", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Generation", exact: true })).toHaveText("All generations");
  await expect(page.getByRole("combobox", { name: "Model year", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Trim", exact: true })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Order by", exact: true })).toHaveValue("popular");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => window.__clearFilterScrollBehaviors)).toEqual(["smooth"]);

  // A subsequent individual filter change updates the URL but does not invoke
  // the Clear All scroll behavior or move the current page position.
  await page.evaluate(() => window.scrollTo({ top: 320, behavior: "instant" }));
  await page.waitForFunction(() => window.scrollY > 0);
  await page.evaluate(() => { window.__clearFilterScrollBehaviors = []; });
  await page.getByRole("combobox", { name: "Order by", exact: true }).selectOption("reliability");
  await expect(page).toHaveURL(/sort=reliability/);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__clearFilterScrollBehaviors)).toEqual([]);
});

test("Clear all filters returns mobile Browse to the top and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await captureScrollBehaviors(page);
  const clearButton = await makeClearVisible(page);

  await page.evaluate(() => window.scrollTo({ top: 620, behavior: "instant" }));
  await page.waitForFunction(() => window.scrollY > 0);
  await page.evaluate(() => { window.__clearFilterScrollBehaviors = []; });
  await clearButton.click();

  await expect(page).toHaveURL(/\/browse$/);
  await expect(clearButton).toHaveCount(0);
  await expect(page.getByTestId("input-search-vehicles")).toHaveValue("");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => window.__clearFilterScrollBehaviors)).toEqual(["instant"]);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(teslaModelYUrl, { waitUntil: "domcontentloaded" });
  await expect(clearButton).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 620, behavior: "instant" }));
  await page.waitForFunction(() => window.scrollY > 0);
  await page.evaluate(() => { window.__clearFilterScrollBehaviors = []; });
  await clearButton.click();
  await expect(page).toHaveURL(/\/browse$/);
  await expect(clearButton).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => window.__clearFilterScrollBehaviors)).toEqual(["smooth"]);
});
