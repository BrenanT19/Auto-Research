export type BrowseFilters = {
  q: string;
  make: string;
  model: string;
  trim: string;
  sort: string;
  year: string;
};

export function parseBrowseFilters(search: string): BrowseFilters {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q") || "",
    make: params.get("make") || "",
    model: params.get("model") || "",
    trim: params.get("trim") || "",
    sort: params.get("sort") || "popular",
    year: params.get("year") || "",
  };
}

export function clearBrowseFilters(): BrowseFilters {
  return { q: "", make: "", model: "", trim: "", sort: "popular", year: "" };
}

export function buildBrowseLocation(filters: BrowseFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.make) params.set("make", filters.make);
  if (filters.model) params.set("model", filters.model);
  if (filters.trim) params.set("trim", filters.trim);
  if (filters.year) params.set("year", filters.year);
  if (filters.sort !== "popular") params.set("sort", filters.sort);
  return `/browse${params.size ? `?${params.toString()}` : ""}`;
}

export function buildVehicleListParams(filters: BrowseFilters) {
  return {
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
    ...(filters.make ? { makeSlug: filters.make } : {}),
    ...(filters.model ? { model: filters.model } : {}),
    ...(filters.year ? { year: Number(filters.year) } : {}),
    ...(filters.trim ? { trim: filters.trim } : {}),
    sort: filters.sort as "popular" | "reliability" | "ownership-cost",
    limit: 60,
  };
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