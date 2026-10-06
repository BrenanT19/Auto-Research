export type BrowseSort = "popular" | "reliability" | "ownership-cost";

export type ResearchFieldState = {
  state: "known" | "unknown" | "not_yet_researched" | "not_applicable";
  reason?: string | null;
  claimIds: string[];
};

export function researchStateLabel(state?: ResearchFieldState | null): string {
  if (!state) return "Research state unavailable";
  if (state.state === "known") return "Known";
  if (state.state === "not_yet_researched") return "Not yet researched";
  if (state.state === "not_applicable") return "Not applicable";
  return "Unknown";
}

/** A field's state takes precedence over a broader (possibly partial) section. */
export function profileResearchState(
  profile: {
    fieldStates?: Record<string, ResearchFieldState | undefined>;
    sectionStates?: Record<string, ResearchFieldState | undefined>;
  },
  field: string,
  section?: string,
): ResearchFieldState | undefined {
  return profile.fieldStates?.[field] ??
    (section ? profile.sectionStates?.[section] ?? profile.fieldStates?.[section] : undefined);
}

export type HomeTrendEvidence = {
  kind: "canonical" | "demo" | "unclassified";
  state?: ResearchFieldState;
  value: number | null;
};

/** Canonical trend values are shown only when that specific field is known. */
export function homeTrendEvidence(
  profile: {
    profileKind?: string;
    isDemo?: boolean;
    fieldStates?: Record<string, ResearchFieldState | undefined>;
    sectionStates?: Record<string, ResearchFieldState | undefined>;
  },
  field: string,
  value: number | null | undefined,
): HomeTrendEvidence {
  if (profile.profileKind === "canonical" && profile.isDemo === false) {
    const state = profileResearchState(profile, field);
    return {
      kind: "canonical",
      ...(state ? { state } : {}),
      value: state?.state === "known" && value != null ? value : null,
    };
  }
  return {
    kind: profile.isDemo === true ? "demo" : "unclassified",
    value: value ?? null,
  };
}

export type CanonicalPrefillProfile = {
  profileKind?: string;
  isDemo?: boolean;
  fieldStates?: Record<string, ResearchFieldState | undefined>;
  priceUsd?: number | null;
  mpgCombined?: number | null;
  annualMaintenanceEstimateUsd?: number | null;
  annualRepairEstimateUsd?: number | null;
  insuranceEstimateUsd?: number | null;
};

/** Only explicitly known canonical profile values may be copied into editable inputs. */
export function buildCanonicalCalculatorPrefill(
  profile: CanonicalPrefillProfile,
): Partial<OwnershipDraft> {
  if (profile.profileKind !== "canonical" || profile.isDemo !== false) return {};
  const knownNumber = (field: string, value: number | null | undefined) =>
    profile.fieldStates?.[field]?.state === "known" && typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  const prefill: Partial<OwnershipDraft> = {};
  const price = knownNumber("priceUsd", profile.priceUsd);
  const mpg = knownNumber("mpgCombined", profile.mpgCombined);
  const maintenance = knownNumber("annualMaintenanceEstimateUsd", profile.annualMaintenanceEstimateUsd);
  const repairs = knownNumber("annualRepairEstimateUsd", profile.annualRepairEstimateUsd);
  const insurance = knownNumber("insuranceEstimateUsd", profile.insuranceEstimateUsd);
  if (price !== undefined) prefill.price = String(price);
  if (mpg !== undefined) prefill.mpg = String(mpg);
  if (maintenance !== undefined) prefill.maintenance = String(maintenance / 12);
  if (repairs !== undefined) prefill.repairs = String(repairs / 12);
  if (insurance !== undefined) prefill.insurance = String(insurance / 12);
  return prefill;
}

