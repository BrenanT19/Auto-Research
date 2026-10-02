import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  calculationMethodVersionsTable,
  researchClaimsTable,
} from "./claims";
import { marketsTable, powertrainComponentRevisionsTable } from "./identity";

export const reliabilityAssessmentDetailsTable = pgTable("reliability_assessment_details", {
  researchClaimId: integer("research_claim_id")
    .primaryKey()
    .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
  namedPopulation: text("named_population").notNull(),
  observationWindow: text("observation_window").notNull(),
  method: text("method").notNull(),
  numerator: bigint("numerator", { mode: "bigint" }),
  denominator: bigint("denominator", { mode: "bigint" }),
  coverage: text("coverage"),
  limitations: text("limitations"),
}, (table) => [
  check(
    "reliability_assessment_counts_check",
    sql`(${table.numerator} IS NULL OR ${table.numerator} >= 0) AND (${table.denominator} IS NULL OR ${table.denominator} > 0) AND (${table.numerator} IS NULL OR ${table.denominator} IS NULL OR ${table.numerator} <= ${table.denominator})`,
  ),
]);

export const knownIssueDetailsTable = pgTable(
  "known_issue_details",
  {
    researchClaimId: integer("research_claim_id")
      .primaryKey()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    issueSystemCode: text("issue_system_code").notNull(),
    symptomSummary: text("symptom_summary").notNull(),
    severityAssessment: text("severity_assessment"),
    supportedMileageStart: integer("supported_mileage_start"),
    supportedMileageEnd: integer("supported_mileage_end"),
    costLowMinorUnits: bigint("cost_low_minor_units", { mode: "bigint" }),
    costHighMinorUnits: bigint("cost_high_minor_units", { mode: "bigint" }),
    currencyCode: text("currency_code"),
    costDate: date("cost_date", { mode: "string" }),
    costBasis: text("cost_basis"),
  },
  (table) => [
    check("known_issue_code_nonempty_check", sql`length(btrim(${table.issueSystemCode})) > 0`),
    check("known_issue_summary_nonempty_check", sql`length(btrim(${table.symptomSummary})) > 0`),
    check(
      "known_issue_severity_check",
      sql`${table.severityAssessment} IS NULL OR ${table.severityAssessment} IN ('low', 'moderate', 'high', 'critical', 'unassessed')`,
    ),
    check(
      "known_issue_mileage_range_check",
      sql`(${table.supportedMileageStart} IS NULL OR ${table.supportedMileageStart} >= 0) AND (${table.supportedMileageEnd} IS NULL OR ${table.supportedMileageEnd} >= 0) AND (${table.supportedMileageStart} IS NULL OR ${table.supportedMileageEnd} IS NULL OR ${table.supportedMileageEnd} >= ${table.supportedMileageStart})`,
    ),
    check(
      "known_issue_cost_range_check",
      sql`(
        ${table.costLowMinorUnits} IS NULL AND ${table.costHighMinorUnits} IS NULL AND ${table.currencyCode} IS NULL AND ${table.costDate} IS NULL AND ${table.costBasis} IS NULL
      ) OR (
        ${table.costLowMinorUnits} IS NOT NULL AND ${table.costHighMinorUnits} IS NOT NULL
        AND ${table.costLowMinorUnits} >= 0 AND ${table.costHighMinorUnits} >= ${table.costLowMinorUnits}
        AND ${table.currencyCode} ~ '^[A-Z]{3}$' AND ${table.costDate} IS NOT NULL
        AND ${table.costBasis} IS NOT NULL AND length(btrim(${table.costBasis})) > 0
      )`,
    ),
  ],
);

export const maintenanceScheduleDetailsTable = pgTable(
  "maintenance_schedule_details",
  {
    researchClaimId: integer("research_claim_id")
      .primaryKey()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    taskCode: text("task_code").notNull(),
    description: text("description").notNull(),
    distanceInterval: numeric("distance_interval", { precision: 18, scale: 4 }),
    distanceUnit: text("distance_unit"),
    monthInterval: integer("month_interval"),
    serviceCondition: text("service_condition").notNull(),
    componentRevisionId: integer("component_revision_id").references(
      () => powertrainComponentRevisionsTable.id,
      { onDelete: "restrict" },
    ),
  },
  (table) => [
    check("maintenance_task_code_nonempty_check", sql`length(btrim(${table.taskCode})) > 0`),
    check("maintenance_description_nonempty_check", sql`length(btrim(${table.description})) > 0`),
    check(
      "maintenance_distance_interval_pair_check",
      sql`(${table.distanceInterval} IS NULL AND ${table.distanceUnit} IS NULL) OR (${table.distanceInterval} > 0 AND ${table.distanceUnit} IS NOT NULL AND length(btrim(${table.distanceUnit})) > 0)`,
    ),
    check(
      "maintenance_month_interval_check",
      sql`${table.monthInterval} IS NULL OR ${table.monthInterval} > 0`,
    ),
    check(
      "maintenance_service_condition_check",
      sql`${table.serviceCondition} IN ('normal', 'severe', 'other_reviewed')`,
    ),
    index("maintenance_schedule_details_component_revision_idx").on(table.componentRevisionId),
  ],
);

