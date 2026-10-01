import { expect, test } from "@playwright/test";

const sequential = ["overview", "reliability", "costs", "reports"];
const nonSequential = ["overview", "reports", "reliability", "costs", "overview"];

for (const vehicle of ["dodge-charger-2023-gt", "tesla-model-y-2024-long-range"]) {
  test(`${vehicle}: immediate click feedback, settled tracking, and reverse manual scrolling`, async ({ page }) => {
    await page.goto(`/vehicles/${vehicle}`);
    await expect(page.locator("#reports")).toBeVisible();
    const active = page.locator(".detail-tabs a[aria-current='location']");
    for (const sequence of [sequential, sequential, nonSequential]) {
      for (const id of sequence) {
        await page.locator(`.detail-tabs a[href='#${id}']`).click();
        // Check immediately, not only after the native animation has finished.
        expect(await active.getAttribute("href")).toBe(`#${id}`);
        await page.waitForFunction(id => {
          const section = document.getElementById(id)!;
          const offset = parseFloat(getComputedStyle(section).scrollMarginTop);
          const max = document.documentElement.scrollHeight - innerHeight;
          const destination = Math.min(max, Math.max(0, scrollY + section.getBoundingClientRect().top - offset));
          return Math.abs(scrollY - destination) <= 1;
        }, id);
        await expect(active).toHaveAttribute("href", `#${id}`);
      }
    }
    await page.locator(".detail-tabs a[href='#reports']").click();
    await page.waitForFunction(() => scrollY >= document.documentElement.scrollHeight - innerHeight - 1);
    await page.mouse.move(700, 400);
    for (const id of ["costs", "reliability", "overview"]) {
      const delta = await page.evaluate(id => {
        const section = document.getElementById(id)!;
        const offset = parseFloat(getComputedStyle(section).scrollMarginTop);
        return section.getBoundingClientRect().top - offset + 25;
      }, id);
      await page.mouse.wheel(0, delta);
      await expect(active).toHaveAttribute("href", `#${id}`);
      await page.waitForFunction(({ id }) => {
        const section = document.getElementById(id)!;
        return Math.abs(section.getBoundingClientRect().top - parseFloat(getComputedStyle(section).scrollMarginTop) + 25) <= 2;
      }, { id });
    }
    for (const id of ["reliability", "costs", "reports"]) {
      const delta = await page.evaluate(id => {
        const section = document.getElementById(id)!;
        return section.getBoundingClientRect().top - parseFloat(getComputedStyle(section).scrollMarginTop) + 25;
      }, id);
      await page.mouse.wheel(0, delta);
      await expect(active).toHaveAttribute("href", `#${id}`);
    }
  });
}

test("report navigation honors reduced motion and initial section links without later loading snaps", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vehicles/dodge-charger-2023-gt#reliability");
  await expect(page.locator(".detail-tabs a.active")).toHaveAttribute("href", "#reliability");
  for (const id of ["reports", "costs", "overview"]) {
    await page.locator(`.detail-tabs a[href='#${id}']`).click();
    await expect(page.locator(".detail-tabs a.active")).toHaveAttribute("href", `#${id}`);
    const aligned = await page.evaluate(id => {
      const section = document.getElementById(id)!;
      const max = document.documentElement.scrollHeight - innerHeight;
      return Math.abs(section.getBoundingClientRect().top - parseFloat(getComputedStyle(section).scrollMarginTop)) <= 1 || scrollY >= max - 1;
    }, id);
    expect(aligned).toBe(true);
  }
});

test("rapid navigation and user interruption do not leave the indicator locked to a click", async ({ page }) => {
  await page.goto("/vehicles/dodge-charger-2023-gt");
  await expect(page.locator("#reports")).toBeVisible();
  const active = page.locator(".detail-tabs a[aria-current='location']");
  for (const id of ["reports", "reliability", "costs", "overview", "reports"]) {
    await page.locator(`.detail-tabs a[href='#${id}']`).click();
    expect(await active.getAttribute("href")).toBe(`#${id}`);
  }
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, -250);
  await expect.poll(async () => page.evaluate(() => {
    const ids = ["overview", "reliability", "costs", "reports"];
    const line = parseFloat(getComputedStyle(document.getElementById("overview")!).scrollMarginTop);
    const expected = scrollY >= document.documentElement.scrollHeight - innerHeight - 1
      ? "reports"
      : ids.filter(id => document.getElementById(id)!.getBoundingClientRect().top <= line + 1).at(-1) ?? "overview";
    return document.querySelector(".detail-tabs a.active")?.getAttribute("href") === `#${expected}`;
  })).toBe(true);
});