export function mergeCanonicalCalculatorPrefill(
  profile: CanonicalPrefillProfile,
  draft: OwnershipDraft,
  editedFields: Partial<Record<keyof OwnershipDraft, boolean>>,
): { draft: OwnershipDraft; appliedFields: Array<keyof OwnershipDraft> } {
  const available = buildCanonicalCalculatorPrefill(profile);
  const appliedFields = (Object.keys(available) as Array<keyof OwnershipDraft>)
    .filter((field) => available[field] !== undefined && !editedFields[field]);
  return {
    draft: { ...draft, ...Object.fromEntries(appliedFields.map((field) => [field, available[field]])) },
    appliedFields,
  };
}

export function resetUneditedCalculatorDraft(
  draft: OwnershipDraft,
  defaults: OwnershipDraft,
  shopperEditedFields: Partial<Record<keyof OwnershipDraft, boolean>>,
): OwnershipDraft {
  return Object.fromEntries((Object.keys(draft) as Array<keyof OwnershipDraft>).map((field) => [
    field,
    shopperEditedFields[field] ? draft[field] : defaults[field],
  ])) as OwnershipDraft;
}

export type CanonicalCalculatorAssumptions = {
  draft: OwnershipDraft;
  taxRate: string;
  dealerFees: string;
  fuelType: string | null | undefined;
};

export function isEnteredCalculatorValue(value: string): boolean {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
}

export function missingCanonicalFinancingInputs(assumptions: CanonicalCalculatorAssumptions): string[] {
  const missing: string[] = [];
  if (!isEnteredCalculatorValue(assumptions.draft.price)) missing.push("vehicle price");
  if (!isEnteredCalculatorValue(assumptions.draft.down)) missing.push("down payment");
  if (!isEnteredCalculatorValue(assumptions.draft.apr)) missing.push("APR");
  if (!isEnteredCalculatorValue(assumptions.taxRate)) missing.push("sales tax rate");
  if (!isEnteredCalculatorValue(assumptions.dealerFees)) missing.push("dealer fees");
  return missing;
}

export function missingCanonicalOwnershipInputs(assumptions: CanonicalCalculatorAssumptions): string[] {
  const missing = missingCanonicalFinancingInputs(assumptions);
  if (!isEnteredCalculatorValue(assumptions.draft.miles)) missing.push("miles driven per year");
  if (!isEnteredCalculatorValue(assumptions.draft.mpg)) missing.push("combined fuel economy");
  const fuel = assumptions.fuelType?.trim().toLocaleLowerCase().replace(/[-_]/g, " ");
  if (!fuel) missing.push("fuel type");
  else if (["electric", "battery electric", "all electric", "bev"].includes(fuel)) {
    if (!isEnteredCalculatorValue(assumptions.draft.electricity)) missing.push("electricity price");
  } else if (!isEnteredCalculatorValue(assumptions.draft.gas)) {
    missing.push("fuel price");
  }
  if (!isEnteredCalculatorValue(assumptions.draft.insurance)) missing.push("insurance");
  if (!isEnteredCalculatorValue(assumptions.draft.maintenance)) missing.push("maintenance");
  if (!isEnteredCalculatorValue(assumptions.draft.repairs)) missing.push("repairs reserve");
  return missing;
}

export function safeCitationUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export type BrowseFilters = {
  q: string;
  make: string;
  model: string;
  trim: string;
  sort: BrowseSort;
  year: string;
  modelId: string;
  generationId: string;
  trimId: string;
  modelKey: string;
  generationKey: string;
  trimKey: string;
};

export type CatalogOption = {
  profileId: string;
  makeId: number;
  make: string;
  makeSlug: string;
  modelId: number;
  model: string;
  generationId?: number;
  generation: string;
  modelYearId: number;
  year: number;
  trimId?: number;
  trim: string;
  profileKind?: "canonical" | "legacy";
  identityLevel?: "model_year" | "trim_configuration";
  makeKey?: string;
  modelKey?: string;
  generationKey?: string;
  modelYearKey?: string;
  trimKey?: string;
};

export function catalogModelKey(option: CatalogOption): string {
  return option.modelKey || `${option.profileKind === "canonical" ? "canonical" : "legacy"}:model:${option.modelId}`;
}

