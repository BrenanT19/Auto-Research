# U.S. catalog — verified development batches

The requested scope remains **all U.S. model years** for Ford, Lincoln,
Chevrolet, Buick, GMC, Cadillac, Chrysler, Dodge, Jeep, Ram, Tesla, Rivian,
and Lucid. This batch is **not** a complete catalog or a recent-years-only
change of scope.

## Exact additions

| Manufacturer / model | U.S. model year | Verified generation | Added trims |
|---|---|---|---|
| Ford F-150 | 2021 | Fourteenth generation, 2021 redesign | XL, XLT, Lariat, King Ranch, Platinum, Limited — **6** |
| Chevrolet Silverado 1500 | 2024 | Fourth generation, T1XX, 2019 redesign | WT, Custom, Custom Trail Boss, LT, RST, LT Trail Boss, ZR2, LTZ, High Country — **9** |
| Buick Enclave | 2024 | North American second generation, MY2018–2024 | Essence, Premium, Avenir — **3** |
| GMC Sierra 1500 | 2024 | Fifth generation, T1XX, 2019 redesign | Pro, SLE, Elevation, SLT, AT4, AT4X, Denali, Denali Ultimate — **8** |
| Lucid Air | 2024 | First generation, MY2022 introduction | Pure, Touring, Grand Touring, Sapphire — **4** |
| Ram 2500 Heavy Duty | 2024 | Fifth-generation Ram Heavy Duty, 2019 introduction | Tradesman, Big Horn/Lone Star, Power Wagon, Rebel, Laramie, Limited Longhorn, Limited — **7** |
| Ram 3500 Heavy Duty | 2024 | Fifth-generation Ram Heavy Duty, 2019 introduction | Tradesman, Big Horn/Lone Star, Laramie, Limited Longhorn, Limited — **5** |

**42 additions**, across seven model-year groups and six manufacturers.
These are trim-level identities, not invented engine, body, drivetrain,
cab, bed, wheel, or package combinations.

The existing MY2024 Mustang EcoBoost Fastback development pilot is unchanged.
The website's development catalog currently contains **4,715 distinct
vehicle profiles**: 4,672 sparse model/year identities plus 43 source-backed
trim-level identities, including the existing Mustang pilot. Preserved
illustrative database rows are excluded from shopper discovery.

## Discovery retirements and saved routes

- MY2024 Silverado 1500 LT demo → exact real MY2024 LT trim identity.
- MY2024 Sierra 1500 Elevation demo → exact real MY2024 Elevation trim identity.
- MY2024 Enclave Preferred demo → hidden from discovery once all three actual
  trims are eligible. There is **no** exact replacement and **no** redirect to
  Essence; the illustrative database row remains, but the shopper profile
  endpoint returns not found for this retired demo.

All 13 original demo trim records and their 13 legacy owner-report records
remain in the database. No aliases, foreign-key relationships, owner reports,
or illustrative research values were reparented or deleted. An old saved LT
or Elevation URL can resolve to the exact real trim, but never brings the
demo's owner reports into that real profile. Enclave Preferred remains hidden
from shopper profile and report routes while its database row is preserved.
Retirement is conditional on the replacement passing the existing evidence,
rights, applicability, and development/public allowlist gates.

## Evidence and limits

Trim-level source URLs, document identifiers, generation references, EPA
corroborating row IDs, and scope/rights decisions are recorded by
`american-catalog-batch.sql`. The Ram model/year identities are also listed by
U.S. NHTSA vPIC; its EPA fuel-economy omission does not imply that those models
or their trims did not exist. The 2024 Ram trim set uses the manufacturer
press-kit lineup, its separate 2500/3500 feature matrix, and the 2500 off-road
announcement. Big Horn/Lone Star is represented as one regionally named grade,
not two trims. Only independent normalized identity facts and minimal factual
provenance are retained. No brochure prose, tables, images, logos, or document
copies are imported; the manufacturer source's broader content restrictions
are not treated as a license to reuse its expressive material.

The six MY2021 F-150 trims reflect the verified specifications document,
**not a claim that the full model-year lineup is complete**. Raptor and
Tremor have not been imported from that document.

Optional specifications, prices, scores, recalls, safety ratings, ownership
costs, problems, maintenance, and owner-pattern evidence remain **Not yet
researched**. These development entries do not authorize public release or
owner-experience submissions. The public release manifest remains empty.

## Remaining coverage

- Remaining U.S. model years, generations, and models for Ford, Chevrolet,
  Buick, GMC, Lucid, and Ram.
- Remaining MY2021 F-150 trims requiring year-specific verification.
- Real catalog expansion for **Lincoln, Cadillac, Chrysler, Dodge, Jeep,
  Tesla, Rivian, and Ram models/years other than the two listed above**;
  existing demos do not count as verified coverage.
- Full historical completeness across all 13 requested manufacturers.

Do not use EPA engine/wheel/configuration names as an exhaustive retail-trim
catalog. Do not carry today's shopping-page names into older model years.

## Reproduction and verification

Apply the SQL file with the project's **development** SQL tooling. It is one
transaction and can be rerun without duplicate records. Inspect its returned
configuration/identity-claim ID pairs before updating the explicit development
allowlist; IDs are not portable assumptions. Do not run this as a startup
migration or automatically add entries to the public manifest.

With the local API running, execute:

```sh
node scripts/tests/american-catalog-batch-smoke.mjs
```

This read-only check covers all 42 profile identities, cascading selectors,
contradictory selectors, sparse fields, discovery counts, text search,
old saved URLs, and separation from illustrative owner reports.
