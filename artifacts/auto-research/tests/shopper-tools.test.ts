import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  addComparisonId,
  buildBrowseLocation,
  buildComparisonLocation,
  buildCanonicalCalculatorPrefill,
  buildVehicleListParams,
  calculateOwnershipEstimate,
  catalogGenerationKey,
  catalogModelKey,
  catalogTrimKey,
  clearBrowseFilters,
  economyUnit,
  getBrowseGenerationOptions,
  getActiveReportSection,
  getBrowseSuggestions,
  getGenerationFilterHint,
  homeTrendEvidence,
  hasActiveBrowseFilters,
  hasInvalidBrowseSelection,
  isEnteredCalculatorValue,
  isGenerationFilterEnabled,
  missingCanonicalFinancingInputs,
  missingCanonicalOwnershipInputs,
  normalizeCalculatorNumber,
  optionalVehicleQueryOptions,
  mergeCanonicalCalculatorPrefill,
  parseCalculatorNumber,
  parseBrowseFilters,
  parseComparisonIds,
  profileResearchState,
  readOwnershipDraft,
  removeComparisonId,
  researchStateLabel,
  resetUneditedCalculatorDraft,
  resolveBrowseFilters,
  safeCitationUrl,
} from "../src/shopper-tools.ts";
import type { CatalogOption, OwnershipDraft } from "../src/shopper-tools.ts";
import {
  calculateFinancingEstimate,
  type FinancingInputs,
} from "../src/financing.ts";
import { STATE_TAX_ESTIMATES } from "../src/state-tax-estimates.ts";

const apiBase = new URL(
  process.env.AUTO_RESEARCH_API_BASE_URL ?? "http://localhost:80/api",
);

const financingDefaults: FinancingInputs = {
  price: 32_000,
  down: 5_000,
  apr: 6.4,
  term: 60,
  salesTaxRate: 7.25,
  dealerFees: 499,
  taxesAndFeesPayment: "financed",
};

function financingEstimate(overrides: Partial<FinancingInputs> = {}) {
  return calculateFinancingEstimate({ ...financingDefaults, ...overrides });
}

function assertMoney(value: number) {
  assert.ok(Number.isFinite(value), `expected finite money amount, got ${value}`);
  assert.ok(value >= 0, `expected nonnegative money amount, got ${value}`);
  assert.equal(value, Math.round(value * 100) / 100);
}

test("financing includes tax on vehicle price only and supports both payment modes", () => {
  const financed = financingEstimate();
  assert.equal(financed.salesTax, 2_320);
  assert.equal(financed.taxesAndFees, 2_819);
  assert.equal(financed.purchaseTotal, 34_819);
  assert.equal(financed.financingBase, 34_819);
  assert.equal(financed.amountFinanced, 29_819);
  assert.equal(financed.upfrontTaxesAndFees, 0);

  const upfront = financingEstimate({ taxesAndFeesPayment: "upfront" });
  assert.equal(upfront.financingBase, 32_000);
  assert.equal(upfront.amountFinanced, 27_000);
  assert.equal(upfront.upfrontTaxesAndFees, 2_819);
  assert.equal(
    upfront.totalPurchaseCost,
    Math.round(
      (upfront.effectiveDownPayment +
        upfront.upfrontTaxesAndFees +
        upfront.totalLoanPayments) *
        100,
    ) / 100,
  );
  assert.equal(
    financed.totalPurchaseCost,
    Math.round(
      (financed.effectiveDownPayment + financed.totalLoanPayments) * 100,
    ) / 100,
  );
});

test("financing caps effective down payment at the applicable amount due", () => {
  const zeroDown = financingEstimate({ down: 0 });
  assert.equal(zeroDown.effectiveDownPayment, 0);
  assert.equal(zeroDown.amountFinanced, zeroDown.financingBase);
  assert.equal(zeroDown.downPaymentCoversFinancing, false);

  const equalToFinancingBase = financingEstimate({ down: 34_819 });
  assert.equal(equalToFinancingBase.amountFinanced, 0);
  assert.equal(equalToFinancingBase.downPaymentCoversFinancing, true);
  assert.equal(equalToFinancingBase.downPaymentExceedsAmountDue, false);
  assert.equal(equalToFinancingBase.monthlyLoanPayment, 0);
  assert.equal(equalToFinancingBase.totalInterestPaid, 0);
  assert.equal(equalToFinancingBase.totalLoanPayments, 0);
  assert.deepEqual(equalToFinancingBase.schedule, []);

  const equalToVehiclePriceUpfront = financingEstimate({
    down: 32_000,
    taxesAndFeesPayment: "upfront",
  });
  assert.equal(equalToVehiclePriceUpfront.amountFinanced, 0);
  assert.equal(equalToVehiclePriceUpfront.totalPurchaseCost, 34_819);

  const excess = financingEstimate({ down: 34_820 });
  assert.equal(excess.amountFinanced, 0);
  assert.equal(excess.downPaymentCoversFinancing, true);
  assert.equal(excess.downPaymentExceedsAmountDue, true);
  assert.equal(excess.effectiveDownPayment, 34_819);

  const hugeDown = financingEstimate({ down: 10_000_000_000 });
  assert.equal(hugeDown.enteredDownPayment, 10_000_000_000);
  assert.equal(hugeDown.effectiveDownPayment, 34_819);
  assert.equal(hugeDown.amountFinanced, 0);
  assert.equal(hugeDown.downPaymentExceedsAmountDue, true);
});

