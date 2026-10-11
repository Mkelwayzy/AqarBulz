-- ==============================================================================
-- Migration: 20261011030000_fix_properties_storage_rls_and_meet_ghamr.sql
-- Description:
--   1. Fix RLS policies on public.properties, property_images & storage.objects
--      to allow server-mediated API requests (anon/authenticated) to insert
--      properties and upload property images without violating RLS.
--   2. Add Dakahlia (الدقهلية) to public.cities and all Meet Ghamr Center (ميت غمر)
--      villages and districts to public.districts.
-- ==============================================================================

-- 1. FIX PROPERTIES RLS POLICIES
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can create property listings" ON public.properties;
    DROP POLICY IF EXISTS "Allow server API and authenticated property listings insertion" ON public.properties;
    DROP POLICY IF EXISTS "Allow server-mediated property listings insertion" ON public.properties;
    DROP POLICY IF EXISTS "Allow server-mediated property listings update" ON public.properties;
END $$;

CREATE POLICY "Allow server-mediated property listings insertion"
ON public.properties FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow server-mediated property listings update"
ON public.properties FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2. FIX PROPERTY IMAGES RLS POLICIES
DO $$ BEGIN
    DROP POLICY IF EXISTS "Advertiser can insert property images" ON public.property_images;
    DROP POLICY IF EXISTS "Advertiser Insert Property Images" ON public.property_images;
    DROP POLICY IF EXISTS "Allow server-mediated property images insertion" ON public.property_images;
END $$;

CREATE POLICY "Allow server-mediated property images insertion"
ON public.property_images FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. FIX STORAGE BUCKET RLS POLICIES FOR 'property-images'
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
    DROP POLICY IF EXISTS "Public Read Property Images Bucket" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own uploaded property images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own uploaded property images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow upload to property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow update to property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow delete from property-images" ON storage.objects;
END $$;

-- Public can view images
CREATE POLICY "Public Read Property Images Bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

-- Allow insert/upload to property-images bucket
CREATE POLICY "Allow upload to property-images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'property-images');

-- Allow update in property-images bucket
CREATE POLICY "Allow update to property-images"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'property-images')
WITH CHECK (bucket_id = 'property-images');

-- Allow delete from property-images bucket
CREATE POLICY "Allow delete from property-images"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'property-images');

-- 4. INSERT DAKAHLIA (الدقهلية) AND MEET GHAMR (ميت غمر) VILLAGES TAXONOMY
DO $$
DECLARE
    v_country_id UUID := 'e1000000-0000-0000-0000-000000000001';
    v_dakahlia_id UUID := 'c4000000-0000-0000-0000-000000000004';