export function catalogGenerationKey(option: CatalogOption): string {
  if (option.generationKey) return option.generationKey;
  if (option.generationId === undefined) return "";
  return option.generationKey || `${option.profileKind === "canonical" ? "canonical" : "legacy"}:generation:${option.generationId}`;
}

export function catalogTrimKey(option: CatalogOption): string {
  if (option.trimId === undefined) return "";
  return option.trimKey || `${option.profileKind === "canonical" ? "canonical" : "legacy"}:trim:${option.trimId}`;
}

export function getBrowseGenerationOptions(options: CatalogOption[]) {
  return [...new Map(options.filter((option): option is CatalogOption & { generationId: number } =>
    option.generationId !== undefined && Boolean(option.generation.trim())).map((option) => [
    catalogGenerationKey(option),
    {
      id: option.generationId,
      ...(option.profileKind === "canonical" ? { key: catalogGenerationKey(option) } : {}),
      name: option.generation,
    },
  ])).values()];
}

export function isGenerationFilterEnabled(options: {
  catalogReady: boolean;
  modelSelected: boolean;
  generationCount?: number;
}): boolean {
  return options.catalogReady && options.modelSelected && options.generationCount !== 0;
}

export type BrowseSuggestion =
  | { kind: "manufacturer"; label: string; makeSlug: string }
  | { kind: "model"; label: string; makeSlug: string; modelId: number; modelKey?: string; profileKind?: string };

export function getGenerationFilterHint(options: {
  catalogReady: boolean;
  modelSelected: boolean;
  generationCount: number;
  hasUnmappedYears?: boolean;
  hasOverlappingYears?: boolean;
}): string | undefined {
  if (!options.catalogReady) return undefined;
  if (!options.modelSelected) return "Choose a model to view its generations.";
  if (options.generationCount === 0) return "Generation grouping has not yet been researched for these model-year profiles.";
  if (options.hasUnmappedYears) return "Grouping is partially researched. Unmapped years remain available under All generations / refreshes.";
  if (options.hasOverlappingYears) return "Some transition years appear in more than one group. A model year alone does not identify the exact version.";
  if (options.generationCount === 1) return "Only one generation is currently represented in this catalog.";
  return undefined;
}

export type ReportSectionId = "overview" | "reliability" | "external-owner-patterns" | "costs" | "reports";

export function getActiveReportSection(
  positions: Array<{ id: ReportSectionId; top: number }>,
  activationLine: number,
  atBottom = false,
): ReportSectionId {
  if (atBottom) return "reports";
  // Native scroll positions are integer-rounded while section boxes can be
  // fractional CSS pixels. Treat an aligned section within one pixel as reached.
  return positions.filter((section) => section.top <= activationLine + 1).at(-1)?.id ?? "overview";
}

export function parseBrowseFilters(search: string): BrowseFilters {
  const params = new URLSearchParams(search);
  const rawSort = params.get("sort");
  return {
    q: params.get("q") || "",
    make: params.get("make") || "",
    model: params.get("model") || "",
    trim: params.get("trim") || "",
    sort: rawSort === "reliability" || rawSort === "ownership-cost" ? rawSort : "popular",
    // Preserve invalid values as active filters so a stale or malformed deep link
    // cannot silently turn into an unfiltered catalog request.
    year: params.get("year") || "",
    modelId: params.get("modelId") || "",
    generationId: params.get("generationId") || "",
    trimId: params.get("trimId") || "",
    modelKey: params.get("modelKey") || "",
    generationKey: params.get("generationKey") || "",
    trimKey: params.get("trimKey") || "",
  };
}

export function clearBrowseFilters(): BrowseFilters {
  return { q: "", make: "", model: "", trim: "", sort: "popular", year: "", modelId: "", generationId: "", trimId: "", modelKey: "", generationKey: "", trimKey: "" };
}

