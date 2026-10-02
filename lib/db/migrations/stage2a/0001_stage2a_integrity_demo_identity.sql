INSERT INTO "spec_field_definitions"
  ("code", "value_type", "dimension", "canonical_unit", "allowed_subject_type", "label")
VALUES
  ('engine_displacement', 'numeric', 'volume', 'L', 'component_revision', 'Engine displacement'),
  ('engine_power', 'numeric', 'power', 'hp', 'component_revision', 'Power output'),
  ('engine_torque', 'numeric', 'torque', 'lb-ft', 'component_revision', 'Torque output'),
  ('vehicle_length', 'numeric', 'length', 'mm', 'vehicle_configuration', 'Vehicle length'),
  ('vehicle_width', 'numeric', 'length', 'mm', 'vehicle_configuration', 'Vehicle width'),
  ('vehicle_height', 'numeric', 'length', 'mm', 'vehicle_configuration', 'Vehicle height'),
  ('fuel_economy_city', 'numeric', 'fuel_economy', 'mpg_us', 'vehicle_configuration', 'City fuel economy'),
  ('fuel_economy_highway', 'numeric', 'fuel_economy', 'mpg_us', 'vehicle_configuration', 'Highway fuel economy'),
  ('fuel_economy_combined', 'numeric', 'fuel_economy', 'mpg_us', 'vehicle_configuration', 'Combined fuel economy'),
  ('battery_capacity', 'numeric', 'energy', 'kWh', 'vehicle_configuration', 'Battery capacity'),
  ('charging_power', 'numeric', 'power', 'kW', 'vehicle_configuration', 'Charging power'),
  ('electric_range', 'numeric', 'distance', 'mi', 'vehicle_configuration', 'Electric range'),
  ('drive_layout', 'text', 'configuration', NULL, 'vehicle_configuration', 'Drive layout'),
  ('is_hybrid', 'boolean', 'attribute', NULL, 'vehicle_configuration', 'Hybrid powertrain'),
  ('battery_chemistry', 'text', 'chemistry', NULL, 'component_revision', 'Battery chemistry')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION stage2a_reject_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; add a superseding record instead', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint

CREATE TRIGGER research_claims_append_only
BEFORE UPDATE OR DELETE ON "research_claims"
FOR EACH ROW EXECUTE FUNCTION stage2a_reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER source_revisions_append_only
BEFORE UPDATE OR DELETE ON "source_revisions"
FOR EACH ROW EXECUTE FUNCTION stage2a_reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER evidence_items_append_only
BEFORE UPDATE OR DELETE ON "evidence_items"
FOR EACH ROW EXECUTE FUNCTION stage2a_reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_evidence_append_only
BEFORE UPDATE OR DELETE ON "claim_evidence"
FOR EACH ROW EXECUTE FUNCTION stage2a_reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_reviews_append_only
BEFORE UPDATE OR DELETE ON "claim_reviews"
FOR EACH ROW EXECUTE FUNCTION stage2a_reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER claim_subjects_append_only
BEFORE UPDATE OR DELETE ON "claim_subjects"
FOR EACH ROW EXECUTE FUNCTION stage2a_reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER applicability_sets_append_only
BEFORE UPDATE OR DELETE ON "applicability_sets"
FOR EACH ROW EXECUTE FUNCTION stage2a_reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER applicability_alternatives_append_only
BEFORE UPDATE OR DELETE ON "applicability_alternatives"
FOR EACH ROW EXECUTE FUNCTION stage2a_reject_history_mutation();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION stage2a_enforce_revision_storage_rights()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content_hash IS NOT NULL AND NEW.storage_rights_status <> 'allowed' THEN
    RAISE EXCEPTION 'source revision content hash requires explicitly allowed storage rights'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER source_revision_content_rights
