import { db, trimsTable, vehicleProfileAliasesTable } from "@workspace/db";
import { asc, eq, inArray } from "drizzle-orm";
import {
  canResolveLegacyFallbackStatus,
  shouldKeepLegacyFallbackProfile,
} from "./vehicle-profile-policy";

const profileReadMode = process.env.AUTO_RESEARCH_PROFILE_READ_MODE ?? "catalog";
let catalogSchemaUnavailable = false;

if (profileReadMode !== "catalog" && profileReadMode !== "legacy") {
  throw new Error(
    "AUTO_RESEARCH_PROFILE_READ_MODE must be either 'catalog' or 'legacy'.",
  );
}

export function usesCatalogProfileReads(): boolean {
  return profileReadMode === "catalog" && !catalogSchemaUnavailable;
}

function isMissingAliasTable(error: unknown): boolean {
  let current: unknown = error;
  const visited = new Set<object>();
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if ("code" in current && current.code === "42P01") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

function disableCatalogReadsUntilRestart(): void {
  if (catalogSchemaUnavailable) return;
  catalogSchemaUnavailable = true;
  console.warn(
    "Stage 2A vehicle aliases are not available; using legacy profile reads until the API restarts after the catalog migration.",
  );
}

/**
 * Stage 2A's alias catalog controls non-demo legacy visibility. Demo profiles
 * remain on their original legacy records even if a canonical alias is later
 * attached. Exact-supported non-demo profiles stay excluded until an approved,
 * complete source can satisfy the existing shopper API contract.
 */
export async function getLegacyFallbackTrimIds(excludedSlugs: ReadonlySet<string> = new Set()): Promise<number[]> {
  if (!usesCatalogProfileReads()) {
    const trims = await db.select({ id: trimsTable.id, slug: trimsTable.slug }).from(trimsTable);
    return trims.filter((trim) => !excludedSlugs.has(trim.slug)).map(({ id }) => id);
  }

  let aliases: Array<{
    slug: string;
    legacyTrimId: number | null;
    mappingStatus: string;
  }>;
  let trims: Array<{ id: number; slug: string; isDemo: boolean }>;
  try {
    [aliases, trims] = await Promise.all([
      db
        .select({
          slug: vehicleProfileAliasesTable.slug,
          legacyTrimId: vehicleProfileAliasesTable.legacyTrimId,
          mappingStatus: vehicleProfileAliasesTable.mappingStatus,
        })
        .from(vehicleProfileAliasesTable),
      db
        .select({
          id: trimsTable.id,
          slug: trimsTable.slug,
          isDemo: trimsTable.isDemo,
        })
        .from(trimsTable),
    ]);
  } catch (error) {
    if (!isMissingAliasTable(error)) throw error;
    disableCatalogReadsUntilRestart();
    const legacyTrims = await db.select({ id: trimsTable.id, slug: trimsTable.slug }).from(trimsTable);
    return legacyTrims.filter((trim) => !excludedSlugs.has(trim.slug)).map(({ id }) => id);
  }

  const aliasesByLegacyId = new Map<number, typeof aliases>();
  const aliasesBySlug = new Map<string, (typeof aliases)[number]>();
  for (const alias of aliases) {
    if (alias.legacyTrimId != null) {
      const matches = aliasesByLegacyId.get(alias.legacyTrimId) ?? [];
      matches.push(alias);
      aliasesByLegacyId.set(alias.legacyTrimId, matches);
    }
    aliasesBySlug.set(alias.slug, alias);
  }

  return trims
    .filter((trim) => {
      if (excludedSlugs.has(trim.slug)) return false;
      const matches = [
        ...(aliasesByLegacyId.get(trim.id) ?? []),
        ...(aliasesBySlug.has(trim.slug) ? [aliasesBySlug.get(trim.slug)!] : []),
      ];
      return shouldKeepLegacyFallbackProfile(
        trim.isDemo,
        matches.map((alias) => alias.mappingStatus),
      );
    })
    .map(({ id }) => id);
}

/**
 * Resolve a public URL slug through its Stage 2A alias before falling back to
 * the legacy slug. Exact-supported and retired mappings are not served from
 * legacy data.
 */
export async function resolveLegacyFallbackTrimId(
  slug: string,
): Promise<number | undefined> {
  if (!usesCatalogProfileReads()) {
    const [trim] = await db
      .select({ id: trimsTable.id })
      .from(trimsTable)
      .where(eq(trimsTable.slug, slug))
      .limit(1);
    return trim?.id;
  }

  let alias:
    | {
        slug: string;
        legacyTrimId: number | null;
        mappingStatus: string;
      }
    | undefined;
  try {
    [alias] = await db
      .select({
        slug: vehicleProfileAliasesTable.slug,
        legacyTrimId: vehicleProfileAliasesTable.legacyTrimId,
        mappingStatus: vehicleProfileAliasesTable.mappingStatus,
      })
      .from(vehicleProfileAliasesTable)
      .where(eq(vehicleProfileAliasesTable.slug, slug))
      .limit(1);
  } catch (error) {
    if (!isMissingAliasTable(error)) throw error;
    disableCatalogReadsUntilRestart();
  }

  if (alias && !canResolveLegacyFallbackStatus(alias.mappingStatus, false)) {
    if (alias.legacyTrimId != null) {
      const [legacyTrim] = await db
        .select({ id: trimsTable.id, isDemo: trimsTable.isDemo })
        .from(trimsTable)
        .where(eq(trimsTable.id, alias.legacyTrimId))
        .limit(1);
      return legacyTrim?.isDemo ? legacyTrim.id : undefined;
    }

    // Do not let a canonical alias collide with and take over an established
    // demo URL. A non-demo legacy row remains hidden until it has a projection.
    const [legacyTrim] = await db
      .select({ id: trimsTable.id, isDemo: trimsTable.isDemo })
      .from(trimsTable)
      .where(eq(trimsTable.slug, slug))
      .limit(1);
    return legacyTrim?.isDemo ? legacyTrim.id : undefined;
  }
  if (alias?.legacyTrimId != null) return alias.legacyTrimId;

  const [legacyTrim] = await db
    .select({ id: trimsTable.id })
    .from(trimsTable)
    .where(eq(trimsTable.slug, slug))
    .limit(1);
  return legacyTrim?.id;
}

export async function getLegacyPublicSlugs(
  legacyTrimIds: readonly number[],
): Promise<Map<number, string>> {
  if (!usesCatalogProfileReads() || legacyTrimIds.length === 0) {
    return new Map();
  }

  const aliases = await db
    .select({
      id: vehicleProfileAliasesTable.id,
      legacyTrimId: vehicleProfileAliasesTable.legacyTrimId,
      slug: vehicleProfileAliasesTable.slug,
    })
    .from(vehicleProfileAliasesTable)
    .where(inArray(vehicleProfileAliasesTable.legacyTrimId, [...legacyTrimIds]))
    .orderBy(asc(vehicleProfileAliasesTable.id));

  const publicSlugs = new Map<number, string>();
  for (const alias of aliases) {
    if (alias.legacyTrimId == null || publicSlugs.has(alias.legacyTrimId)) continue;
    publicSlugs.set(alias.legacyTrimId, alias.slug);
  }
  return publicSlugs;
}
