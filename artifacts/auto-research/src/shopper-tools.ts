export type BrowseSort = "popular" | "reliability" | "ownership-cost";

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
};

export type CatalogOption = {
  profileId: string;
  makeId: number;
  make: string;
  makeSlug: string;
  modelId: number;
  model: string;
  generationId: number;
  generation: string;
  modelYearId: number;
  year: number;
  trimId: number;
  trim: string;
};

export type BrowseSuggestion = {
  kind: "manufacturer" | "model" | "vehicle";
  label: string;
  makeSlug: string;
  modelId?: number;
  profileId?: string;
};

export type ReportSectionId = "overview" | "reliability" | "costs" | "reports";

export function getActiveReportSection(
  positions: Array<{ id: ReportSectionId; top: number }>,
  activationLine: number,
  atBottom = false,
): ReportSectionId {
  if (atBottom) return "reports";
  return positions.filter((section) => section.top <= activationLine).at(-1)?.id ?? "overview";
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
  };
}

export function clearBrowseFilters(): BrowseFilters {
  return { q: "", make: "", model: "", trim: "", sort: "popular", year: "", modelId: "", generationId: "", trimId: "" };
}

export function buildBrowseLocation(filters: BrowseFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.make) params.set("make", filters.make);
  if (filters.modelId) params.set("modelId", filters.modelId);
  else if (filters.model) params.set("model", filters.model);
  if (filters.generationId) params.set("generationId", filters.generationId);
  if (filters.year) params.set("year", filters.year);
  if (filters.trimId) params.set("trimId", filters.trimId);
  else if (filters.trim) params.set("trim", filters.trim);
  if (filters.sort !== "popular") params.set("sort", filters.sort);
  return `/browse${params.size ? `?${params.toString()}` : ""}`;
}

export function buildVehicleListParams(filters: BrowseFilters) {
  return {
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
    ...(filters.make ? { makeSlug: filters.make } : {}),
    ...(filters.modelId ? { modelId: Number(filters.modelId) } : filters.model ? { model: filters.model } : {}),
    ...(filters.generationId ? { generationId: Number(filters.generationId) } : {}),
    ...(filters.year ? { year: Number(filters.year) } : {}),
    ...(filters.trimId ? { trimId: Number(filters.trimId) } : filters.trim ? { trim: filters.trim } : {}),
    sort: filters.sort,
    limit: 60,
  };
}

export function hasActiveBrowseFilters(filters: BrowseFilters): boolean {
  return Boolean(
    filters.q.trim() || filters.make || filters.model || filters.trim || filters.year ||
    filters.modelId || filters.generationId || filters.trimId || filters.sort !== "popular",
  );
}

export function hasInvalidBrowseSelection(filters: BrowseFilters, options: CatalogOption[]): boolean {
  const selectedMake = options.filter((option) => !filters.make || option.makeSlug === filters.make);
  if (filters.make && !selectedMake.length) return true;
  if (filters.modelId && !selectedMake.some((option) => String(option.modelId) === filters.modelId)) return true;
  const selectedModel = selectedMake.filter((option) => !filters.modelId || String(option.modelId) === filters.modelId);
  if (filters.generationId && !selectedModel.some((option) => String(option.generationId) === filters.generationId)) return true;
  const selectedGeneration = selectedModel.filter((option) => !filters.generationId || String(option.generationId) === filters.generationId);
  if (filters.year && !selectedGeneration.some((option) => String(option.year) === filters.year)) return true;
  const selectedYear = selectedGeneration.filter((option) => !filters.year || String(option.year) === filters.year);
  return Boolean(filters.trimId && !selectedYear.some((option) => String(option.trimId) === filters.trimId));
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
      option.model.toLocaleLowerCase() === next.model.toLocaleLowerCase() ||
      option.modelId.toString() === next.model,
    ).map((option) => String(option.modelId)));
    if (matchingModels.length === 1) {
      next = { ...next, modelId: matchingModels[0], model: "" };
    }
  }
  const underModel = underMake.filter((option) => !next.modelId || String(option.modelId) === next.modelId);

  const underGeneration = underModel.filter((option) =>
    !next.generationId || String(option.generationId) === next.generationId,
  );

  const underYear = underGeneration.filter((option) => !next.year || String(option.year) === next.year);

  if (!next.trimId && next.trim) {
    const matchingTrims = unique(underYear.filter((option) =>
      option.trim.toLocaleLowerCase() === next.trim.toLocaleLowerCase(),
    ).map((option) => String(option.trimId)));
    if (matchingTrims.length === 1) next = { ...next, trimId: matchingTrims[0], trim: "" };
  }
  return next;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function getBrowseSuggestions(query: string, options: CatalogOption[], limit = 8): BrowseSuggestion[] {
  const term = normalized(query);
  if (!term) return [];
  const makes = new Map<string, BrowseSuggestion>();
  const models = new Map<string, BrowseSuggestion>();
  const vehicles = new Map<string, BrowseSuggestion>();
  for (const option of options) {
    makes.set(option.makeSlug, {
      kind: "manufacturer", label: `${option.make} — Manufacturer`, makeSlug: option.makeSlug,
    });
    models.set(`${option.makeSlug}:${option.modelId}`, {
      kind: "model", label: `${option.make} ${option.model} — Model`,
      makeSlug: option.makeSlug, modelId: option.modelId,
    });
    vehicles.set(option.profileId, {
      kind: "vehicle", label: `${option.year} ${option.make} ${option.model} ${option.trim} — Vehicle/configuration`,
      makeSlug: option.makeSlug, modelId: option.modelId, profileId: option.profileId,
    });
  }
  const candidates = [...makes.values(), ...models.values(), ...vehicles.values()]
    .map((suggestion) => {
      const searchable = normalized(suggestion.label.replace(/\s+—\s+.*/, ""));
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
  electricity: number;
  insurance: number;
  maintenance: number;
  repairs: number;
  vehicleIsElectric: boolean;
};

export type OwnershipDraft = {
  [Field in Exclude<keyof OwnershipInputs, "term" | "vehicleIsElectric">]: string;
};

export function parseCalculatorNumber(value: string): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function normalizeCalculatorNumber(value: string): string {
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
    electricity: parseCalculatorNumber(draft.electricity),
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