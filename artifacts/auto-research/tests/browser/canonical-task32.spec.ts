import { expect, test, type Page, type Route } from "@playwright/test";

const canonicalSlug = "task32-synthetic-alpha";
const knownValuesSlug = "task32-synthetic-known-values";

const sourceCitation = {
  sourceId: "synthetic-source-32001",
  revisionId: "synthetic-revision-32001",
  publisher: "Task32 synthetic test source",
  url: "https://example.invalid/task32/synthetic-source",
  documentIdentifier: "task32-synthetic-document",
  sourceVersion: "fixture-v1",
  publishedAt: null,
  retrievedAt: "2025-01-01T00:00:00.000Z",
  locator: "Synthetic acceptance-test record",
  measurementBasis: null,
  unit: null,
};

function claim(id: string, unit: string | null = null, contentClass = "source_fact") {
  return {
    id,
    contentClass,
    reviewStatus: "accepted",
    evidenceStrength: "strong",
    effectiveFrom: null,
    effectiveTo: null,
    applicability: "applies",
    applicabilityVersion: "stage2a-v1",
    scopeDescription: "Reviewed synthetic scope applies to this exact configuration.",
    sources: [{ ...sourceCitation, unit }],
  };
}

const sparseClaims = [claim("32001")];
const sparseFieldStates = {
  bodyType: { state: "unknown", reason: "No accepted body-type claim.", claimIds: [] },
  drivetrain: { state: "unknown", reason: "No accepted drivetrain claim.", claimIds: [] },
  fuelType: { state: "unknown", reason: "No accepted fuel-type claim.", claimIds: [] },
  mpgCity: { state: "unknown", reason: "No accepted city fuel-economy claim.", claimIds: [] },
  mpgHighway: { state: "unknown", reason: "No accepted highway fuel-economy claim.", claimIds: [] },
  mpgCombined: { state: "unknown", reason: "No accepted combined fuel-economy claim.", claimIds: [] },
  horsepower: { state: "unknown", reason: "No accepted horsepower claim.", claimIds: [] },
  priceUsd: { state: "unknown", reason: "No accepted price claim.", claimIds: [] },
  reliabilityEstimate: { state: "not_yet_researched", reason: "Reliability research has not been completed.", claimIds: [] },
  annualOwnershipEstimateUsd: { state: "not_yet_researched", reason: "Ownership-cost research has not been completed.", claimIds: [] },
  annualMaintenanceEstimateUsd: { state: "not_yet_researched", reason: "Maintenance research has not been completed.", claimIds: [] },
  annualRepairEstimateUsd: { state: "not_yet_researched", reason: "Repair-cost research has not been completed.", claimIds: [] },
  annualFuelEstimateUsd: { state: "not_yet_researched", reason: "Fuel-cost research has not been completed.", claimIds: [] },
  researchRank: { state: "not_yet_researched", reason: "No research ranking is available.", claimIds: [] },
  overview: { state: "unknown", reason: "No accepted overview claim.", claimIds: [] },
  engineName: { state: "unknown", reason: "No accepted engine claim.", claimIds: [] },
  transmissionName: { state: "unknown", reason: "No accepted transmission claim.", claimIds: [] },
  reliabilityLabel: { state: "not_yet_researched", reason: "No reliability label is available.", claimIds: [] },
  reliabilityNote: { state: "not_yet_researched", reason: "No reliability note is available.", claimIds: [] },
  insuranceEstimateUsd: { state: "not_yet_researched", reason: "Insurance research has not been completed.", claimIds: [] },
  fiveYearDepreciationPercent: { state: "not_yet_researched", reason: "Depreciation research has not been completed.", claimIds: [] },
  expectedLifespanMiles: { state: "not_yet_researched", reason: "Lifespan research has not been completed.", claimIds: [] },
  recallStatus: { state: "unknown", reason: "Recall information is not available.", claimIds: [] },
  safetyStatus: { state: "unknown", reason: "Safety information is not available.", claimIds: [] },
};

