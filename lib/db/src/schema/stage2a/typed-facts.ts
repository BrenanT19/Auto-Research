import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { researchClaimsTable } from "./claims";
import {
  marketsTable,
  powertrainComponentRevisionsTable,
  vehicleConfigurationsTable,
  vehicleGenerationsTable,
  vehicleModelYearsTable,
  vehicleModelsTable,
  vehicleTrimsTable,
} from "./identity";

export const specFieldDefinitionsTable = pgTable(
  "spec_field_definitions",
  {
    code: text("code").primaryKey(),
    valueType: text("value_type").notNull(),
    dimension: text("dimension").notNull(),
    canonicalUnit: text("canonical_unit"),
    allowedSubjectType: text("allowed_subject_type").notNull(),
    label: text("label").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    check(
      "spec_field_definitions_value_type_check",
      sql`${table.valueType} IN ('numeric', 'text', 'boolean')`,
    ),
    check(
      "spec_field_definitions_subject_type_check",
      sql`${table.allowedSubjectType} IN ('organization', 'consumer_brand', 'vehicle_model', 'vehicle_generation', 'vehicle_model_year', 'vehicle_trim', 'vehicle_configuration', 'component_revision', 'market', 'production_site')`,
    ),
    check("spec_field_definitions_dimension_nonempty_check", sql`length(btrim(${table.dimension})) > 0`),
    check("spec_field_definitions_label_nonempty_check", sql`length(btrim(${table.label})) > 0`),
    check(
      "spec_field_definitions_unit_by_type_check",
      sql`(${table.valueType} = 'numeric' AND ${table.canonicalUnit} IS NOT NULL AND length(btrim(${table.canonicalUnit})) > 0) OR (${table.valueType} <> 'numeric' AND ${table.canonicalUnit} IS NULL)`,
    ),
    uniqueIndex("spec_field_definitions_code_type_idx").on(table.code, table.valueType),
  ],
);

export const specClaimValuesTable = pgTable(
  "spec_claim_values",
  {
    researchClaimId: integer("research_claim_id")
      .primaryKey()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    fieldCode: text("field_code").notNull(),
    valueType: text("value_type").notNull(),
    valueState: text("value_state").notNull(),
    numericValue: numeric("numeric_value", { precision: 24, scale: 8 }),
    textValue: text("text_value"),
    booleanValue: boolean("boolean_value"),
    originalSourceValue: text("original_source_value"),
    originalSourceUnit: text("original_source_unit"),
    normalizedUnit: text("normalized_unit"),
    measurementBasis: text("measurement_basis"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "spec_claim_values_field_type_fk",
      columns: [table.fieldCode, table.valueType],
      foreignColumns: [specFieldDefinitionsTable.code, specFieldDefinitionsTable.valueType],
    }).onDelete("restrict"),
    check(
      "spec_claim_values_state_check",
      sql`${table.valueState} IN ('known', 'unknown', 'not_applicable')`,
    ),
    check(
      "spec_claim_values_typed_value_check",
      sql`(
        ${table.valueState} = 'known' AND (
          (${table.valueType} = 'numeric' AND ${table.numericValue} IS NOT NULL AND ${table.textValue} IS NULL AND ${table.booleanValue} IS NULL)
          OR (${table.valueType} = 'text' AND ${table.numericValue} IS NULL AND ${table.textValue} IS NOT NULL AND ${table.booleanValue} IS NULL)
          OR (${table.valueType} = 'boolean' AND ${table.numericValue} IS NULL AND ${table.textValue} IS NULL AND ${table.booleanValue} IS NOT NULL)
        )
      ) OR (
        ${table.valueState} IN ('unknown', 'not_applicable') AND
        ${table.numericValue} IS NULL AND ${table.textValue} IS NULL AND ${table.booleanValue} IS NULL
      )`,
    ),
    index("spec_claim_values_field_code_idx").on(table.fieldCode),
  ],
);

export const applicabilitySetsTable = pgTable(
  "applicability_sets",
  {
    id: serial("id").primaryKey(),
    researchClaimId: integer("research_claim_id")
      .notNull()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    scopeState: text("scope_state").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "applicability_sets_scope_state_check",
      sql`${table.scopeState} IN ('restricted', 'explicit_unrestricted', 'unknown')`,
    ),
    uniqueIndex("applicability_sets_claim_idx").on(table.researchClaimId),
  ],
);

