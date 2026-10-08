# 2024 Mustang EcoBoost Fastback — populated-fact verification

**Profile:** `ford-mustang-2024-ecoboost-fastback-us-23l-10at-rwd`  
**Scope:** Existing populated facts only: `bodyType`, `drivetrain`, `engineName`, `transmissionName`, `fuelRequirement`, and `fuelTankCapacityGallons`. No optional configuration matrix, MPG, or horsepower research. This is a private evidence note, not release approval.

## Key Facts

| Field | Populated value | Finding |
|---|---|---|
| `bodyType` | `Fastback coupe` | **Partially supported.** The official EPA record identifies a 2024 Mustang as “2-door” and “Rear-Wheel Drive,” but does not distinguish coupe/fastback from convertible. U.S. News’ 2024 EcoBoost Fastback page supports the retail Fastback name, but is secondary evidence. Exact body-style applicability is not established by the government record. |
| `drivetrain` | `RWD` | **Supported.** The official EPA 2024 Mustang record says “Rear-Wheel Drive.” EPA test-car data may corroborate powertrain/drivetrain, but is not needed to establish retail body and does not by itself identify this retail trim. |
| `engineName` | `2.3L EcoBoost turbocharged inline-four` | **Partially supported.** The official EPA page identifies “4 cyl, 2.3 L,” supporting displacement and cylinder count. Its record does not say “EcoBoost,” “turbocharged,” or “inline.” The indexed secondary page identifies the EcoBoost Fastback trim in its title but its returned snippet does not expose engine details, so it does not complete support for the displayed engine name. |
| `transmissionName` | `10-speed automatic` | **Supported.** The official EPA record says “Automatic 10-spd.” |
| `fuelRequirement` | `87 AKI minimum; 91+ AKI recommended for best performance, not required.` | **Not verified as stated.** EPA labels the vehicle “Regular Gasoline,” which supports fuel grade broadly but does not establish the exact minimum AKI or recommendation. The retrieved owner-manual extract identifies a Fuel Quality section and the 2024 manual revision, but did not expose the octane sentence. Do not treat “regular” as proof of the exact octane wording. |
| `fuelTankCapacityGallons` | `15.9` | **Unresolved.** The retrieved owner-manual extract identifies a “Fuel Tank Capacity - 2.3L EcoBoost” section but does not expose its value. A secondary 2024 capacity page says 16.0 gallons, while the profile has 15.9; neither establishes the exact EcoBoost Fastback value. Do not silently reconcile/round these. |

## Notable Claims Requiring Cross-Reference

- The EPA page is a final-year government fuel-economy record with a close engine/transmission/drivetrain match, but it does not establish the precise Fastback retail body. Its “2-door” classification is not enough to distinguish coupe from convertible.
- The owner-manual fetch was incomplete for the two needed values: it exposed section headings and a manual revision identifier, not the octane or tank-capacity text. It is not evidence for the numeric values quoted in the profile.
- Search indexing also surfaced a 2024 Mustang technical-specification document explicitly titled **“PRELIMINARY TECHNICAL SPECIFICATIONS.”** It is preliminary evidence, not final production support, and is excluded from verification of these populated values.
- The retrieved Europe-market 2024 specification URL returned only a service error. It supplies no usable content and would not, without a defensible cross-market mapping, establish U.S. retail-trim applicability.
- The profile’s overview is an editorial scope note about recalls, complaints, safety-rating scope, and unresolved EPA package/body mapping. It is not used here as factual specification support.

## Source Quality Assessment

1. **EPA / FuelEconomy.gov vehicle record — high authority for listed government-record attributes.** Final MY2024 record for model 46646. It supplies engine displacement/cylinder count, transmission, fuel type, body door count, and drivetrain; it does not resolve retail Fastback-vs-convertible identity or minimum octane.
2. **Ford 2024 owner’s manual — primary manufacturer source, but the retrieved extract is incomplete.** Manual identifier includes `2024`; exposed revision string `Part Number: -202212-20230418145831`. The exact fuel-quality sentence and capacity value were not returned, so neither is verified here. This is a narrow evidence limitation, not a general permission requirement for factual vehicle data.
3. **U.S. News 2024 EcoBoost Fastback specifications — secondary, trim-specific identity corroboration.** Search result identifies the page as “2024 Ford Mustang EcoBoost Fastback Specs and Features”; it is not a substitute for an exact-body primary or government record.
4. **AutoPadre 2024 Mustang gas-tank-size page — secondary and non-trim-specific.** Its indexed result states “The 2024 Ford Mustang gas tank size is 16.0 gallons.” This conflicts with 15.9 and lacks exact EcoBoost Fastback applicability; it is a lead, not a resolution.
5. **EPA 2024 Mustang by-model page — high-authority government model-year listing, but not exact-body evidence.** Indexed result includes 2024 Mustang records and a 2.3 L, automatic 10-speed EPA entry. Do not infer that model-level listing alone maps to this retail body.
6. **EPA 2024 test-car workbook — government test data, distinct from retail specifications.** Its URL is already attached to the profile’s identity/drivetrain/engine/transmission rows. It is suitable only as a powertrain corroboration where the exact row/join is demonstrated; this task did not inspect workbook rows and makes no new test-car-specific claim.