const sparseSectionStates = {
  specifications: { state: "unknown", reason: "Specification research is sparse.", claimIds: [] },
  reliability: { state: "not_yet_researched", reason: "Reliability research has not been completed.", claimIds: [] },
  ownership: { state: "not_yet_researched", reason: "Ownership research has not been completed.", claimIds: [] },
  knownIssues: { state: "not_yet_researched", reason: "Known-issue research has not been completed.", claimIds: [] },
  ownerReports: { state: "not_yet_researched", reason: "No classified owner reports are available.", claimIds: [] },
  externalOwnerPatterns: { state: "not_yet_researched", reason: "No external owner patterns are available.", claimIds: [] },
  engines: { state: "not_yet_researched", reason: "Engine details have not been researched.", claimIds: [] },
  transmissions: { state: "not_yet_researched", reason: "Transmission details have not been researched.", claimIds: [] },
  siblingTrims: { state: "not_yet_researched", reason: "Sibling trims have not been researched.", claimIds: [] },
  commonProblems: { state: "not_yet_researched", reason: "Common problems have not been researched.", claimIds: [] },
  maintenance: { state: "not_yet_researched", reason: "Maintenance details have not been researched.", claimIds: [] },
  recalls: { state: "unknown", reason: "Recall information is not available.", claimIds: [] },
  safety: { state: "unknown", reason: "Safety information is not available.", claimIds: [] },
  inspectionChecklist: { state: "not_yet_researched", reason: "No inspection checklist has been researched.", claimIds: [] },
};

const canonicalVehicle = {
  id: canonicalSlug,
  profileKind: "canonical",
  canonicalConfigurationId: 32001,
  isDemo: false,
  make: "Task32 Synthetic Motor",
  makeSlug: "task32-synthetic-motor",
  model: "Synthetic Alpha",
  modelSlug: "synthetic-alpha",
  year: 2025,
  generation: "Synthetic first generation",
  trim: "Sparse Test",
  bodyType: null,
  drivetrain: null,
  fuelType: null,
  mpgCity: null,
  mpgHighway: null,
  mpgCombined: null,
  horsepower: null,
  priceUsd: null,
  reliabilityEstimate: null,
  annualOwnershipEstimateUsd: null,
  annualMaintenanceEstimateUsd: null,
  annualRepairEstimateUsd: null,
  annualFuelEstimateUsd: null,
  researchRank: null,
  imageKey: "vehicle-placeholder",
  overview: null,
  engineName: null,
  transmissionName: null,
  engines: [],
  transmissions: [],
  siblingTrims: [],
  reliability: { score: null, label: null, note: null },
  commonProblems: [],
  maintenance: [],
  insuranceEstimateUsd: null,
  fiveYearDepreciationPercent: null,
  expectedLifespanMiles: null,
  inspectionChecklist: [],
  recallStatus: null,
  safetyStatus: null,
  fieldStates: sparseFieldStates,
  sectionStates: sparseSectionStates,
  claims: sparseClaims,
};

const knownClaims = [
  claim("32011", "USD"),
  claim("32012", "mpg"),
  claim("32013", "USD/year", "estimate"),
];

const knownValuesVehicle = {
  ...canonicalVehicle,
  id: knownValuesSlug,
  canonicalConfigurationId: 32002,
  model: "Synthetic Known Values",
  modelSlug: "synthetic-known-values",
  trim: "Researched Test",
  priceUsd: 45_000,
  mpgCombined: 34,
  annualMaintenanceEstimateUsd: 1_200,
  fieldStates: {
    ...sparseFieldStates,
    priceUsd: { state: "known", reason: null, claimIds: ["32011"] },
    mpgCombined: { state: "known", reason: null, claimIds: ["32012"] },
    annualMaintenanceEstimateUsd: { state: "known", reason: null, claimIds: ["32013"] },
  },
  sectionStates: {
    ...sparseSectionStates,
    specifications: { state: "known", reason: null, claimIds: ["32011", "32012"] },
    ownership: { state: "known", reason: null, claimIds: ["32013"] },
  },
  claims: [...sparseClaims, ...knownClaims],
};

const hierarchyIds = {
  makeId: 42,
  modelId: 4201,
  generationId: 4202,
  modelYearId: 42025,
  trimId: 4203,
};