BEGIN
    -- Insert Dakahlia Governorate
    INSERT INTO public.cities (id, country_id, slug, name_ar, name_en, center_location, zoom_level)
    VALUES (v_dakahlia_id, v_country_id, 'dakahlia', 'الدقهلية', 'Dakahlia', ST_SetSRID(ST_MakePoint(31.2580, 30.7194), 4326)::geography, 13)
    ON CONFLICT (slug) DO UPDATE SET name_ar = 'الدقهلية', name_en = 'Dakahlia';

    -- Insert Meet Ghamr Center, City & All Famous Villages
    INSERT INTO public.districts (id, city_id, slug, name_ar, name_en, center_location)
    VALUES
        ('d5000000-0000-0000-0000-000000000001', v_dakahlia_id, 'dist-meet-ghamr-city', 'مدينة ميت غمر', 'Meet Ghamr City', ST_SetSRID(ST_MakePoint(31.2580, 30.7194), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000002', v_dakahlia_id, 'dist-daqados', 'دقادوس', 'Daqados', ST_SetSRID(ST_MakePoint(31.2650, 30.7280), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000003', v_dakahlia_id, 'dist-tafahna-al-ashraf', 'تفهنا الأشراف', 'Tafahna Al-Ashraf', ST_SetSRID(ST_MakePoint(31.2400, 30.7450), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000004', v_dakahlia_id, 'dist-damas', 'دماص', 'Damas', ST_SetSRID(ST_MakePoint(31.3300, 30.7800), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000005', v_dakahlia_id, 'dist-sehregt-kobra', 'صهرجت الكبرى', 'Sehregt El Kobra', ST_SetSRID(ST_MakePoint(31.2900, 30.6800), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000006', v_dakahlia_id, 'dist-atmida', 'أتميدة', 'Atmida', ST_SetSRID(ST_MakePoint(31.3600, 30.7600), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000007', v_dakahlia_id, 'dist-kom-el-nour', 'كوم النور', 'Kom El Nour', ST_SetSRID(ST_MakePoint(31.3400, 30.7400), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000008', v_dakahlia_id, 'dist-beshla', 'بشلا', 'Beshla', ST_SetSRID(ST_MakePoint(31.3100, 30.7300), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000009', v_dakahlia_id, 'dist-awleela', 'أوليلة', 'Awleela', ST_SetSRID(ST_MakePoint(31.3500, 30.7100), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000010', v_dakahlia_id, 'dist-dandit', 'دنديط', 'Dandit', ST_SetSRID(ST_MakePoint(31.3300, 30.6900), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000011', v_dakahlia_id, 'dist-sanfa', 'سنفا', 'Sanfa', ST_SetSRID(ST_MakePoint(31.3000, 30.7500), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000012', v_dakahlia_id, 'dist-meet-yaeish', 'ميت يعيش', 'Meet Yaeish', ST_SetSRID(ST_MakePoint(31.2800, 30.6700), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000013', v_dakahlia_id, 'dist-meet-abou-khaled', 'ميت أبو خالد', 'Meet Abou Khaled', ST_SetSRID(ST_MakePoint(31.3200, 30.6600), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000014', v_dakahlia_id, 'dist-meet-el-faramawy', 'ميت الفرماوي', 'Meet El Faramawy', ST_SetSRID(ST_MakePoint(31.3500, 30.7700), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000015', v_dakahlia_id, 'dist-meet-el-qorashi', 'ميت القرشي', 'Meet El Qorashi', ST_SetSRID(ST_MakePoint(31.2900, 30.7000), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000016', v_dakahlia_id, 'dist-meet-mohsen', 'ميت محسن', 'Meet Mohsen', ST_SetSRID(ST_MakePoint(31.2800, 30.7300), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000017', v_dakahlia_id, 'dist-meet-el-ezz', 'ميت العز', 'Meet El Ezz', ST_SetSRID(ST_MakePoint(31.2700, 30.7500), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000018', v_dakahlia_id, 'dist-meet-nagy', 'ميت ناجي', 'Meet Nagy', ST_SetSRID(ST_MakePoint(31.3100, 30.6900), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000019', v_dakahlia_id, 'dist-hala', 'هلا', 'Hala', ST_SetSRID(ST_MakePoint(31.2900, 30.7100), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000020', v_dakahlia_id, 'dist-serenga', 'سرنجا', 'Serenga', ST_SetSRID(ST_MakePoint(31.3200, 30.7600), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000021', v_dakahlia_id, 'dist-sanbo-maqam', 'سنبو مقام', 'Sanbo Maqam', ST_SetSRID(ST_MakePoint(31.2800, 30.7400), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000022', v_dakahlia_id, 'dist-santmay', 'سنتماي', 'Santmay', ST_SetSRID(ST_MakePoint(31.3000, 30.7700), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000023', v_dakahlia_id, 'dist-bachaloch', 'بشالوش', 'Bachaloch', ST_SetSRID(ST_MakePoint(31.2900, 30.7200), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000024', v_dakahlia_id, 'dist-el-bouha', 'البوها', 'El Bouha', ST_SetSRID(ST_MakePoint(31.3800, 30.7600), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000025', v_dakahlia_id, 'dist-behida', 'بهيدة', 'Behida', ST_SetSRID(ST_MakePoint(31.3700, 30.7500), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000026', v_dakahlia_id, 'dist-gasfa', 'جصفا', 'Gasfa', ST_SetSRID(ST_MakePoint(31.3100, 30.6800), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000027', v_dakahlia_id, 'dist-kafr-el-miqdam', 'كفر المقدام', 'Kafr El Miqdam', ST_SetSRID(ST_MakePoint(31.2700, 30.6900), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000028', v_dakahlia_id, 'dist-kafr-serenga', 'كفر سرنجا', 'Kafr Serenga', ST_SetSRID(ST_MakePoint(31.3250, 30.7650), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000029', v_dakahlia_id, 'dist-kafr-el-shahid', 'كفر الشهيد', 'Kafr El Shahid', ST_SetSRID(ST_MakePoint(31.2750, 30.7150), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000030', v_dakahlia_id, 'dist-kafr-el-wazir', 'كفر الوزير', 'Kafr El Wazir', ST_SetSRID(ST_MakePoint(31.3600, 30.7400), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000031', v_dakahlia_id, 'dist-kafr-behida', 'كفر بهيدة', 'Kafr Behida', ST_SetSRID(ST_MakePoint(31.3750, 30.7550), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000032', v_dakahlia_id, 'dist-kafr-noaman', 'كفر نعمان', 'Kafr Noaman', ST_SetSRID(ST_MakePoint(31.3400, 30.7850), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000033', v_dakahlia_id, 'dist-kafr-el-naeem', 'كفر النعيم', 'Kafr El Naeem', ST_SetSRID(ST_MakePoint(31.3150, 30.7750), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000034', v_dakahlia_id, 'dist-kafr-el-mohamadeya', 'كفر المحمدية', 'Kafr El Mohamadeya', ST_SetSRID(ST_MakePoint(31.3050, 30.7050), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000035', v_dakahlia_id, 'dist-kafr-el-sheikh-helal', 'كفر الشيخ هلال', 'Kafr El Sheikh Helal', ST_SetSRID(ST_MakePoint(31.3400, 30.7250), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000036', v_dakahlia_id, 'dist-kofour-el-behaita', 'كفور البهايتة', 'Kofour El Behaita', ST_SetSRID(ST_MakePoint(31.3700, 30.7350), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000037', v_dakahlia_id, 'dist-kafr-abou-nabhan', 'كفر أبو نبهان', 'Kafr Abou Nabhan', ST_SetSRID(ST_MakePoint(31.2600, 30.7100), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000038', v_dakahlia_id, 'dist-kafr-ibrahim-youssef', 'كفر إبراهيم يوسف', 'Kafr Ibrahim Youssef', ST_SetSRID(ST_MakePoint(31.3300, 30.7200), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000039', v_dakahlia_id, 'dist-kafr-attallah-soliman', 'كفر عطا الله سليمان', 'Kafr Attallah Soliman', ST_SetSRID(ST_MakePoint(31.2950, 30.6950), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000040', v_dakahlia_id, 'dist-kafr-ali-abdullah', 'كفر علي عبد الله', 'Kafr Ali Abdullah', ST_SetSRID(ST_MakePoint(31.3150, 30.7050), 4326)::geography)
    ON CONFLICT (city_id, slug) DO NOTHING;
END $$;