test("financing supports zero/high APR and all common loan terms", () => {
  const zeroApr = financingEstimate({ apr: 0, term: 60 });
  assert.equal(zeroApr.monthlyLoanPayment, 496.98);
  assert.equal(zeroApr.totalInterestPaid, 0);
  assert.equal(zeroApr.totalPrincipalPaid, zeroApr.amountFinanced);
  assert.equal(zeroApr.schedule.length, 60);

  const tinyApr = financingEstimate({ apr: 1e-15, term: 60 });
  assert.ok(tinyApr.monthlyLoanPayment > 0);
  assert.equal(tinyApr.monthlyLoanPayment, zeroApr.monthlyLoanPayment);
  assert.ok(
    Math.abs(tinyApr.monthlyLoanPayment - zeroApr.monthlyLoanPayment) <= 0.01,
    "a tiny positive APR should remain continuous with the zero-rate payment",
  );

  const highApr = financingEstimate({ apr: 35, term: 36 });
  assert.ok(highApr.monthlyLoanPayment > zeroApr.monthlyLoanPayment);
  assert.ok(highApr.totalInterestPaid > 0);
  for (const term of [12, 24, 36, 48, 60, 72, 84, 120]) {
    const estimate = financingEstimate({ term });
    assert.equal(estimate.term, term);
    assert.equal(estimate.schedule.length, term);
    assert.equal(estimate.schedule.at(-1)?.remainingBalance, 0);
    assertMoney(estimate.monthlyLoanPayment);
  }
});

test("financing amortization settles to zero and conserves rounded principal and interest", () => {
  const estimate = financingEstimate({ price: 25_000.01, down: 3_333.33, apr: 8.17, term: 73 });
  const schedulePrincipal = Math.round(
    estimate.schedule.reduce((sum, row) => sum + row.principal, 0) * 100,
  ) / 100;
  const scheduleInterest = Math.round(
    estimate.schedule.reduce((sum, row) => sum + row.interest, 0) * 100,
  ) / 100;
  const schedulePayments = Math.round(
    estimate.schedule.reduce((sum, row) => sum + row.paymentAmount, 0) * 100,
  ) / 100;

  assert.equal(estimate.schedule.length, 73);
  assert.equal(estimate.schedule.at(-1)?.remainingBalance, 0);
  assert.equal(schedulePrincipal, estimate.amountFinanced);
  assert.equal(estimate.totalPrincipalPaid, estimate.amountFinanced);
  assert.equal(scheduleInterest, estimate.totalInterestPaid);
  assert.equal(schedulePayments, estimate.totalLoanPayments);
  assert.equal(
    estimate.totalLoanPayments,
    estimate.totalPrincipalPaid + estimate.totalInterestPaid,
  );
  for (const row of estimate.schedule) {
    assertMoney(row.paymentAmount);
    assertMoney(row.principal);
    assertMoney(row.interest);
    assertMoney(row.remainingBalance);
  }
});

test("cash purchase has meaningful purchase cost and no loan schedule or interest", () => {
  const cash = financingEstimate({ down: 50_000 });
  assert.equal(cash.amountFinanced, 0);
  assert.equal(cash.monthlyLoanPayment, 0);
  assert.equal(cash.totalPrincipalPaid, 0);
  assert.equal(cash.totalInterestPaid, 0);
  assert.equal(cash.totalLoanPayments, 0);
  assert.equal(cash.totalPurchaseCost, cash.purchaseTotal);
  assert.deepEqual(cash.schedule, []);
});

test("tax and dealer fee edits affect loan principal only when financed", () => {
  const baseFinanced = financingEstimate();
  const changedFinanced = financingEstimate({
    salesTaxRate: 8,
    dealerFees: 1_000,
  });
  assert.notEqual(changedFinanced.amountFinanced, baseFinanced.amountFinanced);
  assert.notEqual(changedFinanced.monthlyLoanPayment, baseFinanced.monthlyLoanPayment);

  const baseUpfront = financingEstimate({ taxesAndFeesPayment: "upfront" });
  const changedUpfront = financingEstimate({
    taxesAndFeesPayment: "upfront",
    salesTaxRate: 8,
    dealerFees: 1_000,
  });
  assert.equal(changedUpfront.amountFinanced, baseUpfront.amountFinanced);
  assert.equal(changedUpfront.monthlyLoanPayment, baseUpfront.monthlyLoanPayment);
  assert.notEqual(changedUpfront.totalPurchaseCost, baseUpfront.totalPurchaseCost);
});

test("financing calculations do not mutate entered down-payment drafts and stay finite", () => {
  const inputs: FinancingInputs = { ...financingDefaults, down: 10_000_000_000 };
  const original = { ...inputs };
  const estimate = calculateFinancingEstimate(inputs);
  assert.deepEqual(inputs, original);
  assert.equal(estimate.enteredDownPayment, 10_000_000_000);

  const values = [
    estimate.vehiclePrice,
    estimate.salesTaxRate,
    estimate.salesTax,
    estimate.dealerFees,
    estimate.taxesAndFees,
    estimate.purchaseTotal,
    estimate.financingBase,
    estimate.enteredDownPayment,
    estimate.effectiveDownPayment,
    estimate.upfrontTaxesAndFees,
    estimate.amountFinanced,
    estimate.apr,
    estimate.term,
    estimate.monthlyLoanPayment,
    estimate.totalPrincipalPaid,
    estimate.totalInterestPaid,
    estimate.totalLoanPayments,
    estimate.totalPurchaseCost,
  ];
  values.forEach(assertMoney);
  for (const row of estimate.schedule) {
    Object.values(row).forEach(assertMoney);
  }

  const invalidInputs = financingEstimate({
    price: Number.NaN,
    down: Number.POSITIVE_INFINITY,
    apr: Number.NaN,
    term: Number.NaN,
    salesTaxRate: Number.NaN,
    dealerFees: Number.POSITIVE_INFINITY,
  });
  for (const value of [
    invalidInputs.vehiclePrice,
    invalidInputs.salesTax,
    invalidInputs.dealerFees,
    invalidInputs.amountFinanced,
    invalidInputs.monthlyLoanPayment,
    invalidInputs.totalPurchaseCost,
  ]) {
    assertMoney(value);
  }
});

