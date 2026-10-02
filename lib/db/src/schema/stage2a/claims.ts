import {
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
import { sql } from "drizzle-orm";

export const researchClaimsTable = pgTable(
  "research_claims",
  {
    id: serial("id").primaryKey(),
    claimKind: text("claim_kind").notNull(),
    contentClass: text("content_class").notNull(),
    researchStatus: text("research_status").notNull().default("not_researched"),
    reviewStatus: text("review_status").notNull().default("not_reviewed"),
    evidenceStrength: text("evidence_strength").notNull().default("not_assessed"),
    effectiveFrom: date("effective_from", { mode: "string" }),
    effectiveTo: date("effective_to", { mode: "string" }),
    supersedesClaimId: integer("supersedes_claim_id").references(
      (): AnyPgColumn => researchClaimsTable.id,
      { onDelete: "restrict" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "research_claims_kind_check",
      sql`${table.claimKind} IN ('brand_origin', 'identity', 'specification', 'fitment', 'reliability', 'known_issue', 'maintenance', 'recall', 'safety_rating', 'ownership_estimate', 'calculation', 'editorial', 'owner_pattern', 'owner_experience')`,
    ),
    check(
      "research_claims_content_class_check",
      sql`${table.contentClass} IN ('source_fact', 'estimate', 'calculation', 'editorial_synthesis', 'external_owner_pattern', 'direct_owner_experience', 'demo_fixture')`,
    ),
    check(
      "research_claims_research_status_check",
      sql`${table.researchStatus} IN ('not_researched', 'researching', 'researched', 'blocked')`,
    ),
    check(
      "research_claims_review_status_check",
      sql`${table.reviewStatus} IN ('not_reviewed', 'in_review', 'accepted', 'rejected', 'stale', 'superseded')`,
    ),
    check(
      "research_claims_evidence_strength_check",
      sql`${table.evidenceStrength} IN ('not_assessed', 'low', 'moderate', 'strong')`,
    ),
    check(
      "research_claims_effective_dates_check",
      sql`${table.effectiveFrom} IS NULL OR ${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
    index("research_claims_status_kind_effective_idx").on(
      table.claimKind,
      table.researchStatus,
      table.reviewStatus,
      table.effectiveFrom,
      table.effectiveTo,
    ),
    index("research_claims_supersedes_idx").on(table.supersedesClaimId),
  ],
);

export const calculationMethodVersionsTable = pgTable(
  "calculation_method_versions",
  {
    id: serial("id").primaryKey(),
    methodCode: text("method_code").notNull(),
    version: text("version").notNull(),
    description: text("description").notNull(),
    inputContractVersion: text("input_contract_version").notNull(),
    outputContractVersion: text("output_contract_version").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }),
    effectiveTo: date("effective_to", { mode: "string" }),
    implementationReference: text("implementation_reference"),
    implementationHash: text("implementation_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "calculation_method_versions_code_check",
      sql`length(btrim(${table.methodCode})) > 0 AND length(btrim(${table.version})) > 0`,
    ),
    check(
      "calculation_method_versions_effective_dates_check",
      sql`${table.effectiveFrom} IS NULL OR ${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
    uniqueIndex("calculation_method_versions_code_version_idx").on(table.methodCode, table.version),
  ],
);