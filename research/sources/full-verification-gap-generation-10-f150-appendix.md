# Follow-up evidence: Ford F-150 MY1975–1979 generation and refresh intervals

**Scope:** Validate the three existing F-150 generation/refresh rows and their use on MY1975–1979 profiles. The 142-row era inventory is unchanged. No application data, production data, or release status was changed.

## Fact support

The three catalog intervals covering the five F-150 profile-generation strings are supported as follows:

| Era | Existing claim | Evidence and disposition |
|---|---|---|
| `8001611` | Sixth F-Series generation / F-150 introduction, MY1975–1979 | Ford dates the F-150 launch to the 1975 model year; Hagerty and Car and Driver place its 1975 debut in the sixth generation. Car and Driver dates that generation 1973–1979. Supported. [@profile-batch-f150-official-1975] [@profile-batch-f150-hagerty-sixth-generation] [@profile-batch-f150-car-and-driver-history] |
| `8001612` | 1976 grille change, MY1976–1977 | Hagerty's buyer's guide identifies the 1976 grille revision; its 1977 F-150 model history explicitly says the revised 1976 grille carried into 1977. Supported for the displayed “grille facelift” and range. The catalog locator's narrower “split-grille” wording is not corroborated by the captured sources. [@profile-batch-f150-hagerty-buyers-guide] [@profile-batch-f150-hagerty-1977-model-year] |
| `8001613` | 1978 front-end update, MY1978–1979 | Hagerty describes a 1978 grille/front-end redesign and the 1977 F-150 model history says all series had rectangular headlamps by 1979. Car and Driver independently reports upper-trim rectangular headlamps in 1978 and standard equipment in 1979, within the sixth generation ending in 1979. Supported at the catalog's broad model-year scope; trim-specific lamp fitting remains distinct. [@profile-batch-f150-hagerty-buyers-guide] [@profile-batch-f150-hagerty-1977-model-year] [@profile-batch-f150-car-and-driver-history] |

The 1975 base interval and the later 1976 and 1978 changes are separate from the sixth F-Series generation's 1973 start. The source set includes multiple Hagerty pages, which are not independent outlets; Car and Driver independently supports the generation end and the 1978–1979 lamp transition. The five F-150 profile generation strings are factually supported.

## Identity values on the five profiles

Separate year-specific Hagerty Valuation Tools pages identify Ford F-150 model years 1975–1979; Ford's official history dates the nameplate launch to MY1975. Together with the captured generation sources, this supports all four populated content values (make, model, year, generation) on `ford-f150-1975-model-year` through `ford-f150-1979-model-year`. The row-level dispositions and sources are recorded in `research/profile-information-audit/f150-profile-fact-check.csv`.

This is bounded factual support, not an exhaustive U.S. sales census. The imported Wikipedia article's exact revision, attribution/license treatment, and source-use terms for Wikipedia/Wikimedia, Hagerty, Ford, and Car and Driver remain unresolved. The five profiles remain on hold and have not been marked release-ready.

## Remaining limitations

Hagerty's 2025 guide and its 1977 model-history page are from the same publisher, and the model-history page is unbylined and does not cite its underlying sources. The captured sources establish a revised grille but do not support the catalog locator's extra “split-grille” detail. Source access and use conditions remain a separate, unresolved review for every citation; no article text or images have been imported into the catalog.

**Disposition:** Three of 142 interval claims now have factual support for their full named model-year spans. The same five F-150 profiles now also have factual support for their make/model/year values. The three earlier Tesla/Pacifica refresh checks remain onset-only, and the other era rows and profile fields have not been fully verified.