test("prototype state tax estimates include all states and DC sorted by name", () => {
  assert.equal(STATE_TAX_ESTIMATES.length, 51);
  assert.deepEqual(
    STATE_TAX_ESTIMATES.map(({ name }) => name),
    [...STATE_TAX_ESTIMATES.map(({ name }) => name)].sort((a, b) =>
      a.localeCompare(b),
    ),
  );
  assert.equal(STATE_TAX_ESTIMATES.find(({ code }) => code === "CA")?.rate, 7.25);
  assert.equal(STATE_TAX_ESTIMATES.find(({ code }) => code === "NY")?.rate, 4);
  assert.equal(STATE_TAX_ESTIMATES.find(({ code }) => code === "OR")?.rate, 0);
  assert.ok(STATE_TAX_ESTIMATES.every(({ rate }) => Number.isFinite(rate) && rate >= 0));
});
const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

if (!localHosts.has(apiBase.hostname) || apiBase.pathname.replace(/\/$/, "") !== "/api") {
  throw new Error(
    "Auto Research regression checks only allow a local development API at /api.",
  );
}

async function getDevelopmentVehicles(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  const response = await fetch(`${apiBase.origin}/api/vehicles?${query}`);
  assert.equal(response.status, 200, "development vehicle search should succeed");
  return (await response.json()) as Array<{
    id: string;
    make: string;
    makeSlug: string;
    model: string;
    year: number;
    trim: string;
    fuelType: string;
    mpgCombined: number | null;
    isDemo: boolean;
  }>;
}

test("calculator disables optional vehicle detail lookup without an ID", () => {
  const noVehicle = optionalVehicleQueryOptions("", ["/api/vehicles/"]);
  assert.equal(noVehicle.enabled, false);
  assert.deepEqual(noVehicle.queryKey, ["/api/vehicles/"]);

  const selectedVehicle = optionalVehicleQueryOptions("ford-f-150", [
    "/api/vehicles/ford-f-150",
  ]);
  assert.equal(selectedVehicle.enabled, true);
});

test("a missing calculator vehicle ID never runs the detail query", async () => {
  const client = new QueryClient();
  let fetchCount = 0;
  const observer = new QueryObserver(client, {
    ...optionalVehicleQueryOptions("", ["/api/vehicles/"]),
    queryFn: async () => {
      fetchCount += 1;
      return [];
    },
  });
  const unsubscribe = observer.subscribe(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 0));
  unsubscribe();
  client.clear();

  assert.equal(fetchCount, 0, "an empty ID must not fetch the collection URL");
});

test("calculator keeps zero-APR gas and EV electricity estimates finite and correct", () => {
  const base = {
    price: 32_000,
    down: 5_000,
    apr: 0,
    term: 60,
    miles: 12_000,
    gas: 3.65,
    electricity: 0.16,
    insurance: 145,
    maintenance: 110,
    repairs: 55,
  };

  const gasEstimate = calculateOwnershipEstimate({
    ...base,
    mpg: 28,
    vehicleIsElectric: false,
  });
  assert.equal(gasEstimate.payment, 450);
  assert.ok(Math.abs(gasEstimate.fuel - 130.35714285714286) < 1e-9);
  assert.ok(Math.abs(gasEstimate.monthly - 890.3571428571429) < 1e-9);
  assert.ok(Math.abs(gasEstimate.annual - 10_684.285714285715) < 1e-9);

  const evEstimate = calculateOwnershipEstimate({
    ...base,
    mpg: 122,
    vehicleIsElectric: true,
  });
  assert.equal(evEstimate.payment, 450);
  assert.ok(Math.abs(evEstimate.fuel - 44.19672131147541) < 1e-9);
  assert.ok(Math.abs(evEstimate.monthly - 804.1967213114754) < 1e-9);
  assert.ok(Math.abs(evEstimate.annual - 9_650.360655737705) < 1e-9);
});

test("calculator drafts allow blank editing without mutating the visible value", () => {
  const draft: OwnershipDraft = {
    price: "32000", down: "5000", apr: "6.4", miles: "12000", mpg: "28",
    gas: "3.65", electricity: "0.16", insurance: "145", maintenance: "110", repairs: "55",
  };
  for (const field of Object.keys(draft) as Array<keyof OwnershipDraft>) {
    const editing = { ...draft, [field]: "" };
    const values = readOwnershipDraft(editing);
    assert.equal(editing[field], "", `${field} must stay blank in the draft`);
    assert.equal(values[field], 0);
    for (const vehicleIsElectric of [false, true]) {
      const estimate = calculateOwnershipEstimate({ ...values, term: 60, vehicleIsElectric });
      assert.ok(Number.isFinite(estimate.monthly));
      assert.ok(Number.isFinite(estimate.annual));
    }
    assert.equal(readOwnershipDraft({ ...editing, [field]: "500" })[field], 500);
  }
});

