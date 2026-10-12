DO $$
DECLARE
    v_country_id UUID := 'c0000000-0000-0000-0000-000000000001';
    v_dakahlia_id UUID := 'c4000000-0000-0000-0000-000000000004';
BEGIN
    -- 1. Insert Dakahlia
    INSERT INTO public.cities (id, country_id, slug, name_ar, name_en, center_location, zoom_level)
    VALUES (v_dakahlia_id, v_country_id, 'dakahlia', 'الدقهلية', 'Dakahlia', ST_SetSRID(ST_MakePoint(31.2580, 30.7194), 4326)::geography, 13)
    ON CONFLICT (slug) DO UPDATE SET id = v_dakahlia_id, name_ar = 'الدقهلية', name_en = 'Dakahlia';

    -- 2. Insert Dakahlia Centers and Meet Ghamr Villages
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
        ('d5000000-0000-0000-0000-000000000050', v_dakahlia_id, 'dist-mansoura-city', 'مدينة المنصورة (العاصمة)', 'Mansoura City', ST_SetSRID(ST_MakePoint(31.3785, 31.0409), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000051', v_dakahlia_id, 'dist-talkha-city', 'مدينة طلخا', 'Talkha City', ST_SetSRID(ST_MakePoint(31.3780, 31.0550), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000052', v_dakahlia_id, 'dist-simballawin-city', 'مدينة السنبلاوين', 'Simballawin City', ST_SetSRID(ST_MakePoint(31.4600, 30.8750), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000053', v_dakahlia_id, 'dist-aga-city', 'مدينة أجا', 'Aga City', ST_SetSRID(ST_MakePoint(31.2900, 30.9400), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000054', v_dakahlia_id, 'dist-dikirnis-city', 'مدينة دكرنس', 'Dikirnis City', ST_SetSRID(ST_MakePoint(31.5950, 31.0850), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000055', v_dakahlia_id, 'dist-belqas-city', 'مدينة بلقاس', 'Belqas City', ST_SetSRID(ST_MakePoint(31.3600, 31.2300), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000056', v_dakahlia_id, 'dist-sherbin-city', 'مدينة شربين', 'Sherbin City', ST_SetSRID(ST_MakePoint(31.5200, 31.1950), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000057', v_dakahlia_id, 'dist-gamasa-city', 'مدينة جمصة', 'Gamasa City', ST_SetSRID(ST_MakePoint(31.4900, 31.4350), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000058', v_dakahlia_id, 'dist-manzala-city', 'مدينة المنزلة', 'Manzala City', ST_SetSRID(ST_MakePoint(31.9300, 31.1550), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000059', v_dakahlia_id, 'dist-matareya-city', 'مدينة المطرية', 'Matareya City', ST_SetSRID(ST_MakePoint(32.0300, 31.1850), 4326)::geography),
        ('d5000000-0000-0000-0000-000000000060', v_dakahlia_id, 'dist-nabaroh-city', 'مدينة نبروه', 'Nabaroh City', ST_SetSRID(ST_MakePoint(31.3000, 31.0750), 4326)::geography)
    ON CONFLICT (city_id, slug) DO NOTHING;
END $$;