BEFORE INSERT OR UPDATE ON "source_revisions"
FOR EACH ROW EXECUTE FUNCTION stage2a_enforce_revision_storage_rights();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION stage2a_enforce_evidence_storage_rights()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  storage_state text;
BEGIN
  IF NEW.excerpt IS NULL AND NEW.content_hash IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT storage_rights_status INTO storage_state
  FROM "source_revisions"
  WHERE id = NEW.source_revision_id;
  IF storage_state IS DISTINCT FROM 'allowed' THEN
    RAISE EXCEPTION 'evidence excerpts and hashes require explicitly allowed source storage rights'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER evidence_content_rights
BEFORE INSERT OR UPDATE ON "evidence_items"
FOR EACH ROW EXECUTE FUNCTION stage2a_enforce_evidence_storage_rights();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION stage2a_has_reviewed_evidence_claim(
  claim_id integer,
  expected_kind text DEFAULT NULL,
  require_all_rights boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "research_claims" c
    WHERE c.id = claim_id
      AND (expected_kind IS NULL OR c.claim_kind = expected_kind)
      AND c.content_class <> 'demo_fixture'
      AND c.research_status = 'researched'
      AND c.review_status = 'accepted'
      AND (
        SELECT cr.decision
        FROM "claim_reviews" cr
        WHERE cr.research_claim_id = c.id
        ORDER BY cr.reviewed_at DESC, cr.id DESC
        LIMIT 1
      ) = 'accepted'
      AND EXISTS (
        SELECT 1
        FROM "claim_evidence" ce
        JOIN "evidence_items" ei ON ei.id = ce.evidence_item_id
        JOIN "source_revisions" sr ON sr.id = ei.source_revision_id
        WHERE ce.research_claim_id = c.id
          AND ce.evidence_relation = 'supports'
          AND sr.storage_rights_status = 'allowed'
          AND (
            NOT require_all_rights OR (
              sr.derivative_use_rights_status = 'allowed'
              AND sr.display_rights_status = 'allowed'
            )
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "claim_evidence" conflict
        WHERE conflict.research_claim_id = c.id
          AND conflict.evidence_relation = 'contradicts'
      )
      AND (
        NOT require_all_rights OR NOT EXISTS (
          SELECT 1
          FROM "claim_evidence" linked
          JOIN "evidence_items" linked_item ON linked_item.id = linked.evidence_item_id
          JOIN "source_revisions" linked_revision ON linked_revision.id = linked_item.source_revision_id
          WHERE linked.research_claim_id = c.id
            AND linked.evidence_relation <> 'derived_from'
            AND (
              linked_revision.storage_rights_status <> 'allowed'
              OR linked_revision.derivative_use_rights_status <> 'allowed'
              OR linked_revision.display_rights_status <> 'allowed'
            )
        )
      )
  );
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION stage2a_enforce_spec_value_contract()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  field_type text;
  field_unit text;
  allowed_subject text;
  actual_subject text;
  subject_count integer;
  claim_class text;
BEGIN
  SELECT value_type, canonical_unit, allowed_subject_type
    INTO field_type, field_unit, allowed_subject
  FROM "spec_field_definitions"
  WHERE code = NEW.field_code AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'specification field is missing or inactive'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.value_type <> field_type THEN
    RAISE EXCEPTION 'specification value type does not match the controlled field definition'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*),
    max(CASE
      WHEN organization_id IS NOT NULL THEN 'organization'
      WHEN consumer_brand_id IS NOT NULL THEN 'consumer_brand'
      WHEN vehicle_model_id IS NOT NULL THEN 'vehicle_model'
      WHEN vehicle_generation_id IS NOT NULL THEN 'vehicle_generation'
      WHEN vehicle_model_year_id IS NOT NULL THEN 'vehicle_model_year'
      WHEN vehicle_trim_id IS NOT NULL THEN 'vehicle_trim'
      WHEN vehicle_configuration_id IS NOT NULL THEN 'vehicle_configuration'
      WHEN component_revision_id IS NOT NULL THEN 'component_revision'
      WHEN market_id IS NOT NULL THEN 'market'
      WHEN production_site_id IS NOT NULL THEN 'production_site'
    END)
    INTO subject_count, actual_subject
  FROM "claim_subjects"
  WHERE research_claim_id = NEW.research_claim_id;
  IF subject_count <> 1 OR actual_subject IS DISTINCT FROM allowed_subject THEN
    RAISE EXCEPTION 'specification value subject does not match the controlled field definition'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.value_state = 'known' AND NEW.value_type = 'numeric'
      AND NEW.normalized_unit IS DISTINCT FROM field_unit THEN
    RAISE EXCEPTION 'known numeric specification must use the canonical unit'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.value_type <> 'numeric' AND NEW.normalized_unit IS NOT NULL THEN
    RAISE EXCEPTION 'text and boolean specifications cannot have a normalized unit'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.value_state = 'not_applicable' THEN
    SELECT content_class INTO claim_class
    FROM "research_claims"
    WHERE id = NEW.research_claim_id;
    IF claim_class = 'demo_fixture'
      OR NOT stage2a_has_reviewed_evidence_claim(NEW.research_claim_id, 'specification', false) THEN
      RAISE EXCEPTION 'not-applicable values require a reviewed, evidenced non-demo specification claim'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER spec_claim_values_contract