export function buildBrowseLocation(filters: BrowseFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.make) params.set("make", filters.make);
  if (filters.modelKey) params.set("modelKey", filters.modelKey);
  else if (filters.modelId) params.set("modelId", filters.modelId);
  else if (filters.model) params.set("model", filters.model);
  if (filters.generationKey) params.set("generationKey", filters.generationKey);
  else if (filters.generationId) params.set("generationId", filters.generationId);
  if (filters.year) params.set("year", filters.year);
  if (filters.trimKey) params.set("trimKey", filters.trimKey);
  else if (filters.trimId) params.set("trimId", filters.trimId);
  else if (filters.trim) params.set("trim", filters.trim);
  if (filters.sort !== "popular") params.set("sort", filters.sort);
  return `/browse${params.size ? `?${params.toString()}` : ""}`;
}

export function buildVehicleListParams(filters: BrowseFilters) {
  return {
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
    ...(filters.make ? { makeSlug: filters.make } : {}),
    ...(filters.modelKey ? { modelKey: filters.modelKey } : filters.modelId ? { modelId: Number(filters.modelId) } : filters.model ? { model: filters.model } : {}),
    ...(filters.generationKey ? { generationKey: filters.generationKey } : filters.generationId ? { generationId: Number(filters.generationId) } : {}),
    ...(filters.year ? { year: Number(filters.year) } : {}),
    ...(filters.trimKey ? { trimKey: filters.trimKey } : filters.trimId ? { trimId: Number(filters.trimId) } : filters.trim ? { trim: filters.trim } : {}),
    sort: filters.sort,
    limit: 60,
  };
}

export function hasActiveBrowseFilters(filters: BrowseFilters): boolean {
  return Boolean(
    filters.q.trim() || filters.make || filters.model || filters.trim || filters.year ||
    filters.modelId || filters.generationId || filters.trimId || filters.modelKey || filters.generationKey || filters.trimKey || filters.sort !== "popular",
  );
}

export function hasInvalidBrowseSelection(filters: BrowseFilters, options: CatalogOption[]): boolean {
  const selectedMake = options.filter((option) => !filters.make || option.makeSlug === filters.make);
  if (filters.make && !selectedMake.length) return true;
  if (filters.modelId && !selectedMake.some((option) => option.profileKind !== "canonical" && String(option.modelId) === filters.modelId)) return true;
  if (filters.modelKey && !selectedMake.some((option) => catalogModelKey(option) === filters.modelKey)) return true;
  const selectedModel = selectedMake.filter((option) =>
    (!filters.modelId || option.profileKind !== "canonical" && String(option.modelId) === filters.modelId) &&
    (!filters.modelKey || catalogModelKey(option) === filters.modelKey));
  if (filters.generationId && !selectedModel.some((option) => option.profileKind !== "canonical" && String(option.generationId) === filters.generationId)) return true;
  if (filters.generationKey && !selectedModel.some((option) => catalogGenerationKey(option) === filters.generationKey)) return true;
  const selectedGeneration = selectedModel.filter((option) =>
    (!filters.generationId || option.profileKind !== "canonical" && String(option.generationId) === filters.generationId) &&
    (!filters.generationKey || catalogGenerationKey(option) === filters.generationKey));
  if (filters.year && !selectedGeneration.some((option) => String(option.year) === filters.year)) return true;
  const selectedYear = selectedGeneration.filter((option) => !filters.year || String(option.year) === filters.year);
  return Boolean(
    (filters.trimId && !selectedYear.some((option) => option.profileKind !== "canonical" && String(option.trimId) === filters.trimId)) ||
    (filters.trimKey && !selectedYear.some((option) => catalogTrimKey(option) === filters.trimKey)),
  );
}

