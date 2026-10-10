/**
 * AqarPulse Platform — Geographic Taxonomy UUID Resolver
 * Bridges frontend slugs/identifiers with PostgreSQL UUID primary keys.
 */

export const CITY_MAP: Record<string, string> = {
  // Slugs to UUID
  "cairo": "c1000000-0000-0000-0000-000000000001",
  "city-cairo": "c1000000-0000-0000-0000-000000000001",
  "giza": "c2000000-0000-0000-0000-000000000002",
  "city-giza": "c2000000-0000-0000-0000-000000000002",
  "alexandria": "c3000000-0000-0000-0000-000000000003",
  "city-alexandria": "c3000000-0000-0000-0000-000000000003",
};

export const DISTRICT_MAP: Record<string, string> = {
  // Slugs to UUID
  "new-cairo": "d1000000-0000-0000-0000-000000000001",
  "dist-new-cairo": "d1000000-0000-0000-0000-000000000001",
  "sheikh-zayed": "d2000000-0000-0000-0000-000000000002",
  "dist-sheikh-zayed": "d2000000-0000-0000-0000-000000000002",
  "6th-october": "d3000000-0000-0000-0000-000000000003",
  "dist-6th-october": "d3000000-0000-0000-0000-000000000003",
  "new-capital": "d4000000-0000-0000-0000-000000000004",
  "dist-new-capital": "d4000000-0000-0000-0000-000000000004",
  "maadi": "37c86081-4828-4b02-b592-b5225c6af6f8",
  "dist-maadi": "37c86081-4828-4b02-b592-b5225c6af6f8",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveCityUuid(idOrSlug?: string | null): string {
  if (!idOrSlug) return "c1000000-0000-0000-0000-000000000001"; // Default Cairo
  if (UUID_REGEX.test(idOrSlug)) return idOrSlug;
  const mapped = CITY_MAP[idOrSlug.toLowerCase()];
  return mapped || "c1000000-0000-0000-0000-000000000001";
}

export function resolveDistrictUuid(idOrSlug?: string | null): string {
  if (!idOrSlug) return "d1000000-0000-0000-0000-000000000001"; // Default New Cairo
  if (UUID_REGEX.test(idOrSlug)) return idOrSlug;
  const mapped = DISTRICT_MAP[idOrSlug.toLowerCase()];
  return mapped || "d1000000-0000-0000-0000-000000000001";
}

export function resolveCityAndDistrictUuids(cityId?: string | null, districtId?: string | null): { cityId: string; districtId: string } {
  return {
    cityId: resolveCityUuid(cityId),
    districtId: resolveDistrictUuid(districtId),
  };
}

