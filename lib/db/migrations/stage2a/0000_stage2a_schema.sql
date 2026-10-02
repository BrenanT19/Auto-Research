CREATE TABLE "calculation_method_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"method_code" text NOT NULL,
	"version" text NOT NULL,
	"description" text NOT NULL,
	"input_contract_version" text NOT NULL,
	"output_contract_version" text NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"implementation_reference" text,
	"implementation_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calculation_method_versions_code_check" CHECK (length(btrim("calculation_method_versions"."method_code")) > 0 AND length(btrim("calculation_method_versions"."version")) > 0),
	CONSTRAINT "calculation_method_versions_effective_dates_check" CHECK ("calculation_method_versions"."effective_from" IS NULL OR "calculation_method_versions"."effective_to" IS NULL OR "calculation_method_versions"."effective_to" >= "calculation_method_versions"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "research_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"claim_kind" text NOT NULL,
	"content_class" text NOT NULL,
	"research_status" text DEFAULT 'not_researched' NOT NULL,
	"review_status" text DEFAULT 'not_reviewed' NOT NULL,
	"evidence_strength" text DEFAULT 'not_assessed' NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"supersedes_claim_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "research_claims_kind_check" CHECK ("research_claims"."claim_kind" IN ('brand_origin', 'identity', 'specification', 'fitment', 'reliability', 'known_issue', 'maintenance', 'recall', 'safety_rating', 'ownership_estimate', 'calculation', 'editorial', 'owner_pattern', 'owner_experience')),
	CONSTRAINT "research_claims_content_class_check" CHECK ("research_claims"."content_class" IN ('source_fact', 'estimate', 'calculation', 'editorial_synthesis', 'external_owner_pattern', 'direct_owner_experience', 'demo_fixture')),
	CONSTRAINT "research_claims_research_status_check" CHECK ("research_claims"."research_status" IN ('not_researched', 'researching', 'researched', 'blocked')),
	CONSTRAINT "research_claims_review_status_check" CHECK ("research_claims"."review_status" IN ('not_reviewed', 'in_review', 'accepted', 'rejected', 'stale', 'superseded')),
	CONSTRAINT "research_claims_evidence_strength_check" CHECK ("research_claims"."evidence_strength" IN ('not_assessed', 'low', 'moderate', 'strong')),
	CONSTRAINT "research_claims_effective_dates_check" CHECK ("research_claims"."effective_from" IS NULL OR "research_claims"."effective_to" IS NULL OR "research_claims"."effective_to" >= "research_claims"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "brand_organization_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumer_brand_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"supporting_claim_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_organization_relationships_type_check" CHECK ("brand_organization_relationships"."relationship_type" IN ('created_by', 'owned_by', 'controlled_by', 'licensed_to', 'operated_by', 'manufactured_by', 'other_reviewed')),
	CONSTRAINT "brand_organization_relationships_dates_check" CHECK ("brand_organization_relationships"."valid_from" IS NULL OR "brand_organization_relationships"."valid_to" IS NULL OR "brand_organization_relationships"."valid_to" >= "brand_organization_relationships"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "brand_origin_claim_details" (
	"research_claim_id" integer PRIMARY KEY NOT NULL,
	"consumer_brand_id" integer NOT NULL,
	"country_code" text NOT NULL,
	"origin_basis" text NOT NULL,
	"explanation" text,
	CONSTRAINT "brand_origin_country_code_check" CHECK ("brand_origin_claim_details"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "brand_origin_basis_check" CHECK ("brand_origin_claim_details"."origin_basis" IN ('founded_in', 'historical_identity', 'other_reviewed_basis'))
);
--> statement-breakpoint
CREATE TABLE "configuration_component_fitments" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_configuration_id" integer NOT NULL,
	"component_revision_id" integer NOT NULL,
	"role" text NOT NULL,
	"position_code" text DEFAULT 'system' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"fitment_status" text DEFAULT 'provisional' NOT NULL,
	"supporting_claim_id" integer,
	CONSTRAINT "configuration_component_fitments_role_check" CHECK ("configuration_component_fitments"."role" IN ('engine', 'transmission', 'drive_motor', 'battery', 'fuel_cell', 'energy_system', 'other_reviewed_role')),
	CONSTRAINT "configuration_component_fitments_position_nonempty_check" CHECK (length(btrim("configuration_component_fitments"."position_code")) > 0),
	CONSTRAINT "configuration_component_fitments_quantity_check" CHECK ("configuration_component_fitments"."quantity" > 0),
	CONSTRAINT "configuration_component_fitments_status_check" CHECK ("configuration_component_fitments"."fitment_status" IN ('provisional', 'supported', 'rejected')),
	CONSTRAINT "configuration_component_fitments_supported_claim_check" CHECK ("configuration_component_fitments"."fitment_status" <> 'supported' OR "configuration_component_fitments"."supporting_claim_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "consumer_brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"canonical_name" text NOT NULL,
	"slug" text NOT NULL,
	"lifecycle_status" text DEFAULT 'watchlist' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consumer_brands_name_nonempty_check" CHECK (length(btrim("consumer_brands"."canonical_name")) > 0),
	CONSTRAINT "consumer_brands_slug_normalized_check" CHECK ("consumer_brands"."slug" = lower(btrim("consumer_brands"."slug")) AND "consumer_brands"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "consumer_brands_lifecycle_status_check" CHECK ("consumer_brands"."lifecycle_status" IN ('active', 'discontinued', 'watchlist', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"market_type" text NOT NULL,
	"parent_market_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "markets_code_nonempty_check" CHECK (length(btrim("markets"."code")) > 0),
	CONSTRAINT "markets_name_nonempty_check" CHECK (length(btrim("markets"."name")) > 0),
	CONSTRAINT "markets_market_type_check" CHECK ("markets"."market_type" IN ('country', 'subdivision', 'custom_jurisdiction')),
	CONSTRAINT "markets_not_self_parent_check" CHECK ("markets"."parent_market_id" IS NULL OR "markets"."parent_market_id" <> "markets"."id")
);
--> statement-breakpoint
CREATE TABLE "organization_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_organization_id" integer NOT NULL,
	"child_organization_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"supporting_claim_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_relationships_type_check" CHECK ("organization_relationships"."relationship_type" IN ('parent_of', 'controls', 'subsidiary_of', 'successor_of', 'other_reviewed')),
	CONSTRAINT "organization_relationships_not_self_check" CHECK ("organization_relationships"."parent_organization_id" <> "organization_relationships"."child_organization_id"),
	CONSTRAINT "organization_relationships_dates_check" CHECK ("organization_relationships"."valid_from" IS NULL OR "organization_relationships"."valid_to" IS NULL OR "organization_relationships"."valid_to" >= "organization_relationships"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"legal_name" text NOT NULL,
	"jurisdiction_country_code" text NOT NULL,
	"jurisdiction_region_code" text,
	"registry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_name_nonempty_check" CHECK (length(btrim("organizations"."legal_name")) > 0),
	CONSTRAINT "organizations_jurisdiction_codes_check" CHECK ("organizations"."jurisdiction_country_code" ~ '^[A-Z]{2}$' AND ("organizations"."jurisdiction_region_code" IS NULL OR length(btrim("organizations"."jurisdiction_region_code")) > 0))
);
--> statement-breakpoint
CREATE TABLE "powertrain_component_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"component_id" integer NOT NULL,
	"revision_key" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"lifecycle_status" text DEFAULT 'watchlist' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "powertrain_component_revisions_key_nonempty_check" CHECK (length(btrim("powertrain_component_revisions"."revision_key")) > 0),
	CONSTRAINT "powertrain_component_revisions_dates_check" CHECK ("powertrain_component_revisions"."valid_from" IS NULL OR "powertrain_component_revisions"."valid_to" IS NULL OR "powertrain_component_revisions"."valid_to" >= "powertrain_component_revisions"."valid_from"),
	CONSTRAINT "powertrain_component_revisions_status_check" CHECK ("powertrain_component_revisions"."lifecycle_status" IN ('active', 'discontinued', 'watchlist', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "powertrain_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"component_type" text NOT NULL,
	"responsible_organization_id" integer,
	"source_namespace" text,
	"source_identity_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "powertrain_components_type_check" CHECK ("powertrain_components"."component_type" IN ('engine', 'transmission', 'motor', 'battery', 'fuel_cell', 'energy_system', 'other_reviewed_type')),
	CONSTRAINT "powertrain_components_source_identity_pair_check" CHECK (("powertrain_components"."source_namespace" IS NULL) = ("powertrain_components"."source_identity_key" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "production_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"market_id" integer NOT NULL,
	"site_code" text,
	"name" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"supporting_claim_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_sites_name_nonempty_check" CHECK (length(btrim("production_sites"."name")) > 0),
	CONSTRAINT "production_sites_site_code_nonempty_check" CHECK ("production_sites"."site_code" IS NULL OR length(btrim("production_sites"."site_code")) > 0),
	CONSTRAINT "production_sites_dates_check" CHECK ("production_sites"."valid_from" IS NULL OR "production_sites"."valid_to" IS NULL OR "production_sites"."valid_to" >= "production_sites"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "vehicle_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_trim_id" integer NOT NULL,
	"configuration_key" text,
	"display_label" text,
	"identity_status" text DEFAULT 'unresolved' NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_configurations_identity_status_check" CHECK ("vehicle_configurations"."identity_status" IN ('unresolved', 'provisional', 'supported', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "vehicle_generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_model_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"start_year" integer,
	"end_year" integer,
	"lifecycle_status" text DEFAULT 'watchlist' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_generations_name_nonempty_check" CHECK (length(btrim("vehicle_generations"."name")) > 0),
	CONSTRAINT "vehicle_generations_slug_normalized_check" CHECK ("vehicle_generations"."slug" = lower(btrim("vehicle_generations"."slug")) AND "vehicle_generations"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "vehicle_generations_year_range_check" CHECK ("vehicle_generations"."start_year" IS NULL OR "vehicle_generations"."end_year" IS NULL OR "vehicle_generations"."end_year" >= "vehicle_generations"."start_year"),
	CONSTRAINT "vehicle_generations_lifecycle_status_check" CHECK ("vehicle_generations"."lifecycle_status" IN ('active', 'discontinued', 'watchlist', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "vehicle_model_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_model_id" integer NOT NULL,
	"market_id" integer NOT NULL,
	"alias" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"locale" text NOT NULL,
	"alias_type" text NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	CONSTRAINT "vehicle_model_aliases_alias_nonempty_check" CHECK (length(btrim("vehicle_model_aliases"."alias")) > 0),
	CONSTRAINT "vehicle_model_aliases_normalized_nonempty_check" CHECK (length(btrim("vehicle_model_aliases"."normalized_alias")) > 0),
	CONSTRAINT "vehicle_model_aliases_locale_nonempty_check" CHECK (length(btrim("vehicle_model_aliases"."locale")) > 0),
	CONSTRAINT "vehicle_model_aliases_type_nonempty_check" CHECK (length(btrim("vehicle_model_aliases"."alias_type")) > 0),
	CONSTRAINT "vehicle_model_aliases_dates_check" CHECK ("vehicle_model_aliases"."valid_from" IS NULL OR "vehicle_model_aliases"."valid_to" IS NULL OR "vehicle_model_aliases"."valid_to" >= "vehicle_model_aliases"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "vehicle_model_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_generation_id" integer NOT NULL,
	"market_id" integer,
	"model_year" integer NOT NULL,
	"source_identifier" text,
	"identity_status" text DEFAULT 'demo_identity_only' NOT NULL,
	CONSTRAINT "vehicle_model_years_identity_status_check" CHECK ("vehicle_model_years"."identity_status" IN ('demo_identity_only', 'provisional', 'supported', 'retired')),
	CONSTRAINT "vehicle_model_years_supported_market_check" CHECK ("vehicle_model_years"."identity_status" <> 'supported' OR "vehicle_model_years"."market_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "vehicle_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumer_brand_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"lifecycle_status" text DEFAULT 'watchlist' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_models_name_nonempty_check" CHECK (length(btrim("vehicle_models"."name")) > 0),
	CONSTRAINT "vehicle_models_slug_normalized_check" CHECK ("vehicle_models"."slug" = lower(btrim("vehicle_models"."slug")) AND "vehicle_models"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "vehicle_models_lifecycle_status_check" CHECK ("vehicle_models"."lifecycle_status" IN ('active', 'discontinued', 'watchlist', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "vehicle_production_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer,
	"configuration_id" integer,
	"production_site_id" integer NOT NULL,
	"production_role" text NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"supporting_claim_id" integer,
	CONSTRAINT "vehicle_production_assignments_one_scope_check" CHECK (num_nonnulls("vehicle_production_assignments"."model_year_id", "vehicle_production_assignments"."configuration_id") = 1),
	CONSTRAINT "vehicle_production_assignments_role_check" CHECK ("vehicle_production_assignments"."production_role" IN ('final_assembly', 'vehicle_manufacture', 'engine', 'battery', 'other_reviewed_role')),
	CONSTRAINT "vehicle_production_assignments_dates_check" CHECK ("vehicle_production_assignments"."valid_from" IS NULL OR "vehicle_production_assignments"."valid_to" IS NULL OR "vehicle_production_assignments"."valid_to" >= "vehicle_production_assignments"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "vehicle_profile_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"legacy_trim_id" integer,
	"vehicle_configuration_id" integer,
	"alias_kind" text NOT NULL,
	"mapping_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_profile_aliases_slug_normalized_check" CHECK ("vehicle_profile_aliases"."slug" = lower(btrim("vehicle_profile_aliases"."slug")) AND "vehicle_profile_aliases"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "vehicle_profile_aliases_kind_check" CHECK ("vehicle_profile_aliases"."alias_kind" IN ('legacy_profile', 'canonical_profile')),
	CONSTRAINT "vehicle_profile_aliases_mapping_status_check" CHECK ("vehicle_profile_aliases"."mapping_status" IN ('demo_identity_only', 'exact_supported', 'ambiguous', 'unresolved', 'retired')),
	CONSTRAINT "vehicle_profile_aliases_target_check" CHECK (("vehicle_profile_aliases"."alias_kind" = 'legacy_profile' AND "vehicle_profile_aliases"."legacy_trim_id" IS NOT NULL) OR ("vehicle_profile_aliases"."alias_kind" = 'canonical_profile' AND "vehicle_profile_aliases"."vehicle_configuration_id" IS NOT NULL)),
	CONSTRAINT "vehicle_profile_aliases_exact_supported_target_check" CHECK ("vehicle_profile_aliases"."mapping_status" <> 'exact_supported' OR "vehicle_profile_aliases"."vehicle_configuration_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "vehicle_trims" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_model_year_id" integer NOT NULL,
	"sales_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"oem_trim_code" text,
	"lifecycle_status" text DEFAULT 'watchlist' NOT NULL,
	CONSTRAINT "vehicle_trims_sales_name_nonempty_check" CHECK (length(btrim("vehicle_trims"."sales_name")) > 0),
	CONSTRAINT "vehicle_trims_normalized_name_check" CHECK ("vehicle_trims"."normalized_name" = lower(btrim("vehicle_trims"."normalized_name")) AND length("vehicle_trims"."normalized_name") > 0),
	CONSTRAINT "vehicle_trims_lifecycle_status_check" CHECK ("vehicle_trims"."lifecycle_status" IN ('active', 'discontinued', 'watchlist', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "claim_evidence" (
	"research_claim_id" integer NOT NULL,
	"evidence_item_id" integer NOT NULL,
	"evidence_relation" text NOT NULL,
	"locator_note" text,
	CONSTRAINT "claim_evidence_pk" PRIMARY KEY("research_claim_id","evidence_item_id","evidence_relation"),
	CONSTRAINT "claim_evidence_relation_check" CHECK ("claim_evidence"."evidence_relation" IN ('supports', 'contradicts', 'qualifies', 'derived_from'))
);
--> statement-breakpoint
CREATE TABLE "claim_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_claim_id" integer NOT NULL,
	"decision" text NOT NULL,
	"reviewer_reference" text,
	"rationale" text NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claim_reviews_decision_check" CHECK ("claim_reviews"."decision" IN ('accepted', 'rejected', 'stale', 'superseded')),
	CONSTRAINT "claim_reviews_rationale_nonempty_check" CHECK (length(btrim("claim_reviews"."rationale")) > 0)
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_revision_id" integer NOT NULL,
	"locator" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"excerpt" text,
	"content_hash" text,
	"evidence_kind" text NOT NULL,
	CONSTRAINT "evidence_items_locator_nonempty_check" CHECK (length(btrim("evidence_items"."locator")) > 0),
	CONSTRAINT "evidence_items_kind_check" CHECK ("evidence_items"."evidence_kind" IN ('table_cell', 'document_section', 'dataset_record', 'api_record', 'test_report', 'derived_input', 'other_reviewed'))
);
--> statement-breakpoint
CREATE TABLE "research_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"publisher_organization_id" integer,
	"source_key" text NOT NULL,
	"source_kind" text NOT NULL,
	"canonical_url" text,
	"market_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "research_sources_key_nonempty_check" CHECK (length(btrim("research_sources"."source_key")) > 0),
	CONSTRAINT "research_sources_kind_check" CHECK ("research_sources"."source_kind" IN ('government', 'oem_document', 'standards_body', 'peer_reviewed_research', 'insurer', 'survey', 'owner_forum', 'internal_calculation', 'other_reviewed')),
	CONSTRAINT "research_sources_url_nonempty_check" CHECK ("research_sources"."canonical_url" IS NULL OR length(btrim("research_sources"."canonical_url")) > 0)
);
--> statement-breakpoint
CREATE TABLE "source_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_source_id" integer NOT NULL,
	"document_identifier" text,
	"source_version" text,
	"published_at" timestamp with time zone,
	"retrieved_at" timestamp with time zone NOT NULL,
	"content_hash" text,
	"format" text NOT NULL,
	"update_behavior" text NOT NULL,
	"terms_url" text,
	"terms_version" text,
	"terms_reviewed_at" timestamp with time zone,
	"storage_rights_status" text DEFAULT 'unknown' NOT NULL,
	"derivative_use_rights_status" text DEFAULT 'unknown' NOT NULL,
	"display_rights_status" text DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_revisions_rights_state_check" CHECK ("source_revisions"."storage_rights_status" IN ('unknown', 'pending', 'allowed', 'restricted', 'denied') AND "source_revisions"."derivative_use_rights_status" IN ('unknown', 'pending', 'allowed', 'restricted', 'denied') AND "source_revisions"."display_rights_status" IN ('unknown', 'pending', 'allowed', 'restricted', 'denied')),
	CONSTRAINT "source_revisions_format_nonempty_check" CHECK (length(btrim("source_revisions"."format")) > 0),
	CONSTRAINT "source_revisions_update_behavior_nonempty_check" CHECK (length(btrim("source_revisions"."update_behavior")) > 0)
);
--> statement-breakpoint
CREATE TABLE "claim_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_claim_id" integer NOT NULL,
	"organization_id" integer,
	"consumer_brand_id" integer,
	"vehicle_model_id" integer,
	"vehicle_generation_id" integer,
	"vehicle_model_year_id" integer,
	"vehicle_trim_id" integer,
	"vehicle_configuration_id" integer,
	"component_revision_id" integer,
	"market_id" integer,
	"production_site_id" integer,
	CONSTRAINT "claim_subjects_exactly_one_subject_check" CHECK (num_nonnulls("claim_subjects"."organization_id", "claim_subjects"."consumer_brand_id", "claim_subjects"."vehicle_model_id", "claim_subjects"."vehicle_generation_id", "claim_subjects"."vehicle_model_year_id", "claim_subjects"."vehicle_trim_id", "claim_subjects"."vehicle_configuration_id", "claim_subjects"."component_revision_id", "claim_subjects"."market_id", "claim_subjects"."production_site_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "applicability_alternatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicability_set_id" integer NOT NULL,
	"ordinal" integer NOT NULL,
	"scope_completeness" text NOT NULL,
	"market_id" integer,
	"vehicle_model_id" integer,
	"vehicle_generation_id" integer,
	"vehicle_model_year_id" integer,
	"vehicle_trim_id" integer,
	"vehicle_configuration_id" integer,
	"component_revision_id" integer,
	"package_code" text,
	"build_date_from" date,
	"build_date_to" date,
	CONSTRAINT "applicability_alternatives_completeness_check" CHECK ("applicability_alternatives"."scope_completeness" IN ('complete', 'partial', 'unknown')),
	CONSTRAINT "applicability_alternatives_ordinal_check" CHECK ("applicability_alternatives"."ordinal" >= 0),
	CONSTRAINT "applicability_alternatives_build_dates_check" CHECK ("applicability_alternatives"."build_date_from" IS NULL OR "applicability_alternatives"."build_date_to" IS NULL OR "applicability_alternatives"."build_date_to" >= "applicability_alternatives"."build_date_from"),
	CONSTRAINT "applicability_alternatives_restricted_predicate_check" CHECK (num_nonnulls("applicability_alternatives"."market_id", "applicability_alternatives"."vehicle_model_id", "applicability_alternatives"."vehicle_generation_id", "applicability_alternatives"."vehicle_model_year_id", "applicability_alternatives"."vehicle_trim_id", "applicability_alternatives"."vehicle_configuration_id", "applicability_alternatives"."component_revision_id", "applicability_alternatives"."package_code", "applicability_alternatives"."build_date_from", "applicability_alternatives"."build_date_to") > 0)
);
--> statement-breakpoint
CREATE TABLE "applicability_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_claim_id" integer NOT NULL,
	"scope_state" text NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applicability_sets_scope_state_check" CHECK ("applicability_sets"."scope_state" IN ('restricted', 'explicit_unrestricted', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE "spec_claim_values" (
	"research_claim_id" integer PRIMARY KEY NOT NULL,
	"field_code" text NOT NULL,
	"value_type" text NOT NULL,
	"value_state" text NOT NULL,
	"numeric_value" numeric(24, 8),
	"text_value" text,
	"boolean_value" boolean,
	"original_source_value" text,
	"original_source_unit" text,
	"normalized_unit" text,
	"measurement_basis" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spec_claim_values_state_check" CHECK ("spec_claim_values"."value_state" IN ('known', 'unknown', 'not_applicable')),
	CONSTRAINT "spec_claim_values_typed_value_check" CHECK ((
        "spec_claim_values"."value_state" = 'known' AND (
          ("spec_claim_values"."value_type" = 'numeric' AND "spec_claim_values"."numeric_value" IS NOT NULL AND "spec_claim_values"."text_value" IS NULL AND "spec_claim_values"."boolean_value" IS NULL)
          OR ("spec_claim_values"."value_type" = 'text' AND "spec_claim_values"."numeric_value" IS NULL AND "spec_claim_values"."text_value" IS NOT NULL AND "spec_claim_values"."boolean_value" IS NULL)
          OR ("spec_claim_values"."value_type" = 'boolean' AND "spec_claim_values"."numeric_value" IS NULL AND "spec_claim_values"."text_value" IS NULL AND "spec_claim_values"."boolean_value" IS NOT NULL)
        )
      ) OR (
        "spec_claim_values"."value_state" IN ('unknown', 'not_applicable') AND
        "spec_claim_values"."numeric_value" IS NULL AND "spec_claim_values"."text_value" IS NULL AND "spec_claim_values"."boolean_value" IS NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "spec_field_definitions" (
	"code" text PRIMARY KEY NOT NULL,
	"value_type" text NOT NULL,
	"dimension" text NOT NULL,
	"canonical_unit" text,
	"allowed_subject_type" text NOT NULL,
	"label" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "spec_field_definitions_value_type_check" CHECK ("spec_field_definitions"."value_type" IN ('numeric', 'text', 'boolean')),
	CONSTRAINT "spec_field_definitions_subject_type_check" CHECK ("spec_field_definitions"."allowed_subject_type" IN ('organization', 'consumer_brand', 'vehicle_model', 'vehicle_generation', 'vehicle_model_year', 'vehicle_trim', 'vehicle_configuration', 'component_revision', 'market', 'production_site')),
	CONSTRAINT "spec_field_definitions_dimension_nonempty_check" CHECK (length(btrim("spec_field_definitions"."dimension")) > 0),
	CONSTRAINT "spec_field_definitions_label_nonempty_check" CHECK (length(btrim("spec_field_definitions"."label")) > 0),
	CONSTRAINT "spec_field_definitions_unit_by_type_check" CHECK (("spec_field_definitions"."value_type" = 'numeric' AND "spec_field_definitions"."canonical_unit" IS NOT NULL AND length(btrim("spec_field_definitions"."canonical_unit")) > 0) OR ("spec_field_definitions"."value_type" <> 'numeric' AND "spec_field_definitions"."canonical_unit" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "external_owner_pattern_details" (
	"research_claim_id" integer PRIMARY KEY NOT NULL,
	"source_population" text NOT NULL,
	"geography" text,
	"observation_window" text NOT NULL,
	"sample_size" integer,
	"collection_method" text NOT NULL,
	"known_bias" text,
	"limitations" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "known_issue_details" (
	"research_claim_id" integer PRIMARY KEY NOT NULL,
	"issue_system_code" text NOT NULL,
	"symptom_summary" text NOT NULL,
	"severity_assessment" text,
	"supported_mileage_start" integer,
	"supported_mileage_end" integer,
	"cost_low_minor_units" bigint,
	"cost_high_minor_units" bigint,
	"currency_code" text,
	"cost_date" date,
	"cost_basis" text,
	CONSTRAINT "known_issue_code_nonempty_check" CHECK (length(btrim("known_issue_details"."issue_system_code")) > 0),
	CONSTRAINT "known_issue_summary_nonempty_check" CHECK (length(btrim("known_issue_details"."symptom_summary")) > 0),
	CONSTRAINT "known_issue_severity_check" CHECK ("known_issue_details"."severity_assessment" IS NULL OR "known_issue_details"."severity_assessment" IN ('low', 'moderate', 'high', 'critical', 'unassessed')),
	CONSTRAINT "known_issue_mileage_range_check" CHECK (("known_issue_details"."supported_mileage_start" IS NULL OR "known_issue_details"."supported_mileage_start" >= 0) AND ("known_issue_details"."supported_mileage_end" IS NULL OR "known_issue_details"."supported_mileage_end" >= 0) AND ("known_issue_details"."supported_mileage_start" IS NULL OR "known_issue_details"."supported_mileage_end" IS NULL OR "known_issue_details"."supported_mileage_end" >= "known_issue_details"."supported_mileage_start")),
	CONSTRAINT "known_issue_cost_range_check" CHECK ((
        "known_issue_details"."cost_low_minor_units" IS NULL AND "known_issue_details"."cost_high_minor_units" IS NULL AND "known_issue_details"."currency_code" IS NULL AND "known_issue_details"."cost_date" IS NULL AND "known_issue_details"."cost_basis" IS NULL
      ) OR (
        "known_issue_details"."cost_low_minor_units" IS NOT NULL AND "known_issue_details"."cost_high_minor_units" IS NOT NULL
        AND "known_issue_details"."cost_low_minor_units" >= 0 AND "known_issue_details"."cost_high_minor_units" >= "known_issue_details"."cost_low_minor_units"
        AND "known_issue_details"."currency_code" ~ '^[A-Z]{3}$' AND "known_issue_details"."cost_date" IS NOT NULL
        AND "known_issue_details"."cost_basis" IS NOT NULL AND length(btrim("known_issue_details"."cost_basis")) > 0
      ))
);
--> statement-breakpoint
CREATE TABLE "maintenance_schedule_details" (
	"research_claim_id" integer PRIMARY KEY NOT NULL,
	"task_code" text NOT NULL,
	"description" text NOT NULL,
	"distance_interval" numeric(18, 4),
	"distance_unit" text,
	"month_interval" integer,
	"service_condition" text NOT NULL,
	"component_revision_id" integer,
	CONSTRAINT "maintenance_task_code_nonempty_check" CHECK (length(btrim("maintenance_schedule_details"."task_code")) > 0),
	CONSTRAINT "maintenance_description_nonempty_check" CHECK (length(btrim("maintenance_schedule_details"."description")) > 0),
	CONSTRAINT "maintenance_distance_interval_pair_check" CHECK (("maintenance_schedule_details"."distance_interval" IS NULL AND "maintenance_schedule_details"."distance_unit" IS NULL) OR ("maintenance_schedule_details"."distance_interval" > 0 AND "maintenance_schedule_details"."distance_unit" IS NOT NULL AND length(btrim("maintenance_schedule_details"."distance_unit")) > 0)),
	CONSTRAINT "maintenance_month_interval_check" CHECK ("maintenance_schedule_details"."month_interval" IS NULL OR "maintenance_schedule_details"."month_interval" > 0),
	CONSTRAINT "maintenance_service_condition_check" CHECK ("maintenance_schedule_details"."service_condition" IN ('normal', 'severe', 'other_reviewed'))
);
--> statement-breakpoint
CREATE TABLE "ownership_estimate_details" (
	"research_claim_id" integer PRIMARY KEY NOT NULL,
	"cost_category" text NOT NULL,
	"cost_low_minor_units" bigint NOT NULL,
	"cost_high_minor_units" bigint NOT NULL,
	"currency_code" text NOT NULL,
	"period" text NOT NULL,
	"annual_mileage_assumption" integer,
	"market_id" integer,
	"location_code" text,
	"method_version_id" integer NOT NULL,
	"included_categories" text NOT NULL,
	"excluded_categories" text NOT NULL,
	"uncertainty" text NOT NULL,
	CONSTRAINT "ownership_estimate_category_nonempty_check" CHECK (length(btrim("ownership_estimate_details"."cost_category")) > 0),
	CONSTRAINT "ownership_estimate_cost_range_check" CHECK ("ownership_estimate_details"."cost_low_minor_units" >= 0 AND "ownership_estimate_details"."cost_high_minor_units" >= "ownership_estimate_details"."cost_low_minor_units"),
	CONSTRAINT "ownership_estimate_currency_code_check" CHECK ("ownership_estimate_details"."currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "ownership_estimate_period_nonempty_check" CHECK (length(btrim("ownership_estimate_details"."period")) > 0),
	CONSTRAINT "ownership_estimate_annual_mileage_check" CHECK ("ownership_estimate_details"."annual_mileage_assumption" IS NULL OR "ownership_estimate_details"."annual_mileage_assumption" > 0),
	CONSTRAINT "ownership_estimate_location_code_nonempty_check" CHECK ("ownership_estimate_details"."location_code" IS NULL OR length(btrim("ownership_estimate_details"."location_code")) > 0)
);
--> statement-breakpoint
CREATE TABLE "recall_campaign_details" (
	"research_claim_id" integer PRIMARY KEY NOT NULL,
	"issuing_authority" text NOT NULL,
	"campaign_identifier" text NOT NULL,
	"announcement_date" date,
	"revision_date" date,
	"remedy" text,
	"affected_population_description" text NOT NULL,
	CONSTRAINT "recall_campaign_authority_nonempty_check" CHECK (length(btrim("recall_campaign_details"."issuing_authority")) > 0),
	CONSTRAINT "recall_campaign_identifier_nonempty_check" CHECK (length(btrim("recall_campaign_details"."campaign_identifier")) > 0),
	CONSTRAINT "recall_campaign_population_nonempty_check" CHECK (length(btrim("recall_campaign_details"."affected_population_description")) > 0),
	CONSTRAINT "recall_campaign_dates_check" CHECK ("recall_campaign_details"."announcement_date" IS NULL OR "recall_campaign_details"."revision_date" IS NULL OR "recall_campaign_details"."revision_date" >= "recall_campaign_details"."announcement_date")
);
--> statement-breakpoint
CREATE TABLE "reliability_assessment_details" (
	"research_claim_id" integer PRIMARY KEY NOT NULL,
	"named_population" text NOT NULL,
	"observation_window" text NOT NULL,
	"method" text NOT NULL,
	"numerator" bigint,
	"denominator" bigint,
	"coverage" text,
	"limitations" text
);
--> statement-breakpoint
CREATE TABLE "safety_rating_details" (
	"research_claim_id" integer PRIMARY KEY NOT NULL,
	"authority" text NOT NULL,
	"program" text NOT NULL,
	"test_year" integer,
	"tested_variant_population" text NOT NULL,
	"category" text NOT NULL,
	"result" text,
	"score" numeric(18, 6),
	"score_unit" text,
	"result_basis" text,
	CONSTRAINT "safety_rating_authority_nonempty_check" CHECK (length(btrim("safety_rating_details"."authority")) > 0),
	CONSTRAINT "safety_rating_program_nonempty_check" CHECK (length(btrim("safety_rating_details"."program")) > 0),
	CONSTRAINT "safety_rating_population_nonempty_check" CHECK (length(btrim("safety_rating_details"."tested_variant_population")) > 0),
	CONSTRAINT "safety_rating_category_nonempty_check" CHECK (length(btrim("safety_rating_details"."category")) > 0),
	CONSTRAINT "safety_rating_test_year_check" CHECK ("safety_rating_details"."test_year" IS NULL OR "safety_rating_details"."test_year" > 0),
	CONSTRAINT "safety_rating_result_check" CHECK (("safety_rating_details"."result" IS NOT NULL AND length(btrim("safety_rating_details"."result")) > 0) OR "safety_rating_details"."score" IS NOT NULL),
	CONSTRAINT "safety_rating_score_unit_check" CHECK ("safety_rating_details"."score" IS NULL OR ("safety_rating_details"."score_unit" IS NOT NULL AND length(btrim("safety_rating_details"."score_unit")) > 0))
);
--> statement-breakpoint
ALTER TABLE "research_claims" ADD CONSTRAINT "research_claims_supersedes_claim_id_research_claims_id_fk" FOREIGN KEY ("supersedes_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_organization_relationships" ADD CONSTRAINT "brand_organization_relationships_consumer_brand_id_consumer_brands_id_fk" FOREIGN KEY ("consumer_brand_id") REFERENCES "public"."consumer_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_organization_relationships" ADD CONSTRAINT "brand_organization_relationships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_organization_relationships" ADD CONSTRAINT "brand_organization_relationships_supporting_claim_id_research_claims_id_fk" FOREIGN KEY ("supporting_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_origin_claim_details" ADD CONSTRAINT "brand_origin_claim_details_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_origin_claim_details" ADD CONSTRAINT "brand_origin_claim_details_consumer_brand_id_consumer_brands_id_fk" FOREIGN KEY ("consumer_brand_id") REFERENCES "public"."consumer_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_component_fitments" ADD CONSTRAINT "configuration_component_fitments_vehicle_configuration_id_vehicle_configurations_id_fk" FOREIGN KEY ("vehicle_configuration_id") REFERENCES "public"."vehicle_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_component_fitments" ADD CONSTRAINT "configuration_component_fitments_component_revision_id_powertrain_component_revisions_id_fk" FOREIGN KEY ("component_revision_id") REFERENCES "public"."powertrain_component_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuration_component_fitments" ADD CONSTRAINT "configuration_component_fitments_supporting_claim_id_research_claims_id_fk" FOREIGN KEY ("supporting_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_parent_market_id_markets_id_fk" FOREIGN KEY ("parent_market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_relationships" ADD CONSTRAINT "organization_relationships_parent_organization_id_organizations_id_fk" FOREIGN KEY ("parent_organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_relationships" ADD CONSTRAINT "organization_relationships_child_organization_id_organizations_id_fk" FOREIGN KEY ("child_organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_relationships" ADD CONSTRAINT "organization_relationships_supporting_claim_id_research_claims_id_fk" FOREIGN KEY ("supporting_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powertrain_component_revisions" ADD CONSTRAINT "powertrain_component_revisions_component_id_powertrain_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."powertrain_components"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "powertrain_components" ADD CONSTRAINT "powertrain_components_responsible_organization_id_organizations_id_fk" FOREIGN KEY ("responsible_organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_sites" ADD CONSTRAINT "production_sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_sites" ADD CONSTRAINT "production_sites_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_sites" ADD CONSTRAINT "production_sites_supporting_claim_id_research_claims_id_fk" FOREIGN KEY ("supporting_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_configurations" ADD CONSTRAINT "vehicle_configurations_vehicle_trim_id_vehicle_trims_id_fk" FOREIGN KEY ("vehicle_trim_id") REFERENCES "public"."vehicle_trims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_generations" ADD CONSTRAINT "vehicle_generations_vehicle_model_id_vehicle_models_id_fk" FOREIGN KEY ("vehicle_model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_model_aliases" ADD CONSTRAINT "vehicle_model_aliases_vehicle_model_id_vehicle_models_id_fk" FOREIGN KEY ("vehicle_model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_model_aliases" ADD CONSTRAINT "vehicle_model_aliases_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_model_years" ADD CONSTRAINT "vehicle_model_years_vehicle_generation_id_vehicle_generations_id_fk" FOREIGN KEY ("vehicle_generation_id") REFERENCES "public"."vehicle_generations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_model_years" ADD CONSTRAINT "vehicle_model_years_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_consumer_brand_id_consumer_brands_id_fk" FOREIGN KEY ("consumer_brand_id") REFERENCES "public"."consumer_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_production_assignments" ADD CONSTRAINT "vehicle_production_assignments_model_year_id_vehicle_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."vehicle_model_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_production_assignments" ADD CONSTRAINT "vehicle_production_assignments_configuration_id_vehicle_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."vehicle_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_production_assignments" ADD CONSTRAINT "vehicle_production_assignments_production_site_id_production_sites_id_fk" FOREIGN KEY ("production_site_id") REFERENCES "public"."production_sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_production_assignments" ADD CONSTRAINT "vehicle_production_assignments_supporting_claim_id_research_claims_id_fk" FOREIGN KEY ("supporting_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_profile_aliases" ADD CONSTRAINT "vehicle_profile_aliases_legacy_trim_id_trims_id_fk" FOREIGN KEY ("legacy_trim_id") REFERENCES "public"."trims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_profile_aliases" ADD CONSTRAINT "vehicle_profile_aliases_vehicle_configuration_id_vehicle_configurations_id_fk" FOREIGN KEY ("vehicle_configuration_id") REFERENCES "public"."vehicle_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_trims" ADD CONSTRAINT "vehicle_trims_vehicle_model_year_id_vehicle_model_years_id_fk" FOREIGN KEY ("vehicle_model_year_id") REFERENCES "public"."vehicle_model_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_evidence_item_id_evidence_items_id_fk" FOREIGN KEY ("evidence_item_id") REFERENCES "public"."evidence_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_reviews" ADD CONSTRAINT "claim_reviews_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_source_revision_id_source_revisions_id_fk" FOREIGN KEY ("source_revision_id") REFERENCES "public"."source_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_sources" ADD CONSTRAINT "research_sources_publisher_organization_id_organizations_id_fk" FOREIGN KEY ("publisher_organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_sources" ADD CONSTRAINT "research_sources_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_revisions" ADD CONSTRAINT "source_revisions_research_source_id_research_sources_id_fk" FOREIGN KEY ("research_source_id") REFERENCES "public"."research_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_consumer_brand_id_consumer_brands_id_fk" FOREIGN KEY ("consumer_brand_id") REFERENCES "public"."consumer_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_vehicle_model_id_vehicle_models_id_fk" FOREIGN KEY ("vehicle_model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_vehicle_generation_id_vehicle_generations_id_fk" FOREIGN KEY ("vehicle_generation_id") REFERENCES "public"."vehicle_generations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_vehicle_model_year_id_vehicle_model_years_id_fk" FOREIGN KEY ("vehicle_model_year_id") REFERENCES "public"."vehicle_model_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_vehicle_trim_id_vehicle_trims_id_fk" FOREIGN KEY ("vehicle_trim_id") REFERENCES "public"."vehicle_trims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_vehicle_configuration_id_vehicle_configurations_id_fk" FOREIGN KEY ("vehicle_configuration_id") REFERENCES "public"."vehicle_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_component_revision_id_powertrain_component_revisions_id_fk" FOREIGN KEY ("component_revision_id") REFERENCES "public"."powertrain_component_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_subjects" ADD CONSTRAINT "claim_subjects_production_site_id_production_sites_id_fk" FOREIGN KEY ("production_site_id") REFERENCES "public"."production_sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicability_alternatives" ADD CONSTRAINT "applicability_alternatives_applicability_set_id_applicability_sets_id_fk" FOREIGN KEY ("applicability_set_id") REFERENCES "public"."applicability_sets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicability_alternatives" ADD CONSTRAINT "applicability_alternatives_market_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicability_alternatives" ADD CONSTRAINT "applicability_alternatives_model_fk" FOREIGN KEY ("vehicle_model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicability_alternatives" ADD CONSTRAINT "applicability_alternatives_generation_fk" FOREIGN KEY ("vehicle_generation_id") REFERENCES "public"."vehicle_generations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicability_alternatives" ADD CONSTRAINT "applicability_alternatives_model_year_fk" FOREIGN KEY ("vehicle_model_year_id") REFERENCES "public"."vehicle_model_years"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicability_alternatives" ADD CONSTRAINT "applicability_alternatives_trim_fk" FOREIGN KEY ("vehicle_trim_id") REFERENCES "public"."vehicle_trims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicability_alternatives" ADD CONSTRAINT "applicability_alternatives_configuration_fk" FOREIGN KEY ("vehicle_configuration_id") REFERENCES "public"."vehicle_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicability_alternatives" ADD CONSTRAINT "applicability_alternatives_component_revision_fk" FOREIGN KEY ("component_revision_id") REFERENCES "public"."powertrain_component_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicability_sets" ADD CONSTRAINT "applicability_sets_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_claim_values" ADD CONSTRAINT "spec_claim_values_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "spec_field_definitions_code_type_idx" ON "spec_field_definitions" USING btree ("code","value_type");--> statement-breakpoint
ALTER TABLE "spec_claim_values" ADD CONSTRAINT "spec_claim_values_field_type_fk" FOREIGN KEY ("field_code","value_type") REFERENCES "public"."spec_field_definitions"("code","value_type") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_owner_pattern_details" ADD CONSTRAINT "external_owner_pattern_details_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "known_issue_details" ADD CONSTRAINT "known_issue_details_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedule_details" ADD CONSTRAINT "maintenance_schedule_details_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedule_details" ADD CONSTRAINT "maintenance_schedule_details_component_revision_id_powertrain_component_revisions_id_fk" FOREIGN KEY ("component_revision_id") REFERENCES "public"."powertrain_component_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_estimate_details" ADD CONSTRAINT "ownership_estimate_details_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_estimate_details" ADD CONSTRAINT "ownership_estimate_details_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_estimate_details" ADD CONSTRAINT "ownership_estimate_details_method_version_id_calculation_method_versions_id_fk" FOREIGN KEY ("method_version_id") REFERENCES "public"."calculation_method_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recall_campaign_details" ADD CONSTRAINT "recall_campaign_details_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reliability_assessment_details" ADD CONSTRAINT "reliability_assessment_details_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_rating_details" ADD CONSTRAINT "safety_rating_details_research_claim_id_research_claims_id_fk" FOREIGN KEY ("research_claim_id") REFERENCES "public"."research_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calculation_method_versions_code_version_idx" ON "calculation_method_versions" USING btree ("method_code","version");--> statement-breakpoint
CREATE INDEX "research_claims_status_kind_effective_idx" ON "research_claims" USING btree ("claim_kind","research_status","review_status","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "research_claims_supersedes_idx" ON "research_claims" USING btree ("supersedes_claim_id");--> statement-breakpoint
CREATE INDEX "brand_organization_relationships_brand_effective_idx" ON "brand_organization_relationships" USING btree ("consumer_brand_id","valid_from","valid_to");--> statement-breakpoint
CREATE INDEX "brand_organization_relationships_org_effective_idx" ON "brand_organization_relationships" USING btree ("organization_id","valid_from","valid_to");--> statement-breakpoint
CREATE INDEX "brand_organization_relationships_claim_idx" ON "brand_organization_relationships" USING btree ("supporting_claim_id");--> statement-breakpoint
CREATE INDEX "brand_origin_claim_details_brand_idx" ON "brand_origin_claim_details" USING btree ("consumer_brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "configuration_component_fitments_configuration_role_position_idx" ON "configuration_component_fitments" USING btree ("vehicle_configuration_id","role","position_code");--> statement-breakpoint
CREATE INDEX "configuration_component_fitments_component_revision_idx" ON "configuration_component_fitments" USING btree ("component_revision_id");--> statement-breakpoint
CREATE INDEX "configuration_component_fitments_claim_idx" ON "configuration_component_fitments" USING btree ("supporting_claim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consumer_brands_slug_idx" ON "consumer_brands" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "markets_code_idx" ON "markets" USING btree ("code");--> statement-breakpoint
CREATE INDEX "markets_parent_idx" ON "markets" USING btree ("parent_market_id");--> statement-breakpoint
CREATE INDEX "organization_relationships_parent_effective_idx" ON "organization_relationships" USING btree ("parent_organization_id","valid_from","valid_to");--> statement-breakpoint
CREATE INDEX "organization_relationships_child_effective_idx" ON "organization_relationships" USING btree ("child_organization_id","valid_from","valid_to");--> statement-breakpoint
CREATE INDEX "organization_relationships_claim_idx" ON "organization_relationships" USING btree ("supporting_claim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_registry_identity_idx" ON "organizations" USING btree ("jurisdiction_country_code","jurisdiction_region_code","registry_id") WHERE "organizations"."registry_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "powertrain_component_revisions_key_idx" ON "powertrain_component_revisions" USING btree ("component_id","revision_key");--> statement-breakpoint
CREATE INDEX "powertrain_component_revisions_component_idx" ON "powertrain_component_revisions" USING btree ("component_id");--> statement-breakpoint
CREATE UNIQUE INDEX "powertrain_components_source_identity_idx" ON "powertrain_components" USING btree ("source_namespace","source_identity_key") WHERE "powertrain_components"."source_namespace" IS NOT NULL AND "powertrain_components"."source_identity_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "powertrain_components_organization_idx" ON "powertrain_components" USING btree ("responsible_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "production_sites_organization_site_code_idx" ON "production_sites" USING btree ("organization_id","site_code") WHERE "production_sites"."site_code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "production_sites_market_idx" ON "production_sites" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "production_sites_claim_idx" ON "production_sites" USING btree ("supporting_claim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_configurations_trim_key_idx" ON "vehicle_configurations" USING btree ("vehicle_trim_id","configuration_key") WHERE "vehicle_configurations"."configuration_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "vehicle_configurations_trim_idx" ON "vehicle_configurations" USING btree ("vehicle_trim_id");--> statement-breakpoint
CREATE INDEX "vehicle_configurations_status_trim_idx" ON "vehicle_configurations" USING btree ("identity_status","vehicle_trim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_generations_model_slug_idx" ON "vehicle_generations" USING btree ("vehicle_model_id","slug");--> statement-breakpoint
CREATE INDEX "vehicle_generations_model_idx" ON "vehicle_generations" USING btree ("vehicle_model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_model_aliases_identity_valid_from_idx" ON "vehicle_model_aliases" USING btree ("vehicle_model_id","market_id","locale","normalized_alias","valid_from");--> statement-breakpoint
CREATE INDEX "vehicle_model_aliases_market_idx" ON "vehicle_model_aliases" USING btree ("market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_model_years_market_identity_idx" ON "vehicle_model_years" USING btree ("vehicle_generation_id","market_id","model_year");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_model_years_unmarketed_identity_idx" ON "vehicle_model_years" USING btree ("vehicle_generation_id","model_year") WHERE "vehicle_model_years"."market_id" IS NULL;--> statement-breakpoint
CREATE INDEX "vehicle_model_years_generation_idx" ON "vehicle_model_years" USING btree ("vehicle_generation_id");--> statement-breakpoint
CREATE INDEX "vehicle_model_years_market_idx" ON "vehicle_model_years" USING btree ("market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_models_brand_slug_idx" ON "vehicle_models" USING btree ("consumer_brand_id","slug");--> statement-breakpoint
CREATE INDEX "vehicle_models_brand_idx" ON "vehicle_models" USING btree ("consumer_brand_id");--> statement-breakpoint
CREATE INDEX "vehicle_production_assignments_model_year_idx" ON "vehicle_production_assignments" USING btree ("model_year_id");--> statement-breakpoint
CREATE INDEX "vehicle_production_assignments_configuration_idx" ON "vehicle_production_assignments" USING btree ("configuration_id");--> statement-breakpoint
CREATE INDEX "vehicle_production_assignments_site_idx" ON "vehicle_production_assignments" USING btree ("production_site_id");--> statement-breakpoint
CREATE INDEX "vehicle_production_assignments_claim_idx" ON "vehicle_production_assignments" USING btree ("supporting_claim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_profile_aliases_slug_idx" ON "vehicle_profile_aliases" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "vehicle_profile_aliases_legacy_trim_idx" ON "vehicle_profile_aliases" USING btree ("legacy_trim_id");--> statement-breakpoint
CREATE INDEX "vehicle_profile_aliases_configuration_idx" ON "vehicle_profile_aliases" USING btree ("vehicle_configuration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_trims_model_year_name_idx" ON "vehicle_trims" USING btree ("vehicle_model_year_id","normalized_name");--> statement-breakpoint
CREATE INDEX "vehicle_trims_model_year_idx" ON "vehicle_trims" USING btree ("vehicle_model_year_id");--> statement-breakpoint
CREATE INDEX "claim_evidence_evidence_item_idx" ON "claim_evidence" USING btree ("evidence_item_id");--> statement-breakpoint
CREATE INDEX "claim_reviews_claim_reviewed_idx" ON "claim_reviews" USING btree ("research_claim_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "evidence_items_source_locator_idx" ON "evidence_items" USING btree ("source_revision_id","locator");--> statement-breakpoint
CREATE UNIQUE INDEX "research_sources_source_key_idx" ON "research_sources" USING btree ("source_key");--> statement-breakpoint
CREATE INDEX "research_sources_publisher_idx" ON "research_sources" USING btree ("publisher_organization_id");--> statement-breakpoint
CREATE INDEX "research_sources_market_idx" ON "research_sources" USING btree ("market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_revisions_document_version_idx" ON "source_revisions" USING btree ("research_source_id","document_identifier","source_version") WHERE "source_revisions"."document_identifier" IS NOT NULL AND "source_revisions"."source_version" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "source_revisions_source_retrieved_idx" ON "source_revisions" USING btree ("research_source_id","retrieved_at");--> statement-breakpoint
CREATE INDEX "source_revisions_rights_idx" ON "source_revisions" USING btree ("storage_rights_status","derivative_use_rights_status","display_rights_status");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_subjects_claim_organization_idx" ON "claim_subjects" USING btree ("research_claim_id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_subjects_claim_brand_idx" ON "claim_subjects" USING btree ("research_claim_id","consumer_brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_subjects_claim_model_idx" ON "claim_subjects" USING btree ("research_claim_id","vehicle_model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_subjects_claim_generation_idx" ON "claim_subjects" USING btree ("research_claim_id","vehicle_generation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_subjects_claim_model_year_idx" ON "claim_subjects" USING btree ("research_claim_id","vehicle_model_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_subjects_claim_trim_idx" ON "claim_subjects" USING btree ("research_claim_id","vehicle_trim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_subjects_claim_configuration_idx" ON "claim_subjects" USING btree ("research_claim_id","vehicle_configuration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_subjects_claim_component_revision_idx" ON "claim_subjects" USING btree ("research_claim_id","component_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_subjects_claim_market_idx" ON "claim_subjects" USING btree ("research_claim_id","market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_subjects_claim_production_site_idx" ON "claim_subjects" USING btree ("research_claim_id","production_site_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_claim_idx" ON "claim_subjects" USING btree ("research_claim_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_organization_idx" ON "claim_subjects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_brand_idx" ON "claim_subjects" USING btree ("consumer_brand_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_model_idx" ON "claim_subjects" USING btree ("vehicle_model_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_generation_idx" ON "claim_subjects" USING btree ("vehicle_generation_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_model_year_idx" ON "claim_subjects" USING btree ("vehicle_model_year_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_trim_idx" ON "claim_subjects" USING btree ("vehicle_trim_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_configuration_idx" ON "claim_subjects" USING btree ("vehicle_configuration_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_component_revision_idx" ON "claim_subjects" USING btree ("component_revision_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_market_idx" ON "claim_subjects" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "claim_subjects_production_site_idx" ON "claim_subjects" USING btree ("production_site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "applicability_alternatives_set_ordinal_idx" ON "applicability_alternatives" USING btree ("applicability_set_id","ordinal");--> statement-breakpoint
CREATE INDEX "applicability_alternatives_market_idx" ON "applicability_alternatives" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "applicability_alternatives_model_idx" ON "applicability_alternatives" USING btree ("vehicle_model_id");--> statement-breakpoint
CREATE INDEX "applicability_alternatives_generation_idx" ON "applicability_alternatives" USING btree ("vehicle_generation_id");--> statement-breakpoint
CREATE INDEX "applicability_alternatives_model_year_idx" ON "applicability_alternatives" USING btree ("vehicle_model_year_id");--> statement-breakpoint
CREATE INDEX "applicability_alternatives_trim_idx" ON "applicability_alternatives" USING btree ("vehicle_trim_id");--> statement-breakpoint
CREATE INDEX "applicability_alternatives_configuration_idx" ON "applicability_alternatives" USING btree ("vehicle_configuration_id");--> statement-breakpoint
CREATE INDEX "applicability_alternatives_component_revision_idx" ON "applicability_alternatives" USING btree ("component_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "applicability_sets_claim_idx" ON "applicability_sets" USING btree ("research_claim_id");--> statement-breakpoint
CREATE INDEX "spec_claim_values_field_code_idx" ON "spec_claim_values" USING btree ("field_code");--> statement-breakpoint
CREATE INDEX "maintenance_schedule_details_component_revision_idx" ON "maintenance_schedule_details" USING btree ("component_revision_id");--> statement-breakpoint
CREATE INDEX "ownership_estimate_details_market_idx" ON "ownership_estimate_details" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "ownership_estimate_details_method_version_idx" ON "ownership_estimate_details" USING btree ("method_version_id");--> statement-breakpoint
CREATE INDEX "recall_campaign_authority_identifier_idx" ON "recall_campaign_details" USING btree ("issuing_authority","campaign_identifier");