Ordinary factual attributes in government data are not blocked merely because the vehicle is a Ford. No broad manufacturer-permission gate is asserted. Source-specific reuse terms remain a separate question from factual support.

## Gaps & Unanswered Questions

- Of the **6 targeted populated fields**, **2 are supported** (`drivetrain`, `transmissionName`); **2 are partially supported** (`bodyType`, where “2-door” is supported but exact “Fastback coupe” is not; and `engineName`, where 2.3 L / four-cylinder are supported but the remaining terms are not); **2 remain unresolved as populated** (`fuelRequirement` exact octane wording and `fuelTankCapacityGallons` exact value).
- Remaining body question: an applicable final MY2024 U.S. source linking the EcoBoost Fastback retail body to the profile’s coupe/fastback label, rather than only identifying a two-door Mustang.
- Remaining fuel questions: the exact minimum/recommended AKI wording and the EcoBoost Fastback tank capacity, from an accessible, applicable final MY2024 source with the relevant text visible.
- No optional configurations, MPG, horsepower, or complete build sheet were researched. This verification does not establish public-release readiness or approve any release.

## Sources

Snippets below are limited to the evidence relevant to this review. Dates are reported only where exposed; “not stated” means the retrieved snippet did not give a publication date.

1. **EPA, “Fuel Economy of the 2024 Ford Mustang,” model 46646** — https://fueleconomy.gov/feg/noframes/46646.shtml  
   **Tier/date:** Government primary record; MY2024; page publication date not stated.  
   **Retrieved snippet:** “4 cyl, 2.3 L,” “Automatic 10-spd,” “Regular Gasoline”; extracted page content also states “2-door” and “Rear-Wheel Drive.”  
   **Saved retrieval:** `research/sources/full-verification-gap-mustang-01-epa-record.md`

2. **Ford, 2024 Mustang Owner’s Manual, version 1** — https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2024_Ford_Mustang_Owners_Manual_version_1_om_EN-US.pdf  
   **Tier/date:** Manufacturer primary source; manual revision identifier `-202212-20230418145831`; not a publication date.  
   **Retrieved snippets:** “Fuel Quality” section; “Fuel Tank Capacity - 2.3L EcoBoost™”; no octane sentence or capacity number was exposed in the fetched extract.  
   **Saved retrieval:** `research/sources/full-verification-gap-mustang-02-owner-manual.md`

3. **U.S. News, “2024 Ford Mustang EcoBoost Fastback Specs and Features”** — https://cars.usnews.com/cars-trucks/ford/mustang/2024/specs/mustang-ecoboost-fastback-439073  
   **Tier/date:** Secondary retail-trim reference; page date not stated.  
   **Retrieved snippet:** “View detailed specs, features and options for the 2024 Ford Mustang EcoBoost Fastback…”

4. **AutoPadre, “Ford Mustang Gas Tank Size (2002-2025)”** — https://www.autopadre.com/gas-tank-size/ford-mustang  
   **Tier/date:** Secondary aggregation; page date not stated.  
   **Retrieved snippet:** “The 2024 Ford Mustang gas tank size is 16.0 gallons.”

5. **EPA, 2024 Ford Mustang by-model listing** — https://fueleconomy.gov/feg/bymodel/2024_Ford_Mustang.shtml  
   **Tier/date:** Government primary listing; model year 2024; page publication date not stated.  
   **Retrieved snippet:** “2024 Ford Mustang” listing; indexed results include the 2.3 L automatic record. This is a model listing, not a retail-body crosswalk.

6. **EPA, 2024 test-car workbook (May 2025 file path)** — https://www.epa.gov/system/files/documents/2025-05/24-testcar-2025-05.xlsx  
   **Tier/date:** Government test dataset; file path indicates May 2025.  
   **Evidence boundary:** URL is present in the existing profile’s source metadata; its rows were not inspected in this task. It is not cited as direct support for any new exact-row claim.

7. **Ford Europe, “2024 Ford Mustang technical specification”** — https://media.ford.com/content/dam/fordmedia/Europe/en/2024/01/NewMustang/2024_Ford_Mustang_technical_specification_EU.pdf  
   **Tier/date:** Manufacturer primary document for Europe; URL path indicates January 2024; exact document date not verified.  
   **Retrieved result:** The fetch returned “Service Unavailable - Fail to connect,” with no specification content. Excluded from factual support.
