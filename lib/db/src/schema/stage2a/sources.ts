import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizationsTable, marketsTable } from "./identity";
import { researchClaimsTable } from "./claims";

export const researchSourcesTable = pgTable(
  "research_sources",
  {
    id: serial("id").primaryKey(),
    publisherOrganizationId: integer("publisher_organization_id").references(
      () => organizationsTable.id,
      { onDelete: "restrict" },
    ),
    sourceKey: text("source_key").notNull(),
    sourceKind: text("source_kind").notNull(),
    canonicalUrl: text("canonical_url"),
    marketId: integer("market_id").references(() => marketsTable.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("research_sources_key_nonempty_check", sql`length(btrim(${table.sourceKey})) > 0`),
    check(
      "research_sources_kind_check",
      sql`${table.sourceKind} IN ('government', 'oem_document', 'standards_body', 'peer_reviewed_research', 'insurer', 'survey', 'owner_forum', 'internal_calculation', 'other_reviewed')`,
    ),
    check(
      "research_sources_url_nonempty_check",
      sql`${table.canonicalUrl} IS NULL OR length(btrim(${table.canonicalUrl})) > 0`,
    ),
    uniqueIndex("research_sources_source_key_idx").on(table.sourceKey),
    index("research_sources_publisher_idx").on(table.publisherOrganizationId),
    index("research_sources_market_idx").on(table.marketId),
  ],
);

export const sourceRevisionsTable = pgTable(
  "source_revisions",
  {
    id: serial("id").primaryKey(),
    researchSourceId: integer("research_source_id")
      .notNull()
      .references(() => researchSourcesTable.id, { onDelete: "restrict" }),
    documentIdentifier: text("document_identifier"),
    sourceVersion: text("source_version"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    contentHash: text("content_hash"),
    format: text("format").notNull(),
    updateBehavior: text("update_behavior").notNull(),
    termsUrl: text("terms_url"),
    termsVersion: text("terms_version"),
    termsReviewedAt: timestamp("terms_reviewed_at", { withTimezone: true }),
    storageRightsStatus: text("storage_rights_status").notNull().default("unknown"),
    derivativeUseRightsStatus: text("derivative_use_rights_status").notNull().default("unknown"),
    displayRightsStatus: text("display_rights_status").notNull().default("unknown"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "source_revisions_rights_state_check",
      sql`${table.storageRightsStatus} IN ('unknown', 'pending', 'allowed', 'restricted', 'denied') AND ${table.derivativeUseRightsStatus} IN ('unknown', 'pending', 'allowed', 'restricted', 'denied') AND ${table.displayRightsStatus} IN ('unknown', 'pending', 'allowed', 'restricted', 'denied')`,
    ),
    check("source_revisions_format_nonempty_check", sql`length(btrim(${table.format})) > 0`),
    check(
      "source_revisions_update_behavior_nonempty_check",
      sql`length(btrim(${table.updateBehavior})) > 0`,
    ),
    uniqueIndex("source_revisions_document_version_idx")
      .on(table.researchSourceId, table.documentIdentifier, table.sourceVersion)
      .where(sql`${table.documentIdentifier} IS NOT NULL AND ${table.sourceVersion} IS NOT NULL`),
    index("source_revisions_source_retrieved_idx").on(table.researchSourceId, table.retrievedAt),
    index("source_revisions_rights_idx").on(
      table.storageRightsStatus,
      table.derivativeUseRightsStatus,
      table.displayRightsStatus,
    ),
  ],
);

export const evidenceItemsTable = pgTable(
  "evidence_items",
  {
    id: serial("id").primaryKey(),
    sourceRevisionId: integer("source_revision_id")
      .notNull()
      .references(() => sourceRevisionsTable.id, { onDelete: "restrict" }),
    locator: text("locator").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
    excerpt: text("excerpt"),
    contentHash: text("content_hash"),
    evidenceKind: text("evidence_kind").notNull(),
  },
  (table) => [
    check("evidence_items_locator_nonempty_check", sql`length(btrim(${table.locator})) > 0`),
    check(
      "evidence_items_kind_check",
      sql`${table.evidenceKind} IN ('table_cell', 'document_section', 'dataset_record', 'api_record', 'test_report', 'derived_input', 'other_reviewed')`,
    ),
    index("evidence_items_source_locator_idx").on(table.sourceRevisionId, table.locator),
  ],
);

export const claimEvidenceTable = pgTable(
  "claim_evidence",
  {
    researchClaimId: integer("research_claim_id")
      .notNull()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    evidenceItemId: integer("evidence_item_id")
      .notNull()
      .references(() => evidenceItemsTable.id, { onDelete: "restrict" }),
    evidenceRelation: text("evidence_relation").notNull(),
    locatorNote: text("locator_note"),
  },
  (table) => [
    primaryKey({
      name: "claim_evidence_pk",
      columns: [table.researchClaimId, table.evidenceItemId, table.evidenceRelation],
    }),
    check(
      "claim_evidence_relation_check",
      sql`${table.evidenceRelation} IN ('supports', 'contradicts', 'qualifies', 'derived_from')`,
    ),
    index("claim_evidence_evidence_item_idx").on(table.evidenceItemId),
  ],
);

export const claimReviewsTable = pgTable(
  "claim_reviews",
  {
    id: serial("id").primaryKey(),
    researchClaimId: integer("research_claim_id")
      .notNull()
      .references(() => researchClaimsTable.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    reviewerReference: text("reviewer_reference"),
    rationale: text("rationale").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "claim_reviews_decision_check",
      sql`${table.decision} IN ('accepted', 'rejected', 'stale', 'superseded')`,
    ),
    check("claim_reviews_rationale_nonempty_check", sql`length(btrim(${table.rationale})) > 0`),
    index("claim_reviews_claim_reviewed_idx").on(table.researchClaimId, table.reviewedAt),
  ],
);