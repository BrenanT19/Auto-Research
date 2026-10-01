import { expect, test } from "@playwright/test";

for (const height of [768, 720]) {
  test(`desktop filters fit at 1366×${height} and remain reachable in a long results area`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height });
    await page.goto("/browse?sort=reliability");
    await expect(page.locator(".vehicle-card").first()).toBeVisible();
    const panel = page.locator(".filter-panel");
    const clear = page.getByRole("button", { name: "Clear all search filters" });

    // Browser-only extra length tests sticky independence from dataset size.
    // No vehicle data, API response, or stored records are changed.
    await page.locator(".results-area").evaluate(element => {
      const spacer = document.createElement("div");
      spacer.style.height = "30000px";
      element.appendChild(spacer);
    });
    for (const top of [700, 15000, 28000]) {
      await page.evaluate(y => window.scrollTo({ top: y, behavior: "instant" }), top);
      const geometry = await panel.evaluate(element => ({
        top: element.getBoundingClientRect().top,
        bottom: element.getBoundingClientRect().bottom,
        client: element.clientHeight,
        content: element.scrollHeight,
        headerBottom: document.querySelector(".site-header")!.getBoundingClientRect().bottom,
      }));
      expect(geometry.top).toBeGreaterThanOrEqual(geometry.headerBottom + 11);
      expect(geometry.bottom).toBeLessThanOrEqual(height - 11);
      expect(geometry.content).toBeLessThanOrEqual(geometry.client + 1);
      await expect(clear).toBeInViewport({ ratio: 1 });
    }
    // A fitting sidebar does not intercept normal page-wheel scrolling.
    const box = (await panel.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 100);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 250);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
    expect(await panel.evaluate(element => element.scrollTop)).toBe(0);
  });
}

test("short desktop windows use real internal wheel scrolling and keep Clear All reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 520 });
  await page.goto("/browse?sort=reliability");
  await expect(page.locator(".vehicle-card").first()).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 1000, behavior: "instant" }));
  const panel = page.locator(".filter-panel");
  expect(await panel.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  const box = (await panel.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(84);
  expect(box.y + box.height).toBeLessThanOrEqual(508);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const pagePosition = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => panel.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(pagePosition);
  const clear = page.getByRole("button", { name: "Clear all search filters" });
  await expect(clear).toBeInViewport({ ratio: 1 });
  await clear.click();
  await expect(page).toHaveURL(/\/browse$/);
  await expect(clear).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

for (const width of [700, 390]) {
  test(`existing responsive filters remain in normal page flow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/browse?sort=reliability");
    await expect(page.getByRole("button", { name: "Clear all search filters" })).toBeVisible();
    const geometry = await page.locator(".filter-panel").evaluate(element => ({
      position: getComputedStyle(element).position,
      maxHeight: getComputedStyle(element).maxHeight,
      columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
      client: element.clientHeight,
      content: element.scrollHeight,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    }));
    expect(geometry.position).toBe("static");
    expect(geometry.maxHeight).toBe("none");
    expect(geometry.columns).toBe(width <= 420 ? 1 : 2);
    expect(geometry.content).toBeLessThanOrEqual(geometry.client + 1);
    expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  });
}

test("uncached Clear All performs one continuous scroll without a loading-height clamp", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // Delay the real reset request, without replacing or modifying its response.
  await page.route("**/api/vehicles?**", async route => {
    if (!route.request().url().includes("sort=reliability")) {
      await new Promise(resolve => setTimeout(resolve, 900));
    }
    await route.continue();
  });
  await page.goto("/browse?sort=reliability");
  await expect(page.locator(".vehicle-card").first()).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }));
  await page.evaluate(() => {
    const trace = { calls: [] as { y: number; behavior?: ScrollBehavior }[], samples: [] as number[] };
    Object.assign(window, { __browseResetTrace: trace });
    const original = window.scrollTo.bind(window);
    window.scrollTo = ((options: ScrollToOptions) => {
      trace.calls.push({ y: scrollY, behavior: options.behavior });
      original(options);
    }) as typeof window.scrollTo;
    const start = performance.now();
    const record = () => {
      trace.samples.push(scrollY);
      if (performance.now() - start < 1300) requestAnimationFrame(record);
    };
    record();
  });
  await page.getByRole("button", { name: "Clear all search filters" }).click();
  await expect(page).toHaveURL(/\/browse$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  const trace = await page.evaluate(() => (window as unknown as {
    __browseResetTrace: { calls: { y: number; behavior?: string }[]; samples: number[] };
  }).__browseResetTrace);
  // Before this fix, y had already jumped from 1400 to ~395 at this call.
  expect(trace.calls).toEqual([{ y: 1400, behavior: "smooth" }]);
  expect(new Set(trace.samples.filter(y => y > 0 && y < 1400)).size).toBeGreaterThan(5);
  for (let i = 1; i < trace.samples.length; i++) {
    expect(trace.samples[i]).toBeLessThanOrEqual(trace.samples[i - 1]);
    expect(trace.samples[i - 1] - trace.samples[i]).toBeLessThan(350);
  }
  await expect(page.locator(".results-area")).not.toHaveAttribute("style", /min-height/);
  await expect(page.locator(".vehicle-card").first()).toBeVisible();
});