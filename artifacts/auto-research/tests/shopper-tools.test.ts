import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  addComparisonId,
  buildBrowseLocation,
  buildComparisonLocation,
  buildVehicleListParams,
  calculateOwnershipEstimate,
  clearBrowseFilters,
  normalizeCalculatorNumber,
  optionalVehicleQueryOptions,
  parseCalculatorNumber,
  parseBrowseFilters,
  parseComparisonIds,
  readOwnershipDraft,
  removeComparisonId,
} from "../src/shopper-tools.ts";
import type { OwnershipDraft } from "../src/shopper-tools.ts";
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
  });
  assert.equal(buildBrowseLocation(cleared), "/browse");
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