BEFORE INSERT OR UPDATE ON "spec_claim_values"
FOR EACH ROW EXECUTE FUNCTION stage2a_enforce_spec_value_contract();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION stage2a_validate_supported_model_year()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.identity_status = 'supported' AND NOT EXISTS (
    SELECT 1
    FROM "claim_subjects" cs
    JOIN "research_claims" c ON c.id = cs.research_claim_id
    WHERE cs.vehicle_model_year_id = NEW.id
      AND c.claim_kind = 'identity'
      AND stage2a_has_reviewed_evidence_claim(c.id, 'identity', false)
  ) THEN
    RAISE EXCEPTION 'supported model years require an accepted, evidenced non-demo identity claim'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER vehicle_model_year_supported_identity
AFTER INSERT OR UPDATE ON "vehicle_model_years"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION stage2a_validate_supported_model_year();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION stage2a_validate_supported_configuration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  year_status text;
  year_market_id integer;
BEGIN
  IF NEW.identity_status <> 'supported' THEN
    RETURN NEW;
  END IF;
  IF NEW.is_demo IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'supported configurations cannot remain classified as demo'
      USING ERRCODE = '23514';
  END IF;
  SELECT my.identity_status, my.market_id
    INTO year_status, year_market_id
  FROM "vehicle_trims" vt
  JOIN "vehicle_model_years" my ON my.id = vt.vehicle_model_year_id
  WHERE vt.id = NEW.vehicle_trim_id;
  IF year_status IS DISTINCT FROM 'supported' OR year_market_id IS NULL THEN
    RAISE EXCEPTION 'supported configurations require a supported, market-scoped model year'
      USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM "claim_subjects" cs
    JOIN "research_claims" c ON c.id = cs.research_claim_id
    WHERE cs.vehicle_configuration_id = NEW.id
      AND c.claim_kind = 'identity'
      AND stage2a_has_reviewed_evidence_claim(c.id, 'identity', false)
  ) THEN
    RAISE EXCEPTION 'supported configurations require an accepted, evidenced non-demo identity claim'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER vehicle_configuration_supported_identity
AFTER INSERT OR UPDATE ON "vehicle_configurations"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION stage2a_validate_supported_configuration();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION stage2a_validate_supported_fitment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  config_status text;
  config_is_demo boolean;
BEGIN
  IF NEW.fitment_status <> 'supported' THEN
    RETURN NEW;
  END IF;
  SELECT identity_status, is_demo INTO config_status, config_is_demo
  FROM "vehicle_configurations"
  WHERE id = NEW.vehicle_configuration_id;
  IF config_status IS DISTINCT FROM 'supported' OR config_is_demo IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'supported fitments require a supported non-demo configuration'
      USING ERRCODE = '23514';
  END IF;
  IF NOT stage2a_has_reviewed_evidence_claim(NEW.supporting_claim_id, 'fitment', false) THEN
    RAISE EXCEPTION 'supported fitments require an accepted, evidenced non-demo fitment claim'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER configuration_component_fitment_support
