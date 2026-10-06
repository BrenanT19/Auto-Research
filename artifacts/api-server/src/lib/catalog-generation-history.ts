import browseEraSnapshot from "../data/catalog-browse-eras.json";
import {
  getCatalogBrowseErasForModel,
  type BrowseEra,
} from "./catalog-browse-eras";
import { loadModelYearVehicles } from "./model-year-catalog";

type ModelYearVehicle = ReturnType<typeof loadModelYearVehicles>[number];
type HistoryStatus = "partial" | "not_yet_researched";

export interface GenerationHistoryModelSummary {
  make: string;
  makeSlug: string;
  model: string;
  modelSlug: string;
  firstCatalogYear: number;
  lastCatalogYear: number;
  modelYearCount: number;
  generationCount: number;
  refreshCount: number;
  historyStatus: HistoryStatus;
}

export interface GenerationHistoryDetail {
  model: GenerationHistoryModelSummary;
  generations: Array<{ event: BrowseEra; refreshes: BrowseEra[] }>;
  unassignedRefreshes: Array<{
    event: BrowseEra;
    reason: "overlaps_multiple_generations" | "no_generation_range";
  }>;
  rightsUrl: string;
}

const modelKey = (makeSlug: string, modelSlug: string) => `${makeSlug}\0${modelSlug}`;

function mostCommonName(names: Map<string, number>): string {
  return [...names.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "";
}

function buildModelGroups(vehicles: ModelYearVehicle[]) {
  const groups = new Map<string, {
    makeSlug: string;
    modelSlug: string;
    makeNames: Map<string, number>;
    modelNames: Map<string, number>;
    years: Set<number>;
    sourceIdentities: Map<string, { make: string; model: string }>;
  }>();

  for (const vehicle of vehicles) {
    const key = modelKey(vehicle.makeSlug, vehicle.modelSlug);
    let group = groups.get(key);
    if (!group) {
      group = {
        makeSlug: vehicle.makeSlug,
        modelSlug: vehicle.modelSlug,
        makeNames: new Map(),
        modelNames: new Map(),
        years: new Set(),
        sourceIdentities: new Map(),
      };
      groups.set(key, group);
    }
    group.makeNames.set(vehicle.make, (group.makeNames.get(vehicle.make) ?? 0) + 1);
    group.modelNames.set(vehicle.model, (group.modelNames.get(vehicle.model) ?? 0) + 1);
    group.years.add(vehicle.year);
    group.sourceIdentities.set(`${vehicle.make}\0${vehicle.model}`, {
      make: vehicle.make,
      model: vehicle.model,
    });
  }

  return [...groups.values()].map(group => {
    const erasById = new Map<number, BrowseEra>();
    for (const identity of group.sourceIdentities.values()) {
      for (const era of getCatalogBrowseErasForModel(identity)) erasById.set(era.id, era);
    }
    const eras = [...erasById.values()].sort((a, b) =>
      a.startYear - b.startYear || a.endYear - b.endYear || a.name.localeCompare(b.name));
    const rawGenerations = eras.filter(era => era.kind === "generation");
    const refreshes = eras.filter(era => era.kind === "refresh");
    const generations = rawGenerations.map(event => ({ event, refreshes: [] as BrowseEra[] }));
    const unassignedRefreshes: GenerationHistoryDetail["unassignedRefreshes"] = [];

    for (const refresh of refreshes) {
      const candidates = generations.filter(({ event }) =>
        refresh.startYear <= event.endYear && refresh.endYear >= event.startYear);
      if (candidates.length === 1) {
        candidates[0].refreshes.push(refresh);
      } else {
        unassignedRefreshes.push({
          event: refresh,
          reason: candidates.length > 1 ? "overlaps_multiple_generations" : "no_generation_range",
        });
      }
    }

    const years = [...group.years].sort((a, b) => a - b);
    const summary: GenerationHistoryModelSummary = {
      make: mostCommonName(group.makeNames),
      makeSlug: group.makeSlug,
      model: mostCommonName(group.modelNames),
      modelSlug: group.modelSlug,
      firstCatalogYear: years[0],
      lastCatalogYear: years.at(-1)!,
      modelYearCount: years.length,
      generationCount: rawGenerations.length,
      refreshCount: refreshes.length,
      historyStatus: eras.length ? "partial" : "not_yet_researched",
    };

    return {
      summary,
      detail: {
        model: summary,
        generations,
        unassignedRefreshes,
        rightsUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      } satisfies GenerationHistoryDetail,
    };
  });
}

export function getGenerationHistoryIndex() {
  const groups = buildModelGroups(loadModelYearVehicles()).sort((a, b) =>
    a.summary.make.localeCompare(b.summary.make) || a.summary.model.localeCompare(b.summary.model));
  const models = groups.map(group => group.summary);
  const modelsWithHistory = models.filter(model => model.historyStatus === "partial").length;
  return {
    reviewedAt: browseEraSnapshot.reviewedAt,
    publicationStatus: "development_preview_only" as const,
    rightsUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    coverage: {
      totalModels: models.length,
      modelsWithHistory,
      modelsWithoutHistory: models.length - modelsWithHistory,
      generationCount: models.reduce((total, model) => total + model.generationCount, 0),
      refreshCount: models.reduce((total, model) => total + model.refreshCount, 0),
      completeHistoricalCoverage: false as const,
      note: "This is a partial research index. Models or years without a sourced entry are not yet researched; they are not evidence that no generation or refresh existed.",
    },
    models,
  };
}

export function getGenerationHistory(makeSlug: string, modelSlug: string): GenerationHistoryDetail | undefined {
  return buildModelGroups(loadModelYearVehicles())
    .find(group => group.summary.makeSlug === makeSlug && group.summary.modelSlug === modelSlug)
    ?.detail;
}
