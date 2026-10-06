-- Development catalog batch: 30 documented U.S. trim/year identities.
-- Not a schema migration, exhaustive catalog, powertrain import, or public release.
-- Idempotent and atomic. No legacy records, aliases, reports, or relationships are deleted.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('auto-research-american-catalog-identity-import'));
DO $batch$
DECLARE
  item jsonb; trim_name text; trim_slug text; profile_slug text;
  market_id_ integer; brand_id_ integer; model_id_ integer; generation_id_ integer;
  year_id_ integer; trim_id_ integer; configuration_id_ integer; existing_configuration_ integer;
  source_id_ integer; revision_id_ integer; evidence_id_ integer;
  generation_source_ integer; generation_revision_ integer; generation_evidence_ integer;
  epa_source_ integer; epa_revision_ integer; epa_evidence_ integer;
  claim_id_ integer; set_id_ integer; subject_kind_ text;
BEGIN
  SELECT id INTO market_id_ FROM markets WHERE code='US' AND market_type='country';
  IF market_id_ IS NULL THEN
    INSERT INTO markets(code,name,market_type) VALUES ('US','United States','country')
      RETURNING id INTO market_id_;
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements($identities$[
    {"brand":"Ford","brandSlug":"ford","model":"F-150","modelSlug":"f-150","generation":"Fourteenth generation (2021 redesign)","generationSlug":"us-fourteenth-generation-2021","startYear":2021,"endYear":null,"year":2021,"trims":["XL","XLT","Lariat","King Ranch","Platinum","Limited"],"url":"https://www.auto-brochures.com/makes/Ford/F-150/Ford_US%20F-150_2021-specs.pdf","title":"2021 Ford F-150 U.S. specifications","locator":"2021 FORD F-150: Trim levels row. Six documented trims only; this is not the full late-model-year lineup.","generationUrl":"https://en.wikipedia.org/wiki/Ford_F-Series_(fourteenth_generation)","generationLocator":"Introduction and model-years infobox: fourteenth generation introduced for MY2021."},
    {"brand":"Chevrolet","brandSlug":"chevrolet","model":"Silverado 1500","modelSlug":"silverado-1500","generation":"Fourth generation (T1XX, 2019 redesign)","generationSlug":"us-fourth-generation-t1xx-2019","startYear":2019,"endYear":null,"year":2024,"trims":["WT","Custom","Custom Trail Boss","LT","RST","LT Trail Boss","ZR2","LTZ","High Country"],"url":"https://media.chevrolet.com/content/dam/Media/images/US/Vehicles/Chevrolet/Trucks/Silverado/2024/2024-Chevrolet-Silverado-033023.pdf","title":"MY2024 Chevrolet Silverado 1500 U.S. facts","locator":"MY2024 US fast-facts document: Available in ... trims list. Cab, bed, engine, drive layout and packages are not inferred.","generationUrl":"https://en.wikipedia.org/wiki/Chevrolet_Silverado","generationLocator":"Fourth-generation Silverado / fifth-generation Sierra (GMT T1XX; 2019) section; light-duty 1500, not HD or Silverado LD."},
    {"brand":"Buick","brandSlug":"buick","model":"Enclave","modelSlug":"enclave","generation":"Second generation (2018–2024)","generationSlug":"us-second-generation-2018","startYear":2018,"endYear":2024,"year":2024,"trims":["Essence","Premium","Avenir"],"url":"https://www.buick.com/content/dam/buick/na/us/en/index/shopping-tools/download-catalog/02-pdfs/GMBE23CT100-2024-ENCLAVE-FO_050924.pdf","title":"2024 Buick Enclave U.S. catalog","locator":"Enclave trim overview and equipment columns: Essence, Premium, Avenir. Preferred is not listed and is not an alias for Essence.","generationUrl":"https://en.wikipedia.org/wiki/Buick_Enclave","generationLocator":"Second generation / North America model-years infobox: MY2018–2024. Excludes the separate Chinese-market Enclave."},
    {"brand":"GMC","brandSlug":"gmc","model":"Sierra 1500","modelSlug":"sierra-1500","generation":"Fifth generation (T1XX, 2019 redesign)","generationSlug":"us-fifth-generation-t1xx-2019","startYear":2019,"endYear":null,"year":2024,"trims":["Pro","SLE","Elevation","SLT","AT4","AT4X","Denali","Denali Ultimate"],"url":"https://media.gmc.com/content/dam/Media/images/US/Vehicles/GMC/Sierra/2024/2024-GMC-Sierra-1500.pdf","title":"MY2024 GMC Sierra 1500 U.S. facts","locator":"MY2024 US fast-facts document: Available in ... trims list. AT4X AEV Edition is an edition, not an extra base trim.","generationUrl":"https://en.wikipedia.org/wiki/Chevrolet_Silverado","generationLocator":"Fourth-generation Silverado / fifth-generation Sierra (GMT T1XX; 2019) section. Sierra generation numbering differs from Silverado; excludes HD and Sierra Limited."},
    {"brand":"Lucid","brandSlug":"lucid","model":"Air","modelSlug":"air","generation":"First generation (2022 model-year introduction)","generationSlug":"us-first-generation-2022","startYear":2022,"endYear":null,"year":2024,"trims":["Pure","Touring","Grand Touring","Sapphire"],"url":"https://ir.lucidmotors.com/news-releases/news-release-details/lucid-air-model-line-updates-offer-customers-more-freedom-power","title":"Lucid Air model-line update, December 5, 2023","locator":"Four-model retail lineup and MY2024 footnotes, independently matched to MY2024 EPA named-model records. Outgoing Grand Touring Performance and Pure AWD are not extrapolated into this year.","generationUrl":"https://en.wikipedia.org/wiki/Lucid_Air","generationLocator":"Model-years infobox: MY2022–present; production started in calendar 2021. Model year is not the production calendar year."}
  ]$identities$::jsonb)
  LOOP
    INSERT INTO consumer_brands(canonical_name,slug,lifecycle_status)
      VALUES (item->>'brand',item->>'brandSlug','active')
      ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO brand_id_ FROM consumer_brands WHERE slug=item->>'brandSlug';
    INSERT INTO vehicle_models(consumer_brand_id,name,slug,lifecycle_status)
      VALUES (brand_id_,item->>'model',item->>'modelSlug','active')
      ON CONFLICT (consumer_brand_id,slug) DO NOTHING;
    SELECT id INTO model_id_ FROM vehicle_models
      WHERE consumer_brand_id=brand_id_ AND slug=item->>'modelSlug';
    INSERT INTO vehicle_generations(vehicle_model_id,name,slug,start_year,end_year,lifecycle_status)
      VALUES (model_id_,item->>'generation',item->>'generationSlug',
        (item->>'startYear')::integer,(item->>'endYear')::integer,'active')
      ON CONFLICT (vehicle_model_id,slug) DO NOTHING;
    SELECT id INTO generation_id_ FROM vehicle_generations
      WHERE vehicle_model_id=model_id_ AND slug=item->>'generationSlug'
        AND name=item->>'generation' AND start_year=(item->>'startYear')::integer
        AND end_year IS NOT DISTINCT FROM (item->>'endYear')::integer;
    IF generation_id_ IS NULL THEN RAISE EXCEPTION 'Conflicting generation: %',item->>'generationSlug'; END IF;
    INSERT INTO vehicle_model_years(vehicle_generation_id,market_id,model_year,source_identifier,identity_status)
      VALUES (generation_id_,market_id_,(item->>'year')::integer,
        'american-catalog-identity-batch-2026-10-05','supported')
      ON CONFLICT (vehicle_generation_id,market_id,model_year) DO NOTHING;
    SELECT id INTO year_id_ FROM vehicle_model_years
      WHERE vehicle_generation_id=generation_id_ AND market_id=market_id_
        AND model_year=(item->>'year')::integer AND identity_status='supported';
    IF year_id_ IS NULL THEN RAISE EXCEPTION 'Conflicting model year: %',item; END IF;

    INSERT INTO research_sources(source_key,source_kind,canonical_url,market_id)
      VALUES ('american-catalog-'||(item->>'brandSlug')||'-'||(item->>'modelSlug')||'-my'||(item->>'year'),
        'oem_document',item->>'url',market_id_) ON CONFLICT (source_key) DO NOTHING;
    SELECT id INTO source_id_ FROM research_sources
      WHERE source_key='american-catalog-'||(item->>'brandSlug')||'-'||(item->>'modelSlug')||'-my'||(item->>'year');
    INSERT INTO source_revisions(research_source_id,document_identifier,source_version,retrieved_at,
      format,update_behavior,terms_version,terms_reviewed_at,
      storage_rights_status,derivative_use_rights_status,display_rights_status)
      VALUES (source_id_,item->>'title','Normalized identity review 2026-10-05',now(),
        'Manually inspected published document; normalized factual identifiers only',
        'Year-specific factual snapshot; no current-year carryover or automatic scraping',
        'Rights decision limited to independent factual names/year relationships and minimal provenance in a private development catalog. No prose, images, logos, tables, document copies or other expressive material retained or licensed. Copyright notices do not grant a document-republication license; no such license is asserted. Public release requires separate opt-in.',
        now(),'allowed','allowed','allowed')
      ON CONFLICT (research_source_id,document_identifier,source_version)
        WHERE document_identifier IS NOT NULL AND source_version IS NOT NULL DO NOTHING;
    SELECT id INTO revision_id_ FROM source_revisions WHERE research_source_id=source_id_
      AND document_identifier=item->>'title' AND source_version='Normalized identity review 2026-10-05';
    SELECT id INTO evidence_id_ FROM evidence_items
      WHERE source_revision_id=revision_id_ AND locator=item->>'locator' LIMIT 1;
    IF evidence_id_ IS NULL THEN
      INSERT INTO evidence_items(source_revision_id,locator,evidence_kind)
        VALUES (revision_id_,item->>'locator','document_section') RETURNING id INTO evidence_id_;
    END IF;

    INSERT INTO research_sources(source_key,source_kind,canonical_url,market_id)
      VALUES ('american-catalog-generation-'||(item->>'brandSlug')||'-'||(item->>'modelSlug'),
        'other_reviewed',item->>'generationUrl',market_id_) ON CONFLICT (source_key) DO NOTHING;
    SELECT id INTO generation_source_ FROM research_sources
      WHERE source_key='american-catalog-generation-'||(item->>'brandSlug')||'-'||(item->>'modelSlug');
    INSERT INTO source_revisions(research_source_id,document_identifier,source_version,retrieved_at,
      format,update_behavior,terms_url,terms_version,terms_reviewed_at,
      storage_rights_status,derivative_use_rights_status,display_rights_status)
      VALUES (generation_source_,'U.S. generation grouping','Normalized identity review 2026-10-05',now(),
        'Wikipedia factual generation metadata; no article prose or images copied',
        'Manually reviewed snapshot; model-year and market distinctions retained',
        'https://creativecommons.org/licenses/by-sa/4.0/',
        'Independent normalized facts only; attribution retained through the linked article. No creative article text or media imported; no restriction on commercial factual reuse claimed.',
        now(),'allowed','allowed','allowed')
      ON CONFLICT (research_source_id,document_identifier,source_version)
        WHERE document_identifier IS NOT NULL AND source_version IS NOT NULL DO NOTHING;
    SELECT id INTO generation_revision_ FROM source_revisions WHERE research_source_id=generation_source_
      AND document_identifier='U.S. generation grouping' AND source_version='Normalized identity review 2026-10-05';
    SELECT id INTO generation_evidence_ FROM evidence_items
      WHERE source_revision_id=generation_revision_ AND locator=item->>'generationLocator' LIMIT 1;
    IF generation_evidence_ IS NULL THEN
      INSERT INTO evidence_items(source_revision_id,locator,evidence_kind)
        VALUES (generation_revision_,item->>'generationLocator','document_section') RETURNING id INTO generation_evidence_;
    END IF;

    epa_evidence_ := NULL;
    IF item->>'brandSlug'='lucid' THEN
      INSERT INTO research_sources(source_key,source_kind,canonical_url,market_id)
        VALUES ('american-catalog-epa-lucid-my2024','government',
          'https://www.fueleconomy.gov/feg/epadata/vehicles.csv',market_id_)
        ON CONFLICT (source_key) DO NOTHING;
      SELECT id INTO epa_source_ FROM research_sources WHERE source_key='american-catalog-epa-lucid-my2024';
      INSERT INTO source_revisions(research_source_id,document_identifier,source_version,retrieved_at,
        format,update_behavior,terms_url,terms_version,terms_reviewed_at,
        storage_rights_status,derivative_use_rights_status,display_rights_status)
        VALUES (epa_source_,'MY2024 Lucid Air named-model records','Normalized identity review 2026-10-05',now(),
          'Government CSV; only year/make/named-model identifiers retained',
          'Periodically updated dataset; retail names independently verified in dated Lucid announcement',
          'https://edg.epa.gov/EPA_Data_License.htm',
          'Independent normalized government vehicle year/name identifiers only; no ORNL documents, site prose, images, document copies or creative presentation retained. Used only to corroborate MY2024, not to manufacture retail trims from drivetrain or wheel options. Minimal factual audit metadata in private development; no document republication license asserted.',
          now(),'allowed','allowed','allowed')
        ON CONFLICT (research_source_id,document_identifier,source_version)
          WHERE document_identifier IS NOT NULL AND source_version IS NOT NULL DO NOTHING;
      SELECT id INTO epa_revision_ FROM source_revisions WHERE research_source_id=epa_source_
        AND document_identifier='MY2024 Lucid Air named-model records' AND source_version='Normalized identity review 2026-10-05';
      SELECT id INTO epa_evidence_ FROM evidence_items WHERE source_revision_id=epa_revision_ LIMIT 1;
      IF epa_evidence_ IS NULL THEN
        INSERT INTO evidence_items(source_revision_id,locator,evidence_kind)
          VALUES (epa_revision_,'CSV exact filters: make=Lucid, year=2024. Pure: IDs 47454–47455; Touring: 47839–47841; Grand Touring: 47836–47838, EPA shorthand Air G Touring XR; Sapphire: 47456. Dated Lucid announcement supplies retail trim names. Wheel, XR and drive variants are not additional trims.',
            'dataset_record') RETURNING id INTO epa_evidence_;
      END IF;
    END IF;

    FOR trim_name IN SELECT jsonb_array_elements_text(item->'trims')
    LOOP
      trim_slug := regexp_replace(lower(trim_name),'[^a-z0-9]+','-','g');
      profile_slug := (item->>'brandSlug')||'-'||(item->>'modelSlug')||'-'||(item->>'year')||'-'||trim_slug||'-us-trim-identity';
      SELECT vehicle_configuration_id INTO existing_configuration_ FROM vehicle_profile_aliases WHERE slug=profile_slug;
      IF FOUND THEN
        IF NOT EXISTS (
          SELECT 1 FROM vehicle_configurations c JOIN vehicle_trims t ON t.id=c.vehicle_trim_id
          JOIN vehicle_profile_aliases a ON a.vehicle_configuration_id=c.id
          WHERE c.id=existing_configuration_ AND t.vehicle_model_year_id=year_id_
            AND t.normalized_name=lower(trim_name) AND c.identity_status='supported' AND NOT c.is_demo
            AND a.slug=profile_slug AND a.alias_kind='canonical_profile' AND a.mapping_status='exact_supported'
            AND a.legacy_trim_id IS NULL
        ) THEN RAISE EXCEPTION 'Conflicting existing alias: %',profile_slug; END IF;
        CONTINUE;
      END IF;
      INSERT INTO vehicle_trims(vehicle_model_year_id,sales_name,normalized_name,lifecycle_status)
        VALUES (year_id_,trim_name,lower(trim_name),'active')
        ON CONFLICT (vehicle_model_year_id,normalized_name) DO NOTHING;
      SELECT id INTO trim_id_ FROM vehicle_trims WHERE vehicle_model_year_id=year_id_ AND normalized_name=lower(trim_name);
      INSERT INTO vehicle_configurations(vehicle_trim_id,configuration_key,display_label,identity_status,is_demo)
        VALUES (trim_id_,'us-my'||(item->>'year')||'-trim-level-identity',trim_name,'supported',false)
        RETURNING id INTO configuration_id_;
      INSERT INTO vehicle_profile_aliases(slug,vehicle_configuration_id,alias_kind,mapping_status)
        VALUES (profile_slug,configuration_id_,'canonical_profile','exact_supported');
      FOR subject_kind_ IN SELECT unnest(ARRAY['model_year','configuration'])
      LOOP
        IF subject_kind_='model_year' AND EXISTS (
          SELECT 1 FROM claim_subjects s JOIN research_claims c ON c.id=s.research_claim_id
          WHERE s.vehicle_model_year_id=year_id_ AND c.claim_kind='identity'
            AND c.content_class='source_fact' AND c.review_status='accepted'
        ) THEN CONTINUE; END IF;
        INSERT INTO research_claims(claim_kind,content_class,research_status,review_status,evidence_strength)
          VALUES ('identity','source_fact','researched','accepted','moderate') RETURNING id INTO claim_id_;
        IF subject_kind_='model_year' THEN
          INSERT INTO claim_subjects(research_claim_id,vehicle_model_year_id) VALUES (claim_id_,year_id_);
        ELSE
          INSERT INTO claim_subjects(research_claim_id,vehicle_configuration_id) VALUES (claim_id_,configuration_id_);
        END IF;
        INSERT INTO claim_reviews(research_claim_id,decision,reviewer_reference,rationale)
          VALUES (claim_id_,'accepted','auto-research/development-catalog-identity-review',
            'Private development trim-level identity only: U.S. '||(item->>'year')||' '||(item->>'brand')||' '||(item->>'model')||' '||trim_name||
            '. Named retail trim was manually checked in the retrieved year-specific document; generation grouping independently reviewed. No body/cab/bed, powertrain, drivetrain, package, price, reliability, safety, ownership or recall values inferred. No demo facts or reports transferred. Public release and owner-submission eligibility remain separate gates.');
        INSERT INTO claim_evidence(research_claim_id,evidence_item_id,evidence_relation,locator_note)
          VALUES (claim_id_,evidence_id_,'supports','Exact U.S. year and retail trim name: '||trim_name),
            (claim_id_,generation_evidence_,'supports','Generation grouping only; not a source for retail trim availability or optional research.');
        IF epa_evidence_ IS NOT NULL THEN
          INSERT INTO claim_evidence(research_claim_id,evidence_item_id,evidence_relation,locator_note)
            VALUES (claim_id_,epa_evidence_,'supports','MY2024 named-model corroboration; retail naming relies on the dated Lucid lineup.');
        END IF;
        INSERT INTO applicability_sets(research_claim_id,scope_state,reviewed_at)
          VALUES (claim_id_,'restricted',now()) RETURNING id INTO set_id_;
        IF subject_kind_='model_year' THEN
          INSERT INTO applicability_alternatives(applicability_set_id,ordinal,scope_completeness,market_id,vehicle_model_year_id)
            VALUES (set_id_,0,'complete',market_id_,year_id_);
        ELSE
          INSERT INTO applicability_alternatives(applicability_set_id,ordinal,scope_completeness,market_id,vehicle_configuration_id)
            VALUES (set_id_,0,'complete',market_id_,configuration_id_);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END
$batch$;
COMMIT;
-- Read the exact IDs for the explicit development allowlist. Never add to the public manifest automatically.
SELECT a.slug,c.id AS configuration_id,s.research_claim_id AS identity_claim_id
FROM vehicle_profile_aliases a
JOIN vehicle_configurations c ON c.id=a.vehicle_configuration_id
JOIN vehicle_trims t ON t.id=c.vehicle_trim_id
JOIN vehicle_model_years y ON y.id=t.vehicle_model_year_id
JOIN claim_subjects s ON s.vehicle_configuration_id=c.id
JOIN research_claims r ON r.id=s.research_claim_id AND r.claim_kind='identity' AND r.content_class='source_fact'
WHERE y.source_identifier='american-catalog-identity-batch-2026-10-05'
  AND a.alias_kind='canonical_profile' AND r.review_status='accepted'
ORDER BY c.id;