export function economyUnit(fuelType: string): "MPGe" | "mpg" {
  const normalizedFuelType = fuelType.trim().toLocaleLowerCase().replace(/[-_]/g, " ");
  return ["electric", "battery electric", "all electric", "bev"].includes(normalizedFuelType) ? "MPGe" : "mpg";
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** Resolve old readable model/trim URLs without broadening an invalid hierarchy filter. */
export function resolveBrowseFilters(filters: BrowseFilters, options: CatalogOption[]): BrowseFilters {
  let next: BrowseFilters = { ...filters };
  if (!["popular", "reliability", "ownership-cost"].includes(next.sort)) next.sort = "popular";

  const underMake = options.filter((option) => !next.make || option.makeSlug === next.make);

  if (!next.modelId && next.model) {
    const matchingModels = unique(underMake.filter((option) =>
      (option.profileKind !== "canonical" && option.model.toLocaleLowerCase() === next.model.toLocaleLowerCase()) ||
      option.modelId.toString() === next.model,
    ).map((option) => catalogModelKey(option)));
    if (matchingModels.length === 1) {
      const selected = underMake.find((option) => catalogModelKey(option) === matchingModels[0]);
      next = selected?.profileKind === "canonical"
        ? { ...next, modelKey: matchingModels[0], modelId: "", model: "" }
        : { ...next, modelId: String(selected?.modelId ?? ""), modelKey: "", model: "" };
    }
  }
  const underModel = underMake.filter((option) =>
    (!next.modelId || String(option.modelId) === next.modelId) &&
    (!next.modelKey || catalogModelKey(option) === next.modelKey));

  const underGeneration = underModel.filter((option) =>
    (!next.generationId || String(option.generationId) === next.generationId) &&
    (!next.generationKey || catalogGenerationKey(option) === next.generationKey),
  );

  const underYear = underGeneration.filter((option) => !next.year || String(option.year) === next.year);

  if (!next.trimId && next.trim) {
    const matchingTrims = unique(underYear.filter((option) =>
      option.profileKind !== "canonical" && option.trim.toLocaleLowerCase() === next.trim.toLocaleLowerCase(),
    ).map((option) => catalogTrimKey(option)));
    if (matchingTrims.length === 1) {
      const selected = underYear.find((option) => catalogTrimKey(option) === matchingTrims[0]);
      next = selected?.profileKind === "canonical"
        ? { ...next, trimKey: matchingTrims[0], trimId: "", trim: "" }
        : { ...next, trimId: String(selected?.trimId ?? ""), trimKey: "", trim: "" };
    }
  }
  return next;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[-‐‑–]/g, "").replace(/\s+/g, " ");
}

export function getBrowseSuggestions(query: string, options: CatalogOption[], limit = 8): BrowseSuggestion[] {
  const term = normalized(query);
  if (!term) return [];
  const makes = new Map<string, BrowseSuggestion>();
  const models = new Map<string, BrowseSuggestion>();
  for (const option of options) {
    makes.set(option.makeSlug, {
      kind: "manufacturer", label: option.make, makeSlug: option.makeSlug,
    });
    const modelKey = catalogModelKey(option);
    // Prefer the year catalog over a recent trim-only subset for the same
    // name. This is discovery only; configuration identities stay separate.
    const nameKey = `${option.makeSlug}:${normalized(option.model)}`;
    if (models.has(nameKey) && option.identityLevel !== "model_year") continue;
    models.set(nameKey, {
      kind: "model", label: `${option.make} ${option.model}`,
      makeSlug: option.makeSlug, modelId: option.modelId, modelKey,
      profileKind: option.profileKind,
    });
  }
  const candidates = [...makes.values(), ...models.values()]
    .map((suggestion) => {
      const searchable = normalized(suggestion.label);
      const words = searchable.split(" ");
      const queryWords = term.split(" ");
      const rank = searchable === term ? 0 :
        searchable.startsWith(term) ? 1 :
        queryWords.every((word) => words.some((candidate) => candidate.startsWith(word))) ? 2 :
        searchable.includes(term) ? 3 : -1;
      return { suggestion, rank };
    })
    .filter((candidate) => candidate.rank >= 0)
    .sort((left, right) =>
      left.rank - right.rank ||
      left.suggestion.label.localeCompare(right.suggestion.label) ||
      left.suggestion.kind.localeCompare(right.suggestion.kind),
    );
  return candidates.slice(0, limit).map(({ suggestion }) => suggestion);
}

export function optionalVehicleQueryOptions(
  vehicleId: string,
  queryKey: readonly unknown[],
) {
  return { queryKey, enabled: Boolean(vehicleId) };
}

