-- ==============================================================================
-- AqarPulse Platform — Complete Supabase PostgreSQL + PostGIS Schema Migration
-- Includes: PostGIS, Spatial Indexes, Geographic Hierarchy, Properties,
-- Supabase Auth Profiles, Inquiries, RLS Policies, Storage Bucket & Demo Todos
-- ==============================================================================

-- 1. Enable Required Extensions
-- In Supabase, extensions are safely installed into the 'extensions' schema.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Verify PostGIS installation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        RAISE EXCEPTION 'PostGIS extension failed to initialize.';
    END IF;
END $$;

-- 2. Enumerations (Idempotent creation)
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('guest', 'seeker', 'owner', 'broker', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE property_status_enum AS ENUM ('draft', 'pending_review', 'published', 'rejected', 'paused', 'sold', 'rented', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM ('sale', 'rent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE location_privacy_enum AS ENUM ('exact', 'approximate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE finishing_status_enum AS ENUM ('core_and_shell', 'semi_finished', 'fully_finished', 'ultra_lux');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE furnishing_status_enum AS ENUM ('unfurnished', 'semi_furnished', 'furnished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE inquiry_status_enum AS ENUM ('new', 'contacted', 'qualified', 'closed', 'spam');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- 3. User Profiles (Integrated with Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    role user_role_enum NOT NULL DEFAULT 'seeker',
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    license_number VARCHAR(100),
    company_name VARCHAR(200),
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-create profile on user signup in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role_enum, 'seeker'::user_role_enum)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. Geographic Hierarchy (Egyptian Administrative Divisions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iso_code VARCHAR(2) NOT NULL UNIQUE, -- 'EG'
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'EGP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    center_location GEOGRAPHY(Point, 4326) NOT NULL,
    zoom_level INT NOT NULL DEFAULT 12,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    center_location GEOGRAPHY(Point, 4326) NOT NULL,
    boundary_polygon GEOGRAPHY(Polygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_city_district_slug UNIQUE (city_id, slug)
);

-- ==============================================================================
-- 5. Properties Table with PostGIS Geography Columns
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'apartment', 'villa', 'duplex', 'twin_house', 'commercial', 'office'
    price NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
    rental_period VARCHAR(20),
    negotiable BOOLEAN NOT NULL DEFAULT FALSE,
    down_payment NUMERIC(15, 2),
    installment_years INT,

    -- Specifications
    area_sqm NUMERIC(10, 2) NOT NULL CHECK (area_sqm > 0),
    bedrooms INT CHECK (bedrooms >= 0),
    bathrooms INT CHECK (bathrooms >= 0),
    floor INT,
    total_floors INT,
    finishing_status finishing_status_enum,
    furnishing_status furnishing_status_enum,
    parking_spots INT DEFAULT 0,
    has_elevator BOOLEAN DEFAULT FALSE,
    year_built INT,

    -- Administrative & Geographic Linking
    city_id UUID NOT NULL REFERENCES public.cities(id),
    district_id UUID NOT NULL REFERENCES public.districts(id),
    address_details TEXT,

    -- Coordinate Inputs (WGS 84)
    exact_lat DOUBLE PRECISION NOT NULL CHECK (exact_lat BETWEEN -90 AND 90),
    exact_lng DOUBLE PRECISION NOT NULL CHECK (exact_lng BETWEEN -180 AND 180),
    location GEOGRAPHY(Point, 4326),

    -- Privacy Obfuscation (Default ~500m random displacement for privacy)
    location_privacy location_privacy_enum NOT NULL DEFAULT 'exact',
    approximate_lat DOUBLE PRECISION,
    approximate_lng DOUBLE PRECISION,
    approximate_location GEOGRAPHY(Point, 4326),

    -- Moderation Lifecycle
    status property_status_enum NOT NULL DEFAULT 'pending_review',
    moderation_notes TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    views_count INT NOT NULL DEFAULT 0,
    inquiries_count INT NOT NULL DEFAULT 0,

    -- Ownership / Brokerage Link
    advertiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    advertiser_type VARCHAR(20) NOT NULL CHECK (advertiser_type IN ('owner', 'broker')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Automatic Point Synchronization Trigger
CREATE OR REPLACE FUNCTION public.update_property_spatial_point()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.exact_lng, NEW.exact_lat), 4326)::geography;
    IF NEW.approximate_lat IS NOT NULL AND NEW.approximate_lng IS NOT NULL THEN
        NEW.approximate_location = ST_SetSRID(ST_MakePoint(NEW.approximate_lng, NEW.approximate_lat), 4326)::geography;
    ELSE
        NEW.approximate_location = NEW.location;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_properties_spatial_point ON public.properties;
CREATE TRIGGER trg_properties_spatial_point
BEFORE INSERT OR UPDATE OF exact_lat, exact_lng, approximate_lat, approximate_lng ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_property_spatial_point();

-- Spatial & Performance Indexes (Covering & Partial)
CREATE INDEX IF NOT EXISTS idx_properties_location_gist ON public.properties USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_properties_approx_gist ON public.properties USING GIST (approximate_location);
CREATE INDEX IF NOT EXISTS idx_properties_status_published ON public.properties(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_properties_search_composite ON public.properties (status, transaction_type, city_id, district_id, price);
CREATE INDEX IF NOT EXISTS idx_properties_advertiser ON public.properties (advertiser_id, status);

-- ==============================================================================
-- 6. Property Media (Images)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt TEXT NOT NULL,
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_property_images_prop ON public.property_images (property_id, sort_order);

-- ==============================================================================
-- 7. Amenities Catalog & Cross-Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.property_amenity_map (
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, amenity_id)
);

-- ==============================================================================
-- 8. User Interactions: Favorites, Saved Searches & Inquiries
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_favorite UNIQUE (user_id, property_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites (user_id);

CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    filters_json JSONB NOT NULL,
    notify_new_listings BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON public.saved_searches (user_id);

CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    seeker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    advertiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seeker_name VARCHAR(200) NOT NULL,
    seeker_phone VARCHAR(50) NOT NULL,
    seeker_email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    preferred_contact VARCHAR(20) NOT NULL DEFAULT 'call',
    status inquiry_status_enum NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_advertiser ON public.inquiries (advertiser_id, status);
CREATE INDEX IF NOT EXISTS idx_inquiries_seeker ON public.inquiries (seeker_id);

-- ==============================================================================
-- 9. Quickstart / Connectivity Verification Table (todos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.todos (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert sample todos if table is empty
INSERT INTO public.todos (name, is_completed)
SELECT name, is_completed FROM (
    VALUES 
        ('Configure Supabase environment variables (.env.local)', true),
        ('Verify PostGIS extension in SQL editor', true),
        ('Run AqarPulse real estate schema migration', true),
        ('Upload property images to Supabase Storage bucket', false),
        ('Launch interactive geospatial property search', false)
) AS v(name, is_completed)
WHERE NOT EXISTS (SELECT 1 FROM public.todos);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- Following official Supabase Best Practices (Subquery wrapping, Explicit TO)
-- ==============================================================================

-- 10.1 Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- 10.2 Countries, Cities, Districts (Public read-only)
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read countries" ON public.countries FOR SELECT USING (true);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cities" ON public.cities FOR SELECT USING (true);

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read districts" ON public.districts FOR SELECT USING (true);

-- 10.3 Properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published properties"
ON public.properties FOR SELECT
USING (status = 'published');

CREATE POLICY "Owners and brokers can view their own listings"
ON public.properties FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = advertiser_id);

CREATE POLICY "Authenticated users can create property listings"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = advertiser_id);

CREATE POLICY "Owners and brokers can update their own listings"
ON public.properties FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = advertiser_id)
WITH CHECK ((SELECT auth.uid()) = advertiser_id);

CREATE POLICY "Owners and brokers can delete their own listings"
ON public.properties FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = advertiser_id);

-- 10.4 Property Images
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view property images"
ON public.property_images FOR SELECT
USING (true);

CREATE POLICY "Advertiser can insert property images"
ON public.property_images FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_id AND p.advertiser_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Advertiser can delete property images"
ON public.property_images FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_id AND p.advertiser_id = (SELECT auth.uid())
    )
);

