# Auto Research regression checks

Run the regression suite with:

```sh
pnpm --filter @workspace/scripts test:auto-research
```

The suite includes unit checks for optional calculator lookups, loan/fuel
estimates, purchase taxes/fees, down-payment caps, cent-rounded amortization,
browse filters and URL cleanup, and comparison limits/URL state. Its
read-only API checks create a temporary database from fixed demo fixtures, start
a local API server against it, and make `GET /api/vehicles` requests. The runner
requires `AUTO_RESEARCH_TEST_DATABASE_URL`; it accepts only a local PostgreSQL
URL whose database name is exactly `auto_research_test`, creates a uniquely
named database for the run, and drops it afterward. It does not use
`DATABASE_URL` or contact a running development or production API.

For local use and CI, provision a local PostgreSQL service with an
`auto_research_test` database and a role allowed to create databases, then run
the same command:

```sh
export AUTO_RESEARCH_TEST_DATABASE_URL=postgresql://postgres:test@127.0.0.1:5432/auto_research_test
pnpm --filter @workspace/scripts test:auto-research
```

CI should provide that PostgreSQL service and URL as job configuration. Do not
set this variable to a hosted database or use `DATABASE_URL` as a substitute.
The browser smoke check below remains a separate manual check against the local
development workflows and their demo database.

## Generation mouse-interaction regression

With the web and API workflows running, use the installed system Chromium in this
workspace (no additional browser download or Linux library installation needed):

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$(command -v chromium)"
pnpm --filter @workspace/auto-research test:browse:ui
```

Run just Generation selection with:

```sh
pnpm --filter @workspace/auto-research test:generation:ui
```

Outside this workspace, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a supported
installed Chromium executable, or leave it unset to use Playwright's managed
browser. For the latter, provision Chromium and its Linux runtime libraries in
your local/CI environment; downloading the browser alone does not supply those
libraries. The configuration does not hardcode a workspace-specific browser path.
`AUTO_RESEARCH_PREVIEW_URL` can point to the running preview; it defaults to the
local shared proxy at `http://localhost:80`.

`tests/browser/generation.spec.ts` reads the existing catalog, chooses Tesla
Model Y, Dodge Charger, and Ram 1500, then **clicks** the Generation trigger and
the visible option. It asserts the open listbox, selected name, URL, dependent
years, reload persistence, and mouse clearing via All generations. Generation
selection is never replaced with `selectOption()`, keyboard input, or injected
state. These checks perform no database or catalog writes.

## Clear All scrolling regression

```sh
pnpm --filter @workspace/auto-research test:clear-filters:ui
```

`tests/browser/browse-clear-filters.spec.ts` clicks Clear all filters in a
scrolled desktop/mobile Browse page and checks the complete reset, clean URL,
button disappearance, and return to the top. It checks smooth scrolling for
normal motion, immediate scrolling for reduced motion, and no return-to-top
when changing an individual sort filter.

`tests/browser/browse-sidebar.spec.ts` additionally verifies 1366×768 and
1366×720 fitting sticky panels, real mouse-wheel internal scrolling at 1366×520,
unchanged 700px/390px responsive layouts, and a single uninterrupted Clear All
scroll while the real reset request is delayed. A browser-only results spacer
checks sticky reachability deep into a long page without changing vehicle data.

## Vehicle report section navigation

```sh
pnpm --filter @workspace/auto-research test:report-navigation:ui
```

Use the same Chromium executable override described above. The tests physically
click repeated sequential and non-sequential section links on Dodge Charger and
Tesla Model Y reports, assert immediate and settled active indicators, and use
mouse-wheel input to track sections upward and downward. They also cover rapid
retargeting, user interruption, reduced motion, and initial fragment links.
These checks do not modify vehicle data or report content.

## Browser smoke check

Run with the Auto Research web workflow and API Server workflow running against
the local seeded demo database. In Chromium:

1. Open `/calculator` without a `vehicle` query parameter. Confirm the estimate
   renders and the Network panel has no request to `/api/vehicles/`.
2. Set APR to `0`. With the default gas assumptions, confirm the loan payment is
   `$450`, fuel is about `$130`, and monthly estimate is `$890`.
3. Open `/calculator?vehicle=tesla-model-y-2024-long-range`, select **Use vehicle
   profile estimates**, and set APR to `0`. Confirm the fuel controls show
   electricity pricing and `122 MPGe`, with about `$44` monthly fuel.
4. On `/browse`, search `2024 Ford F-150 XLT`. Confirm one result and a matching
   `q` URL parameter. Select **Clear all filters** and confirm the URL is
   `/browse`, the search is empty, and all 13 seeded profiles return.
5. On `/compare`, add the seeded Ford F-150 XLT, Chevrolet Silverado 1500 LT,
   Tesla Model Y Long Range, and Cadillac Escalade Premium Luxury. Confirm all
   four IDs appear in the URL. After each selection confirm the search input is
   empty and suggestions are closed. At four vehicles confirm the search input
   is disabled, suggestions stay closed, and the counter says `4 of 4 vehicles
   selected`. Remove one vehicle and confirm searching is enabled again and
   its ID leaves the URL. Use browser Back and Forward after a removal and
   confirm the URL, selected count, and columns stay aligned. Reopen the four-ID
   URL directly and confirm all four columns return.

