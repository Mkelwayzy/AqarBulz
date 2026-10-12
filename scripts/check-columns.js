const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
});

const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key);

async function run() {
  const { data: cols, error: errCols } = await supabase.rpc('execute_sql_admin', {
    sql_query: `
      SELECT column_name, data_type, numeric_precision, numeric_scale, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      ORDER BY ordinal_position;
    `
  });
  if (errCols) {
    console.error('RPC Error:', errCols);
  } else {
    console.log('Columns:', JSON.stringify(cols, null, 2));
  }
}

run();