export type OwnershipInputs = {
  price: number;
  down: number;
  apr: number;
  term: number;
  miles: number;
  mpg: number;
  gas: number;
  /** Internal calculation unit: dollars per kWh. The editable draft uses cents. */
  electricity: number;
  insurance: number;
  maintenance: number;
  repairs: number;
  vehicleIsElectric: boolean;
};

/** Editable drafts use displayed units; electricity is stored in cents per kWh. */
export type OwnershipDraft = {
  [Field in Exclude<keyof OwnershipInputs, "term" | "vehicleIsElectric">]: string;
};

/** Convert the shopper-facing ¢/kWh input to the $/kWh used by calculations. */
export function centsPerKwhToDollars(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value / 100 : 0;
}

export type MonthlyOwnershipCost = {
  label: string;
  monthlyAmount: number | null;
};

/** Sum only calculations that are actually available; zero is an included result. */
export function summarizeMonthlyOwnershipCosts(costs: readonly MonthlyOwnershipCost[]) {
  const included = costs.filter(({ monthlyAmount }) =>
    monthlyAmount !== null && Number.isFinite(monthlyAmount) && monthlyAmount >= 0,
  );
  const excluded = costs.filter(({ monthlyAmount }) =>
    monthlyAmount === null || !Number.isFinite(monthlyAmount) || monthlyAmount < 0,
  );
  return {
    total: included.length
      ? included.reduce((sum, cost) => sum + cost.monthlyAmount!, 0)
      : null,
    includedLabels: included.map(({ label }) => label),
    excludedLabels: excluded.map(({ label }) => label),
    isPartial: included.length > 0 && excluded.length > 0,
    isComplete: included.length > 0 && excluded.length === 0,
  };
}

export function parseCalculatorNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function normalizeCalculatorNumber(value: string): string {
  if (value.trim() === "") return "";
  return String(parseCalculatorNumber(value));
}

// Convert only at the calculation boundary; never replace the editable draft.
export function readOwnershipDraft(draft: OwnershipDraft) {
  return {
    price: parseCalculatorNumber(draft.price),
    down: parseCalculatorNumber(draft.down),
    apr: parseCalculatorNumber(draft.apr),
    miles: parseCalculatorNumber(draft.miles),
    mpg: parseCalculatorNumber(draft.mpg),
    gas: parseCalculatorNumber(draft.gas),
    electricity: centsPerKwhToDollars(parseCalculatorNumber(draft.electricity)),
    insurance: parseCalculatorNumber(draft.insurance),
    maintenance: parseCalculatorNumber(draft.maintenance),
    repairs: parseCalculatorNumber(draft.repairs),
  };
}

export function calculateOwnershipEstimate(inputs: OwnershipInputs) {
  const loan = Math.max(0, inputs.price - inputs.down);
  const rate = inputs.apr / 100 / 12;
  const payment =
    inputs.term > 0
      ? rate === 0
        ? loan / inputs.term
        : (loan * rate * Math.pow(1 + rate, inputs.term)) /
          (Math.pow(1 + rate, inputs.term) - 1)
      : 0;
  const fuel =
    inputs.mpg > 0
      ? (inputs.miles / inputs.mpg) *
        (inputs.vehicleIsElectric ? 33.7 * inputs.electricity : inputs.gas) /
        12
      : 0;
  const monthly =
    payment + fuel + inputs.insurance + inputs.maintenance + inputs.repairs;
  return { loan, payment, fuel, monthly, annual: monthly * 12 };
}

export function parseComparisonIds(search: string): string[] {
  const raw = new URLSearchParams(search).get("ids") || "";
  return raw.split(",").filter(Boolean).slice(0, 4);
}

export function addComparisonId(ids: string[], id: string): string[] {
  return ids.includes(id) || ids.length >= 4 ? ids : [...ids, id];
}

export function removeComparisonId(ids: string[], id: string): string[] {
  return ids.filter((existingId) => existingId !== id);
}

export function buildComparisonLocation(ids: string[]): string {
  return `/compare${ids.length ? `?ids=${ids.join(",")}` : ""}`;
}