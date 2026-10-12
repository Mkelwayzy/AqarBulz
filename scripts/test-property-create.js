const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function testAuthenticatedPropertyCreation() {
  console.log('1. Signing in with darshme36@gmail.com...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'darshme36@gmail.com',
    password: '24221568'
  });

  if (authErr || !authData.user) {
    console.error('Sign in failed:', authErr);
    return;
  }

  const userId = authData.user.id;
  console.log('✔ Authenticated successfully as:', userId);

  // 1. Test Land property with building permit
  console.log('\n2. Testing Land property insert...');
  const landPayload = {
    slug: `test-land-${Date.now()}`,
    title: 'أرض مباني مميزة في المنصورة',
    description: 'قطعة أرض ممتازة كاملة المرافق وبها ترخيص بناء معتمد',
    transaction_type: 'sale',
    category: 'land',
    price: 3500000,
    currency: 'EGP',
    area_sqm: 220,
    has_building_permit: true,
    city_id: 'c4000000-0000-0000-0000-000000000004', // Dakahlia
    district_id: 'd5000000-0000-0000-0000-000000000050', // Mansoura City
    address_details: 'مدينة المنصورة - حي الجامعة',
    exact_lat: 31.0409,
    exact_lng: 31.3785,
    location_privacy: 'exact',
    status: 'pending_review',
    advertiser_id: userId,
    advertiser_type: 'owner'
  };

  const { data: landRes, error: landErr } = await supabase
    .from('properties')
    .insert(landPayload)
    .select()
    .single();

  if (landErr) {
    console.error('FAILED to insert Land property:', landErr);
  } else {
    console.log('✔ SUCCESS: Inserted Land property:', {
      id: landRes.id,
      title: landRes.title,
      category: landRes.category,
      has_building_permit: landRes.has_building_permit,
      area_sqm: landRes.area_sqm,
      price: landRes.price
    });
  }

  // 2. Test House property with total_floors
  console.log('\n3. Testing House property insert with total_floors...');
  const housePayload = {
    slug: `test-house-${Date.now()}`,
    title: 'منزل عائلي 4 أدوار في ميت غمر',
    description: 'منزل مستقل كامل التشطيب مكون من 4 أدوار بمدينة ميت غمر',
    transaction_type: 'sale',
    category: 'house',
    price: 4800000,
    currency: 'EGP',
    area_sqm: 160,
    total_floors: 4,
    bedrooms: 8,
    bathrooms: 4,
    finishing_status: 'fully_finished',
    city_id: 'c4000000-0000-0000-0000-000000000004',
    district_id: 'd5000000-0000-0000-0000-000000000001',
    address_details: 'مدينة ميت غمر - شارع أحمد عرابي',
    exact_lat: 30.7194,
    exact_lng: 31.2580,
    location_privacy: 'exact',
    status: 'pending_review',
    advertiser_id: userId,
    advertiser_type: 'owner'
  };

  const { data: houseRes, error: houseErr } = await supabase
    .from('properties')
    .insert(housePayload)
    .select()
    .single();

  if (houseErr) {
    console.error('FAILED to insert House property:', houseErr);
  } else {
    console.log('✔ SUCCESS: Inserted House property:', {
      id: houseRes.id,
      title: houseRes.title,
      category: houseRes.category,
      total_floors: houseRes.total_floors,
      bedrooms: houseRes.bedrooms,
      price: houseRes.price
    });
  }

  // Cleanup test rows
  if (landRes?.id) await supabase.from('properties').delete().eq('id', landRes.id);
  if (houseRes?.id) await supabase.from('properties').delete().eq('id', houseRes.id);
  console.log('\n✔ All test records cleaned up.');
}

testAuthenticatedPropertyCreation();
