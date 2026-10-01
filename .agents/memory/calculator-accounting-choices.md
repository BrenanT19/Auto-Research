---
name: Calculator accounting choices
description: Why the ownership estimator uses cent-reconciled loan totals and starts without a state assumption.
---

Loan analysis should reconcile to the displayed cent-rounded installments, with a final settlement payment, rather than presenting a separately rounded theoretical interest total.

**Why:** The user requires internally consistent principal, interest, purchase totals and a printable schedule that ends at zero. Summaries calculated independently from unrounded installments can disagree with the payment rows a shopper sees.

**How to apply:** Preserve cent-level reconciliation when changing financing math. Keep the recurring ownership estimate separate from lifetime purchase/loan costs; a cash purchase still has operating expenses.

Start with no state selected and zero assumed taxes/dealer fees until the shopper supplies those assumptions.

**Why:** No shopper location or dealer charge was provided, and choosing an arbitrary default would change the existing estimate while suggesting a level of tax accuracy this prototype does not have.

**How to apply:** Do not add an implicit state or dealer fee when extending the calculator. Any future verified tax integration must remain explicit about locality, vehicle-specific rules and unmodeled costs.