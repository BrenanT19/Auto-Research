import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const demoBaseline = JSON.parse(
  readFileSync(resolve(scriptsDirectory, "../fixtures/auto-research-demo-baseline.json"), "utf8"),
);

const legacyTables = [
  "makes",
  "models",
  "generations",
  "model_years",
  "engines",
  "transmissions",
  "trims",
  "ownership_estimates",
  "maintenance_items",
  "common_problems",
  "recalls",
  "safety_ratings",
  "owner_reports",
];

export async function captureLegacyDatabaseState(pool) {
  const state = {};
  for (const table of legacyTables) {
    const { rows } = await pool.query(`SELECT * FROM "${table}" ORDER BY id`);
    state[table] = rows;
  }
  return state;
}

export async function captureLegacySchemaCatalog(pool) {
  const { rows: indexes } = await pool.query(
    `SELECT tablename, indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = ANY($1::text[])
     ORDER BY tablename, indexname`,
    [legacyTables],
  );
  const { rows: constraints } = await pool.query(
    `SELECT table_class.relname AS table_name,
            constraint_row.conname AS constraint_name,
            constraint_row.contype AS constraint_type,
            pg_get_constraintdef(constraint_row.oid, true) AS definition
     FROM pg_constraint AS constraint_row
     JOIN pg_class AS table_class ON table_class.oid = constraint_row.conrelid
     JOIN pg_namespace AS table_schema ON table_schema.oid = table_class.relnamespace
     WHERE table_schema.nspname = 'public'
       AND table_class.relname = ANY($1::text[])
     ORDER BY table_class.relname, constraint_row.conname`,
    [legacyTables],
  );
  return { indexes, constraints };
}

export async function assertStage2aIdentityBackfill(pool) {
  const expectedAliases = demoBaseline.tables.trims
    .map((trim) => ({
      slug: trim.slug,
      legacy_trim_id: trim.id,
      vehicle_configuration_id: null,
      alias_kind: "legacy_profile",
      mapping_status: "demo_identity_only",
    }))
    .sort((left, right) => left.legacy_trim_id - right.legacy_trim_id);
  const { rows: aliases } = await pool.query(`
    SELECT slug, legacy_trim_id, vehicle_configuration_id, alias_kind, mapping_status
    FROM vehicle_profile_aliases
    WHERE slug = ANY($1::text[])
    ORDER BY legacy_trim_id
  `, [expectedAliases.map((alias) => alias.slug)]);
  assert.deepEqual(
    aliases,
    expectedAliases,
    "The 13 public slugs must retain their legacy trim IDs and remain demo-only mappings",
  );

  const { rows: hierarchyRows } = await pool.query(`
    SELECT
      (SELECT count(*)::integer FROM consumer_brands WHERE lifecycle_status = 'watchlist') AS brands,
      (SELECT count(*)::integer FROM vehicle_models WHERE lifecycle_status = 'watchlist') AS models,
      (SELECT count(*)::integer FROM vehicle_generations WHERE lifecycle_status = 'watchlist') AS generations,
      (SELECT count(*)::integer FROM vehicle_model_years
        WHERE identity_status = 'demo_identity_only' AND market_id IS NULL) AS model_years,
      (SELECT count(*)::integer FROM vehicle_trims WHERE lifecycle_status = 'watchlist') AS trims,
      (SELECT count(*)::integer FROM vehicle_configurations) AS configurations
  `);
  const expectedCounts = {
    brands: new Set(demoBaseline.tables.makes.map((row) => row.slug)).size,
    models: demoBaseline.tables.models.length,
    generations: demoBaseline.tables.generations.length,
    model_years: demoBaseline.tables.model_years.length,
    trims: demoBaseline.tables.trims.length,
    configurations: 0,
  };
  assert.deepEqual(hierarchyRows[0], expectedCounts);

  const { rows: researchRows } = await pool.query(`
    SELECT
      (SELECT count(*)::integer FROM research_claims) AS claims,
      (SELECT count(*)::integer FROM research_sources) AS sources,
      (SELECT count(*)::integer FROM source_revisions) AS source_revisions,
      (SELECT count(*)::integer FROM evidence_items) AS evidence_items,
      (SELECT count(*)::integer FROM claim_evidence) AS claim_evidence,
      (SELECT count(*)::integer FROM claim_reviews) AS claim_reviews,
      (SELECT count(*)::integer FROM spec_claim_values) AS typed_values,
      (SELECT count(*)::integer FROM applicability_sets) AS applicability_sets,
      (SELECT count(*)::integer FROM configuration_component_fitments) AS fitments
  `);
  assert.deepEqual(researchRows[0], {
    claims: 0,
    sources: 0,
    source_revisions: 0,
    evidence_items: 0,
    claim_evidence: 0,
    claim_reviews: 0,
    typed_values: 0,
    applicability_sets: 0,
    fitments: 0,
  }, "The identity-only backfill must not turn demo metrics into claims or import sources");
}