function catalogOption(profileId: string, model: string, trim: string, keys: typeof hierarchyIds) {
  return {
    profileId,
    profileKind: "canonical",
    makeId: keys.makeId,
    make: canonicalVehicle.make,
    makeSlug: canonicalVehicle.makeSlug,
    makeKey: `canonical:make:${keys.makeId}`,
    modelId: keys.modelId,
    model,
    modelKey: `canonical:model:${keys.modelId}`,
    generationId: keys.generationId,
    generation: canonicalVehicle.generation,
    generationKey: `canonical:generation:${keys.generationId}`,
    modelYearId: keys.modelYearId,
    modelYearKey: `canonical:model-year:${keys.modelYearId}`,
    year: canonicalVehicle.year,
    trimId: keys.trimId,
    trimKey: `canonical:trim:${keys.trimId}`,
    trim,
  };
}

const catalogOptions = [
  catalogOption(canonicalSlug, canonicalVehicle.model, canonicalVehicle.trim, hierarchyIds),
  catalogOption(knownValuesSlug, knownValuesVehicle.model, knownValuesVehicle.trim, {
    ...hierarchyIds,
    modelId: 4211,
    generationId: 4212,
    modelYearId: 42125,
    trimId: 4213,
  }),
];

async function routeTask32Api(page: Page, options: { detailDelayMs?: number } = {}) {
  await page.route("**/api/**", async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api/, "");
    if (path === "/vehicles") {
      await route.fulfill({ json: [canonicalVehicle, knownValuesVehicle] });
    } else if (path === "/catalog/options") {
      await route.fulfill({ json: catalogOptions });
    } else if (path === `/vehicles/${canonicalSlug}` || path === `/vehicles/${knownValuesSlug}`) {
      if (options.detailDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.detailDelayMs));
      }
      const detail = path.endsWith(canonicalSlug) ? canonicalVehicle : knownValuesVehicle;
      await route.fulfill({ json: detail });
    } else if (path === "/owner-reports" || path.startsWith("/owner-reports?")) {
      await route.fulfill({ json: [] });
    } else if (path === "/makes") {
      await route.fulfill({ json: [] });
    } else if (path === "/discovery/stats") {
      await route.fulfill({ json: { makeCount: 1, vehicleCount: 2, reportCount: 0, demoLabel: "Synthetic test catalog" } });
    } else {
      await route.fulfill({ json: [] });
    }
  });
}

test("Browse keeps a supported sparse canonical profile selectable without demo fallbacks", async ({ page }) => {
  await routeTask32Api(page);
  await page.goto("/browse");

  const canonicalCard = page.locator(".vehicle-card").filter({ hasText: "Synthetic Alpha" });
  await expect(canonicalCard).toBeVisible();
  await expect(canonicalCard).toContainText("Sparse Test");
  await expect(canonicalCard).not.toContainText("DEMO / ESTIMATE");
  await expect(canonicalCard).not.toContainText("$0");
  await expect(canonicalCard.locator(".vehicle-card-foot")).toContainText("—");
  await expect(canonicalCard.getByRole("link", { name: "Task32 Synthetic Motor Synthetic Alpha", exact: true })).toHaveAttribute(
    "href",
    `/vehicles/${canonicalSlug}`,
  );
});

test("canonical detail communicates Unknown and NotYet without demo research or false zeroes", async ({ page }) => {
  await routeTask32Api(page);
  await page.goto(`/vehicles/${canonicalSlug}`);

  await expect(page.getByRole("heading", { name: /Synthetic Alpha/ })).toBeVisible();
  await expect(page.getByText(/unknown/i).first()).toBeVisible();
  await expect(page.getByText(/not yet researched/i).first()).toBeVisible();
  await expect(page.getByText(/\$0\.00/)).toHaveCount(0);
  await expect(page.getByText(/DEMO \/ ESTIMATE DATA/)).toHaveCount(0);
  await expect(page.locator(".report-card")).toHaveCount(0);
});

test("Compare renders missing canonical research as unavailable rather than fabricated zeroes", async ({ page }) => {
  await routeTask32Api(page);
  await page.goto(`/compare?ids=${canonicalSlug}`);

  await expect(page.locator(".compare-table")).toBeVisible();
  await expect(page.locator(".compare-vehicle")).toContainText("Synthetic Alpha");
  await expect(page.locator(".compare-table")).not.toContainText("$0");
  await expect(page.locator(".compare-table")).not.toContainText("0.0 / 10");
});