-- 10.5 Favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
ON public.favorites FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can add favorites"
ON public.favorites FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete favorites"
ON public.favorites FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- 10.6 Saved Searches
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their saved searches"
ON public.saved_searches FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 10.7 Inquiries
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advertisers can view received inquiries"
ON public.inquiries FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = advertiser_id);

CREATE POLICY "Seekers can view their sent inquiries"
ON public.inquiries FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = seeker_id);

CREATE POLICY "Anyone can submit an inquiry"
ON public.inquiries FOR INSERT
WITH CHECK (true);

CREATE POLICY "Advertisers can update status of their inquiries"
ON public.inquiries FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = advertiser_id)
WITH CHECK ((SELECT auth.uid()) = advertiser_id);

-- 10.8 Todos (Demo Table)
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view and create todos" ON public.todos FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 11. SUPABASE STORAGE BUCKET: property-images
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'property-images',
    'property-images',
    true,
    10485760, -- 10 Megabytes max per image
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

-- Storage RLS Policies
CREATE POLICY "Public Read Property Images Bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'property-images' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can update their own uploaded property images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'property-images' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
    bucket_id = 'property-images' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can delete their own uploaded property images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'property-images' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- ==============================================================================
-- 12. Spatial Proximity Function for Radial Search (within N kilometers)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.search_properties_within_radius(
    center_lng DOUBLE PRECISION,
    center_lat DOUBLE PRECISION,
    radius_km DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    slug VARCHAR,
    title VARCHAR,
    price NUMERIC,
    transaction_type transaction_type_enum,
    category VARCHAR,
    exact_lat DOUBLE PRECISION,
    exact_lng DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.slug,
        p.title,
        p.price,
        p.transaction_type,
        p.category,
        p.exact_lat,
        p.exact_lng,
        ST_Distance(
            p.location,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
        ) AS distance_meters
    FROM public.properties p
    WHERE 
        p.status = 'published'
        AND ST_DWithin(
            p.location,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
            radius_km * 1000.0
        )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;