test("calculator normalizes numeric drafts only on blur and keeps decimals valid", () => {
  assert.equal(normalizeCalculatorNumber(""), "0");
  assert.equal(normalizeCalculatorNumber("0500"), "500");
  assert.equal(normalizeCalculatorNumber("3.65"), "3.65");
  assert.equal(parseCalculatorNumber("0"), 0);
  assert.equal(parseCalculatorNumber("-5"), 0);
  assert.equal(parseCalculatorNumber("not a number"), 0);
  assert.equal(parseCalculatorNumber("1e309"), 0);
});

test("browse URL filters become search parameters and clear back to a clean URL", () => {
  const parsed = parseBrowseFilters(
    "?q=2024+Ford+F-150+XLT&make=ford&model=F-150&year=2024&trim=XLT&sort=ownership-cost",
  );
  assert.deepEqual(buildVehicleListParams(parsed), {
    q: "2024 Ford F-150 XLT",
    makeSlug: "ford",
    model: "F-150",
    year: 2024,
    trim: "XLT",
    sort: "ownership-cost",
    limit: 60,
  });

  const cleared = clearBrowseFilters();
  assert.deepEqual(cleared, {
    q: "",
    make: "",
    model: "",
    trim: "",
    sort: "popular",
    year: "",
    modelId: "",
    generationId: "",
    trimId: "",
    modelKey: "",
    generationKey: "",
    trimKey: "",
  });
  assert.equal(buildBrowseLocation(cleared), "/browse");
});

const browseCatalog: CatalogOption[] = [
  {
    profileId: "ford-f-150-2024-xlt", makeId: 1, make: "Ford", makeSlug: "ford",
    modelId: 11, model: "F-150", generationId: 111, generation: "Fourteenth Generation",
    modelYearId: 1111, year: 2024, trimId: 11111, trim: "XLT",
  },
  {
    profileId: "ford-f-150-2024-lariat", makeId: 1, make: "Ford", makeSlug: "ford",
    modelId: 11, model: "F-150", generationId: 111, generation: "Fourteenth Generation",
    modelYearId: 1111, year: 2024, trimId: 11112, trim: "Lariat",
  },
  {
    profileId: "ford-mustang-2024-gt", makeId: 1, make: "Ford", makeSlug: "ford",
    modelId: 12, model: "Mustang", generationId: 112, generation: "Seventh Generation",
    modelYearId: 1121, year: 2024, trimId: 11211, trim: "GT",
  },
  {
    profileId: "tesla-model-y-2024-long-range", makeId: 2, make: "Tesla", makeSlug: "tesla",
    modelId: 21, model: "Model Y", generationId: 211, generation: "First Generation",
    modelYearId: 2111, year: 2024, trimId: 21111, trim: "Long Range",
  },
  {
    profileId: "tesla-model-y-2024-performance", makeId: 2, make: "Tesla", makeSlug: "tesla",
    modelId: 21, model: "Model Y", generationId: 211, generation: "First Generation",
    modelYearId: 2111, year: 2024, trimId: 21112, trim: "Performance",
  },
  {
    profileId: "dodge-charger-2023-gt", makeId: 3, make: "Dodge", makeSlug: "dodge",
    modelId: 31, model: "Charger", generationId: 311, generation: "Seventh generation",
    modelYearId: 3111, year: 2023, trimId: 31111, trim: "GT",
  },
  {
    profileId: "ram-1500-2024-big-horn", makeId: 4, make: "Ram", makeSlug: "ram",
    modelId: 41, model: "1500", generationId: 411, generation: "Fifth generation",
    modelYearId: 4111, year: 2024, trimId: 41111, trim: "Big Horn",
  },
];

test("browse deep links resolve legacy names without broadening invalid hierarchy filters", () => {
  const legacy = parseBrowseFilters("?make=ford&model=F-150&year=2024&trim=XLT");
  const resolved = resolveBrowseFilters(legacy, browseCatalog);
  assert.equal(resolved.modelId, "11");
  assert.equal(resolved.generationId, "");
  assert.equal(resolved.trimId, "11111");
  assert.equal(
    buildBrowseLocation(resolved),
    "/browse?make=ford&modelId=11&year=2024&trimId=11111",
  );

  const invalid = resolveBrowseFilters({
    ...resolved, modelId: "12", generationId: "111", year: "2024", trimId: "11111",
  }, browseCatalog);
  assert.equal(invalid.generationId, "111");
  assert.equal(invalid.trimId, "11111");
  assert.equal(hasInvalidBrowseSelection(invalid, browseCatalog), true);
});

test("qualified browse keys round-trip and become namespaced API query parameters", () => {
  const query = "?make=ford&modelKey=canonical%3Amodel%3A11&generationKey=canonical%3Ageneration%3A22&year=2024&trimKey=canonical%3Atrim%3A33";
  const parsed = parseBrowseFilters(query);
  assert.equal(buildBrowseLocation(parsed), `/browse${query}`);
  assert.deepEqual(buildVehicleListParams(parsed), {
    makeSlug: "ford",
    modelKey: "canonical:model:11",
    generationKey: "canonical:generation:22",
    year: 2024,
    trimKey: "canonical:trim:33",
    sort: "popular",
    limit: 60,
  });
});

