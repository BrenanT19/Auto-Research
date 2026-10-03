-- Private research data only; not a schema migration or publication.
-- Retain normalized facts and citation metadata, never source prose or personal narratives.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('auto-research-private-mustang-my2024'));
DO $enrichment$
DECLARE
  cfg integer := 2; market_ integer; year_ integer;
  source_ integer; revision_ integer; evidence_ integer; claim_ integer; scope_ integer;
  item record; field_ record; campaign_ record;
BEGIN
  SELECT y.market_id,y.id INTO market_,year_
  FROM vehicle_profile_aliases a
  JOIN vehicle_configurations c ON c.id=a.vehicle_configuration_id
  JOIN vehicle_trims t ON t.id=c.vehicle_trim_id
  JOIN vehicle_model_years y ON y.id=t.vehicle_model_year_id
  JOIN markets m ON m.id=y.market_id
  WHERE a.slug='ford-mustang-2024-ecoboost-fastback-us-23l-10at-rwd'
    AND c.id=cfg AND NOT c.is_demo AND c.identity_status='supported'
    AND y.model_year=2024 AND m.code='US'
    AND c.configuration_key='us-my2024-fastback-23l-ecoboost-turbo-i4-10at-rwd';
  IF year_ IS NULL THEN RAISE EXCEPTION 'Exact existing private identity not found'; END IF;
  IF EXISTS (SELECT 1 FROM research_sources WHERE source_key='mustang-enrichment-one-review') THEN
    RAISE EXCEPTION 'Enrichment already exists; inspect, do not duplicate';
  END IF;

  FOR item IN SELECT * FROM (VALUES
    ('mustang-enrichment-one-manual-fuel','oem_document',
      'https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2024_Ford_Mustang_Owners_Manual_version_1_om_EN-US.pdf',
      'Ford Motor Company','MY2024 Canada/US enUSA, edition 202212, copyright 2023',
      'Printed page 166, Fuel Quality; U.S. pump octane AKI, not RON; general MY2024 fuel requirement, not an EPA label classification',
      'Normalized noncreative facts and minimal citations only. Copyright notice prohibits reproduction of the publication; no prose, tables, images, document files or layouts retained. No manual redistribution permission asserted.',
      'allowed','allowed','allowed'),
    ('mustang-enrichment-one-manual-tank','oem_document',
      'https://www.fordservicecontent.com/Ford_Content/vdirsnet/OwnerManual/Home/Content?variantid=9122&languageCode=en&countryCode=USA&moidRef=G2133836&Uid=G2301084&ProcUid=G2301085&userMarket=usa&div=f&vFilteringEnabled=False&buildtype=web',
      'Ford Motor Company','MY2024 US manual, variant 9122; rendered chapter verified 2026-10-03',
      'Fuel Tank Capacity, 2.3L EcoBoost, all variants. U.S. units, advertised capacity; not usable fuel or a driving-range estimate. Footer explicitly identifies 2024 Mustang.',
      'Normalized noncreative numerical facts and minimal citations only; no manual prose, table, image or layout retained. Copyright restrictions on the publication remain; no document-copy permission asserted.',
      'allowed','allowed','allowed'),
    ('mustang-enrichment-one-recalls','government',
      'https://api.nhtsa.gov/recalls/recallsByVehicle?make=ford&model=mustang&modelYear=2024',
      'National Highway Traffic Safety Administration','MY2024 Ford Mustang API snapshot 2026-10-03; 12 records',
      'results.NHTSACampaignNumber; model-year search includes configurations not matching this draft. Campaign existence only, not configuration applicability or VIN-open status.',
      'Public government API factual identifiers and aggregate metadata only; no manufacturer narrative, document, illustrations or proprietary presentation copied. No endorsement claimed.',
      'allowed','allowed','allowed'),
    ('mustang-enrichment-one-complaints','government',
      'https://api.nhtsa.gov/complaints/complaintsByVehicle?make=ford&model=mustang&modelYear=2024',
      'National Highway Traffic Safety Administration','MY2024 Ford Mustang API snapshot 2026-10-03; 81 records',
      'Count=81, model-year population; includes GT and convertible reports. No exact-configuration attribution. No narratives, VINs, locations or personal metadata retained.',
      'Public agency aggregate factual metadata only. No personal narratives or third-party creative material retained, reproduced or transformed into issue patterns.',
      'allowed','allowed','allowed'),
    ('mustang-enrichment-one-ncap','government',
      'https://api.nhtsa.gov/SafetyRatings/VehicleId/19149?format=json',
      'National Highway Traffic Safety Administration','NCAP VehicleId 19149 snapshot 2026-10-03',
      'VehicleDescription=2024 Ford Mustang 2 DR RWD. Published family: overall/front/side/rollover 5 stars, rear side occupant 4 stars, rollover probability 0.079, InvestigationCount=0. Engine/trim transfer not established.',
      'Public government numerical test results and minimal identifiers only; no photographs, video, diagrams, manufacturer text or page presentation copied.',
      'allowed','allowed','allowed'),
    ('mustang-enrichment-one-epa-candidates','government',
      'https://www.fueleconomy.gov/ws/rest/vehicle/46646',
      'U.S. Department of Energy / EPA, FuelEconomy.gov administered by ORNL',
      'Candidate record IDs 46646 and 46645; research snapshot 2026-10-03',
      '46646 Mustang vs 46645 Mustang (Performance Package), MY2024 2.3L four-cylinder RWD automatic 10-speed. Package/body label mapping unresolved; no economy, fuel-type or emissions value accepted.',
      'https://www.fueleconomy.gov/feg/ORNL-disclaimer.htm reviewed 2026-10-03: document reuse explicitly covers noncommercial/scientific/educational use. Commercial raw web-service fact reuse not resolved. Minimal candidate IDs/citation metadata only retained; no payload stored.',
      'allowed','unknown','unknown'),
    ('mustang-enrichment-one-part573-24V220','government',
      'https://static.nhtsa.gov/odi/rcl/2024/RCLRPT-24V220-4944.PDF',
      'Ford Motor Company, filed with NHTSA','Part 573 24V220, submitted 2024-03-22',
      'Vehicle Information: 2024 Mustang, 2.3L engines, production 2024-02-02 through 2024-02-09; nonsequential VIN population.',
      'Manufacturer-filed report: factual scope/date identifiers only; no copyrighted prose, report files, tables or illustrations retained.',
      'allowed','allowed','allowed'),
    ('mustang-enrichment-one-part573-24V394','government',
      'https://static.nhtsa.gov/odi/rcl/2024/RCLRPT-24V394-3723.PDF',
      'Ford Motor Company, filed with NHTSA','Part 573 24V394, submitted 2024-06-03',
      'Vehicle Information: manual-transmission population, production 2022-09-27 through 2024-05-23. Incompatible with this automatic configuration.',
      'Manufacturer-filed report: factual scope/date identifiers only; no copyrighted prose, report files, tables or illustrations retained.',
      'allowed','allowed','allowed'),
    ('mustang-enrichment-one-part573-24V593','government',
      'https://static.nhtsa.gov/odi/rcl/2024/RCLRPT-24V593-3301.PDF',
      'Ford Motor Company, filed with NHTSA','Part 573 24V593, submitted 2024-08-09',
      'Vehicle Information: production 2023-07-25 through 2023-09-15; rear suspension knuckle affected-parts population, nonsequential VINs.',
      'Manufacturer-filed report: factual scope/date identifiers only; no copyrighted prose, report files, tables or illustrations retained.',
      'allowed','allowed','allowed'),
    ('mustang-enrichment-one-part573-26V547','government',
      'https://static.nhtsa.gov/odi/rcl/2026/RCLRPT-26V547-3184.pdf',
      'Ford Motor Company, filed with NHTSA','Part 573 26V547, submitted 2026-08-25',
      'Vehicle Information: MY2024-2026 Mustang, production 2022-09-07 through 2026-06-09; engine harness ground terminal population.',
      'Manufacturer-filed report: factual scope/date identifiers only; no copyrighted prose, report files, tables or illustrations retained.',
      'allowed','allowed','allowed'),
    ('mustang-enrichment-one-review','other_reviewed',NULL,
      'AutoResearch research review','Authored private development review 2026-10-03',
      'Research Enrichment Pass 1, existing configuration 2 only. Scope and source-rights decisions; not a source of estimated vehicle performance or ownership outcomes.',
      'Project-authored review text and metadata; no third-party prose copied. Primary factual context separately cited. No scores, rates, costs, lifespan or inspection recommendations synthesized.',
      'allowed','allowed','allowed')
  ) AS records(key,kind,url,publisher,version,locator,terms,storage,derivative,display)
  LOOP
    INSERT INTO research_sources(source_key,source_kind,canonical_url,market_id)
      VALUES(item.key,item.kind,item.url,market_) RETURNING id INTO source_;
    INSERT INTO source_revisions(research_source_id,document_identifier,source_version,
      retrieved_at,format,update_behavior,terms_url,terms_version,terms_reviewed_at,
      storage_rights_status,derivative_use_rights_status,display_rights_status)
      VALUES(source_,item.publisher,item.version,now(),'Normalized facts and minimal citation metadata only',
      'Point-in-time review; sources may change; no automatic refresh or raw payload retention',
      CASE WHEN item.key='mustang-enrichment-one-epa-candidates'
        THEN 'https://www.fueleconomy.gov/feg/ORNL-disclaimer.htm' ELSE item.url END,
      item.terms,now(),item.storage,item.derivative,item.display) RETURNING id INTO revision_;
    INSERT INTO evidence_items(source_revision_id,locator,evidence_kind)
      VALUES(revision_,item.locator,CASE WHEN item.kind='government' THEN 'api_record' ELSE 'document_section' END);
  END LOOP;

  INSERT INTO spec_field_definitions(code,value_type,dimension,canonical_unit,allowed_subject_type,label)
    VALUES
    ('fuel_requirement','text','fuel_requirement',NULL,'vehicle_configuration','Fuel requirement'),
    ('fuel_tank_capacity_gallons','numeric','volume','US gal','vehicle_configuration','Fuel tank capacity'),
    ('overview','text','review_summary',NULL,'vehicle_configuration','Research overview'),
    ('fuel_type','text','fuel_type',NULL,'vehicle_configuration','EPA fuel type'),
    ('mpg_city','numeric','fuel_economy','mpg','vehicle_configuration','City MPG'),
    ('mpg_highway','numeric','fuel_economy','mpg','vehicle_configuration','Highway MPG'),
    ('mpg_combined','numeric','fuel_economy','mpg','vehicle_configuration','Combined MPG'),
    ('horsepower','numeric','power','hp','vehicle_configuration','Horsepower')
    ON CONFLICT(code) DO NOTHING;
  FOR field_ IN SELECT * FROM (VALUES
    ('fuel_requirement','text','known',NULL::numeric,
      '87 AKI minimum; 91+ AKI recommended for best performance, not required.',
      'mustang-enrichment-one-manual-fuel',NULL::text,
      'Directly inspected MY2024 US owner manual fuel-quality chapter. Minimum and recommendation are distinct; AKI is not RON. No EPA fuel-type classification inferred.'),
    ('fuel_tank_capacity_gallons','numeric','known',15.9,NULL,
      'mustang-enrichment-one-manual-tank','US gal',
      'Rendered official US MY2024 manual chapter explicitly covers all 2.3L EcoBoost variants, including this Fastback automatic/RWD configuration; not a GT-only or package-dependent specification.'),
    ('overview','text','known',NULL,
      E'Research snapshot: NHTSA returned 12 recall campaigns for the 2024 Mustang model year. These are candidate campaigns, not 12 recalls established for this configuration and not VIN-specific open recalls. Manual-transmission campaign 24V394000 does not apply to this 10-speed automatic. Campaign 24V220000 covers certain 2.3L vehicles built February 2–9, 2024; this draft has no build date or VIN. Campaign 25V516000 covers one incorrectly repaired vehicle; its service history cannot be assumed.\n\nThe model-year complaint query returned 81 reports, including incompatible GT and convertible examples. These are owner-reported allegations, not confirmed defects or failure rates. No exact-configuration complaint pattern was approved. NCAP family record 19149 lists InvestigationCount 0; that limited query is not proof that no investigation exists.\n\nNHTSA publishes a five-star overall result for its 2024 Mustang two-door RWD family, but tested-engine/trim transfer to this exact EcoBoost has not been established; no exact-configuration rating is assigned. EPA candidate records distinguish standard and Performance Package vehicles. Package/body mapping and FuelEconomy.gov commercial reuse remain unresolved, so MPG, EPA fuel type and emissions values remain unassigned.',
      'mustang-enrichment-one-review',NULL,
      'Original editorial research summary with primary citations. Broader populations and unresolved applicability explicitly identified; no synthesized estimates, ratings or issue prevalence.'),
    ('mpg_city','numeric','unknown',NULL,NULL,'mustang-enrichment-one-epa-candidates','mpg','Package/body label mapping and commercial reuse unresolved.'),
    ('mpg_highway','numeric','unknown',NULL,NULL,'mustang-enrichment-one-epa-candidates','mpg','Package/body label mapping and commercial reuse unresolved.'),
    ('mpg_combined','numeric','unknown',NULL,NULL,'mustang-enrichment-one-epa-candidates','mpg','Package/body label mapping and commercial reuse unresolved.'),
    ('fuel_type','text','unknown',NULL,NULL,'mustang-enrichment-one-epa-candidates',NULL,'EPA label classification not assigned without exact applicable record. Manual octane requirement is a separately sourced technical specification.'),
    ('horsepower','numeric','unknown',NULL,NULL,'mustang-enrichment-one-review','hp','No independently verified final exact-configuration primary output specification accepted. Preliminary identity evidence does not authorize final output specifications.')
  ) AS fields(code,type,state,number,value,key,unit,rationale)
  LOOP
    SELECT e.id INTO evidence_ FROM evidence_items e
      JOIN source_revisions r ON r.id=e.source_revision_id JOIN research_sources s ON s.id=r.research_source_id
      WHERE s.source_key=field_.key;
    INSERT INTO research_claims(claim_kind,content_class,research_status,review_status,evidence_strength)
      VALUES(CASE WHEN field_.code='overview' THEN 'editorial' ELSE 'specification' END,
      CASE WHEN field_.code='overview' THEN 'editorial_synthesis' ELSE 'source_fact' END,
      CASE WHEN field_.key='mustang-enrichment-one-epa-candidates' THEN 'blocked' ELSE 'researched' END,
      'accepted',CASE WHEN field_.state='known' AND field_.code<>'overview' THEN 'strong' ELSE 'moderate' END)
      RETURNING id INTO claim_;
    INSERT INTO claim_subjects(research_claim_id,vehicle_configuration_id) VALUES(claim_,cfg);
    INSERT INTO claim_reviews(research_claim_id,decision,reviewer_reference,rationale)
      VALUES(claim_,'accepted','auto-research/private-enrichment-review',field_.rationale);
    INSERT INTO claim_evidence(research_claim_id,evidence_item_id,evidence_relation) VALUES(claim_,evidence_,'supports');
    IF field_.code='overview' THEN
      INSERT INTO claim_evidence(research_claim_id,evidence_item_id,evidence_relation)
      SELECT claim_,e.id,'supports' FROM evidence_items e
      JOIN source_revisions r ON r.id=e.source_revision_id JOIN research_sources s ON s.id=r.research_source_id
      WHERE s.source_key IN ('mustang-enrichment-one-recalls','mustang-enrichment-one-complaints','mustang-enrichment-one-ncap',
        'mustang-enrichment-one-part573-24V220','mustang-enrichment-one-part573-24V394');
    END IF;
    INSERT INTO applicability_sets(research_claim_id,scope_state,reviewed_at) VALUES(claim_,'restricted',now()) RETURNING id INTO scope_;
    INSERT INTO applicability_alternatives(applicability_set_id,ordinal,scope_completeness,market_id,vehicle_configuration_id)
      VALUES(scope_,0,'complete',market_,cfg);
    INSERT INTO spec_claim_values(research_claim_id,field_code,value_type,value_state,numeric_value,text_value,
      normalized_unit,original_source_unit,measurement_basis)
      VALUES(claim_,field_.code,field_.type,field_.state,field_.number,field_.value,
        field_.unit,field_.unit,field_.rationale);
  END LOOP;

  FOR campaign_ IN SELECT * FROM (VALUES
    ('23V800000','Brake pedal assembly; affected production population not established for this draft.'),
    ('24V220000','Certain 2.3L vehicles, production 2024-02-02 through 2024-02-09; build date/VIN unknown. Part 573: https://static.nhtsa.gov/odi/rcl/2024/RCLRPT-24V220-4944.PDF'),
    ('24V394000','Manual transmissions only; incompatible with this automatic. Part 573: https://static.nhtsa.gov/odi/rcl/2024/RCLRPT-24V394-3723.PDF'),
    ('24V496000','BCM service-update population; service history unknown.'),
    ('24V593000','Rear suspension knuckles, production 2023-07-25 through 2023-09-15; build date and affected part unknown. Part 573: https://static.nhtsa.gov/odi/rcl/2024/RCLRPT-24V593-3301.PDF'),
    ('24V634000','Fuel injector population; exact engine/parts/build scope not established.'),
    ('24V802000','Instrument cluster population; exact affected production scope not established.'),
    ('25V315000','Rearview camera software population; configuration/software applicability unresolved.'),
    ('25V516000','One vehicle incorrectly repaired under 24V802000; VIN/service history unknown.'),
    ('25V546000','Exterior lighting/BCM population; exact production/parts scope unresolved.'),
    ('26V418000','Windshield wiper/washer population; exact production/parts scope unresolved.'),
    ('26V547000','Harness grounds, production 2022-09-07 through 2026-06-09; draft build date and VIN unknown. Part 573: https://static.nhtsa.gov/odi/rcl/2026/RCLRPT-26V547-3184.pdf')
  ) AS campaigns(code,scope)
  LOOP
    INSERT INTO research_claims(claim_kind,content_class,research_status,review_status,evidence_strength)
      VALUES('recall','source_fact','researched',CASE WHEN campaign_.code='24V394000' THEN 'rejected' ELSE 'accepted' END,'moderate') RETURNING id INTO claim_;
    INSERT INTO claim_subjects(research_claim_id,vehicle_configuration_id) VALUES(claim_,cfg);
    INSERT INTO claim_reviews(research_claim_id,decision,reviewer_reference,rationale)
      VALUES(claim_,CASE WHEN campaign_.code='24V394000' THEN 'rejected' ELSE 'accepted' END,
      'auto-research/private-enrichment-review',campaign_.scope || ' Campaign existence does not establish configuration or VIN-open status.');
    INSERT INTO claim_evidence(research_claim_id,evidence_item_id,evidence_relation,locator_note)
      SELECT claim_,e.id,'supports',campaign_.code || ': ' || campaign_.scope FROM evidence_items e
      JOIN source_revisions r ON r.id=e.source_revision_id JOIN research_sources s ON s.id=r.research_source_id
      WHERE s.source_key='mustang-enrichment-one-recalls'
        OR s.source_key='mustang-enrichment-one-part573-' || substring(campaign_.code,1,6);
    INSERT INTO applicability_sets(research_claim_id,scope_state,reviewed_at) VALUES(claim_,'restricted',now()) RETURNING id INTO scope_;
    INSERT INTO applicability_alternatives(applicability_set_id,ordinal,scope_completeness,market_id,vehicle_model_year_id)
      VALUES(scope_,0,'partial',market_,year_);
    INSERT INTO recall_campaign_details(research_claim_id,issuing_authority,campaign_identifier,affected_population_description)
      VALUES(claim_,'NHTSA',campaign_.code,campaign_.scope || ' No VIN-open status assigned.');
  END LOOP;
  INSERT INTO research_claims(claim_kind,content_class,research_status,review_status,evidence_strength)
    VALUES('safety_rating','source_fact','researched','accepted','moderate') RETURNING id INTO claim_;
  INSERT INTO claim_subjects(research_claim_id,vehicle_configuration_id) VALUES(claim_,cfg);
  INSERT INTO claim_reviews(research_claim_id,decision,reviewer_reference,rationale)
    VALUES(claim_,'accepted','auto-research/private-enrichment-review',
      'Published NCAP family result is established; exact tested engine/trim transfer is not. Partial applicability must remain unknown and never become this configuration rating.');
  INSERT INTO claim_evidence(research_claim_id,evidence_item_id,evidence_relation)
    SELECT claim_,e.id,'supports' FROM evidence_items e
    JOIN source_revisions r ON r.id=e.source_revision_id JOIN research_sources s ON s.id=r.research_source_id
    WHERE s.source_key='mustang-enrichment-one-ncap';
  INSERT INTO applicability_sets(research_claim_id,scope_state,reviewed_at) VALUES(claim_,'restricted',now()) RETURNING id INTO scope_;
  INSERT INTO applicability_alternatives(applicability_set_id,ordinal,scope_completeness,market_id,vehicle_model_year_id)
    VALUES(scope_,0,'partial',market_,year_);
  INSERT INTO safety_rating_details(research_claim_id,authority,program,test_year,tested_variant_population,
    category,score,score_unit,result_basis)
    VALUES(claim_,'NHTSA','NCAP',2024,'2024 Ford Mustang 2 DR RWD; VehicleId 19149; exact engine/trim transfer unestablished',
      'Overall',5,'stars','Broader published body/drive family only; not assigned to exact EcoBoost configuration.');
END
$enrichment$;
COMMIT;