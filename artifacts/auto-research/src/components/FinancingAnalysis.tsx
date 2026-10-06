import type { calculateFinancingEstimate } from '../financing';

type Financing = ReturnType<typeof calculateFinancingEstimate>;
export const cents = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function PurchaseBreakdown({ f }: { f: Financing }) {
  const upfront = f.upfrontTaxesAndFees > 0;
  const rows: [string, string, boolean?][] = [
    ['Vehicle price', cents(f.vehiclePrice)],
    [`Estimated sales tax (${f.salesTaxRate}%)`, cents(f.salesTax)],
    ['Estimated dealer fees', cents(f.dealerFees)],
    ['Estimated purchase total', cents(f.purchaseTotal), true],
    ['Down payment applied', `− ${cents(f.effectiveDownPayment)}`],
    ['Trade-in value applied', `− ${cents(f.effectiveTradeInValue)}`],
    ...(upfront ? [['Taxes & fees paid upfront', cents(f.upfrontTaxesAndFees)] as [string, string]] : []),
    ['Estimated amount financed', cents(f.amountFinanced), true],
  ];
  return <div className="purchase-breakdown" data-testid="purchase-breakdown">
    <span className="eyebrow">PURCHASE BREAKDOWN</span>
    {rows.map(([name, value, strong]) => <div key={name} className={strong ? 'strong' : ''}><span>{name}</span><b>{value}</b></div>)}
    {f.downPaymentExceedsAmountDue && <p className="calc-note" data-testid="text-down-exceeds">Your entered down payment of {cents(f.enteredDownPayment)} is more than the amount due, so only {cents(f.effectiveDownPayment)} is applied. Down payment covers the financed amount. No financing required.</p>}
    {!f.downPaymentExceedsAmountDue && f.downPaymentCoversFinancing && <p className="calc-note" data-testid="text-down-covers">Your down payment covers the financed amount, No financing required.</p>}
    {f.tradeInExceedsAmountDue && <p className="calc-note" data-testid="text-trade-in-exceeds">Your entered trade-in value of {cents(f.enteredTradeInValue)} exceeds the amount remaining after the down payment, so only {cents(f.effectiveTradeInValue)} is applied.</p>}
    {!f.downPaymentCoversFinancing && f.financingCoveredByContributions && <p className="calc-note" data-testid="text-contributions-cover">Your down payment and trade-in value cover the financed amount. No financing required.</p>}
  </div>;
}

export function FinancingAnalysis({ f }: { f: Financing }) {
  const noLoan = f.amountFinanced <= 0;
  const interestShare = f.totalLoanPayments ? f.totalInterestPaid / f.totalLoanPayments * 100 : 0;
  const table = (cls: string) => <div className={cls}><table><thead><tr><th>Payment #</th><th>Payment amount</th><th>Principal</th><th>Interest</th><th>Remaining balance</th></tr></thead><tbody>{f.schedule.map(r => <tr key={r.paymentNumber}><td>{r.paymentNumber}</td><td>{cents(r.paymentAmount)}</td><td>{cents(r.principal)}</td><td>{cents(r.interest)}</td><td>{cents(r.remainingBalance)}</td></tr>)}</tbody></table></div>;
  return <section className="calc-group financing-analysis" data-testid="financing-analysis">
    <span className="eyebrow">FINANCING ANALYSIS</span><h2 className="serif">What the loan costs over {f.term} months</h2>
    {noLoan && <p className="analysis-empty" data-testid="text-no-loan">No financing required. You would pay {cents(f.totalPurchaseCost)} in total, with no loan interest.</p>}
    <div className="analysis-grid" data-testid="analysis-metrics">{([['Estimated amount financed', cents(f.amountFinanced)], ['APR', `${f.apr}%`], ['Loan term', `${f.term} months`], ['Monthly loan payment', cents(f.monthlyLoanPayment)], ['Total principal paid', cents(f.totalPrincipalPaid)], ['Total interest paid', cents(f.totalInterestPaid)], ['Total of loan payments', cents(f.totalLoanPayments)], ['Estimated total paid for vehicle', cents(f.totalPurchaseCost)]] as [string, string][]).map(([n, v]) => <div key={n}><span>{n}</span><b>{v}</b></div>)}</div>
    {!noLoan && <><div className="split-bar" role="img" aria-label={`Of your loan payments, ${interestShare.toFixed(1)}% is interest`}><i style={{ width: `${100 - interestShare}%` }}/><i style={{ width: `${interestShare}%` }}/></div>
      <div className="split-legend"><span><u/>Principal {cents(f.totalPrincipalPaid)}</span><span><u className="int"/>Interest {cents(f.totalInterestPaid)} ({interestShare.toFixed(1)}%)</span></div></>}
    <p className="analysis-foot">Total purchase cost = loan payments + down payment applied{f.effectiveTradeInValue > 0 ? ' + trade-in value applied' : ''}{f.upfrontTaxesAndFees > 0 ? ' + taxes & fees paid upfront' : ''}.</p>
    {!noLoan && <details className="schedule" data-testid="schedule-details"><summary>View amortization schedule</summary>{table('schedule-scroll')}</details>}
    {noLoan && <details className="schedule" data-testid="schedule-details"><summary>View amortization schedule</summary><p className="analysis-empty">No financing schedule is required.</p></details>}
    {!noLoan && <div className="schedule-print"><span className="eyebrow">AMORTIZATION SCHEDULE</span>{table('schedule-print-table')}</div>}
  </section>;
}
