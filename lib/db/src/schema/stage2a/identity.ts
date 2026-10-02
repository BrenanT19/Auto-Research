import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  type AnyPgColumn,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { researchClaimsTable } from "./claims";
import { trimsTable } from "../vehicles";

const nonEmpty = (column: AnyPgColumn) => sql`length(btrim(${column})) > 0`;
const normalizedSlug = (column: AnyPgColumn) =>
  sql`${column} = lower(btrim(${column})) AND ${column} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`;
const validDateRange = (from: AnyPgColumn, to: AnyPgColumn) =>
  sql`${from} IS NULL OR ${to} IS NULL OR ${to} >= ${from}`;

export const organizationsTable = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    legalName: text("legal_name").notNull(),
    jurisdictionCountryCode: text("jurisdiction_country_code").notNull(),
    jurisdictionRegionCode: text("jurisdiction_region_code"),
    registryId: text("registry_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("organizations_name_nonempty_check", nonEmpty(table.legalName)),
    check(
      "organizations_jurisdiction_codes_check",
      sql`${table.jurisdictionCountryCode} ~ '^[A-Z]{2}$' AND (${table.jurisdictionRegionCode} IS NULL OR ${table.jurisdictionRegionCode} ~ '^[A-Z0-9-]{1,12}$')`,
    ),
    uniqueIndex("organizations_registry_identity_idx")
      .on(table.jurisdictionCountryCode, table.jurisdictionRegionCode, table.registryId)
      .where(sql`${table.registryId} IS NOT NULL`),
  ],
);

