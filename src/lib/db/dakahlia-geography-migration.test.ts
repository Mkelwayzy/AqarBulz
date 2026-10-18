import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  isMeetGhamrCity,
  MEET_GHAMR_DISTRICTS,
  resolveMeetGhamrDistrictSlug,
} from "./meet-ghamr-geography";

test("Meet Ghamr migration seeds every in-scope district and no other Dakahlia cities", () => {
  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/20261018233314_seed_dakahlia_geography.sql"
  );
  const migration = fs.readFileSync(migrationPath, "utf-8");
  const seededSlugs = new Set(
    Array.from(migration.matchAll(/\(v_city_id,\s*'([^']+)'/g), (match) => match[1])
  );

  assert.match(migration, /'dakahlia'/);
  assert.equal(seededSlugs.size, MEET_GHAMR_DISTRICTS.length);

  for (const district of MEET_GHAMR_DISTRICTS) {
    assert.ok(seededSlugs.has(district.slug), `Missing Supabase district "${district.slug}"`);
  }
  for (const outOfScopeSlug of ["mansoura-city", "talkha-city", "aga-city", "nabaroh-city"]) {
    assert.ok(!seededSlugs.has(outOfScopeSlug), `Out-of-scope district "${outOfScopeSlug}" was seeded`);
  }

  assert.equal(isMeetGhamrCity("city-dakahlia"), true);
  assert.equal(isMeetGhamrCity("city-cairo"), false);
  assert.equal(resolveMeetGhamrDistrictSlug("dist-meet-ghamr-city"), "meet-ghamr-city");
  assert.equal(resolveMeetGhamrDistrictSlug("dist-mansoura-city"), null);
});
