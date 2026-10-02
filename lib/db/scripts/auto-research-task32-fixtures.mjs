import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
export const demoBaseline = JSON.parse(
  readFileSync(resolve(fixtureDirectory, "../fixtures/auto-research-demo-baseline.json"), "utf8"),
);

const ownerReportFixtureFields = {
  display_name: "Synthetic demo test owner",
  ownership_months: 12,
  miles_driven: 10_000,
  rating: 4,
  title: "Synthetic demo test report",
  body: "Synthetic test fixture only; not an actual owner submission.",
  reported_problem: null,
};

const seedTables = [
  ["makes", ["id", "name", "slug", "mark", "origin"]],
  ["models", ["id", "make_id", "name", "slug"]],
  ["generations", ["id", "model_id", "name", "start_year", "end_year", "body_type"]],
  ["model_years", ["id", "generation_id", "year", "fuel_type"]],
  ["engines", ["id", "model_year_id", "name", "horsepower", "fuel_type", "availability"]],
  ["transmissions", ["id", "model_year_id", "name", "gears", "availability"]],
  [
    "trims",
    [
      "id", "model_year_id", "engine_id", "transmission_id", "name", "slug", "drivetrain",
      "fuel_type", "mpg_city", "mpg_highway", "mpg_combined", "horsepower", "price_usd",
      "research_rank", "image_key", "is_demo",
    ],
  ],
  [
    "ownership_estimates",
    [
      "id", "trim_id", "reliability_score", "reliability_label", "reliability_note",
      "annual_ownership_usd", "annual_maintenance_usd", "annual_repair_usd", "annual_fuel_usd",
      "annual_insurance_usd", "five_year_depreciation_percent", "expected_lifespan_miles", "is_demo",
    ],
  ],
  [
    "maintenance_items",
    ["id", "trim_id", "item", "interval_miles", "estimated_cost_usd", "is_demo"],
  ],
  [
    "common_problems",
    [
      "id", "model_year_id", "engine_id", "title", "description", "typical_mileage_start",
      "typical_mileage_end", "repair_cost_low_usd", "repair_cost_high_usd", "severity", "is_demo",
    ],
  ],
  [
    "owner_reports",
    [
      "id", "trim_id", "display_name", "ownership_months", "miles_driven", "rating", "title",
      "body", "reported_problem", "is_demo", "created_at",
    ],
  ],
  ["recalls", ["id", "model_year_id", "nhtsa_campaign_number", "component", "summary", "is_demo", "is_verified"]],
  ["safety_ratings", ["id", "model_year_id", "agency", "overall_rating", "is_demo", "is_verified"]],
];

