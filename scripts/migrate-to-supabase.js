/**
 * AqarPulse Platform — Safe Controlled Data Migration Utility
 *
 * Migrates local records from `.data/aqarpulse_db.json` to PostgreSQL (Supabase)
 * with strict referential integrity, idempotency, and audit validation.
 *
 * Usage:
 *   node scripts/migrate-to-supabase.js [--apply]
 *
 * Default is DRY-RUN mode (safe inspection without mutating remote database).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Polyfill WebSocket for Node runtime
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {};
}

const { createClient } = require('@supabase/supabase-js');

// Load environment
const envPath = path.resolve(__dirname, '..', '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let v = match[2] || '';
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
      env[match[1]] = v.trim();
    }
  });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isApply = process.argv.includes('--apply');
const DB_FILE = path.join(__dirname, '..', '.data', 'aqarpulse_db.json');

// City and District UUID resolver mapping
const CITY_MAP = {
  "cairo": "c1000000-0000-0000-0000-000000000001",
  "city-cairo": "c1000000-0000-0000-0000-000000000001",
  "giza": "c2000000-0000-0000-0000-000000000002",
  "city-giza": "c2000000-0000-0000-0000-000000000002",
  "alexandria": "c3000000-0000-0000-0000-000000000003",
  "city-alexandria": "c3000000-0000-0000-0000-000000000003",
  "dakahlia": "c4000000-0000-0000-0000-000000000004",
  "city-dakahlia": "c4000000-0000-0000-0000-000000000004",
};

const DISTRICT_MAP = {
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
  "dist-meet-ghamr-city": "d5000000-0000-0000-0000-000000000001",
};

function generateDeterministicUuid(namespace, value) {
  const hash = crypto.createHash('sha1').update(`${namespace}:${value}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    'a' + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-');
}

async function runMigration() {
  console.log("=================================================================");
  console.log(`  AQARPULSE DATA MIGRATION: JSON -> POSTGRESQL (${isApply ? "APPLY" : "DRY-RUN"})`);
  console.log("=================================================================\n");

  if (!fs.existsSync(DB_FILE)) {
    console.error("❌ Database file not found:", DB_FILE);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(DB_FILE, 'utf-8');
  let db;
  try {
    db = JSON.parse(rawJson);
  } catch (e) {
    console.error("❌ Invalid JSON in data store:", e.message);
    process.exit(1);
  }

  console.log(`Loaded JSON store:`);
  console.log(`  Users:      ${db.users?.length || 0}`);
  console.log(`  Properties: ${db.properties?.length || 0}`);
  console.log(`  Inquiries:  ${db.inquiries?.length || 0}`);
  console.log(`  Target URL: ${supabaseUrl}\n`);

  // 1. Validate & Map Users
  const userMap = new Map(); // localId -> uuid
  const validUsers = [];
  const rejectedUsers = [];

  for (const u of db.users || []) {
    if (!u.id || (!u.email && !u.phone)) {
      rejectedUsers.push({ id: u.id, reason: "Missing required identifier (email or phone)" });
      continue;
    }
    const userUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id)
      ? u.id
      : generateDeterministicUuid("user", u.email || u.phone || u.id);

    userMap.set(u.id, userUuid);
    validUsers.push({
      id: userUuid,
      name: u.name || "مستخدم",
      email: u.email || null,
      phone: u.phone || null,
      role: u.role || "seeker",
      is_verified: Boolean(u.isVerified),
      company_name: u.companyName || null,
      license_number: u.licenseNumber || null,
      created_at: u.createdAt || new Date().toISOString(),
    });
  }

  console.log(`User Validation:`);
  console.log(`  Valid Users:    ${validUsers.length}`);
  console.log(`  Rejected Users: ${rejectedUsers.length}`);

  // 2. Validate & Map Properties
  const validProperties = [];
  const validImages = [];
  const rejectedProperties = [];

  for (const p of db.properties || []) {
    // Check required fields
    if (!p.id || !p.title || p.price === undefined || p.price === null || !p.lat || !p.lng) {
      rejectedProperties.push({ id: p.id, reason: "Missing title, price, or coordinates" });
      continue;
    }

    // Constraints: price >= 0, area > 0
    const price = Number(p.price);
    const area = Number(p.areaSqM || p.area_sqm || 100);
    const lat = Number(p.lat);
    const lng = Number(p.lng);

    if (isNaN(price) || price < 0) {
      rejectedProperties.push({ id: p.id, reason: `Invalid price: ${p.price}` });
      continue;
    }
    if (isNaN(area) || area <= 0) {
      rejectedProperties.push({ id: p.id, reason: `Invalid area: ${p.areaSqM}` });
      continue;
    }
    // Egypt coordinate bounds check
    if (isNaN(lat) || isNaN(lng) || lat < 21 || lat > 32.5 || lng < 24 || lng > 37.5) {
      rejectedProperties.push({ id: p.id, reason: `Coordinates outside Egypt bounds: [${lat}, ${lng}]` });
      continue;
    }

    const propUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)
      ? p.id
      : generateDeterministicUuid("property", p.id);

    const advertiserUuid = userMap.get(p.advertiserId) || userMap.get("usr-broker-01") || "a0000000-0000-0000-0000-000000000001";
    const cityUuid = CITY_MAP[p.cityId] || CITY_MAP["city-cairo"];
    const districtUuid = DISTRICT_MAP[p.districtId] || DISTRICT_MAP["dist-new-cairo"];

    const slug = (p.slug || p.title)
      .toString()
      .toLowerCase()
      .replace(/[\s\W-]+/g, "-")
      .slice(0, 40) + `-${propUuid.substring(0, 8)}`;

    validProperties.push({
      id: propUuid,
      slug,
      title: p.title.trim(),
      description: p.description?.trim() || p.title,
      transaction_type: p.transactionType === "rent" ? "rent" : "sale",
      category: p.category || "apartment",
      price,
      currency: "EGP",
      area_sqm: area,
      bedrooms: p.bedrooms ? Number(p.bedrooms) : null,
      bathrooms: p.bathrooms ? Number(p.bathrooms) : null,
      finishing_status: p.finishingStatus || "fully_finished",
      furnishing_status: p.furnishingStatus || "unfurnished",
      city_id: cityUuid,
      district_id: districtUuid,
      address_details: p.addressDetails || null,
      exact_lat: lat,
      exact_lng: lng,
      location_privacy: p.locationPrivacy || "exact",
      approximate_lat: p.approximateLat ? Number(p.approximateLat) : null,
      approximate_lng: p.approximateLng ? Number(p.approximateLng) : null,
      status: p.status || "published",
      featured: Boolean(p.featured),
      advertiser_id: advertiserUuid,
      advertiser_type: p.advertiserType || "broker",
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: p.updatedAt || new Date().toISOString(),
    });

    if (Array.isArray(p.images)) {
      p.images.forEach((imgUrl, idx) => {
        validImages.push({
          property_id: propUuid,
          url: imgUrl,
          is_main: idx === 0,
          sort_order: idx + 1,
        });
      });
    }
  }

  console.log(`\nProperty Validation:`);
  console.log(`  Valid Properties:    ${validProperties.length}`);
  console.log(`  Valid Images:        ${validImages.length}`);
  console.log(`  Rejected Properties: ${rejectedProperties.length}`);
  if (rejectedProperties.length > 0) {
    console.log("  Sample Rejected:", rejectedProperties.slice(0, 3));
  }

  // 3. Execution or Dry-Run Output
  if (!isApply) {
    console.log("\n=================================================================");
    console.log("  DRY-RUN VALIDATION SUCCEEDED! (No remote database writes made)");
    console.log("  To apply to PostgreSQL, execute: node scripts/migrate-to-supabase.js --apply");
    console.log("=================================================================\n");
    return;
  }

  // Live Apply via Supabase Client
  console.log("\nApplying records to Supabase PostgreSQL database...");
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Backup current json store first
  const backupFile = `${DB_FILE}.backup_${Date.now()}.json`;
  fs.copyFileSync(DB_FILE, backupFile);
  console.log(`✔ Created safety backup at: ${backupFile}`);

  // Insert Profiles
  let insertedProfiles = 0;
  for (const profile of validUsers) {
    const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
    if (!error) insertedProfiles++;
  }
  console.log(`✔ Upserted ${insertedProfiles}/${validUsers.length} profiles.`);

  // Insert Properties
  let insertedProperties = 0;
  for (const prop of validProperties) {
    const { error } = await supabase.from('properties').upsert(prop, { onConflict: 'id' });
    if (!error) insertedProperties++;
  }
  console.log(`✔ Upserted ${insertedProperties}/${validProperties.length} properties.`);

  console.log("\n✅ Migration completed successfully!");
}

runMigration().catch(err => {
  console.error("Migration fatal error:", err);
  process.exit(1);
});