export const recallCampaignDetailsTable = pgTable(
  "recall_campaign_details",
  {
    researchClaimId: integer("research_claim_id")
      .primaryKey()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    issuingAuthority: text("issuing_authority").notNull(),
    campaignIdentifier: text("campaign_identifier").notNull(),
    announcementDate: date("announcement_date", { mode: "string" }),
    revisionDate: date("revision_date", { mode: "string" }),
    remedy: text("remedy"),
    affectedPopulationDescription: text("affected_population_description").notNull(),
  },
  (table) => [
    check("recall_campaign_authority_nonempty_check", sql`length(btrim(${table.issuingAuthority})) > 0`),
    check(
      "recall_campaign_identifier_nonempty_check",
      sql`length(btrim(${table.campaignIdentifier})) > 0`,
    ),
    check(
      "recall_campaign_population_nonempty_check",
      sql`length(btrim(${table.affectedPopulationDescription})) > 0`,
    ),
    check(
      "recall_campaign_dates_check",
      sql`${table.announcementDate} IS NULL OR ${table.revisionDate} IS NULL OR ${table.revisionDate} >= ${table.announcementDate}`,
    ),
    uniqueIndex("recall_campaign_authority_identifier_idx").on(
      table.issuingAuthority,
      table.campaignIdentifier,
    ),
  ],
);

export const safetyRatingDetailsTable = pgTable(
  "safety_rating_details",
  {
    researchClaimId: integer("research_claim_id")
      .primaryKey()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    authority: text("authority").notNull(),
    program: text("program").notNull(),
    testYear: integer("test_year"),
    testedVariantPopulation: text("tested_variant_population").notNull(),
    category: text("category").notNull(),
    result: text("result"),
    score: numeric("score", { precision: 18, scale: 6 }),
    scoreUnit: text("score_unit"),
    resultBasis: text("result_basis"),
  },
  (table) => [
    check("safety_rating_authority_nonempty_check", sql`length(btrim(${table.authority})) > 0`),
    check("safety_rating_program_nonempty_check", sql`length(btrim(${table.program})) > 0`),
    check(
      "safety_rating_population_nonempty_check",
      sql`length(btrim(${table.testedVariantPopulation})) > 0`,
    ),
    check("safety_rating_category_nonempty_check", sql`length(btrim(${table.category})) > 0`),
    check("safety_rating_test_year_check", sql`${table.testYear} IS NULL OR ${table.testYear} > 0`),
    check(
      "safety_rating_result_check",
      sql`(${table.result} IS NOT NULL AND length(btrim(${table.result})) > 0) OR ${table.score} IS NOT NULL`,
    ),
    check(
      "safety_rating_score_unit_check",
      sql`${table.score} IS NULL OR (${table.scoreUnit} IS NOT NULL AND length(btrim(${table.scoreUnit})) > 0)`,
    ),
  ],
);

export const ownershipEstimateDetailsTable = pgTable(
  "ownership_estimate_details",
  {
    researchClaimId: integer("research_claim_id")
      .primaryKey()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    costCategory: text("cost_category").notNull(),
    costLowMinorUnits: bigint("cost_low_minor_units", { mode: "bigint" }).notNull(),
    costHighMinorUnits: bigint("cost_high_minor_units", { mode: "bigint" }).notNull(),
    currencyCode: text("currency_code").notNull(),
    period: text("period").notNull(),
    annualMileageAssumption: integer("annual_mileage_assumption"),
    marketId: integer("market_id").references(() => marketsTable.id, { onDelete: "restrict" }),
    locationCode: text("location_code"),
    methodVersionId: integer("method_version_id")
      .notNull()
      .references(() => calculationMethodVersionsTable.id, { onDelete: "restrict" }),
    includedCategories: text("included_categories").notNull(),
    excludedCategories: text("excluded_categories").notNull(),
    uncertainty: text("uncertainty").notNull(),
  },
  (table) => [
    check("ownership_estimate_category_nonempty_check", sql`length(btrim(${table.costCategory})) > 0`),
    check(
      "ownership_estimate_cost_range_check",
      sql`${table.costLowMinorUnits} >= 0 AND ${table.costHighMinorUnits} >= ${table.costLowMinorUnits}`,
    ),
    check("ownership_estimate_currency_code_check", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    check("ownership_estimate_period_nonempty_check", sql`length(btrim(${table.period})) > 0`),
    check(
      "ownership_estimate_annual_mileage_check",
      sql`${table.annualMileageAssumption} IS NULL OR ${table.annualMileageAssumption} > 0`,
    ),
    check(
      "ownership_estimate_location_code_nonempty_check",
      sql`${table.locationCode} IS NULL OR length(btrim(${table.locationCode})) > 0`,
    ),
    check(
      "ownership_estimate_categories_nonempty_check",
      sql`length(btrim(${table.includedCategories})) > 0 AND length(btrim(${table.excludedCategories})) > 0 AND length(btrim(${table.uncertainty})) > 0`,
    ),
    index("ownership_estimate_details_market_idx").on(table.marketId),
    index("ownership_estimate_details_method_version_idx").on(table.methodVersionId),
  ],
);

export const externalOwnerPatternDetailsTable = pgTable(
  "external_owner_pattern_details",
  {
    researchClaimId: integer("research_claim_id")
      .primaryKey()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    sourcePopulation: text("source_population").notNull(),
    geography: text("geography"),
    observationWindow: text("observation_window").notNull(),
    sampleSize: integer("sample_size"),
    collectionMethod: text("collection_method").notNull(),
    knownBias: text("known_bias"),
    limitations: text("limitations").notNull(),
  },
  (table) => [
    check(
      "external_owner_pattern_nonempty_check",
      sql`length(btrim(${table.sourcePopulation})) > 0 AND length(btrim(${table.observationWindow})) > 0 AND length(btrim(${table.collectionMethod})) > 0 AND length(btrim(${table.limitations})) > 0`,
    ),
    check("external_owner_pattern_sample_size_check", sql`${table.sampleSize} IS NULL OR ${table.sampleSize} > 0`),
  ],
);