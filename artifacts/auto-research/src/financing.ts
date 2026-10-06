export type TaxesAndFeesPayment = "financed" | "upfront";

export type FinancingInputs = {
  price: number;
  down: number;
  tradeInValue?: number;
  apr: number;
  term: number;
  salesTaxRate: number;
  dealerFees: number;
  taxesAndFeesPayment: TaxesAndFeesPayment;
};

export type AmortizationScheduleRow = {
  paymentNumber: number;
  paymentAmount: number;
  principal: number;
  interest: number;
  remainingBalance: number;
};

function nonNegativeFinite(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateMonthlyPayment(
  principal: number,
  monthlyRate: number,
  term: number,
): number {
  if (principal <= 0 || term <= 0) return 0;
  if (monthlyRate === 0) return roundMoney(principal / term);

  // expm1/log1p preserve precision for very small positive APR values.
  const discount = -Math.expm1(-term * Math.log1p(monthlyRate));
  const payment = principal * (monthlyRate / discount);
  return roundMoney(payment);
}

export function calculateFinancingEstimate(inputs: FinancingInputs) {
  const vehiclePrice = roundMoney(nonNegativeFinite(inputs.price));
  const enteredDownPayment = roundMoney(nonNegativeFinite(inputs.down));
  const enteredTradeInValue = roundMoney(
    nonNegativeFinite(inputs.tradeInValue ?? 0),
  );
  const apr = nonNegativeFinite(inputs.apr);
  const term = Number.isFinite(inputs.term)
    ? Math.max(0, Math.floor(inputs.term))
    : 0;
  const salesTaxRate = nonNegativeFinite(inputs.salesTaxRate);
  const dealerFees = roundMoney(nonNegativeFinite(inputs.dealerFees));

  // Sales tax applies to the vehicle price only; fees are not taxed here.
  const salesTax = roundMoney((vehiclePrice * salesTaxRate) / 100);
  const taxesAndFees = roundMoney(salesTax + dealerFees);
  const purchaseTotal = roundMoney(vehiclePrice + taxesAndFees);
  const financingBase = roundMoney(
    vehiclePrice +
      (inputs.taxesAndFeesPayment === "financed" ? taxesAndFees : 0),
  );
  const effectiveDownPayment = roundMoney(
    Math.min(enteredDownPayment, financingBase),
  );
  const remainingAfterDownPayment = roundMoney(
    Math.max(0, financingBase - effectiveDownPayment),
  );
  const effectiveTradeInValue = roundMoney(
    Math.min(enteredTradeInValue, remainingAfterDownPayment),
  );
  const downPaymentCoversFinancing =
    enteredDownPayment >= financingBase;
  const downPaymentExceedsAmountDue =
    enteredDownPayment > financingBase;
  const tradeInExceedsAmountDue =
    enteredTradeInValue > remainingAfterDownPayment;
  const financingCoveredByContributions =
    downPaymentCoversFinancing ||
    enteredTradeInValue >= remainingAfterDownPayment;
  const upfrontTaxesAndFees =
    inputs.taxesAndFeesPayment === "upfront" ? taxesAndFees : 0;
  const amountFinanced = roundMoney(
    Math.max(
      0,
      financingBase - effectiveDownPayment - effectiveTradeInValue,
    ),
  );
  const monthlyRate = apr / 100 / 12;
  const monthlyLoanPayment =
    amountFinanced > 0 && term > 0
      ? calculateMonthlyPayment(amountFinanced, monthlyRate, term)
      : 0;

  const schedule: AmortizationScheduleRow[] = [];
  let remainingBalance = amountFinanced;

  if (amountFinanced > 0 && term > 0) {
    for (let paymentNumber = 1; paymentNumber <= term; paymentNumber += 1) {
      const interest = roundMoney(remainingBalance * monthlyRate);
      const isFinalPayment = paymentNumber === term;
      const principal = roundMoney(
        isFinalPayment
          ? remainingBalance
          : Math.min(
              remainingBalance,
              Math.max(0, monthlyLoanPayment - interest),
            ),
      );
      remainingBalance = roundMoney(
        Math.max(0, remainingBalance - principal),
      );
      const paymentAmount = roundMoney(principal + interest);

      schedule.push({
        paymentNumber,
        paymentAmount,
        principal,
        interest,
        remainingBalance: isFinalPayment ? 0 : remainingBalance,
      });
    }
  }

  const totalPrincipalPaid = roundMoney(
    schedule.reduce((total, row) => total + row.principal, 0),
  );
  const totalInterestPaid = roundMoney(
    schedule.reduce((total, row) => total + row.interest, 0),
  );
  const totalLoanPayments = roundMoney(
    schedule.reduce((total, row) => total + row.paymentAmount, 0),
  );
  const totalPurchaseCost = roundMoney(
    effectiveDownPayment +
      effectiveTradeInValue +
      upfrontTaxesAndFees +
      totalLoanPayments,
  );

  return {
    vehiclePrice,
    salesTaxRate,
    salesTax,
    dealerFees,
    taxesAndFees,
    purchaseTotal,
    financingBase,
    enteredDownPayment,
    enteredTradeInValue,
    effectiveDownPayment,
    effectiveTradeInValue,
    downPaymentCoversFinancing,
    downPaymentExceedsAmountDue,
    tradeInExceedsAmountDue,
    financingCoveredByContributions,
    upfrontTaxesAndFees,
    amountFinanced,
    apr,
    term,
    monthlyLoanPayment,
    totalPrincipalPaid,
    totalInterestPaid,
    totalLoanPayments,
    totalPurchaseCost,
    schedule,
  };
}