export const applicabilityAlternativesTable = pgTable(
  "applicability_alternatives",
  {
    id: serial("id").primaryKey(),
    applicabilitySetId: integer("applicability_set_id")
      .notNull()
      .references(() => applicabilitySetsTable.id, { onDelete: "restrict" }),
    ordinal: integer("ordinal").notNull(),
    scopeCompleteness: text("scope_completeness").notNull(),
    marketId: integer("market_id"),
    vehicleModelId: integer("vehicle_model_id"),
    vehicleGenerationId: integer("vehicle_generation_id"),
    vehicleModelYearId: integer("vehicle_model_year_id"),
    vehicleTrimId: integer("vehicle_trim_id"),
    vehicleConfigurationId: integer("vehicle_configuration_id"),
    componentRevisionId: integer("component_revision_id"),
    packageCode: text("package_code"),
    buildDateFrom: date("build_date_from", { mode: "string" }),
    buildDateTo: date("build_date_to", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      name: "applicability_alternatives_market_fk",
      columns: [table.marketId],
      foreignColumns: [marketsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "applicability_alternatives_model_fk",
      columns: [table.vehicleModelId],
      foreignColumns: [vehicleModelsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "applicability_alternatives_generation_fk",
      columns: [table.vehicleGenerationId],
      foreignColumns: [vehicleGenerationsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "applicability_alternatives_model_year_fk",
      columns: [table.vehicleModelYearId],
      foreignColumns: [vehicleModelYearsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "applicability_alternatives_trim_fk",
      columns: [table.vehicleTrimId],
      foreignColumns: [vehicleTrimsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "applicability_alternatives_configuration_fk",
      columns: [table.vehicleConfigurationId],
      foreignColumns: [vehicleConfigurationsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "applicability_alternatives_component_revision_fk",
      columns: [table.componentRevisionId],
      foreignColumns: [powertrainComponentRevisionsTable.id],
    }).onDelete("restrict"),
    check(
      "applicability_alternatives_completeness_check",
      sql`${table.scopeCompleteness} IN ('complete', 'partial', 'unknown')`,
    ),
    check("applicability_alternatives_ordinal_check", sql`${table.ordinal} >= 0`),
    check(
      "applicability_alternatives_build_dates_check",
      sql`${table.buildDateFrom} IS NULL OR ${table.buildDateTo} IS NULL OR ${table.buildDateTo} >= ${table.buildDateFrom}`,
    ),
    check(
      "applicability_alternatives_package_code_nonempty_check",
      sql`${table.packageCode} IS NULL OR length(btrim(${table.packageCode})) > 0`,
    ),
    check(
      "applicability_alternatives_restricted_predicate_check",
      sql`num_nonnulls(${table.marketId}, ${table.vehicleModelId}, ${table.vehicleGenerationId}, ${table.vehicleModelYearId}, ${table.vehicleTrimId}, ${table.vehicleConfigurationId}, ${table.componentRevisionId}, ${table.packageCode}, ${table.buildDateFrom}, ${table.buildDateTo}) > 0`,
    ),
    check(
      "applicability_alternatives_complete_scope_market_check",
      sql`${table.scopeCompleteness} <> 'complete' OR num_nonnulls(${table.vehicleModelId}, ${table.vehicleGenerationId}, ${table.vehicleModelYearId}, ${table.vehicleTrimId}, ${table.vehicleConfigurationId}, ${table.componentRevisionId}, ${table.packageCode}, ${table.buildDateFrom}, ${table.buildDateTo}) = 0 OR ${table.marketId} IS NOT NULL`,
    ),
    uniqueIndex("applicability_alternatives_set_ordinal_idx").on(
      table.applicabilitySetId,
      table.ordinal,
    ),
    index("applicability_alternatives_market_idx").on(table.marketId),
    index("applicability_alternatives_model_idx").on(table.vehicleModelId),
    index("applicability_alternatives_generation_idx").on(table.vehicleGenerationId),
    index("applicability_alternatives_model_year_idx").on(table.vehicleModelYearId),
    index("applicability_alternatives_trim_idx").on(table.vehicleTrimId),
    index("applicability_alternatives_configuration_idx").on(table.vehicleConfigurationId),
    index("applicability_alternatives_component_revision_idx").on(table.componentRevisionId),
  ],
);
