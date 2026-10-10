const fs = require('fs');
const path = require('path');

// Ensure globalThis.WebSocket doesn't crash on Node 20
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

const { createClient } = require('@supabase/supabase-js');

// Load .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('--- SUPABASE DATABASE & API VERIFICATION ---');
console.log('Project URL:', supabaseUrl);
console.log('Key prefix:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NONE');

async function verify() {
  const report = {
    httpConnected: false,
    openApiDetected: false,
    exposedTables: [],
    tableChecks: {},
    rpcChecks: {},
    storageBuckets: []
  };

  // Headers for Supabase PostgREST
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  // 1. Check OpenAPI root
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, { headers });
    report.httpConnected = true;
    report.httpStatus = res.status;
    if (res.ok) {
      const data = await res.json();
      report.openApiDetected = true;
      report.exposedTables = data.definitions ? Object.keys(data.definitions) : [];
      report.exposedPaths = data.paths ? Object.keys(data.paths) : [];
      console.log(`[PASS] Supabase REST API connected. Found ${report.exposedTables.length} exposed tables.`);
    } else {
      console.log(`[WARN] Supabase REST API returned ${res.status}: ${res.statusText}`);
    }
  } catch (err) {
    console.error('[FAIL] HTTP connection failed:', err.message);
    report.error = err.message;
  }

  // 2. Query Tables
  const testTables = ['todos', 'properties', 'profiles', 'cities', 'districts', 'property_images', 'amenities', 'inquiries'];
  for (const tbl of testTables) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${tbl}?select=*&limit=3`, {
        headers: { ...headers, 'Prefer': 'count=exact' }
      });
      const content = await res.text();
      let parsed = null;
      try { parsed = JSON.parse(content); } catch (e) {}

      if (res.ok) {
        const countHeader = res.headers.get('content-range');
        report.tableChecks[tbl] = {
          exists: true,
          status: res.status,
          rowCount: countHeader || (Array.isArray(parsed) ? parsed.length : 0),
          sampleData: Array.isArray(parsed) ? parsed.slice(0, 1) : parsed
        };
        console.log(`[TABLE] ${tbl}: EXISTS (Status ${res.status}, Rows: ${countHeader || (parsed ? parsed.length : 0)})`);
      } else {
        report.tableChecks[tbl] = {
          exists: false,
          status: res.status,
          message: parsed?.message || content
        };
        console.log(`[TABLE] ${tbl}: NOT FOUND OR NOT EXPOSED (${res.status} - ${parsed?.message || content})`);
      }
    } catch (err) {
      report.tableChecks[tbl] = { exists: false, error: err.message };
      console.log(`[TABLE] ${tbl}: ERROR (${err.message})`);
    }
  }

  // 3. Test RPC: search_properties_within_radius
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/search_properties_within_radius`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        center_lng: 31.2357,
        center_lat: 30.0444,
        radius_km: 10
      })
    });
    const rpcText = await rpcRes.text();
    let rpcParsed = null;
    try { rpcParsed = JSON.parse(rpcText); } catch (e) {}

    if (rpcRes.ok) {
      report.rpcChecks['search_properties_within_radius'] = {
        exists: true,
        status: rpcRes.status,
        resultCount: Array.isArray(rpcParsed) ? rpcParsed.length : 0
      };
      console.log(`[RPC] search_properties_within_radius: EXISTS (Returned ${Array.isArray(rpcParsed) ? rpcParsed.length : 0} results)`);
    } else {
      report.rpcChecks['search_properties_within_radius'] = {
        exists: false,
        status: rpcRes.status,
        message: rpcParsed?.message || rpcText
      };
      console.log(`[RPC] search_properties_within_radius: NOT FOUND (${rpcRes.status} - ${rpcParsed?.message || rpcText})`);
    }
  } catch (err) {
    report.rpcChecks['search_properties_within_radius'] = { exists: false, error: err.message };
  }

  // 4. Test Storage
  try {
    const stRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, { headers });
    if (stRes.ok) {
      const buckets = await stRes.json();
      report.storageBuckets = buckets.map(b => ({ id: b.id, name: b.name, public: b.public }));
      console.log(`[STORAGE] Found ${buckets.length} bucket(s):`, buckets.map(b => b.name));
    } else {
      const stErr = await stRes.text();
      console.log(`[STORAGE] Query returned ${stRes.status}:`, stErr);
    }
  } catch (err) {
    console.error('[STORAGE] Query error:', err.message);
  }

  console.log('\n--- VERIFICATION COMPLETED ---');
  return report;
}

verify();