test("Calculator does not prefill or invent a monthly total for an all-null sparse canonical profile", async ({ page }) => {
  await routeTask32Api(page);
  await page.goto(`/calculator?vehicle=${canonicalSlug}`);

  await expect(page.getByText(/Synthetic Alpha/).first()).toBeVisible();
  const prefill = page.getByRole("button", { name: "Use known profile values" });
  await expect(prefill).toBeDisabled();
  await expect(page.getByRole("spinbutton", { name: "Combined fuel economy" })).toHaveValue("");
  await expect(page.locator(".calc-result strong")).not.toContainText("$0");
});

test("Calculator uses a shopper-selected gasoline basis without changing unknown sourced fuel type", async ({ page }) => {
  await routeTask32Api(page);
  await page.goto(`/calculator?vehicle=${canonicalSlug}`);

  const energyBasis = page.getByRole("combobox", { name: "Your energy basis" });
  const fuelSection = page.locator(".calc-group").filter({ has: page.getByRole("heading", { name: "Fuel assumptions" }) });
  const prefill = page.getByRole("button", { name: "Use known profile values" });
  await expect(energyBasis).toBeVisible();
  await expect(page.locator(".annual-total")).toContainText("—");
  await expect(prefill).toBeDisabled();
  await expect(page.getByRole("spinbutton", { name: "Combined fuel economy (unit unknown)" })).toHaveValue("");

  await energyBasis.selectOption("gasoline");
  await expect(fuelSection).toContainText("This is your calculation assumption, not a researched vehicle fact.");
  await expect(fuelSection.locator(".canonical-state")).toContainText("Unknown — No accepted fuel-type claim.");
  await expect(prefill).toBeDisabled();
  const mpg = page.getByRole("spinbutton", { name: "Combined fuel economy" });
  await expect(mpg).toHaveValue("");
  await expect(mpg).not.toHaveValue("28");

  await page.getByRole("spinbutton", { name: "Vehicle price" }).fill("32000");
  await page.getByRole("spinbutton", { name: "Down payment" }).fill("0");
  await page.getByRole("spinbutton", { name: "APR" }).fill("0");
  await page.getByRole("spinbutton", { name: "Estimated sales tax rate (editable)" }).fill("0");
  await page.getByRole("spinbutton", { name: "Estimated dealer fees" }).fill("0");
  await page.getByRole("spinbutton", { name: "Miles driven per year" }).fill("12000");
  await mpg.fill("32");
  await page.getByRole("spinbutton", { name: "Fuel price" }).fill("3.65");
  await page.getByRole("spinbutton", { name: "Insurance" }).fill("145");
  await page.getByRole("spinbutton", { name: "Maintenance" }).fill("110");
  await page.getByRole("spinbutton", { name: "Repairs reserve" }).fill("55");

  await expect(page.locator(".calc-result > strong")).toContainText("$");
  await expect(page.locator(".calc-result > strong")).not.toContainText("Enter remaining assumptions");
  await expect(page.locator(".annual-total")).not.toContainText("—");
  await expect(fuelSection.locator(".canonical-state")).toContainText("Unknown — No accepted fuel-type claim.");
  await expect(prefill).toBeDisabled();
});

test("Calculator imports only known profile values and preserves dirty shopper inputs", async ({ page }) => {
  await routeTask32Api(page, { detailDelayMs: 700 });
  await page.goto(`/calculator?vehicle=${knownValuesSlug}`);

  const price = page.getByRole("spinbutton", { name: "Vehicle price" });
  const mpg = page.getByRole("spinbutton", { name: "Combined fuel economy" });
  const maintenance = page.getByRole("spinbutton", { name: "Maintenance" });
  await expect(price).toBeVisible();
  await price.fill("44444");
  await expect(page.getByText(/Synthetic Known Values/).first()).toBeVisible({ timeout: 10_000 });
  await expect(price).toHaveValue("44444");
  await expect(mpg).toHaveValue("");
  await expect(maintenance).toHaveValue("");

  const prefill = page.getByRole("button", { name: "Use known profile values" });
  await expect(prefill).toBeEnabled();
  await prefill.click();
  await expect(price).toHaveValue("44444");
  await expect(mpg).toHaveValue("34");
  await expect(maintenance).toHaveValue("100");
});