test("colliding legacy and canonical IDs stay scoped by qualified hierarchy keys", () => {
  const colliding: CatalogOption[] = [
    { ...browseCatalog[0]!, profileKind: "legacy" },
    {
      ...browseCatalog[0]!,
      profileId: "canonical-ford-f150",
      profileKind: "canonical",
      model: "F-150 canonical",
      generation: "Canonical generation",
      trim: "Canonical XLT",
      modelKey: "canonical:model:11",
      generationKey: "canonical:generation:111",
      modelYearKey: "canonical:model-year:1111",
      trimKey: "canonical:trim:11111",
    },
  ];
  assert.equal(catalogModelKey(colliding[0]!), "legacy:model:11");
  assert.equal(catalogModelKey(colliding[1]!), "canonical:model:11");
  assert.equal(catalogGenerationKey(colliding[1]!), "canonical:generation:111");
  assert.equal(catalogTrimKey(colliding[1]!), "canonical:trim:11111");

  const canonicalFilters = parseBrowseFilters(
    "?make=ford&modelKey=canonical%3Amodel%3A11&generationKey=canonical%3Ageneration%3A111&year=2024&trimKey=canonical%3Atrim%3A11111",
  );
  assert.equal(hasInvalidBrowseSelection(canonicalFilters, colliding), false);
  const legacyNumericFilters = parseBrowseFilters("?make=ford&modelId=11&generationId=111&year=2024&trimId=11111");
  assert.equal(hasInvalidBrowseSelection(legacyNumericFilters, colliding), false);
  const wrongGeneration = { ...canonicalFilters, generationKey: "canonical:generation:999" };
  assert.equal(hasInvalidBrowseSelection(wrongGeneration, colliding), true);

  const suggestions = getBrowseSuggestions("F-150", colliding).filter(item => item.kind === "model");
  assert.deepEqual(suggestions.map(item => item.kind === "model" ? item.modelKey : undefined), [
    "legacy:model:11",
    "canonical:model:11",
  ]);
});

test("canonical nulls display research state and never copy unknown values into calculator inputs", () => {
  assert.equal(researchStateLabel({ state: "unknown", claimIds: [] }), "Unknown");
  assert.equal(researchStateLabel({ state: "not_yet_researched", claimIds: [] }), "Not yet researched");
  assert.deepEqual(buildCanonicalCalculatorPrefill({
    profileKind: "canonical",
    isDemo: false,
    priceUsd: null,
    mpgCombined: null,
    annualMaintenanceEstimateUsd: 1_200,
    insuranceEstimateUsd: 2_400,
    fieldStates: {
      priceUsd: { state: "unknown", claimIds: [] },
      mpgCombined: { state: "not_yet_researched", claimIds: [] },
      annualMaintenanceEstimateUsd: { state: "known", claimIds: ["maintenance"] },
      insuranceEstimateUsd: { state: "known", claimIds: ["insurance"] },
    },
  }), {
    maintenance: "100",
    insurance: "200",
  });
  assert.deepEqual(buildCanonicalCalculatorPrefill({
    profileKind: "canonical",
    isDemo: false,
    priceUsd: 0,
    fieldStates: { priceUsd: { state: "known", claimIds: ["price"] } },
  }), { price: "0" });
  assert.deepEqual(buildCanonicalCalculatorPrefill({
    profileKind: "canonical",
    isDemo: true,
    priceUsd: 10_000,
    fieldStates: { priceUsd: { state: "known", claimIds: [] } },
  }), {});
});

test("Home trend evidence shows canonical numbers only for known fields and keeps demo values illustrative", () => {
  const known = { state: "known" as const, claimIds: ["synthetic-claim"] };
  const unknown = { state: "unknown" as const, claimIds: ["synthetic-withheld-claim"] };
  const canonical = {
    profileKind: "canonical",
    isDemo: false,
    fieldStates: { annualOwnershipEstimateUsd: known, reliabilityEstimate: unknown },
  };
  assert.deepEqual(homeTrendEvidence(canonical, "annualOwnershipEstimateUsd", 4_250), {
    kind: "canonical",
    state: known,
    value: 4_250,
  });
  assert.deepEqual(homeTrendEvidence(canonical, "reliabilityEstimate", 7.8), {
    kind: "canonical",
    state: unknown,
    value: null,
  });
  assert.deepEqual(homeTrendEvidence(canonical, "annualMaintenanceEstimateUsd", 900), {
    kind: "canonical",
    value: null,
  });
  assert.deepEqual(homeTrendEvidence({
    profileKind: "canonical",
    isDemo: false,
    fieldStates: { annualOwnershipEstimateUsd: known },
  }, "annualOwnershipEstimateUsd", null), {
    kind: "canonical",
    state: known,
    value: null,
  });
  assert.deepEqual(homeTrendEvidence({
    profileKind: "legacy",
    isDemo: true,
  }, "annualOwnershipEstimateUsd", 0), {
    kind: "demo",
    value: 0,
  });
  assert.deepEqual(homeTrendEvidence({
    profileKind: "legacy",
    isDemo: true,
  }, "annualOwnershipEstimateUsd", null), {
    kind: "demo",
    value: null,
  });
  assert.deepEqual(homeTrendEvidence({
    profileKind: "legacy",
    isDemo: false,
  }, "annualOwnershipEstimateUsd", 3_000), {
    kind: "unclassified",
    value: 3_000,
  });
});