export const organizationRelationshipsTable = pgTable(
  "organization_relationships",
  {
    id: serial("id").primaryKey(),
    parentOrganizationId: integer("parent_organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "restrict" }),
    childOrganizationId: integer("child_organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "restrict" }),
    relationshipType: text("relationship_type").notNull(),
    validFrom: date("valid_from", { mode: "string" }),
    validTo: date("valid_to", { mode: "string" }),
    supportingClaimId: integer("supporting_claim_id").references(
      () => researchClaimsTable.id,
      { onDelete: "restrict" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "organization_relationships_type_check",
      sql`${table.relationshipType} IN ('parent_of', 'controls', 'subsidiary_of', 'successor_of', 'other_reviewed')`,
    ),
    check(
      "organization_relationships_not_self_check",
      sql`${table.parentOrganizationId} <> ${table.childOrganizationId}`,
    ),
    check("organization_relationships_dates_check", validDateRange(table.validFrom, table.validTo)),
    index("organization_relationships_parent_effective_idx").on(table.parentOrganizationId, table.validFrom, table.validTo),
    index("organization_relationships_child_effective_idx").on(table.childOrganizationId, table.validFrom, table.validTo),
    index("organization_relationships_claim_idx").on(table.supportingClaimId),
  ],
);

export const consumerBrandsTable = pgTable(
  "consumer_brands",
  {
    id: serial("id").primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    slug: text("slug").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull().default("watchlist"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("consumer_brands_name_nonempty_check", nonEmpty(table.canonicalName)),
    check("consumer_brands_slug_normalized_check", normalizedSlug(table.slug)),
    check(
      "consumer_brands_lifecycle_status_check",
      sql`${table.lifecycleStatus} IN ('active', 'discontinued', 'watchlist', 'retired')`,
    ),
    uniqueIndex("consumer_brands_slug_idx").on(table.slug),
  ],
);

export const brandOrganizationRelationshipsTable = pgTable(
  "brand_organization_relationships",
  {
    id: serial("id").primaryKey(),
    consumerBrandId: integer("consumer_brand_id")
      .notNull()
      .references(() => consumerBrandsTable.id, { onDelete: "restrict" }),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "restrict" }),
    relationshipType: text("relationship_type").notNull(),
    validFrom: date("valid_from", { mode: "string" }),
    validTo: date("valid_to", { mode: "string" }),
    supportingClaimId: integer("supporting_claim_id").references(
      () => researchClaimsTable.id,
      { onDelete: "restrict" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "brand_organization_relationships_type_check",
      sql`${table.relationshipType} IN ('created_by', 'owned_by', 'controlled_by', 'licensed_to', 'operated_by', 'manufactured_by', 'other_reviewed')`,
    ),
    check(
      "brand_organization_relationships_dates_check",
      validDateRange(table.validFrom, table.validTo),
    ),
    index("brand_organization_relationships_brand_effective_idx").on(
      table.consumerBrandId,
      table.validFrom,
      table.validTo,
    ),
    index("brand_organization_relationships_org_effective_idx").on(
      table.organizationId,
      table.validFrom,
      table.validTo,
    ),
    index("brand_organization_relationships_claim_idx").on(table.supportingClaimId),
  ],
);

export const brandOriginClaimDetailsTable = pgTable(
  "brand_origin_claim_details",
  {
    researchClaimId: integer("research_claim_id")
      .primaryKey()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    consumerBrandId: integer("consumer_brand_id")
      .notNull()
      .references(() => consumerBrandsTable.id, { onDelete: "restrict" }),
    countryCode: text("country_code").notNull(),
    originBasis: text("origin_basis").notNull(),
    explanation: text("explanation"),
  },
  (table) => [
    check("brand_origin_country_code_check", sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
    check(
      "brand_origin_basis_check",
      sql`${table.originBasis} IN ('founded_in', 'historical_identity', 'other_reviewed_basis')`,
    ),
    index("brand_origin_claim_details_brand_idx").on(table.consumerBrandId),
  ],
);

export const marketsTable = pgTable(
  "markets",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    marketType: text("market_type").notNull(),
    parentMarketId: integer("parent_market_id").references(
      (): AnyPgColumn => marketsTable.id,
      { onDelete: "restrict" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("markets_code_nonempty_check", nonEmpty(table.code)),
    check("markets_name_nonempty_check", nonEmpty(table.name)),
    check(
      "markets_market_type_check",
      sql`${table.marketType} IN ('country', 'subdivision', 'custom_jurisdiction')`,
    ),
    check("markets_code_format_check", sql`${table.code} = upper(btrim(${table.code})) AND ${table.code} ~ '^[A-Z0-9-]+$'`),
    check("markets_not_self_parent_check", sql`${table.parentMarketId} IS NULL OR ${table.parentMarketId} <> ${table.id}`),
    uniqueIndex("markets_code_idx").on(table.code),
    index("markets_parent_idx").on(table.parentMarketId),
  ],
);

export const vehicleModelsTable = pgTable(
  "vehicle_models",
  {
    id: serial("id").primaryKey(),
    consumerBrandId: integer("consumer_brand_id")
      .notNull()
      .references(() => consumerBrandsTable.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    lifecycleStatus: text("lifecycle_status").notNull().default("watchlist"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("vehicle_models_name_nonempty_check", nonEmpty(table.name)),
    check("vehicle_models_slug_normalized_check", normalizedSlug(table.slug)),
    check(
      "vehicle_models_lifecycle_status_check",
      sql`${table.lifecycleStatus} IN ('active', 'discontinued', 'watchlist', 'retired')`,
    ),
    uniqueIndex("vehicle_models_brand_slug_idx").on(table.consumerBrandId, table.slug),
    index("vehicle_models_brand_idx").on(table.consumerBrandId),
  ],
);

export const vehicleModelAliasesTable = pgTable(
  "vehicle_model_aliases",
  {
    id: serial("id").primaryKey(),
    vehicleModelId: integer("vehicle_model_id")
      .notNull()
      .references(() => vehicleModelsTable.id, { onDelete: "restrict" }),
    marketId: integer("market_id")
      .notNull()
      .references(() => marketsTable.id, { onDelete: "restrict" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    locale: text("locale").notNull(),
    aliasType: text("alias_type").notNull(),
    validFrom: date("valid_from", { mode: "string" }).notNull(),
    validTo: date("valid_to", { mode: "string" }),
  },
  (table) => [
    check("vehicle_model_aliases_alias_nonempty_check", nonEmpty(table.alias)),
    check(
      "vehicle_model_aliases_normalized_alias_check",
      sql`${table.normalizedAlias} = lower(btrim(${table.normalizedAlias})) AND length(${table.normalizedAlias}) > 0`,
    ),
    check("vehicle_model_aliases_locale_nonempty_check", nonEmpty(table.locale)),
    check(
      "vehicle_model_aliases_type_check",
      sql`${table.aliasType} IN ('market_name', 'translation', 'transliteration', 'other_reviewed')`,
    ),
    check("vehicle_model_aliases_dates_check", validDateRange(table.validFrom, table.validTo)),
    uniqueIndex("vehicle_model_aliases_identity_valid_from_idx").on(
      table.vehicleModelId,
      table.marketId,
      table.locale,
      table.normalizedAlias,
      table.validFrom,
    ),
    index("vehicle_model_aliases_market_idx").on(table.marketId),
  ],
);

export const vehicleGenerationsTable = pgTable(
  "vehicle_generations",
  {
    id: serial("id").primaryKey(),
    vehicleModelId: integer("vehicle_model_id")
      .notNull()
      .references(() => vehicleModelsTable.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    startYear: integer("start_year"),
    endYear: integer("end_year"),
    lifecycleStatus: text("lifecycle_status").notNull().default("watchlist"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("vehicle_generations_name_nonempty_check", nonEmpty(table.name)),
    check("vehicle_generations_slug_normalized_check", normalizedSlug(table.slug)),
    check(
      "vehicle_generations_year_range_check",
      sql`${table.startYear} IS NULL OR ${table.endYear} IS NULL OR ${table.endYear} >= ${table.startYear}`,
    ),
    check(
      "vehicle_generations_lifecycle_status_check",
      sql`${table.lifecycleStatus} IN ('active', 'discontinued', 'watchlist', 'retired')`,
    ),
    uniqueIndex("vehicle_generations_model_slug_idx").on(table.vehicleModelId, table.slug),
    index("vehicle_generations_model_idx").on(table.vehicleModelId),
  ],
);

export const vehicleModelYearsTable = pgTable(
  "vehicle_model_years",
  {
    id: serial("id").primaryKey(),
    vehicleGenerationId: integer("vehicle_generation_id")
      .notNull()
      .references(() => vehicleGenerationsTable.id, { onDelete: "restrict" }),
    marketId: integer("market_id").references(() => marketsTable.id, { onDelete: "restrict" }),
    modelYear: integer("model_year").notNull(),
    sourceIdentifier: text("source_identifier"),
    identityStatus: text("identity_status").notNull().default("demo_identity_only"),
  },
  (table) => [
    check(
      "vehicle_model_years_identity_status_check",
      sql`${table.identityStatus} IN ('demo_identity_only', 'provisional', 'supported', 'retired')`,
    ),
    check("vehicle_model_years_positive_year_check", sql`${table.modelYear} > 0`),
    check(
      "vehicle_model_years_supported_market_check",
      sql`${table.identityStatus} <> 'supported' OR ${table.marketId} IS NOT NULL`,
    ),
    uniqueIndex("vehicle_model_years_market_identity_idx").on(
      table.vehicleGenerationId,
      table.marketId,
      table.modelYear,
    ),
    uniqueIndex("vehicle_model_years_unmarketed_identity_idx")
      .on(table.vehicleGenerationId, table.modelYear)
      .where(sql`${table.marketId} IS NULL`),
    index("vehicle_model_years_generation_idx").on(table.vehicleGenerationId),
    index("vehicle_model_years_market_idx").on(table.marketId),
  ],
);

export const vehicleTrimsTable = pgTable(
  "vehicle_trims",
  {
    id: serial("id").primaryKey(),
    vehicleModelYearId: integer("vehicle_model_year_id")
      .notNull()
      .references(() => vehicleModelYearsTable.id, { onDelete: "restrict" }),
    salesName: text("sales_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    oemTrimCode: text("oem_trim_code"),
    lifecycleStatus: text("lifecycle_status").notNull().default("watchlist"),
  },
  (table) => [
    check("vehicle_trims_sales_name_nonempty_check", nonEmpty(table.salesName)),
    check(
      "vehicle_trims_normalized_name_check",
      sql`${table.normalizedName} = lower(btrim(${table.normalizedName})) AND length(${table.normalizedName}) > 0`,
    ),
    check(
      "vehicle_trims_lifecycle_status_check",
      sql`${table.lifecycleStatus} IN ('active', 'discontinued', 'watchlist', 'retired')`,
    ),
    uniqueIndex("vehicle_trims_model_year_name_idx").on(table.vehicleModelYearId, table.normalizedName),
    index("vehicle_trims_model_year_idx").on(table.vehicleModelYearId),
  ],
);

export const vehicleConfigurationsTable = pgTable(
  "vehicle_configurations",
  {
    id: serial("id").primaryKey(),
    vehicleTrimId: integer("vehicle_trim_id")
      .notNull()
      .references(() => vehicleTrimsTable.id, { onDelete: "restrict" }),
    configurationKey: text("configuration_key"),
    displayLabel: text("display_label"),
    identityStatus: text("identity_status").notNull().default("unresolved"),
    isDemo: boolean("is_demo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "vehicle_configurations_identity_status_check",
      sql`${table.identityStatus} IN ('unresolved', 'provisional', 'supported', 'retired')`,
    ),
    check(
      "vehicle_configurations_supported_non_demo_check",
      sql`${table.identityStatus} <> 'supported' OR ${table.isDemo} = false`,
    ),
    uniqueIndex("vehicle_configurations_trim_key_idx")
      .on(table.vehicleTrimId, table.configurationKey)
      .where(sql`${table.configurationKey} IS NOT NULL`),
    index("vehicle_configurations_trim_idx").on(table.vehicleTrimId),
    index("vehicle_configurations_status_trim_idx").on(table.identityStatus, table.vehicleTrimId),
  ],
);

export const vehicleProfileAliasesTable = pgTable(
  "vehicle_profile_aliases",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    legacyTrimId: integer("legacy_trim_id").references(() => trimsTable.id, { onDelete: "restrict" }),
    vehicleConfigurationId: integer("vehicle_configuration_id").references(
      () => vehicleConfigurationsTable.id,
      { onDelete: "restrict" },
    ),
    aliasKind: text("alias_kind").notNull(),
    mappingStatus: text("mapping_status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("vehicle_profile_aliases_slug_normalized_check", normalizedSlug(table.slug)),
    check(
      "vehicle_profile_aliases_kind_check",
      sql`${table.aliasKind} IN ('legacy_profile', 'canonical_profile')`,
    ),
    check(
      "vehicle_profile_aliases_mapping_status_check",
      sql`${table.mappingStatus} IN ('demo_identity_only', 'exact_supported', 'ambiguous', 'unresolved', 'retired')`,
    ),
    check(
      "vehicle_profile_aliases_target_check",
      sql`(${table.aliasKind} = 'legacy_profile' AND ${table.legacyTrimId} IS NOT NULL) OR (${table.aliasKind} = 'canonical_profile' AND ${table.vehicleConfigurationId} IS NOT NULL)`,
    ),
    check(
      "vehicle_profile_aliases_exact_supported_target_check",
      sql`${table.mappingStatus} <> 'exact_supported' OR ${table.vehicleConfigurationId} IS NOT NULL`,
    ),
    check(
      "vehicle_profile_aliases_legacy_configuration_check",
      sql`${table.aliasKind} <> 'legacy_profile' OR ${table.vehicleConfigurationId} IS NULL OR ${table.mappingStatus} = 'exact_supported'`,
    ),
    uniqueIndex("vehicle_profile_aliases_slug_idx").on(table.slug),
    index("vehicle_profile_aliases_legacy_trim_idx").on(table.legacyTrimId),
    index("vehicle_profile_aliases_configuration_idx").on(table.vehicleConfigurationId),
  ],
);

export const powertrainComponentsTable = pgTable(
  "powertrain_components",
  {
    id: serial("id").primaryKey(),
    componentType: text("component_type").notNull(),
    responsibleOrganizationId: integer("responsible_organization_id").references(
      () => organizationsTable.id,
      { onDelete: "restrict" },
    ),
    sourceNamespace: text("source_namespace"),
    sourceIdentityKey: text("source_identity_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "powertrain_components_type_check",
      sql`${table.componentType} IN ('engine', 'transmission', 'motor', 'battery', 'fuel_cell', 'energy_system', 'other_reviewed_type')`,
    ),
    check(
      "powertrain_components_source_identity_pair_check",
      sql`(${table.sourceNamespace} IS NULL) = (${table.sourceIdentityKey} IS NULL)`,
    ),
    uniqueIndex("powertrain_components_source_identity_idx")
      .on(table.sourceNamespace, table.sourceIdentityKey)
      .where(sql`${table.sourceNamespace} IS NOT NULL AND ${table.sourceIdentityKey} IS NOT NULL`),
    index("powertrain_components_organization_idx").on(table.responsibleOrganizationId),
  ],
);

export const powertrainComponentRevisionsTable = pgTable(
  "powertrain_component_revisions",
  {
    id: serial("id").primaryKey(),
    componentId: integer("component_id")
      .notNull()
      .references(() => powertrainComponentsTable.id, { onDelete: "restrict" }),
    revisionKey: text("revision_key").notNull(),
    validFrom: date("valid_from", { mode: "string" }),
    validTo: date("valid_to", { mode: "string" }),
    lifecycleStatus: text("lifecycle_status").notNull().default("watchlist"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("powertrain_component_revisions_key_nonempty_check", nonEmpty(table.revisionKey)),
    check(
      "powertrain_component_revisions_dates_check",
      validDateRange(table.validFrom, table.validTo),
    ),
    check(
      "powertrain_component_revisions_status_check",
      sql`${table.lifecycleStatus} IN ('active', 'discontinued', 'watchlist', 'retired')`,
    ),
    uniqueIndex("powertrain_component_revisions_key_idx").on(table.componentId, table.revisionKey),
    index("powertrain_component_revisions_component_idx").on(table.componentId),
  ],
);

export const configurationComponentFitmentsTable = pgTable(
  "configuration_component_fitments",
  {
    id: serial("id").primaryKey(),
    vehicleConfigurationId: integer("vehicle_configuration_id")
      .notNull()
      .references(() => vehicleConfigurationsTable.id, { onDelete: "restrict" }),
    componentRevisionId: integer("component_revision_id")
      .notNull()
      .references(() => powertrainComponentRevisionsTable.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    positionCode: text("position_code").notNull().default("system"),
    quantity: integer("quantity").notNull().default(1),
    fitmentStatus: text("fitment_status").notNull().default("provisional"),
    supportingClaimId: integer("supporting_claim_id").references(
      () => researchClaimsTable.id,
      { onDelete: "restrict" },
    ),
  },
  (table) => [
    check(
      "configuration_component_fitments_role_check",
      sql`${table.role} IN ('engine', 'transmission', 'drive_motor', 'battery', 'fuel_cell', 'energy_system', 'other_reviewed_role')`,
    ),
    check("configuration_component_fitments_position_nonempty_check", nonEmpty(table.positionCode)),
    check("configuration_component_fitments_quantity_check", sql`${table.quantity} > 0`),
    check(
      "configuration_component_fitments_status_check",
      sql`${table.fitmentStatus} IN ('provisional', 'supported', 'rejected')`,
    ),
    check(
      "configuration_component_fitments_supported_claim_check",
      sql`${table.fitmentStatus} <> 'supported' OR ${table.supportingClaimId} IS NOT NULL`,
    ),
    uniqueIndex("configuration_component_fitments_configuration_role_position_idx").on(
      table.vehicleConfigurationId,
      table.role,
      table.positionCode,
    ),
    index("configuration_component_fitments_component_revision_idx").on(table.componentRevisionId),
    index("configuration_component_fitments_claim_idx").on(table.supportingClaimId),
  ],
);

export const productionSitesTable = pgTable(
  "production_sites",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "restrict" }),
    marketId: integer("market_id")
      .notNull()
      .references(() => marketsTable.id, { onDelete: "restrict" }),
    siteCode: text("site_code"),
    name: text("name").notNull(),
    validFrom: date("valid_from", { mode: "string" }),
    validTo: date("valid_to", { mode: "string" }),
    supportingClaimId: integer("supporting_claim_id").references(
      () => researchClaimsTable.id,
      { onDelete: "restrict" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("production_sites_name_nonempty_check", nonEmpty(table.name)),
    check("production_sites_site_code_nonempty_check", sql`${table.siteCode} IS NULL OR ${nonEmpty(table.siteCode)}`),
    check("production_sites_dates_check", validDateRange(table.validFrom, table.validTo)),
    uniqueIndex("production_sites_organization_site_code_idx")
      .on(table.organizationId, table.siteCode)
      .where(sql`${table.siteCode} IS NOT NULL`),
    index("production_sites_market_idx").on(table.marketId),
    index("production_sites_claim_idx").on(table.supportingClaimId),
  ],
);

export const vehicleProductionAssignmentsTable = pgTable(
  "vehicle_production_assignments",
  {
    id: serial("id").primaryKey(),
    modelYearId: integer("model_year_id").references(() => vehicleModelYearsTable.id, { onDelete: "restrict" }),
    configurationId: integer("configuration_id").references(
      () => vehicleConfigurationsTable.id,
      { onDelete: "restrict" },
    ),
    productionSiteId: integer("production_site_id")
      .notNull()
      .references(() => productionSitesTable.id, { onDelete: "restrict" }),
    productionRole: text("production_role").notNull(),
    validFrom: date("valid_from", { mode: "string" }),
    validTo: date("valid_to", { mode: "string" }),
    supportingClaimId: integer("supporting_claim_id").references(
      () => researchClaimsTable.id,
      { onDelete: "restrict" },
    ),
  },
  (table) => [
    check(
      "vehicle_production_assignments_one_scope_check",
      sql`num_nonnulls(${table.modelYearId}, ${table.configurationId}) = 1`,
    ),
    check(
      "vehicle_production_assignments_role_check",
      sql`${table.productionRole} IN ('final_assembly', 'vehicle_manufacture', 'engine', 'battery', 'other_reviewed_role')`,
    ),
    check(
      "vehicle_production_assignments_dates_check",
      validDateRange(table.validFrom, table.validTo),
    ),
    index("vehicle_production_assignments_model_year_idx").on(table.modelYearId),
    index("vehicle_production_assignments_configuration_idx").on(table.configurationId),
    index("vehicle_production_assignments_site_idx").on(table.productionSiteId),
    index("vehicle_production_assignments_claim_idx").on(table.supportingClaimId),
  ],
);