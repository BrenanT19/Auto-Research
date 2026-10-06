import { expect, test } from "@playwright/test";

test("refreshing a nested page returns to the landing page", async ({ page }) => {
  await page.goto("/about?source=refresh-test#what-youll-find");
  await expect(page.getByRole("heading", { name: "Better questions make better ownership." })).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL(url =>
    url.pathname === "/" && !url.search && !url.hash
  );
  await expect(page.getByRole("heading", { name: "Know What You’re Buying." })).toBeVisible();
});

test("opening a deep link directly still opens that page", async ({ page }) => {
  await page.goto("/about");

  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "Better questions make better ownership." })).toBeVisible();
});