test("partial sections never override a missing field's explicit research state", () => {
  const unknown = { state: "unknown" as const, claimIds: ["withheld"] };
  const notApplicable = { state: "not_applicable" as const, claimIds: ["scope"] };
  const known = { state: "known" as const, claimIds: ["assessment"] };
  const profile = {
    fieldStates: { reliabilityEstimate: unknown, safetyStatus: notApplicable },
    sectionStates: { reliability: known, safety: notApplicable, recalls: unknown },
  };
  assert.equal(profileResearchState(profile, "reliabilityEstimate", "reliability"), unknown);
  assert.equal(profileResearchState(profile, "recallStatus", "recalls"), unknown);
  assert.equal(profileResearchState(profile, "safetyStatus", "safety"), notApplicable);
  assert.equal(researchStateLabel(notApplicable), "Not applicable");
  assert.equal(profileResearchState({}, "priceUsd", "ownership"), undefined);
});

test("identity-only canonical profiles leave every calculator assumption untouched", () => {
  const draft = {
    price: "", down: "", apr: "", miles: "", mpg: "", gas: "",
    electricity: "", insurance: "", maintenance: "", repairs: "",
  };
  const profile = {
    profileKind: "canonical", isDemo: false,
    priceUsd: null, mpgCombined: null, annualMaintenanceEstimateUsd: null,
    annualRepairEstimateUsd: null, insuranceEstimateUsd: null,
    fieldStates: {},
  };
  assert.deepEqual(mergeCanonicalCalculatorPrefill(profile, draft, {}), { draft, appliedFields: [] });
  assert.ok(missingCanonicalOwnershipInputs({ draft, taxRate: "", dealerFees: "", fuelType: null }).includes("fuel type"));
  assert.deepEqual(buildCanonicalCalculatorPrefill({
    ...profile,
    priceUsd: 12345,
    fieldStates: { priceUsd: { state: "not_applicable", claimIds: ["excluded"] } },
  }), {});
});

test("canonical calculator prefill includes only known annual repair estimates", () => {
  assert.deepEqual(buildCanonicalCalculatorPrefill({
    profileKind: "canonical",
    isDemo: false,
    annualRepairEstimateUsd: 1_800,
    fieldStates: {
      annualRepairEstimateUsd: { state: "known", claimIds: ["repairs"] },
    },
  }), { repairs: "150" });
  assert.deepEqual(buildCanonicalCalculatorPrefill({
    profileKind: "canonical",
    isDemo: false,
    annualRepairEstimateUsd: 1_800,
    fieldStates: {
      annualRepairEstimateUsd: { state: "unknown", claimIds: [] },
    },
  }), {});
});

test("canonical source prefill never replaces shopper-edited calculator fields", () => {
  const current: OwnershipDraft = {
    price: "41000", down: "", apr: "", miles: "", mpg: "", gas: "", electricity: "",
    insurance: "", maintenance: "", repairs: "",
  };
  const result = mergeCanonicalCalculatorPrefill({
    profileKind: "canonical",
    isDemo: false,
    priceUsd: 30_000,
    mpgCombined: 31,
    fieldStates: {
      priceUsd: { state: "known", claimIds: ["price"] },
      mpgCombined: { state: "known", claimIds: ["economy"] },
    },
  }, current, { price: true });
  assert.equal(result.draft.price, "41000");
  assert.equal(result.draft.mpg, "31");
  assert.deepEqual(result.appliedFields, ["mpg"]);
});

test("canonical calculator readiness distinguishes blank assumptions from explicit zero", () => {
  const draft: OwnershipDraft = {
    price: "", down: "", apr: "", miles: "", mpg: "", gas: "", electricity: "",
    insurance: "", maintenance: "", repairs: "",
  };
  const assumptions = { draft, taxRate: "", dealerFees: "", fuelType: null };
  assert.deepEqual(missingCanonicalFinancingInputs(assumptions), [
    "vehicle price", "down payment", "APR", "sales tax rate", "dealer fees",
  ]);
  assert.ok(missingCanonicalOwnershipInputs(assumptions).includes("fuel type"));
  assert.ok(!missingCanonicalOwnershipInputs(assumptions).includes("fuel price"));
  const completed = {
    draft: Object.fromEntries(Object.keys(draft).map(field => [field, "0"])) as OwnershipDraft,
    taxRate: "0",
    dealerFees: "0",
    fuelType: "electric",
  };
  assert.deepEqual(missingCanonicalFinancingInputs(completed), []);
  assert.deepEqual(missingCanonicalOwnershipInputs(completed), []);
  assert.equal(isEnteredCalculatorValue("0"), true);
  assert.equal(isEnteredCalculatorValue(""), false);
});

test("profile-sourced calculator values reset on vehicle change while shopper edits remain", () => {
  const draft: OwnershipDraft = {
    price: "41000", down: "5000", apr: "6", miles: "12000", mpg: "31", gas: "3.50",
    electricity: "0.15", insurance: "200", maintenance: "100", repairs: "150",
  };
  const defaults: OwnershipDraft = {
    price: "32000", down: "5000", apr: "6.4", miles: "12000", mpg: "28", gas: "3.65",
    electricity: "0.16", insurance: "145", maintenance: "110", repairs: "55",
  };
  assert.deepEqual(resetUneditedCalculatorDraft(draft, defaults, { price: true, down: true }), {
    ...defaults,
    price: "41000",
    down: "5000",
  });
});