BEFORE INSERT OR UPDATE ON "configuration_component_fitments"
FOR EACH ROW EXECUTE FUNCTION stage2a_validate_supported_fitment();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION stage2a_validate_exact_profile_alias()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  config_status text;
  config_is_demo boolean;
BEGIN
  IF NEW.mapping_status <> 'exact_supported' THEN
    RETURN NEW;
  END IF;
  SELECT identity_status, is_demo INTO config_status, config_is_demo
  FROM "vehicle_configurations"
  WHERE id = NEW.vehicle_configuration_id;
  IF config_status IS DISTINCT FROM 'supported' OR config_is_demo IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'exact supported aliases require a supported non-demo configuration'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER vehicle_profile_alias_exact_support
BEFORE INSERT OR UPDATE ON "vehicle_profile_aliases"
FOR EACH ROW EXECUTE FUNCTION stage2a_validate_exact_profile_alias();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION stage2a_validate_unrestricted_applicability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.scope_state = 'explicit_unrestricted'
      AND NOT stage2a_has_reviewed_evidence_claim(NEW.research_claim_id, NULL, true) THEN
    RAISE EXCEPTION 'explicitly unrestricted applicability requires an accepted, evidenced non-demo claim with allowed rights'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER applicability_explicit_unrestricted_support
AFTER INSERT OR UPDATE ON "applicability_sets"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION stage2a_validate_unrestricted_applicability();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION research_claim_is_publishable(claim_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT
      c.content_class <> 'demo_fixture'
      AND c.research_status = 'researched'
      AND c.review_status = 'accepted'
      AND stage2a_has_reviewed_evidence_claim(c.id, NULL, true)
      AND NOT EXISTS (
        SELECT 1 FROM "claim_evidence" ce
        WHERE ce.research_claim_id = c.id
          AND ce.evidence_relation = 'contradicts'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "claim_subjects" cs
        LEFT JOIN "vehicle_model_years" my ON my.id = cs.vehicle_model_year_id
        LEFT JOIN "vehicle_trims" vt ON vt.id = cs.vehicle_trim_id
        LEFT JOIN "vehicle_model_years" trim_year ON trim_year.id = vt.vehicle_model_year_id
        LEFT JOIN "vehicle_configurations" vc ON vc.id = cs.vehicle_configuration_id
        LEFT JOIN "vehicle_trims" config_trim ON config_trim.id = vc.vehicle_trim_id
        LEFT JOIN "vehicle_model_years" config_year ON config_year.id = config_trim.vehicle_model_year_id
        WHERE cs.research_claim_id = c.id
          AND (
            (cs.vehicle_model_year_id IS NOT NULL AND (my.identity_status <> 'supported' OR my.market_id IS NULL))
            OR (cs.vehicle_trim_id IS NOT NULL AND (trim_year.identity_status <> 'supported' OR trim_year.market_id IS NULL))
            OR (cs.vehicle_configuration_id IS NOT NULL AND (vc.identity_status <> 'supported' OR vc.is_demo OR config_year.identity_status <> 'supported' OR config_year.market_id IS NULL))
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "claim_subjects" cs
        WHERE cs.research_claim_id = c.id
          AND (
            cs.vehicle_model_id IS NOT NULL OR cs.vehicle_generation_id IS NOT NULL
            OR cs.vehicle_model_year_id IS NOT NULL OR cs.vehicle_trim_id IS NOT NULL
            OR cs.vehicle_configuration_id IS NOT NULL OR cs.component_revision_id IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1
            FROM "applicability_sets" aps
            WHERE aps.research_claim_id = c.id
              AND (
                aps.scope_state = 'explicit_unrestricted'
                OR (
                  aps.scope_state = 'restricted'
                  AND EXISTS (
                    SELECT 1 FROM "applicability_alternatives" aa
                    WHERE aa.applicability_set_id = aps.id
                      AND aa.scope_completeness = 'complete'
                  )
                )
              )
          )
        )
    FROM "research_claims" c
    WHERE c.id = claim_id
  ), false);
$$;