Source: https://www.fueleconomy.gov/feg/epadata/27data.zip
Title: 2027 EPA Fuel Economy Guide datafile (download linked from FuelEconomy.gov)
Fetched: 2026-10-08

## Download and archive facts

- Downloaded the official 2027 datafile ZIP linked by FuelEconomy.gov on 2026-10-08.
- ZIP SHA-256: `f1ac221facbf7f8c04523f57a72cafa1480c8dfca6152fcdf36ebd8efde84627`.
- The ZIP contains one workbook: `MY27 FEGuide for DOE - No Release Dates Before 20260911 for DOE R1public.xlsx` (334,914 bytes).
- The workbook's `FEguide` sheet contains 363 model-year 2027 rows; relevant columns are `Model Year`, `Mfr Name`, `Division`, and `Carline`. The file title and the download page's “2027 Guide (Preliminary)” label indicate preliminary status.
- The workbook exposes `EPA FE Label Dataset ID` values but no direct crosswalk to the project's EPA `vehicle ID` locators. No exact vehicle-ID join was made.

## Catalog crosswalk check

The profile export contains 34 MY2027 model-year profiles, all assigned to `epa-1984-present` and the `vehicles.csv.zip` URL. A conservative **name-only** crosswalk matched each profile's make against workbook manufacturer/division labels and its model against the Carline string (case-insensitive substring):

- **Found:** 21 / 34 profiles: Buick Enclave, Cadillac Escalade, Chevrolet Corvette, Chevrolet Equinox, Chevrolet Suburban, Chevrolet Tahoe, Chevrolet Traverse, Chrysler Pacifica, Dodge Durango, Ford Expedition, Ford Explorer, GMC Acadia, GMC Terrain, GMC Yukon, Jeep Gladiator, Jeep Grand Cherokee, Jeep Grand Wagoneer, Jeep Wrangler, Lincoln Aviator, Lincoln Navigator, Ram 1500.
- **Not found by that name crosswalk:** 13 / 34: Cadillac LYRIQ, Cadillac OPTIQ, Cadillac VISTIQ, Chevrolet BOLT, Chevrolet Blazer, Dodge Charger, Lucid Air, Lucid Gravity, Rivian R1S, Rivian R1T, Rivian R2, Tesla Model 3, Tesla Model Y.

A name match establishes only that a make/model label appears in the preliminary workbook. It does not establish exact EPA vehicle-ID identity, retail sale, final lineup, or a complete U.S. census. A missing name is not evidence that the vehicle was not sold or will not be available. Keep every MY2027 row preliminary and do not release it based on this check alone.

## Source-lineage issue

FuelEconomy.gov's download page describes the all-years dataset as MY1984–2026 and separately lists a 2027 datafile and preliminary guide. The profile audit reports that the referenced MY2027 vehicle IDs also match the current all-years ZIP, but the catalog's single `epa-1984-present` source ID does not distinguish the separate preliminary workbook. This is a source metadata/version issue, not proof that the catalog model-year labels are false. The two files' row identifiers could not be reconciled exactly in this pass.