## Prototype refinement checks

- In every calculator number field, delete the value using the keyboard. While
  focused, it must stay completely blank; monthly and yearly totals must remain
  finite. Type a replacement such as `500` and confirm it displays without a
  leading zero and updates the estimate. An empty field normalizes to `0` only
  on blur. Check decimal APR/fuel pricing and the EV electricity field too.
- Verify the yellow header CTA says **Browse cars** and opens `/browse`.
- On Community, confirm the ownership-sharing CTA says coming soon/preview only
  and does not open a form. All demo scenarios must be visibly fictional, with
  owner reports distinguished from researched owner-reported issues.
- Change the Community manufacturer filter and clear it. Matching vehicle
  experiences should return, and any fictional preview details should stay
  consistent for the same report.
- On About, retain **Better questions make better ownership**, **A guide, not a
  verdict**, demo disclosures, connected research, and the NHTSA/EPA links.
- At a narrow mobile viewport, check the navigation menu, calculator fields and
  totals, comparison picker/table scrolling, Community cards/CTA, and About
  content. No page-level horizontal overflow or clipped controls should appear.

## Expanded financing checks

Zero-default input cleanup: on a fresh calculator, click the dealer-fee field
showing `0` and type `300` without deleting first; the raw value must be `300`,
not `0300`. Repeat with the zero tax-rate field and a decimal such as `7.25`.
Blank editing/blur normalization must still work, and focusing a non-zero value
must not select or change it automatically. Fee changes must update financing.
The purchase breakdown retains **Estimated purchase total**, while the analysis
uses **Estimated total paid for vehicle** for the unchanged interest-inclusive total.

State tax rates are replaceable prototype assumptions, not verified tax data.
Start with no state selected and zero tax/fees to preserve the original estimate.
Run these checks in one real-browser pass after calculator changes:

1. Set vehicle price to `32000`, down payment to `5000`, APR to `0`, term to
   `60 months`, New York (prototype `4%` tax), dealer fees to `500`, and include
   taxes/fees in the loan. Expect tax `$1,280.00`, purchase total `$33,780.00`,
   financed amount `$28,780.00`, monthly loan `$479.67`, and zero interest.
2. Switch to paying taxes/fees upfront. Expect `$1,780.00` upfront and
   `$27,000.00` financed, with a `$450.00` loan payment. Purchase cost remains
   `$33,780.00` at zero APR; taxes/fees must not be counted twice.
3. Check zero down, down equal to the vehicle price, down exceeding the price,
   and `10000000000` down in both payment modes. In financed mode, taxes/fees
   may still require a loan when down equals only the vehicle price. The
   no-financing threshold is the applicable financing base, not always price.
   At/exceeding that base, loan principal/payment/interest/loan total are zero.
   Show coverage and excess messages as appropriate, preserve the entered
   draft, cap only the applied down payment, and keep purchase cost meaningful.
   Default gas operating costs still total about `$440/month` with no loan.
4. Restore a normal loan; check `6.4%` and a higher APR such as `24%`, and
   all loan terms (`36`, `48`, `60`, `72`, `84`). Confirm total principal equals
   the financed amount, principal plus interest equals total loan payments,
   and total purchase cost equals purchase total plus interest.
5. Change states (including a zero-rate state), manually override the estimated
   rate, change dealer fees, and change states again. A new state resets the
   rate to its default; manual overrides update the calculation immediately.
   Tax/fee changes affect principal only when financed, but always affect the
   purchase total. The state picker includes all 50 states and Washington, D.C.
6. Clear all financing numeric fields while focused, including tax and fees.
   They remain blank until blur and accept replacements without leading zeros.
   Decimal rates/fees work; drafts never become `NaN`/`Infinity`. Existing
   driving/ongoing-cost fields and the EV profile still work.
7. Confirm the restrained principal/interest visual updates with every financing
   assumption. Expand **View amortization schedule** (collapsed initially);
   check the full term, payment/principal/interest relationship and final
   `$0.00` balance. At zero APR, every interest amount is zero. At no financing,
   show an explanatory empty state rather than a meaningless schedule.
8. Verify **ESTIMATED MONTHLY OWNERSHIP** describes the combined loan, fuel,
   insurance, maintenance and repair reserve—not just the loan payment.
   No negative balances/payments/totals, `NaN`, or `Infinity` should appear.
9. Use **Print this estimate** and inspect print output: purchase breakdown,
   ownership breakdown and detailed financing totals must be readable, current,
   and free of sticky-card/scroll clipping. Taxes/dealer fees are included as
   estimates; registration/depreciation remain excluded. Verify the revised
   disclaimer calls for checking dealer/lender/DMV or tax-authority figures.
10. Check desktop and `375px` layouts; the amortization table should scroll
    internally on mobile without page-level overflow. Preserve the two-column
    desktop calculator and the existing stacked mobile layout.