export async function seedDemoBaseline(client) {
  assert.equal(demoBaseline.format, "auto-research-demo-baseline.v1");
  assert.equal(demoBaseline.classification, "demo_fixture");
  assert.equal(demoBaseline.tables.trims.length, 13);
  await client.query("BEGIN");
  try {
    for (const [table, columns] of seedTables) {
      let rows = demoBaseline.tables[table];
      if (table === "owner_reports") {
        rows = rows.map((row) => ({ ...ownerReportFixtureFields, ...row }));
      }
      assert.ok(Array.isArray(rows), `Missing ${table} in the checked-in demo baseline.`);
      assert.equal(rows.length, demoBaseline.counts[table]);
      for (const row of rows) {
        await client.query(
          `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(", ")}) ` +
            `VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`,
          columns.map((column) => row[column] ?? null),
        );
      }
    }

    for (const [table] of seedTables) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${table}"`,
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

async function addClaim(client, {
  claimKind = "specification",
  researchStatus = "researched",
  reviewStatus = "accepted",
  contentClass = "source_fact",
  evidenceStrength = "strong",
  rights = ["allowed", "allowed", "allowed"],
  subjectConfigurationId,
  subjectModelYearId,
  marketId,
  valueCode,
  valueType = "numeric",
  value,
  valueState,
  normalizedUnit,
  reviewDecision = reviewStatus,
  evidenceRelation = "supports",
  scopeState = "restricted",
  alternativeCompleteness = "complete",
  alternativeConfigurationId = subjectConfigurationId,
  includeAlternative = true,
  conflictEvidence = false,
  additionalReviewDecisions = [],
} = {}) {
  const { rows: claimRows } = await client.query(
    `INSERT INTO research_claims
       (claim_kind, content_class, research_status, review_status, evidence_strength)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [claimKind, contentClass, researchStatus, reviewStatus, evidenceStrength],
  );
  const claimId = claimRows[0].id;
  await client.query(
    `INSERT INTO claim_subjects
       (research_claim_id, vehicle_configuration_id, vehicle_model_year_id)
     VALUES ($1, $2, $3)`,
    [claimId, subjectConfigurationId ?? null, subjectModelYearId ?? null],
  );
  await client.query(
    `INSERT INTO claim_reviews (research_claim_id, decision, reviewer_reference, rationale)
     VALUES ($1, $2, $3, $4)`,
    [claimId, reviewDecision, "task32.synthetic/reviewer", "Synthetic acceptance-test review only."],
  );
  for (const [index, decision] of additionalReviewDecisions.entries()) {
    await client.query(
      `INSERT INTO claim_reviews (research_claim_id, decision, reviewer_reference, rationale, reviewed_at)
       VALUES ($1, $2, $3, $4, now() + ($5 * interval '1 second'))`,
      [
        claimId,
        decision,
        "task32.synthetic/latest-reviewer",
        "Synthetic adversarial review-history fixture.",
        index + 1,
      ],
    );
  }

  const { rows: sourceRows } = await client.query(
    `INSERT INTO research_sources (source_key, source_kind, canonical_url)
     VALUES ($1, 'other_reviewed', $2) RETURNING id`,
    [`task32-source-${claimId}`, "https://example.invalid/task32-synthetic-evidence"],
  );
  const { rows: revisionRows } = await client.query(
    `INSERT INTO source_revisions
       (research_source_id, document_identifier, source_version, retrieved_at, format, update_behavior,
        storage_rights_status, derivative_use_rights_status, display_rights_status,
        terms_version, terms_reviewed_at)
     VALUES ($1, $2, 'fixture-v1', now(), 'synthetic test record', 'fixed fixture',
             $3, $4, $5, 'synthetic-rights-v1', now())
     RETURNING id`,
    [sourceRows[0].id, `task32-document-${claimId}`, ...rights],
  );
  const { rows: evidenceRows } = await client.query(
    `INSERT INTO evidence_items (source_revision_id, locator, excerpt, evidence_kind)
     VALUES ($1, $2, $3, 'dataset_record') RETURNING id`,
    [revisionRows[0].id, `fixture row ${claimId}`, "Synthetic fixture evidence; no real vehicle data."],
  );
  await client.query(
    `INSERT INTO claim_evidence (research_claim_id, evidence_item_id, evidence_relation, locator_note)
     VALUES ($1, $2, $3, 'Synthetic acceptance-test locator.')`,
    [claimId, evidenceRows[0].id, evidenceRelation],
  );
  if (conflictEvidence) {
    const { rows: conflictSource } = await client.query(
      `INSERT INTO research_sources (source_key, source_kind, canonical_url)
       VALUES ($1, 'other_reviewed', $2) RETURNING id`,
      [`task32-conflict-source-${claimId}`, "https://example.invalid/task32-synthetic-conflict"],
    );
    const { rows: conflictRevision } = await client.query(
      `INSERT INTO source_revisions
         (research_source_id, retrieved_at, format, update_behavior,
          storage_rights_status, derivative_use_rights_status, display_rights_status)
       VALUES ($1, now(), 'synthetic test record', 'fixed fixture', 'allowed', 'allowed', 'allowed')
       RETURNING id`,
      [conflictSource[0].id],
    );
    const { rows: conflictItem } = await client.query(
      `INSERT INTO evidence_items (source_revision_id, locator, evidence_kind)
       VALUES ($1, $2, 'dataset_record') RETURNING id`,
      [conflictRevision[0].id, `conflicting synthetic row ${claimId}`],
    );
    await client.query(
      `INSERT INTO claim_evidence (research_claim_id, evidence_item_id, evidence_relation)
       VALUES ($1, $2, 'contradicts')`,
      [claimId, conflictItem[0].id],
    );
  }

  const { rows: setRows } = await client.query(
    `INSERT INTO applicability_sets (research_claim_id, scope_state, reviewed_at)
     VALUES ($1, $2, now()) RETURNING id`,
    [claimId, scopeState],
  );
  if (includeAlternative) {
    await client.query(
      `INSERT INTO applicability_alternatives
         (applicability_set_id, ordinal, scope_completeness, market_id, vehicle_configuration_id)
       VALUES ($1, 0, $2, $3, $4)`,
      [setRows[0].id, alternativeCompleteness, marketId, alternativeConfigurationId],
    );
  }

  if (valueCode) {
    const resolvedValueState = valueState ?? (value === undefined ? "unknown" : "known");
    let resolvedUnit = null;
    if (valueType === "numeric" && resolvedValueState === "known") {
      if (normalizedUnit !== undefined) {
        resolvedUnit = normalizedUnit;
      } else {
        const { rows: fieldRows } = await client.query(
          "SELECT canonical_unit FROM spec_field_definitions WHERE code = $1",
          [valueCode],
        );
        resolvedUnit = fieldRows[0]?.canonical_unit ?? null;
      }
    }
    await client.query(
      `INSERT INTO spec_claim_values
         (research_claim_id, field_code, value_type, value_state, numeric_value, text_value, boolean_value, normalized_unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        claimId,
        valueCode,
        valueType,
        resolvedValueState,
        valueType === "numeric" ? value ?? null : null,
        valueType === "text" ? value ?? null : null,
        valueType === "boolean" ? value ?? null : null,
        resolvedUnit,
      ],
    );
  }
  return claimId;
}

/**
 * Creates only synthetic canonical identity and evidence records. The returned
 * release is injected by the Express test harness; nothing is written to any
 * checked-in or production release manifest.
 */
export async function seedTask32CanonicalFixtures(client) {
  const { rows: marketRows } = await client.query(
    `INSERT INTO markets (code, name, market_type) VALUES ('T32-US', 'Task32 synthetic market', 'country') RETURNING id`,
  );
  const marketId = marketRows[0].id;
  const { rows: brandRows } = await client.query(
    `INSERT INTO consumer_brands (canonical_name, slug, lifecycle_status)
     VALUES ('Task32 Synthetic Motor', 'task32-synthetic-motor', 'active') RETURNING id`,
  );
  const brandId = brandRows[0].id;

  async function createModel(name, slug) {
    const { rows: modelRows } = await client.query(
      `INSERT INTO vehicle_models (consumer_brand_id, name, slug, lifecycle_status)
       VALUES ($1, $2, $3, 'active') RETURNING id`,
      [brandId, name, slug],
    );
    const modelId = modelRows[0].id;
    const { rows: generationRows } = await client.query(
      `INSERT INTO vehicle_generations (vehicle_model_id, name, slug, start_year, end_year, lifecycle_status)
       VALUES ($1, 'Synthetic first generation', 'synthetic-first-generation', 2025, 2025, 'active')
       RETURNING id`,
      [modelId],
    );
    const generationId = generationRows[0].id;
    const { rows: modelYearRows } = await client.query(
      `INSERT INTO vehicle_model_years
         (vehicle_generation_id, market_id, model_year, identity_status)
       VALUES ($1, $2, 2025, 'provisional') RETURNING id`,
      [generationId, marketId],
    );
    const modelYearId = modelYearRows[0].id;
    const { rows: trimRows } = await client.query(
      `INSERT INTO vehicle_trims (vehicle_model_year_id, sales_name, normalized_name, lifecycle_status)
       VALUES ($1, 'Sparse Test', 'sparse test', 'active') RETURNING id`,
      [modelYearId],
    );
    const trimId = trimRows[0].id;
    const { rows: configurationRows } = await client.query(
      `INSERT INTO vehicle_configurations
         (vehicle_trim_id, configuration_key, display_label, identity_status, is_demo)
       VALUES ($1, 'task32-sparse', 'Sparse Test', 'provisional', false)
       RETURNING id`,
      [trimId],
    );
    const configurationId = configurationRows[0].id;
    const aliasSlug = `task32-${slug}`;
    return { aliasSlug, configurationId, modelId, generationId, modelYearId, trimId };
  }

  const primary = await createModel("Synthetic Alpha", "synthetic-alpha");
  const duplicateAliasSlug = `${primary.aliasSlug}-alternate`;
  const collision = await createModel("Synthetic Alpha", "synthetic-alpha-market-variant");
  const aliasCollisionA = await createModel("Synthetic Shared Name", "synthetic-shared-name-a");
  const aliasCollisionB = await createModel("Synthetic Shared Name", "synthetic-shared-name-b");
  const unreleased = await createModel("Synthetic Unreleased", "synthetic-unreleased");

  for (const model of [aliasCollisionA, aliasCollisionB]) {
    await client.query(
      `INSERT INTO vehicle_model_aliases
         (vehicle_model_id, market_id, alias, normalized_alias, locale, alias_type, valid_from)
       VALUES ($1, $2, 'Shared Synthetic Alias', 'shared synthetic alias', 'en-US', 'market_name', '2025-01-01')`,
      [model.modelId, marketId],
    );
  }

  await client.query(
    `INSERT INTO spec_field_definitions (code, value_type, dimension, canonical_unit, allowed_subject_type, label)
     VALUES
       ('horsepower', 'numeric', 'power', 'hp', 'vehicle_configuration', 'Horsepower'),
        ('mpg_combined', 'numeric', 'fuel_economy', 'mpg', 'vehicle_configuration', 'Combined fuel economy'),
       ('fuel_type', 'text', 'fuel', NULL, 'vehicle_configuration', 'Fuel type'),
       ('price_usd', 'numeric', 'currency', 'USD', 'vehicle_configuration', 'Price'),
       ('mpg_city', 'numeric', 'fuel_economy', 'mpg', 'vehicle_configuration', 'City fuel economy'),
       ('mpg_highway', 'numeric', 'fuel_economy', 'mpg', 'vehicle_configuration', 'Highway fuel economy'),
       ('body_type', 'text', 'vehicle_type', NULL, 'vehicle_configuration', 'Body type'),
        ('drivetrain', 'text', 'powertrain', NULL, 'vehicle_configuration', 'Drivetrain'),
        ('engine_name', 'numeric', 'power', 'hp', 'vehicle_configuration', 'Engine name wrong-type probe'),
        ('annual_ownership_estimate_usd', 'numeric', 'currency', 'USD/year', 'vehicle_configuration', 'Annual ownership estimate')
     ON CONFLICT (code) DO NOTHING`,
  );
  await client.query(
    `UPDATE spec_field_definitions SET canonical_unit = 'L/100km' WHERE code = 'mpg_combined'`,
  );

  async function supportConfiguration(configuration) {
    await addClaim(client, {
      claimKind: "identity",
      contentClass: "source_fact",
      subjectModelYearId: configuration.modelYearId,
      marketId,
      scopeState: "explicit_unrestricted",
      includeAlternative: false,
    });
    await client.query(
      `UPDATE vehicle_model_years SET identity_status = 'supported' WHERE id = $1`,
      [configuration.modelYearId],
    );
    const identityClaimId = await addClaim(client, {
      claimKind: "identity",
      contentClass: "source_fact",
      subjectConfigurationId: configuration.configurationId,
      marketId,
      scopeState: "explicit_unrestricted",
      includeAlternative: false,
    });
    await client.query(
      `UPDATE vehicle_configurations SET identity_status = 'supported' WHERE id = $1`,
      [configuration.configurationId],
    );
    await client.query(
      `INSERT INTO vehicle_profile_aliases
         (slug, vehicle_configuration_id, alias_kind, mapping_status)
       VALUES ($1, $2, 'canonical_profile', 'exact_supported')`,
      [configuration.aliasSlug, configuration.configurationId],
    );
    if (configuration.configurationId === primary.configurationId) {
      await client.query(
        `INSERT INTO vehicle_profile_aliases
           (slug, vehicle_configuration_id, alias_kind, mapping_status)
         VALUES ($1, $2, 'canonical_profile', 'exact_supported')`,
        [duplicateAliasSlug, configuration.configurationId],
      );
    }
    return identityClaimId;
  }
  const identityClaimId = await supportConfiguration(primary);
  const collisionIdentityClaimId = await supportConfiguration(collision);
  const aliasAIdentityClaimId = await supportConfiguration(aliasCollisionA);
  const aliasBIdentityClaimId = await supportConfiguration(aliasCollisionB);
  await supportConfiguration(unreleased);
  const ownershipSortClaimId = await addClaim(client, {
    claimKind: "ownership_estimate",
    contentClass: "estimate",
    subjectConfigurationId: aliasCollisionA.configurationId,
    marketId,
    valueCode: "annual_ownership_estimate_usd",
    value: 1_000,
  });
  const knownClaimId = await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "horsepower",
    value: 123,
  });
  await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "mpg_combined",
    value: 38,
  });
  const wrongTypeClaimId = await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "engine_name",
    valueType: "numeric",
    value: 500,
  });
  await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "fuel_type",
    valueType: "text",
    valueState: "not_applicable",
    reviewDecision: "accepted",
  });
  await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "price_usd",
    value: 35_000,
    researchStatus: "blocked",
    rights: ["allowed", "pending", "allowed"],
  });
  const staleLatestAcceptedClaimId = await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "price_usd",
    value: 48_000,
    reviewStatus: "stale",
    reviewDecision: "stale",
    additionalReviewDecisions: ["accepted"],
  });
  await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "mpg_city",
    value: 33,
    conflictEvidence: true,
  });
  await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "mpg_highway",
    value: 41,
    reviewStatus: "rejected",
    reviewDecision: "rejected",
  });
  await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    contentClass: "demo_fixture",
    valueCode: "mpg_city",
    value: 99,
  });
  await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "body_type",
    valueType: "text",
    value: "Synthetic coupe",
    reviewStatus: "stale",
    reviewDecision: "stale",
  });
  await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "drivetrain",
    valueType: "text",
    value: "Synthetic AWD",
    alternativeCompleteness: "partial",
  });
  await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "drivetrain",
    valueType: "text",
    value: "Synthetic RWD",
    includeAlternative: false,
  });
  await addClaim(client, {
    subjectConfigurationId: primary.configurationId,
    marketId,
    valueCode: "drivetrain",
    valueType: "text",
    value: "Synthetic FWD",
    alternativeConfigurationId: collision.configurationId,
  });

  const { rows: duplicateAliasRows } = await client.query(
    `SELECT normalized_alias, COUNT(DISTINCT vehicle_model_id)::int AS model_count
     FROM vehicle_model_aliases
     WHERE market_id = $1 AND normalized_alias = 'shared synthetic alias'
     GROUP BY normalized_alias`,
    [marketId],
  );
  assert.equal(duplicateAliasRows[0]?.model_count, 2);

  return {
    release: {
      configurationId: primary.configurationId,
      slug: primary.aliasSlug,
      identityClaimId,
      approvedAt: "2025-01-01T00:00:00.000Z",
      approvalReference: "task32.synthetic/release-approval",
    },
    duplicateAliasSlug,
    releases: [
      {
        configurationId: primary.configurationId,
        identityClaimId,
        slug: primary.aliasSlug,
        approvedAt: "2025-01-01T00:00:00.000Z",
        approvalReference: "task32.synthetic/release-approval",
      },
      { configurationId: collision.configurationId, identityClaimId: collisionIdentityClaimId },
      { configurationId: aliasCollisionA.configurationId, identityClaimId: aliasAIdentityClaimId },
      { configurationId: aliasCollisionB.configurationId, identityClaimId: aliasBIdentityClaimId },
    ],
    primary,
    collision,
    aliasCollisionA,
    aliasCollisionB,
    unreleased,
    marketId,
    knownClaimId,
    ownershipSortClaimId,
    wrongTypeClaimId,
    staleLatestAcceptedClaimId,
  };
}