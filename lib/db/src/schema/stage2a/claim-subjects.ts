import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { researchClaimsTable } from "./claims";
import {
  consumerBrandsTable,
  marketsTable,
  organizationsTable,
  productionSitesTable,
  vehicleConfigurationsTable,
  vehicleGenerationsTable,
  vehicleModelYearsTable,
  vehicleModelsTable,
  vehicleTrimsTable,
  powertrainComponentRevisionsTable,
} from "./identity";

// Direct owner_experience claims must target vehicleConfigurationId exactly.
// Broader subjects are valid for other claim kinds (e.g. external owner patterns),
// but never establish firsthand ownership of every configuration below them.
export const claimSubjectsTable = pgTable(
  "claim_subjects",
  {
    id: serial("id").primaryKey(),
    researchClaimId: integer("research_claim_id")
      .notNull()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    organizationId: integer("organization_id").references(() => organizationsTable.id, {
      onDelete: "restrict",
    }),
    consumerBrandId: integer("consumer_brand_id").references(() => consumerBrandsTable.id, {
      onDelete: "restrict",
    }),
    vehicleModelId: integer("vehicle_model_id").references(() => vehicleModelsTable.id, {
      onDelete: "restrict",
    }),
    vehicleGenerationId: integer("vehicle_generation_id").references(
      () => vehicleGenerationsTable.id,
      { onDelete: "restrict" },
    ),
    vehicleModelYearId: integer("vehicle_model_year_id").references(
      () => vehicleModelYearsTable.id,
      { onDelete: "restrict" },
    ),
    vehicleTrimId: integer("vehicle_trim_id").references(() => vehicleTrimsTable.id, {
      onDelete: "restrict",
    }),
    vehicleConfigurationId: integer("vehicle_configuration_id").references(
      () => vehicleConfigurationsTable.id,
      { onDelete: "restrict" },
    ),
    componentRevisionId: integer("component_revision_id").references(
      () => powertrainComponentRevisionsTable.id,
      { onDelete: "restrict" },
    ),
    marketId: integer("market_id").references(() => marketsTable.id, { onDelete: "restrict" }),
    productionSiteId: integer("production_site_id").references(() => productionSitesTable.id, {
      onDelete: "restrict",
    }),
  },
  (table) => [
    check(
      "claim_subjects_exactly_one_subject_check",
      sql`num_nonnulls(${table.organizationId}, ${table.consumerBrandId}, ${table.vehicleModelId}, ${table.vehicleGenerationId}, ${table.vehicleModelYearId}, ${table.vehicleTrimId}, ${table.vehicleConfigurationId}, ${table.componentRevisionId}, ${table.marketId}, ${table.productionSiteId}) = 1`,
    ),
    uniqueIndex("claim_subjects_claim_organization_idx").on(table.researchClaimId, table.organizationId),
    uniqueIndex("claim_subjects_claim_brand_idx").on(table.researchClaimId, table.consumerBrandId),
    uniqueIndex("claim_subjects_claim_model_idx").on(table.researchClaimId, table.vehicleModelId),
    uniqueIndex("claim_subjects_claim_generation_idx").on(
      table.researchClaimId,
      table.vehicleGenerationId,
    ),
    uniqueIndex("claim_subjects_claim_model_year_idx").on(
      table.researchClaimId,
      table.vehicleModelYearId,
    ),
    uniqueIndex("claim_subjects_claim_trim_idx").on(table.researchClaimId, table.vehicleTrimId),
    uniqueIndex("claim_subjects_claim_configuration_idx").on(
      table.researchClaimId,
      table.vehicleConfigurationId,
    ),
    uniqueIndex("claim_subjects_claim_component_revision_idx").on(
      table.researchClaimId,
      table.componentRevisionId,
    ),
    uniqueIndex("claim_subjects_claim_market_idx").on(table.researchClaimId, table.marketId),
    uniqueIndex("claim_subjects_claim_production_site_idx").on(
      table.researchClaimId,
      table.productionSiteId,
    ),
    index("claim_subjects_claim_idx").on(table.researchClaimId),
    index("claim_subjects_organization_idx").on(table.organizationId),
    index("claim_subjects_brand_idx").on(table.consumerBrandId),
    index("claim_subjects_model_idx").on(table.vehicleModelId),
    index("claim_subjects_generation_idx").on(table.vehicleGenerationId),
    index("claim_subjects_model_year_idx").on(table.vehicleModelYearId),
    index("claim_subjects_trim_idx").on(table.vehicleTrimId),
    index("claim_subjects_configuration_idx").on(table.vehicleConfigurationId),
    index("claim_subjects_component_revision_idx").on(table.componentRevisionId),
    index("claim_subjects_market_idx").on(table.marketId),
    index("claim_subjects_production_site_idx").on(table.productionSiteId),
  ],
);