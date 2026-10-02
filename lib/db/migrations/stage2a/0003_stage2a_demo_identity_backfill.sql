DO $$
DECLARE
  profile record;
  profile_count integer;
  trim_name_collision_count integer;
  brand_id integer;
  model_id integer;
  generation_id integer;
  model_year_id integer;
  canonical_trim_id integer;
  alias_record record;
  expected_slugs text[] := ARRAY[
    'buick-enclave-2024-preferred',
    'cadillac-escalade-2024-premium-luxury',
    'chevrolet-silverado-1500-2024-lt',
    'chrysler-pacifica-2024-touring',
    'dodge-charger-2023-gt',
    'ford-f-150-2024-lariat',
    'ford-f-150-2024-xlt',
    'gmc-sierra-1500-2024-elevation',
    'jeep-grand-cherokee-2024-laredo',
    'lincoln-navigator-2023-reserve',
    'ram-1500-2024-big-horn',
    'tesla-model-y-2024-long-range',
    'tesla-model-y-2024-performance'
  ];
BEGIN
  SELECT count(*) INTO profile_count
  FROM "trims"
  WHERE slug = ANY(expected_slugs);
  IF profile_count <> cardinality(expected_slugs) THEN
    RAISE EXCEPTION 'Stage 2A identity backfill requires all 13 approved legacy profile slugs; found %', profile_count
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "trims"
    WHERE slug = ANY(expected_slugs) AND is_demo IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'Stage 2A identity backfill refuses to reclassify a non-demo legacy profile'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO trim_name_collision_count
  FROM (
    SELECT my.id, lower(btrim(t.name))
    FROM "trims" t
    JOIN "model_years" my ON my.id = t.model_year_id
    WHERE t.slug = ANY(expected_slugs)
    GROUP BY my.id, lower(btrim(t.name))
    HAVING count(*) > 1
  ) collisions;
  IF trim_name_collision_count > 0 THEN
    RAISE EXCEPTION 'Stage 2A identity backfill found ambiguous legacy trim names; retain those public profiles without canonical trim mapping'
      USING ERRCODE = '23514';
  END IF;

  FOR profile IN
    SELECT
      t.id AS legacy_trim_id,
      t.slug AS legacy_slug,
      t.name AS trim_name,
      mk.name AS brand_name,
      mk.slug AS brand_slug,
      m.name AS model_name,
      m.slug AS model_slug,
      g.id AS legacy_generation_id,
      g.name AS generation_name,
      g.start_year,
      g.end_year,
      my.year AS model_year
    FROM "trims" t
    JOIN "model_years" my ON my.id = t.model_year_id
    JOIN "generations" g ON g.id = my.generation_id
    JOIN "models" m ON m.id = g.model_id
    JOIN "makes" mk ON mk.id = m.make_id
    WHERE t.slug = ANY(expected_slugs)
    ORDER BY t.id
  LOOP
    INSERT INTO "consumer_brands" (canonical_name, slug, lifecycle_status)
    VALUES (profile.brand_name, profile.brand_slug, 'watchlist')
    ON CONFLICT (slug) DO NOTHING;
    SELECT id INTO brand_id
    FROM "consumer_brands"
    WHERE slug = profile.brand_slug AND canonical_name = profile.brand_name;
    IF brand_id IS NULL THEN
      RAISE EXCEPTION 'Legacy make identity conflicts with an existing canonical brand'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO "vehicle_models" (consumer_brand_id, name, slug, lifecycle_status)
    VALUES (brand_id, profile.model_name, profile.model_slug, 'watchlist')
    ON CONFLICT (consumer_brand_id, slug) DO NOTHING;
    SELECT id INTO model_id
    FROM "vehicle_models"
    WHERE consumer_brand_id = brand_id
      AND slug = profile.model_slug
      AND name = profile.model_name;
    IF model_id IS NULL THEN
      RAISE EXCEPTION 'Legacy model identity conflicts with an existing canonical model'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO "vehicle_generations"
      (vehicle_model_id, name, slug, start_year, end_year, lifecycle_status)
    VALUES (
      model_id,
      profile.generation_name,
      'legacy-generation-' || profile.legacy_generation_id::text,
      profile.start_year,
      profile.end_year,
      'watchlist'
    )
    ON CONFLICT (vehicle_model_id, slug) DO NOTHING;
    SELECT id INTO generation_id
    FROM "vehicle_generations"
    WHERE vehicle_model_id = model_id
      AND slug = 'legacy-generation-' || profile.legacy_generation_id::text
      AND name = profile.generation_name;
    IF generation_id IS NULL THEN
      RAISE EXCEPTION 'Legacy generation identity conflicts with an existing canonical generation'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO "vehicle_model_years"
      (vehicle_generation_id, market_id, model_year, identity_status)
    VALUES (generation_id, NULL, profile.model_year, 'demo_identity_only')
    ON CONFLICT DO NOTHING;
    SELECT id INTO model_year_id
    FROM "vehicle_model_years"
    WHERE vehicle_generation_id = generation_id
      AND market_id IS NULL
      AND model_year = profile.model_year
      AND identity_status = 'demo_identity_only';
    IF model_year_id IS NULL THEN
      RAISE EXCEPTION 'Legacy model-year identity conflicts with an existing canonical model year'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO "vehicle_trims"
      (vehicle_model_year_id, sales_name, normalized_name, lifecycle_status)
    VALUES (
      model_year_id,
      profile.trim_name,
      lower(btrim(profile.trim_name)),
      'watchlist'
    )
    ON CONFLICT (vehicle_model_year_id, normalized_name) DO NOTHING;
    SELECT id INTO canonical_trim_id
    FROM "vehicle_trims"
    WHERE vehicle_model_year_id = model_year_id
      AND normalized_name = lower(btrim(profile.trim_name))
      AND sales_name = profile.trim_name;
    IF canonical_trim_id IS NULL THEN
      RAISE EXCEPTION 'Legacy trim identity conflicts with an existing canonical trim'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO "vehicle_profile_aliases"
      (slug, legacy_trim_id, vehicle_configuration_id, alias_kind, mapping_status)
    VALUES (profile.legacy_slug, profile.legacy_trim_id, NULL, 'legacy_profile', 'demo_identity_only')
    ON CONFLICT (slug) DO NOTHING;
    SELECT id, legacy_trim_id, vehicle_configuration_id, alias_kind, mapping_status
      INTO alias_record
    FROM "vehicle_profile_aliases"
    WHERE slug = profile.legacy_slug;
    IF alias_record.legacy_trim_id IS DISTINCT FROM profile.legacy_trim_id
      OR alias_record.vehicle_configuration_id IS NOT NULL
      OR alias_record.alias_kind IS DISTINCT FROM 'legacy_profile'
      OR alias_record.mapping_status IS DISTINCT FROM 'demo_identity_only' THEN
      RAISE EXCEPTION 'Legacy public profile alias conflicts with an existing canonical mapping'
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  IF (
    SELECT count(*)
    FROM "vehicle_profile_aliases"
    WHERE slug = ANY(expected_slugs)
      AND alias_kind = 'legacy_profile'
      AND mapping_status = 'demo_identity_only'
      AND vehicle_configuration_id IS NULL
  ) <> cardinality(expected_slugs) THEN
    RAISE EXCEPTION 'Stage 2A did not create all 13 demo-only legacy profile aliases'
      USING ERRCODE = '23514';
  END IF;
END;
$$;