test("canonical citations reject unsafe URL schemes", () => {
  assert.equal(safeCitationUrl("javascript:alert(1)"), undefined);
  assert.equal(safeCitationUrl("data:text/html,unsafe"), undefined);
  assert.equal(safeCitationUrl("https://example.com/evidence"), "https://example.com/evidence");
  assert.equal(safeCitationUrl("http://example.com/evidence"), "http://example.com/evidence");
});

test("Browse generation stays enabled and unselected for single-generation models", () => {
  const cases = [
    {
      make: "tesla",
      modelId: "21",
      generationId: "211",
      generationName: "First Generation",
      trimYear: 2024,
      expectedYears: [2024],
      expectedTrims: ["Long Range", "Performance"],
    },
    {
      make: "dodge",
      modelId: "31",
      generationId: "311",
      generationName: "Seventh generation",
      trimYear: 2023,
      expectedYears: [2023],
      expectedTrims: ["GT"],
    },
    {
      make: "ram",
      modelId: "41",
      generationId: "411",
      generationName: "Fifth generation",
      trimYear: 2024,
      expectedYears: [2024],
      expectedTrims: ["Big Horn"],
    },
  ];

  for (const {
    make,
    modelId,
    generationId,
    generationName,
    trimYear,
    expectedYears,
    expectedTrims,
  } of cases) {
    const resolved = resolveBrowseFilters(
      { ...clearBrowseFilters(), make, modelId },
      browseCatalog,
    );
    assert.equal(resolved.generationId, "", `${make} model alone must not select a generation`);
    assert.equal(
      buildBrowseLocation(resolved),
      `/browse?make=${make}&modelId=${modelId}`,
    );

    const modelOptions = browseCatalog.filter((option) =>
      option.makeSlug === make && String(option.modelId) === modelId,
    );
    const generationOptions = getBrowseGenerationOptions(modelOptions);
    assert.deepEqual(generationOptions, [{ id: Number(generationId), name: generationName }]);
    assert.equal(
      isGenerationFilterEnabled({ catalogReady: true, modelSelected: true }),
      true,
      "a selected model keeps the generation control enabled even with one option",
    );
    assert.equal(
      isGenerationFilterEnabled({ catalogReady: true, modelSelected: false }),
      false,
      "the generation control is disabled until a model is selected",
    );

    const explicitlySelected = resolveBrowseFilters(
      { ...resolved, generationId },
      browseCatalog,
    );
    assert.equal(explicitlySelected.generationId, generationId);
    assert.equal(
      buildBrowseLocation(explicitlySelected),
      `/browse?make=${make}&modelId=${modelId}&generationId=${generationId}`,
      "an explicit generation selection remains in the URL",
    );

    const selectedGeneration = modelOptions.filter((option) =>
      String(option.generationId) === explicitlySelected.generationId,
    );
    assert.deepEqual(
      [...new Set(selectedGeneration.map((option) => option.year))].sort((a, b) => a - b),
      expectedYears,
    );
    assert.deepEqual(
      selectedGeneration.filter((option) => option.year === trimYear).map((option) => option.trim),
      expectedTrims,
    );
  }

  const multipleGenerationFixture: CatalogOption[] = [
    {
      profileId: "test-profile-a", makeId: 99, make: "Test Make", makeSlug: "test-make",
      modelId: 99, model: "Test Model", generationId: 991, generation: "Generation A",
      modelYearId: 9911, year: 2024, trimId: 99111, trim: "Test Trim A",
    },
    {
      profileId: "test-profile-b", makeId: 99, make: "Test Make", makeSlug: "test-make",
      modelId: 99, model: "Test Model", generationId: 992, generation: "Generation B",
      modelYearId: 9921, year: 2025, trimId: 99211, trim: "Test Trim B",
    },
  ];
  assert.deepEqual(
    getBrowseGenerationOptions(multipleGenerationFixture),
    [
      { id: 991, name: "Generation A" },
      { id: 992, name: "Generation B" },
    ],
  );
  const multipleGenerations = resolveBrowseFilters(
    { ...clearBrowseFilters(), make: "test-make", modelId: "99" },
    multipleGenerationFixture,
  );
  assert.equal(multipleGenerations.generationId, "");
  assert.equal(
    isGenerationFilterEnabled({ catalogReady: true, modelSelected: true }),
    true,
    "models with multiple generations use the same enabled control",
  );

  const laterGeneration: CatalogOption = {
    ...multipleGenerationFixture[1]!,
    profileId: "test-profile-c",
    generationId: 993,
    generation: "Generation C",
    modelYearId: 9931,
    year: 2026,
    trimId: 99311,
    trim: "Test Trim C",
  };
  assert.deepEqual(
    getBrowseGenerationOptions([...multipleGenerationFixture, laterGeneration]),
    [
      { id: 991, name: "Generation A" },
      { id: 992, name: "Generation B" },
      { id: 993, name: "Generation C" },
    ],
    "new catalog generations appear without manufacturer/model-specific code",
  );

  const makeOnly = resolveBrowseFilters(
    { ...clearBrowseFilters(), make: "tesla" },
    browseCatalog,
  );
  assert.equal(makeOnly.generationId, "");
});

