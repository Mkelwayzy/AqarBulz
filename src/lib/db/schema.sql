-- ==============================================================================
-- AqarPulse — PostgreSQL + PostGIS Production Database Schema DDL
-- Egypt Real Estate Marketplace with Spatial Indexing
-- ==============================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enumerations
CREATE TYPE user_role_enum AS ENUM ('guest', 'seeker', 'owner', 'broker', 'admin');
CREATE TYPE property_status_enum AS ENUM ('draft', 'pending_review', 'published', 'rejected', 'paused', 'sold', 'rented', 'archived');
CREATE TYPE transaction_type_enum AS ENUM ('sale', 'rent');
CREATE TYPE location_privacy_enum AS ENUM ('exact', 'approximate');
CREATE TYPE finishing_status_enum AS ENUM ('core_and_shell', 'semi_finished', 'fully_finished', 'ultra_lux');
CREATE TYPE furnishing_status_enum AS ENUM ('unfurnished', 'semi_furnished', 'furnished');
CREATE TYPE inquiry_status_enum AS ENUM ('new', 'contacted', 'qualified', 'closed', 'spam');

-- 3. Geography Hierarchy
CREATE TABLE IF NOT EXISTS countries (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    iso_code VARCHAR(2) NOT NULL UNIQUE, -- 'EG'
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'EGP',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    country_id VARCHAR(36) REFERENCES countries(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    center_location GEOGRAPHY(Point, 4326) NOT NULL,
    zoom_level INT NOT NULL DEFAULT 12,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS districts (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    city_id VARCHAR(36) NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    center_location GEOGRAPHY(Point, 4326) NOT NULL,
    boundary_polygon GEOGRAPHY(Polygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_city_district_slug UNIQUE (city_id, slug)
);

-- 4. Users and Profiles
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'seeker',
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    license_number VARCHAR(100), -- For licensed Egyptian brokers
    company_name VARCHAR(200),
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Properties (with PostGIS Geometry/Geography)
CREATE TABLE IF NOT EXISTS properties (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    category VARCHAR(50) NOT NULL,
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

    -- Geospatial Point Column (WGS 84 SRID 4326)
    city_id VARCHAR(36) NOT NULL REFERENCES cities(id),
    district_id VARCHAR(36) NOT NULL REFERENCES districts(id),
    address_details TEXT,
    exact_lat DOUBLE PRECISION NOT NULL CHECK (exact_lat BETWEEN -90 AND 90),
    exact_lng DOUBLE PRECISION NOT NULL CHECK (exact_lng BETWEEN -180 AND 180),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    
    -- Geospatial Privacy Setting
    location_privacy location_privacy_enum NOT NULL DEFAULT 'exact',
    approximate_lat DOUBLE PRECISION,
    approximate_lng DOUBLE PRECISION,
    approximate_location GEOGRAPHY(Point, 4326),

    -- Status & Moderation Lifecycle
    status property_status_enum NOT NULL DEFAULT 'draft',
    moderation_notes TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    views_count INT NOT NULL DEFAULT 0,
    inquiries_count INT NOT NULL DEFAULT 0,

    -- Advertiser Relationship
    advertiser_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    advertiser_type VARCHAR(20) NOT NULL CHECK (advertiser_type IN ('owner', 'broker')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- 6. Spatial and Filtering Indexes
CREATE INDEX IF NOT EXISTS idx_properties_location_gist ON properties USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_properties_approx_location_gist ON properties USING GIST (approximate_location);
CREATE INDEX IF NOT EXISTS idx_properties_status_published ON properties(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_properties_search_composite ON properties (status, transaction_type, city_id, district_id, price);
CREATE INDEX IF NOT EXISTS idx_properties_advertiser ON properties (advertiser_id, status);

-- 7. Property Images
CREATE TABLE IF NOT EXISTS property_images (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    property_id VARCHAR(36) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt TEXT NOT NULL,
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_property_images_prop ON property_images (property_id, sort_order);

-- 8. Amenities Catalog & Cross-Table
CREATE TABLE IF NOT EXISTS amenities (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    key VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    icon_name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS property_amenity_map (
    property_id VARCHAR(36) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    amenity_id VARCHAR(36) NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, amenity_id)
);

-- 9. Engagement: Favorites, Saved Searches, Inquiries
CREATE TABLE IF NOT EXISTS favorites (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id VARCHAR(36) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_favorite UNIQUE (user_id, property_id)
);

CREATE TABLE IF NOT EXISTS saved_searches (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    filters_json JSONB NOT NULL,
    notify_new_listings BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inquiries (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    property_id VARCHAR(36) REFERENCES properties(id) ON DELETE SET NULL,
    property_title TEXT,
    seeker_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    advertiser_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seeker_name VARCHAR(200) NOT NULL,
    seeker_phone VARCHAR(50) NOT NULL,
    seeker_email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    preferred_contact VARCHAR(20) NOT NULL DEFAULT 'call',
    status inquiry_status_enum NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_advertiser ON inquiries (advertiser_id, status);

-- 10. Platform Administration: Audit Logs & Moderation History
CREATE TABLE IF NOT EXISTS moderation_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    property_id VARCHAR(36) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    admin_id VARCHAR(36) NOT NULL REFERENCES users(id),
    previous_status property_status_enum NOT NULL,
    new_status property_status_enum NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Spatial Trigger: Automatically populate PostGIS Point from (lat, lng)
CREATE OR REPLACE FUNCTION update_property_spatial_point()
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

CREATE TRIGGER trg_properties_spatial_point
BEFORE INSERT OR UPDATE OF exact_lat, exact_lng, approximate_lat, approximate_lng ON properties
FOR EACH ROW
EXECUTE FUNCTION update_property_spatial_point();
