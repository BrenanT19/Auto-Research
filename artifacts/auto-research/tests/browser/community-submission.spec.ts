import { expect, test, type Page } from "@playwright/test";

const canonicalOption = {
  profileId: "synthetic-canonical-profile",
  canonicalConfigurationId: 32001,
  makeId: 12,
  make: "Synthetic Motors",
  makeSlug: "synthetic-motors",
  modelId: 34,
  model: "Example",
  generationId: 56,
  generation: "Second generation",
  modelYearId: 78,
  year: 2025,
  trimId: 90,
  trim: "Touring",
  profileKind: "canonical",
  makeKey: "canonical:make:12",
  modelKey: "canonical:model:34",
  generationKey: "canonical:generation:56",
  modelYearKey: "canonical:model-year:78",
  trimKey: "canonical:trim:90",
};

async function mockCommunityReads(
  page: Page,
  catalogOptions: unknown[],
) {
  await page.route("**/api/makes**", route => route.fulfill({ json: [] }));
  await page.route("**/api/vehicles**", route => route.fulfill({ json: [] }));
  await page.route("**/api/owner-reports**", route => route.fulfill({ json: [] }));
  await page.route("**/api/catalog/options**", route => route.fulfill({ json: catalogOptions }));
}

test("submits consent and firsthand attestation for the selected exact canonical configuration", async ({ page }) => {
  await mockCommunityReads(page, [canonicalOption]);
  let requestBody: unknown;
  await page.route("**/api/owner-submissions", async route => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        status: "pending_review",
        message: "Your experience was received. It will stay private until its content and exact-vehicle applicability are reviewed.",
      }),
    });
  });

  await page.goto("/community");
  await page.getByRole("button", { name: /Share Your Ownership Experience/ }).click();
  await page.getByLabel("Exact vehicle configuration").selectOption("32001");
  await page.getByLabel("Title", { exact: true }).fill("A useful ownership detail");
  await page.getByLabel("Your firsthand experience").fill(
    "I have driven this exact configuration for two years and want to share what ownership has been like.",
  );
  await page.getByLabel("I confirm this is my firsthand experience with the exact configuration selected.").check();
  await page.getByLabel(/I consent to AutoResearch reviewing/).check();
  await page.getByRole("button", { name: "Submit for review" }).click();

  await expect(page.getByRole("status")).toContainText("stay private until its content");
  await expect(page.locator("#owner-submission-form")).toBeHidden();
  expect(requestBody).toEqual({
    configurationId: 32001,
    title: "A useful ownership detail",
    body: "I have driven this exact configuration for two years and want to share what ownership has been like.",
    firsthandAttestation: true,
    publicationConsent: true,
  });
});

test("keeps demo profiles unavailable for submission when no canonical configurations are released", async ({ page }) => {
  await mockCommunityReads(page, []);
  await page.goto("/community");
  await page.getByRole("button", { name: /Share Your Ownership Experience/ }).click();

  await expect(page.getByRole("status")).toContainText("No canonical configurations are currently open");
  await expect(page.getByLabel("Exact vehicle configuration")).toHaveCount(0);
  await expect(page.getByLabel("Title", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit for review" })).toHaveCount(0);
});