test("browse state preserves invalid filters, normalizes sorts, and detects active filters", () => {
  const parsed = parseBrowseFilters("?sort=made-up&modelId=-1&generationId=12x&trimId=999&year=02024");
  assert.equal(parsed.sort, "popular");
  assert.equal(parsed.modelId, "-1");
  assert.equal(parsed.generationId, "12x");
  assert.equal(parsed.trimId, "999");
  assert.equal(parsed.year, "02024");
  assert.equal(buildVehicleListParams(parsed).modelId, -1);
  assert.equal(Number.isNaN(buildVehicleListParams(parsed).generationId), true);
  assert.equal(hasActiveBrowseFilters(parsed), true);
  assert.equal(hasInvalidBrowseSelection(parsed, browseCatalog), true);
  assert.equal(hasActiveBrowseFilters(clearBrowseFilters()), false);
  assert.equal(hasActiveBrowseFilters({ ...clearBrowseFilters(), sort: "reliability" }), true);
});

test("browse suggestions include only clean manufacturer and model results", () => {
  const teslaSuggestions = getBrowseSuggestions("Tes", browseCatalog);
  assert.deepEqual(
    teslaSuggestions.map(({ label, kind }) => ({ label, kind })),
    [
      { label: "Tesla", kind: "manufacturer" },
      { label: "Tesla Model Y", kind: "model" },
    ],
  );

  const suggestions = getBrowseSuggestions("tesla model y", browseCatalog);
  assert.ok(suggestions.length > 0);
  assert.equal(suggestions[0]?.kind, "model");
  assert.ok(suggestions.some((suggestion) => suggestion.label === "Tesla Model Y"));
  assert.ok(suggestions.every((suggestion) => suggestion.kind === "manufacturer" || suggestion.kind === "model"));
  assert.equal(getBrowseSuggestions("Long Range", browseCatalog).length, 0);
  assert.equal(getBrowseSuggestions("  ", browseCatalog).length, 0);
  assert.equal(getBrowseSuggestions("Ford F-150", browseCatalog, 1).length, 1);
  assert.equal(getBrowseSuggestions("Ford F-150", browseCatalog, 1)[0]?.kind, "model");
});

test("generation filter explains when model selection is needed or only one generation exists", () => {
  assert.equal(
    getGenerationFilterHint({ catalogReady: false, modelSelected: false, generationCount: 0 }),
    undefined,
  );
  assert.equal(
    getGenerationFilterHint({ catalogReady: true, modelSelected: false, generationCount: 0 }),
    "Choose a model to view its generations.",
  );
  assert.equal(
    getGenerationFilterHint({ catalogReady: true, modelSelected: true, generationCount: 1 }),
    "Only one generation is currently represented in this catalog.",
  );
  assert.equal(
    getGenerationFilterHint({ catalogReady: true, modelSelected: true, generationCount: 2 }),
    undefined,
  );
});

test("electric economy uses MPGe while combustion economy keeps mpg", () => {
  assert.equal(economyUnit("Electric"), "MPGe");
  assert.equal(economyUnit("Battery Electric"), "MPGe");
  assert.equal(economyUnit("Hybrid Electric"), "mpg");
  assert.equal(economyUnit("Plug-in Hybrid"), "mpg");
  assert.equal(economyUnit("Gasoline"), "mpg");
});

test("report navigation tracks the last section across the activation line and reports at page end", () => {
  const positions = [
    { id: "overview" as const, top: -200 },
    { id: "reliability" as const, top: -40 },
    { id: "costs" as const, top: 80 },
    { id: "reports" as const, top: 620 },
  ];
  assert.equal(getActiveReportSection(positions, 72), "reliability");
  assert.equal(getActiveReportSection(positions, 100), "costs");
  assert.equal(getActiveReportSection(positions, 72, true), "reports");
  assert.equal(getActiveReportSection([], 72), "overview");
  assert.equal(getActiveReportSection([{ id: "overview", top: -300 }, { id: "reliability", top: 128.14 }], 128), "reliability");
});

test("comparison URL state supports removal and stops at four distinct vehicles", () => {
  assert.deepEqual(
    parseComparisonIds("?ids=one,two,three,four,five,,two"),
    ["one", "two", "three", "four"],
  );

  const four = ["one", "two", "three", "four"];
  assert.equal(addComparisonId(four, "two"), four);
  assert.equal(addComparisonId(four, "five"), four);

  const three = removeComparisonId(four, "two");
  assert.deepEqual(three, ["one", "three", "four"]);
  assert.equal(buildComparisonLocation(three), "/compare?ids=one,three,four");
  assert.equal(buildComparisonLocation(removeComparisonId(three, "one")), "/compare?ids=three,four");
  assert.equal(buildComparisonLocation([]), "/compare");
  assert.deepEqual(addComparisonId(three, "five"), ["one", "three", "four", "five"]);
});

test("local seeded demo vehicles support cross-column search with active filters", async () => {
  const results = await getDevelopmentVehicles({
    q: "2024 Ford F-150 XLT",
    makeSlug: "ford",
    model: "F-150",
    year: "2024",
    trim: "XLT",
    limit: "100",
  });

  assert.deepEqual(
    results.map(({ id }) => id),
    ["ford-f-150-2024-xlt"],
    "year, make, model, and trim search terms should match alongside explicit filters",
  );
  assert.ok(results.every((vehicle) => vehicle.isDemo));
});

test("local seeded demo vehicles include an electric MPGe fixture for calculator estimates", async () => {
  const vehicles = await getDevelopmentVehicles({ limit: "100" });
  const modelY = vehicles.find(
    (vehicle) => vehicle.id === "tesla-model-y-2024-long-range",
  );

  assert.ok(modelY, "the seeded Tesla Model Y Long Range fixture should exist");
  assert.equal(modelY.fuelType, "Electric");
  assert.equal(modelY.mpgCombined, 122);
  assert.equal(modelY.isDemo, true);
});