export async function assertStage2aRolledBack(pool) {
  const { rows } = await pool.query(`
    SELECT to_regclass('public.vehicle_profile_aliases') AS aliases,
           to_regclass('public.research_claims') AS claims,
           to_regclass('public.vehicle_configurations') AS configurations
  `);
  assert.deepEqual(rows[0], { aliases: null, claims: null, configurations: null });
  const { rows: unexpectedTables } = await pool.query(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename <> ALL($1::text[])
       AND tablename <> '__drizzle_migrations'
     ORDER BY tablename`,
    [legacyTables],
  );
  assert.deepEqual(
    unexpectedTables,
    [],
    "Rollback must remove every Stage 2A table while preserving the legacy schema",
  );
  const { rows: legacyRows } = await pool.query(
    "SELECT count(*)::integer AS profiles FROM trims WHERE is_demo = true",
  );
  assert.equal(legacyRows[0].profiles, 13, "Rollback must preserve the 13 legacy demo profile rows");
}

function expectError(error, allowedCodes, message) {
  assert.ok(error, `${message}: statement unexpectedly succeeded`);
  assert.ok(
    allowedCodes.includes(error.code),
    `${message}: expected PostgreSQL code ${allowedCodes.join(" or ")}, received ${error.code}: ${error.message}`,
  );
}

async function expectStatementError(client, sql, params, allowedCodes, message) {
  await client.query("SAVEPOINT expected_constraint_failure");
  let error;
  try {
    await client.query(sql, params);
  } catch (caught) {
    error = caught;
  }
  await client.query("ROLLBACK TO SAVEPOINT expected_constraint_failure");
  await client.query("RELEASE SAVEPOINT expected_constraint_failure");
  expectError(error, allowedCodes, message);
}

async function createReviewedClaim(client, { kind, contentClass = "source_fact", evidenceId, subjects }) {
  const { rows } = await client.query(
    `INSERT INTO research_claims
       (claim_kind, content_class, research_status, review_status, evidence_strength)
     VALUES ($1, $2, 'researched', 'accepted', 'strong')
     RETURNING id`,
    [kind, contentClass],
  );
  const claimId = rows[0].id;
  for (const subject of subjects) {
    const columns = Object.keys(subject);
    assert.equal(columns.length, 1, "Test claim subjects must use exactly one typed foreign key");
    const column = columns[0];
    const allowedSubjectColumns = new Set([
      "organization_id",
      "consumer_brand_id",
      "vehicle_model_id",
      "vehicle_generation_id",
      "vehicle_model_year_id",
      "vehicle_trim_id",
      "vehicle_configuration_id",
      "component_revision_id",
      "market_id",
      "production_site_id",
    ]);
    assert.ok(allowedSubjectColumns.has(column), "Test claim subject column must be allowlisted");
    await client.query(
      `INSERT INTO claim_subjects (research_claim_id, "${column}") VALUES ($1, $2)`,
      [claimId, subject[column]],
    );
  }
  await client.query(
    `INSERT INTO claim_evidence (research_claim_id, evidence_item_id, evidence_relation)
     VALUES ($1, $2, 'supports')`,
    [claimId, evidenceId],
  );
  await client.query(
    `INSERT INTO claim_reviews (research_claim_id, decision, rationale)
     VALUES ($1, 'accepted', 'Synthetic disposable database constraint test only')`,
    [claimId],
  );
  return claimId;
}

export async function runStage2aConstraintChecks(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const sourceResult = await client.query(
      `INSERT INTO research_sources (source_key, source_kind)
       VALUES ($1, 'internal_calculation') RETURNING id`,
      [`stage2a-synthetic-${suffix}`],
    );
    const sourceId = sourceResult.rows[0].id;
    const revisionResult = await client.query(
      `INSERT INTO source_revisions
         (research_source_id, retrieved_at, format, update_behavior,
          storage_rights_status, derivative_use_rights_status, display_rights_status)
       VALUES ($1, now(), 'synthetic-test', 'ephemeral', 'allowed', 'allowed', 'allowed')
       RETURNING id`,
      [sourceId],
    );
    const revisionId = revisionResult.rows[0].id;
    const evidenceResult = await client.query(
      `INSERT INTO evidence_items (source_revision_id, locator, evidence_kind)
       VALUES ($1, 'synthetic test record', 'test_report') RETURNING id`,
      [revisionId],
    );
    const evidenceId = evidenceResult.rows[0].id;

    const brandSlug = `stage2a-test-brand-${suffix}`;
    const brand = (await client.query(
      `INSERT INTO consumer_brands (canonical_name, slug, lifecycle_status)
       VALUES ('Synthetic Test Brand', $1, 'watchlist') RETURNING id`,
      [brandSlug],
    )).rows[0];
    await expectStatementError(
      client,
      `INSERT INTO consumer_brands (canonical_name, slug)
       VALUES ('Duplicate Synthetic Brand', $1)`,
      [brandSlug],
      ["23505"],
      "Duplicate canonical brand slugs must be rejected",
    );
    const modelSlug = `stage2a-test-model-${suffix}`;
    const model = (await client.query(
      `INSERT INTO vehicle_models (consumer_brand_id, name, slug, lifecycle_status)
       VALUES ($1, 'Synthetic Test Model', $2, 'watchlist') RETURNING id`,
      [brand.id, modelSlug],
    )).rows[0];
    await expectStatementError(
      client,
      `INSERT INTO vehicle_models (consumer_brand_id, name, slug)
       VALUES ($1, 'Duplicate Synthetic Model', $2)`,
      [brand.id, modelSlug],
      ["23505"],
      "Duplicate canonical model keys must be rejected",
    );
    const generationSlug = `stage2a-test-generation-${suffix}`;
    const generation = (await client.query(
      `INSERT INTO vehicle_generations (vehicle_model_id, name, slug, lifecycle_status)
       VALUES ($1, 'Synthetic Test Generation', $2, 'watchlist') RETURNING id`,
      [model.id, generationSlug],
    )).rows[0];
    await expectStatementError(
      client,
      `INSERT INTO vehicle_generations
         (vehicle_model_id, name, slug, start_year, end_year)
       VALUES ($1, 'Invalid Synthetic Generation', $2, 2025, 2024)`,
      [model.id, `${generationSlug}-invalid-years`],
      ["23514"],
      "Invalid generation year intervals must be rejected",
    );
    const market = (await client.query(
      `INSERT INTO markets (code, name, market_type)
       VALUES ($1, 'Synthetic Test Market', 'custom_jurisdiction') RETURNING id`,
      [`TST-${suffix.toUpperCase().replaceAll(/[^A-Z0-9-]/g, "-")}`],
    )).rows[0];
    const secondMarket = (await client.query(
      `INSERT INTO markets (code, name, market_type)
       VALUES ($1, 'Second Synthetic Test Market', 'custom_jurisdiction') RETURNING id`,
      [`TST2-${suffix.toUpperCase().replaceAll(/[^A-Z0-9-]/g, "-")}`],
    )).rows[0];
    const modelYear = (await client.query(
      `INSERT INTO vehicle_model_years
         (vehicle_generation_id, market_id, model_year, identity_status)
       VALUES ($1, $2, 2024, 'provisional') RETURNING id`,
      [generation.id, market.id],
    )).rows[0];
    await expectStatementError(
      client,
      `INSERT INTO vehicle_model_years
         (vehicle_generation_id, market_id, model_year, identity_status)
       VALUES ($1, $2, 2024, 'provisional')`,
      [generation.id, market.id],
      ["23505"],
      "Duplicate canonical model-year keys in one market must be rejected",
    );
    const otherMarketYear = await client.query(
      `INSERT INTO vehicle_model_years
         (vehicle_generation_id, market_id, model_year, identity_status)
       VALUES ($1, $2, 2024, 'provisional')
       RETURNING id`,
      [generation.id, secondMarket.id],
    );
    assert.ok(otherMarketYear.rows[0].id, "The same model year must coexist in a distinct market");
    const trim = (await client.query(
      `INSERT INTO vehicle_trims (vehicle_model_year_id, sales_name, normalized_name, lifecycle_status)
       VALUES ($1, 'Synthetic Test Trim', 'synthetic test trim', 'watchlist') RETURNING id`,
      [modelYear.id],
    )).rows[0];
    await expectStatementError(
      client,
      `INSERT INTO vehicle_trims (vehicle_model_year_id, sales_name, normalized_name)
       VALUES ($1, 'Duplicate Synthetic Trim', 'synthetic test trim')`,
      [modelYear.id],
      ["23505"],
      "Duplicate canonical trim keys must be rejected",
    );
    const configuration = (await client.query(
      `INSERT INTO vehicle_configurations
         (vehicle_trim_id, configuration_key, identity_status, is_demo)
       VALUES ($1, $2, 'unresolved', false) RETURNING id`,
      [trim.id, `stage2a-test-config-${suffix}`],
    )).rows[0];
    const component = (await client.query(
      `INSERT INTO powertrain_components (component_type)
       VALUES ('motor') RETURNING id`,
    )).rows[0];
    const componentRevision = (await client.query(
      `INSERT INTO powertrain_component_revisions (component_id, revision_key, lifecycle_status)
       VALUES ($1, $2, 'active') RETURNING id`,
      [component.id, `stage2a-test-revision-${suffix}`],
    )).rows[0];

    const identityClaimId = await createReviewedClaim(client, {
      kind: "identity",
      evidenceId,
      subjects: [
        { vehicle_model_year_id: modelYear.id },
        { vehicle_configuration_id: configuration.id },
      ],
    });
    await client.query(
      `UPDATE vehicle_model_years SET identity_status = 'supported' WHERE id = $1`,
      [modelYear.id],
    );
    await client.query(
      `UPDATE vehicle_configurations SET identity_status = 'supported' WHERE id = $1`,
      [configuration.id],
    );
    const identityScope = (await client.query(
      `INSERT INTO applicability_sets (research_claim_id, scope_state, reviewed_at)
       VALUES ($1, 'restricted', now()) RETURNING id`,
      [identityClaimId],
    )).rows[0];
    await client.query(
      `INSERT INTO applicability_alternatives
         (applicability_set_id, ordinal, scope_completeness, market_id, vehicle_model_year_id, vehicle_configuration_id)
       VALUES ($1, 0, 'complete', $2, $3, $4)`,
      [identityScope.id, market.id, modelYear.id, configuration.id],
    );

    const fitmentClaimId = await createReviewedClaim(client, {
      kind: "fitment",
      evidenceId,
      subjects: [
        { vehicle_configuration_id: configuration.id },
        { component_revision_id: componentRevision.id },
      ],
    });
    await client.query(
      `INSERT INTO applicability_sets (research_claim_id, scope_state, reviewed_at)
       VALUES ($1, 'restricted', now()) RETURNING id`,
      [fitmentClaimId],
    );
    const fitmentScopeId = (await client.query(
      "SELECT id FROM applicability_sets WHERE research_claim_id = $1",
      [fitmentClaimId],
    )).rows[0].id;
    await client.query(
      `INSERT INTO applicability_alternatives
         (applicability_set_id, ordinal, scope_completeness, market_id, vehicle_configuration_id, component_revision_id)
       VALUES ($1, 0, 'complete', $2, $3, $4)`,
      [fitmentScopeId, market.id, configuration.id, componentRevision.id],
    );
    await client.query(
      `INSERT INTO configuration_component_fitments
         (vehicle_configuration_id, component_revision_id, role, position_code, fitment_status, supporting_claim_id)
       VALUES ($1, $2, 'drive_motor', 'front', 'supported', $3)`,
      [configuration.id, componentRevision.id, fitmentClaimId],
    );
    await expectStatementError(
      client,
      `INSERT INTO configuration_component_fitments
         (vehicle_configuration_id, component_revision_id, role, position_code, quantity)
       VALUES ($1, $2, 'drive_motor', 'invalid-zero-quantity', 0)`,
      [configuration.id, componentRevision.id],
      ["23514"],
      "Zero and negative component fitment quantities must be rejected",
    );
    await client.query(
      `INSERT INTO vehicle_profile_aliases
         (slug, vehicle_configuration_id, alias_kind, mapping_status)
       VALUES ($1, $2, 'canonical_profile', 'exact_supported')`,
      [`stage2a-synthetic-supported-${suffix}`, configuration.id],
    );

    const specificationClaimId = await createReviewedClaim(client, {
      kind: "specification",
      evidenceId,
      subjects: [{ component_revision_id: componentRevision.id }],
    });
    const specificationScope = (await client.query(
      `INSERT INTO applicability_sets (research_claim_id, scope_state, reviewed_at)
       VALUES ($1, 'restricted', now()) RETURNING id`,
      [specificationClaimId],
    )).rows[0];
    await client.query(
      `INSERT INTO applicability_alternatives
         (applicability_set_id, ordinal, scope_completeness, market_id, vehicle_configuration_id, component_revision_id)
       VALUES ($1, 0, 'complete', $2, $3, $4)`,
      [specificationScope.id, market.id, configuration.id, componentRevision.id],
    );
    await client.query(
      `INSERT INTO spec_claim_values
         (research_claim_id, field_code, value_type, value_state, numeric_value, normalized_unit)
       VALUES ($1, 'engine_power', 'numeric', 'known', 0, 'hp')`,
      [specificationClaimId],
    );
    const zeroFact = await client.query(
      "SELECT numeric_value FROM spec_claim_values WHERE research_claim_id = $1",
      [specificationClaimId],
    );
    assert.equal(Number(zeroFact.rows[0].numeric_value), 0, "A known numeric zero must remain representable");

    const draftClaimId = (await client.query(
      `INSERT INTO research_claims (claim_kind, content_class)
       VALUES ('known_issue', 'source_fact')
       RETURNING id`,
    )).rows[0].id;
    await expectStatementError(
      client,
      `INSERT INTO known_issue_details
         (research_claim_id, issue_system_code, symptom_summary,
          cost_low_minor_units, cost_high_minor_units, currency_code, cost_date, cost_basis)
       VALUES ($1, 'synthetic-system', 'Synthetic invalid range', 100, 50,
               'USD', '2024-01-01', 'synthetic test only')`,
      [draftClaimId],
      ["23514"],
      "Invalid typed issue cost ranges must be rejected",
    );
    await expectStatementError(
      client,
      `INSERT INTO spec_claim_values
         (research_claim_id, field_code, value_type, value_state, text_value)
       VALUES ($1, 'engine_power', 'text', 'known', 'wrong field type')`,
      [draftClaimId],
      ["23514", "23503"],
      "A typed specification must match its registered field type",
    );

    const unknownScopeClaimId = (await client.query(
      `INSERT INTO research_claims (claim_kind, content_class)
       VALUES ('specification', 'source_fact')
       RETURNING id`,
    )).rows[0].id;
    const unknownScopeSetId = (await client.query(
      `INSERT INTO applicability_sets (research_claim_id, scope_state)
       VALUES ($1, 'restricted')
       RETURNING id`,
      [unknownScopeClaimId],
    )).rows[0].id;
    await client.query(
      `INSERT INTO applicability_alternatives
         (applicability_set_id, ordinal, scope_completeness, vehicle_configuration_id)
       VALUES ($1, 0, 'partial', $2)
       `,
      [unknownScopeSetId, configuration.id],
    );
    await expectStatementError(
      client,
      `INSERT INTO applicability_alternatives
         (applicability_set_id, ordinal, scope_completeness, vehicle_configuration_id)
       VALUES ($1, 1, 'complete', $2)`,
      [unknownScopeSetId, configuration.id],
      ["23514"],
      "Complete vehicle applicability without a market must fail closed",
    );
    const staleClaimId = (await client.query(
      `INSERT INTO research_claims
         (claim_kind, content_class, research_status, review_status, evidence_strength)
       VALUES ('specification', 'source_fact', 'researched', 'stale', 'strong')
       RETURNING id`,
    )).rows[0].id;

    const unrestrictedClaimId = await createReviewedClaim(client, {
      kind: "editorial",
      contentClass: "editorial_synthesis",
      evidenceId,
      subjects: [],
    });
    await client.query(
      `INSERT INTO applicability_sets (research_claim_id, scope_state, reviewed_at)
       VALUES ($1, 'explicit_unrestricted', now())`,
      [unrestrictedClaimId],
    );
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");

    const publication = await client.query(
      `SELECT
        research_claim_is_publishable($1) AS identity_publishable,
        research_claim_is_publishable($2) AS fitment_publishable,
        research_claim_is_publishable($3) AS specification_publishable,
        research_claim_is_publishable($4) AS unrestricted_publishable`,
      [identityClaimId, fitmentClaimId, specificationClaimId, unrestrictedClaimId],
    );
    assert.deepEqual(publication.rows[0], {
      identity_publishable: true,
      fitment_publishable: true,
      specification_publishable: true,
      unrestricted_publishable: true,
    });
    await client.query(
      `INSERT INTO claim_evidence (research_claim_id, evidence_item_id, evidence_relation)
       VALUES ($1, $2, 'contradicts')`,
      [specificationClaimId, evidenceId],
    );
    const conflictingPublication = await client.query(
      "SELECT research_claim_is_publishable($1) AS publishable",
      [specificationClaimId],
    );
    assert.equal(
      conflictingPublication.rows[0].publishable,
      false,
      "Claims with conflicting evidence must not pass publication checks",
    );
    const stalePublication = await client.query(
      "SELECT research_claim_is_publishable($1) AS publishable",
      [staleClaimId],
    );
    assert.equal(
      stalePublication.rows[0].publishable,
      false,
      "Stale claims must not pass publication checks",
    );
    await expectStatementError(
      client,
      "UPDATE research_claims SET review_status = 'accepted' WHERE id = $1",
      [staleClaimId],
      ["55000", "23514"],
      "Claims must remain append-only; corrections need a new claim or review",
    );

    await expectStatementError(
      client,
      "DELETE FROM vehicle_model_years WHERE id = $1",
      [modelYear.id],
      ["23503"],
      "Referenced canonical identities must not be deleted",
    );
    await expectStatementError(
      client,
      "UPDATE source_revisions SET display_rights_status = 'denied' WHERE id = $1",
      [revisionId],
      ["55000", "23514"],
      "Source revision history must be append-only",
    );
    await expectStatementError(
      client,
      `INSERT INTO spec_claim_values
         (research_claim_id, field_code, value_type, value_state, numeric_value, normalized_unit)
       VALUES ($1, 'engine_power', 'numeric', 'known', 0, 'kW')`,
      [specificationClaimId],
      ["23514"],
      "Known numeric specifications must use the controlled canonical unit",
    );
    await expectStatementError(
      client,
      `INSERT INTO spec_claim_values
         (research_claim_id, field_code, value_type, value_state, numeric_value, normalized_unit)
       VALUES ($1, 'unreviewed_client_key', 'numeric', 'known', 0, 'hp')`,
      [specificationClaimId],
      ["23514", "23503"],
      "Unregistered typed fact keys must be rejected",
    );

    const unreviewedClaim = (await client.query(
      `INSERT INTO research_claims
         (claim_kind, content_class, research_status, review_status)
       VALUES ('specification', 'source_fact', 'not_researched', 'not_reviewed')
       RETURNING id`,
    )).rows[0].id;
    await client.query(
      `INSERT INTO claim_subjects (research_claim_id, component_revision_id)
       VALUES ($1, $2)`,
      [unreviewedClaim, componentRevision.id],
    );
    await expectStatementError(
      client,
      `INSERT INTO spec_claim_values
         (research_claim_id, field_code, value_type, value_state)
       VALUES ($1, 'engine_power', 'numeric', 'not_applicable')`,
      [unreviewedClaim],
      ["23514"],
      "Not-applicable values must have reviewed, evidenced non-demo support",
    );

    const deniedSource = (await client.query(
      `INSERT INTO research_sources (source_key, source_kind)
       VALUES ($1, 'internal_calculation') RETURNING id`,
      [`stage2a-rights-test-${suffix}`],
    )).rows[0].id;
    const unknownRightsRevision = (await client.query(
      `INSERT INTO source_revisions
         (research_source_id, retrieved_at, format, update_behavior)
       VALUES ($1, now(), 'synthetic-test', 'ephemeral') RETURNING id`,
      [deniedSource],
    )).rows[0].id;
    await expectStatementError(
      client,
      `INSERT INTO evidence_items (source_revision_id, locator, excerpt, evidence_kind)
       VALUES ($1, 'synthetic test record', 'synthetic test text', 'test_report')`,
      [unknownRightsRevision],
      ["23514"],
      "Unknown storage rights must block excerpt storage",
    );
    await expectStatementError(
      client,
      `INSERT INTO source_revisions
         (research_source_id, retrieved_at, content_hash, format, update_behavior)
       VALUES ($1, now(), 'synthetic-test-hash', 'synthetic-test', 'ephemeral')`,
      [deniedSource],
      ["23514"],
      "Unknown storage rights must block source content hashes",
    );

    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  const invalidUnrestrictedClient = await pool.connect();
  try {
    await invalidUnrestrictedClient.query("BEGIN");
    await invalidUnrestrictedClient.query(
      `INSERT INTO research_claims
         (claim_kind, content_class, research_status, review_status)
       VALUES ('specification', 'demo_fixture', 'researched', 'accepted')
       RETURNING id`,
    );
    const claimId = (await invalidUnrestrictedClient.query(
      "SELECT max(id) AS id FROM research_claims",
    )).rows[0].id;
    await invalidUnrestrictedClient.query(
      `INSERT INTO applicability_sets (research_claim_id, scope_state)
       VALUES ($1, 'explicit_unrestricted')`,
      [claimId],
    );
    let deferredError;
    try {
      await invalidUnrestrictedClient.query(
        "SET CONSTRAINTS applicability_explicit_unrestricted_support IMMEDIATE",
      );
    } catch (error) {
      deferredError = error;
    }
    expectError(
      deferredError,
      ["23514"],
      "Explicitly unrestricted scope without reviewed evidence must fail closed",
    );
  } finally {
    await invalidUnrestrictedClient.query("ROLLBACK").catch(() => {});
    invalidUnrestrictedClient.release();
  }

  const unsupportedModelYearClient = await pool.connect();
  try {
    await unsupportedModelYearClient.query("BEGIN");
    const suffix = `${process.pid}-${Date.now()}-unsupported`;
    const brandId = (await unsupportedModelYearClient.query(
      `INSERT INTO consumer_brands (canonical_name, slug)
       VALUES ('Unsupported Test Brand', $1) RETURNING id`,
      [`stage2a-unsupported-brand-${suffix}`],
    )).rows[0].id;
    const modelId = (await unsupportedModelYearClient.query(
      `INSERT INTO vehicle_models (consumer_brand_id, name, slug)
       VALUES ($1, 'Unsupported Test Model', $2) RETURNING id`,
      [brandId, `stage2a-unsupported-model-${suffix}`],
    )).rows[0].id;
    const generationId = (await unsupportedModelYearClient.query(
      `INSERT INTO vehicle_generations (vehicle_model_id, name, slug)
       VALUES ($1, 'Unsupported Test Generation', $2) RETURNING id`,
      [modelId, `stage2a-unsupported-generation-${suffix}`],
    )).rows[0].id;
    const marketId = (await unsupportedModelYearClient.query(
      `INSERT INTO markets (code, name, market_type)
       VALUES ($1, 'Unsupported Test Market', 'custom_jurisdiction') RETURNING id`,
      [`UNS-${suffix.toUpperCase().replaceAll(/[^A-Z0-9-]/g, "-")}`],
    )).rows[0].id;
    await unsupportedModelYearClient.query(
      `INSERT INTO vehicle_model_years
         (vehicle_generation_id, market_id, model_year, identity_status)
       VALUES ($1, $2, 2024, 'supported')`,
      [generationId, marketId],
    );
    let deferredError;
    try {
      await unsupportedModelYearClient.query(
        "SET CONSTRAINTS vehicle_model_year_supported_identity IMMEDIATE",
      );
    } catch (error) {
      deferredError = error;
    }
    expectError(
      deferredError,
      ["23514"],
      "Supported model years without an accepted identity claim must be rejected",
    );
  } finally {
    await unsupportedModelYearClient.query("ROLLBACK").catch(() => {});
    unsupportedModelYearClient.release();
  }
}
