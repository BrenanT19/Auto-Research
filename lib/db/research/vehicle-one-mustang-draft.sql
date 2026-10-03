-- Development-only, create-once canonical draft. NOT a migration or public release.
-- Only normalized factual identity/powertrain attributes and audit metadata.
-- Ford evidence is indexed preliminary content, not a directly retrieved PDF.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('auto-research-private-mustang-my2024'));
DO $draft$
DECLARE
  market_id_ integer; brand_id_ integer; model_id_ integer; generation_id_ integer;
  year_id_ integer; trim_id_ integer; configuration_id_ integer;
  ford_source_ integer; epa_source_ integer; ford_revision_ integer; epa_revision_ integer;
  ford_evidence_ integer; epa_evidence_ integer; claim_id_ integer; set_id_ integer;
  field_ text; value_ text;
BEGIN
  IF EXISTS (SELECT 1 FROM vehicle_profile_aliases
    WHERE slug='ford-mustang-2024-ecoboost-fastback-us-23l-10at-rwd') THEN
    RAISE EXCEPTION 'Vehicle #1 draft already exists; inspect it instead of creating duplicates';
  END IF;
  SELECT id INTO market_id_ FROM markets WHERE code='US';
  IF market_id_ IS NULL THEN
    INSERT INTO markets(code,name,market_type)
      VALUES ('US','United States','country') RETURNING id INTO market_id_;
  END IF;
  SELECT id INTO brand_id_ FROM consumer_brands WHERE slug='ford';
  IF brand_id_ IS NULL THEN
    INSERT INTO consumer_brands(canonical_name,slug,lifecycle_status)
      VALUES ('Ford','ford','watchlist') RETURNING id INTO brand_id_;
  END IF;
  SELECT id INTO model_id_ FROM vehicle_models
    WHERE consumer_brand_id=brand_id_ AND slug='mustang';
  IF model_id_ IS NULL THEN
    INSERT INTO vehicle_models(consumer_brand_id,name,slug,lifecycle_status)
      VALUES (brand_id_,'Mustang','mustang','watchlist') RETURNING id INTO model_id_;
  END IF;
  -- Required hierarchy grouping, NOT a claimed production generation or year range.
  INSERT INTO vehicle_generations(vehicle_model_id,name,slug,lifecycle_status)
    VALUES (model_id_,'Generation not yet researched','generation-not-yet-researched','watchlist')
    RETURNING id INTO generation_id_;
  INSERT INTO vehicle_model_years(vehicle_generation_id,market_id,model_year,identity_status)
    VALUES (generation_id_,market_id_,2024,'supported') RETURNING id INTO year_id_;
  INSERT INTO vehicle_trims(vehicle_model_year_id,sales_name,normalized_name,lifecycle_status)
    VALUES (year_id_,'EcoBoost','ecoboost','watchlist') RETURNING id INTO trim_id_;
  INSERT INTO vehicle_configurations
    (vehicle_trim_id,configuration_key,display_label,identity_status,is_demo)
    VALUES (trim_id_,'us-my2024-fastback-23l-ecoboost-turbo-i4-10at-rwd',
      'EcoBoost Fastback — 2.3L turbo I4 / 10-speed automatic / RWD','supported',false)
    RETURNING id INTO configuration_id_;
  INSERT INTO vehicle_profile_aliases(slug,vehicle_configuration_id,alias_kind,mapping_status)
    VALUES ('ford-mustang-2024-ecoboost-fastback-us-23l-10at-rwd',
      configuration_id_,'canonical_profile','exact_supported');

  INSERT INTO research_sources(source_key,source_kind,canonical_url,market_id)
    VALUES ('ford-us-my2024-mustang-preliminary-tech-specs','oem_document',
      'https://media.ford.com/content/dam/fordmedia/North%20America/US/2022/09/14/2024-mustang-technical-specifications.pdf',
      market_id_) RETURNING id INTO ford_source_;
  INSERT INTO research_sources(source_key,source_kind,canonical_url,market_id)
    VALUES ('epa-us-my2024-test-car-list-may2025','government',
      'https://www.epa.gov/system/files/documents/2025-05/24-testcar-2025-05.xlsx',
      market_id_) RETURNING id INTO epa_source_;
  INSERT INTO source_revisions
    (research_source_id,document_identifier,source_version,published_at,retrieved_at,
      format,update_behavior,terms_version,terms_reviewed_at,
      storage_rights_status,derivative_use_rights_status,display_rights_status)
    VALUES (ford_source_,'2024 Mustang preliminary technical specifications',
      'Preliminary as of 2022-09-22; subject to change','2022-09-22',now(),
      'Indexed official PDF content; PDF not directly inspected',
      'Old Ford Media URL redirected to Ford From the Road home page on fresh retrieval 2026-10-03',
      'Normalized factual attributes and minimal audit metadata only; no creative material retained; private draft only; no document-copy or redistribution permission asserted',
      now(),'allowed','allowed','allowed') RETURNING id INTO ford_revision_;
  INSERT INTO source_revisions
    (research_source_id,document_identifier,source_version,retrieved_at,format,
      update_behavior,terms_url,terms_version,terms_reviewed_at,
      storage_rights_status,derivative_use_rights_status,display_rights_status)
    VALUES (epa_source_,'MY2024 Test Car List','May 2025 edition',now(),'XLSX dataset',
      'Periodically revised; rows independently downloaded and checked 2026-10-03',
      'https://edg.epa.gov/EPA_Data_License.htm',
      'EPA-produced public-domain data absent a stated exception; normalized factual rows only',
      now(),'allowed','allowed','allowed') RETURNING id INTO epa_revision_;
  INSERT INTO evidence_items(source_revision_id,locator,evidence_kind)
    VALUES (ford_revision_,
      'Indexed BODY and ENGINE CONFIGURATION / TRANSMISSION tables, Mustang EcoBoost column; preliminary MY2024 relationships accepted under explicit private-pilot instruction; no source excerpt retained',
      'document_section') RETURNING id INTO ford_evidence_;
  INSERT INTO evidence_items(source_revision_id,locator,evidence_kind)
    VALUES (epa_revision_,
      'Worksheet 1, rows 897–898; test vehicle R5100029; test group RFMXV02.3VJY; MY2024 Ford Mustang, 2.3L, four cylinders, automatic, ten gears, rear drive; does not identify retail trim/body',
      'dataset_record') RETURNING id INTO epa_evidence_;

  INSERT INTO spec_field_definitions
    (code,value_type,dimension,allowed_subject_type,label) VALUES
    ('body_type','text','body_style','vehicle_configuration','Body style'),
    ('engine_name','text','powertrain_identity','vehicle_configuration','Engine identity'),
    ('transmission_name','text','powertrain_identity','vehicle_configuration','Transmission identity'),
    ('drivetrain','text','drive_layout','vehicle_configuration','Drive layout')
    ON CONFLICT (code) DO NOTHING;

  FOR field_,value_ IN
    SELECT * FROM (VALUES
      ('model_year_identity',NULL::text),
      ('identity',NULL::text),
      ('body_type','Fastback coupe'),
      ('engine_name','2.3L EcoBoost turbocharged inline-four'),
      ('transmission_name','10-speed automatic'),
      ('drivetrain','RWD')) AS fields(code,value)
  LOOP
    INSERT INTO research_claims
      (claim_kind,content_class,research_status,review_status,evidence_strength)
      VALUES (CASE WHEN field_ IN ('identity','model_year_identity') THEN 'identity' ELSE 'specification' END,
        'source_fact','researched','accepted','moderate') RETURNING id INTO claim_id_;
    IF field_='model_year_identity' THEN
      INSERT INTO claim_subjects(research_claim_id,vehicle_model_year_id)
        VALUES (claim_id_,year_id_);
    ELSE
      INSERT INTO claim_subjects(research_claim_id,vehicle_configuration_id)
        VALUES (claim_id_,configuration_id_);
    END IF;
    INSERT INTO claim_reviews(research_claim_id,decision,reviewer_reference,rationale)
      VALUES (claim_id_,'accepted','auto-research/private-pilot-review',
        'Private draft only. Explicit authorization accepts indexed preliminary Ford MY2024 configuration relationships, subject to change, combined with independently checked EPA joined powertrain/drivetrain rows. Direct Ford URL returned unrelated HTML, not the PDF. EcoBoost is distinct from Premium. No contradictory evidence identified in the reviewed sources. No final output, economy, package, safety, recall, or ownership values inferred. Generation remains unresearched.');
    INSERT INTO claim_evidence(research_claim_id,evidence_item_id,evidence_relation,locator_note)
      VALUES (claim_id_,ford_evidence_,'supports',
        'Indexed preliminary configuration relationship, not final production specifications or direct PDF inspection.');
    IF field_ <> 'body_type' THEN
      INSERT INTO claim_evidence(research_claim_id,evidence_item_id,evidence_relation,locator_note)
        VALUES (claim_id_,epa_evidence_,'supports',
          'Independent MY2024 joined powertrain/drivetrain corroboration only; retail trim/body and EcoBoost marketing label rely on preliminary Ford relationship.');
    END IF;
    INSERT INTO applicability_sets(research_claim_id,scope_state,reviewed_at)
      VALUES (claim_id_,'restricted',now()) RETURNING id INTO set_id_;
    IF field_='model_year_identity' THEN
      INSERT INTO applicability_alternatives
        (applicability_set_id,ordinal,scope_completeness,market_id,vehicle_model_year_id)
        VALUES (set_id_,0,'complete',market_id_,year_id_);
    ELSE
      INSERT INTO applicability_alternatives
        (applicability_set_id,ordinal,scope_completeness,market_id,vehicle_configuration_id)
        VALUES (set_id_,0,'complete',market_id_,configuration_id_);
    END IF;
    IF field_ NOT IN ('identity','model_year_identity') THEN
      INSERT INTO spec_claim_values(research_claim_id,field_code,value_type,value_state,text_value)
        VALUES (claim_id_,field_,'text','known',value_);
    END IF;
  END LOOP;
END
$draft$;
COMMIT;
SELECT a.slug,c.id AS configuration_id,s.research_claim_id AS identity_claim_id,
  c.identity_status,c.is_demo
FROM vehicle_profile_aliases a
JOIN vehicle_configurations c ON c.id=a.vehicle_configuration_id
JOIN claim_subjects s ON s.vehicle_configuration_id=c.id
JOIN research_claims r ON r.id=s.research_claim_id AND r.claim_kind='identity'
WHERE a.slug='ford-mustang-2024-ecoboost-fastback-us-23l-10at-rwd';