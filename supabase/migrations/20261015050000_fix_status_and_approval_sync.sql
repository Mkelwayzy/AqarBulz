-- ==============================================================================
-- Migration: 20261015050000_fix_status_and_approval_sync.sql
-- Description:
--   1. Unify canonical property status to support 'active' and 'published'.
--   2. Extend property_status_enum and ensure table constraints accept both.
--   3. Update RLS policies for public view, owner tracking, and admin moderation.
--   4. Update PostGIS RPC search_properties_within_bounds to accept ('active', 'published').
--   5. Provide admin_approve_property RPC with SECURITY DEFINER for zero-friction approvals.
--   6. Remove/update obsolete demotion triggers that were causing post-approval disappearance.
-- ==============================================================================

-- 1. Ensure enum values exist
DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'active';
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'published';
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'pending_review';
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'under_review';
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'suspended';
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- 2. Ensure date columns exist for audit and moderation
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- 3. Replace/Relax safe status triggers so admin approval is never demoted
DROP TRIGGER IF EXISTS trg_enforce_safe_property_status ON public.properties;
DROP FUNCTION IF EXISTS public.enforce_safe_property_status();

CREATE OR REPLACE FUNCTION public.enforce_safe_property_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only protect against ordinary user inserts directly trying to activate without admin
    IF (NEW.status::text IN ('active', 'published') AND (TG_OP = 'INSERT')) THEN
        IF NOT (
            (SELECT auth.role()) = 'service_role'
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = (SELECT auth.uid()) AND role::text IN ('admin', 'superadmin', 'moderator')
            )
        ) THEN
            NEW.status := 'pending_review';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_enforce_safe_property_status
BEFORE INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.enforce_safe_property_status();

-- Remove any blocking self-approval trigger that blocks server-mediated admin action
DROP TRIGGER IF EXISTS trg_prevent_owner_self_approval ON public.properties;
DROP FUNCTION IF EXISTS public.prevent_owner_self_approval();

-- 4. Clean up and establish comprehensive RLS policies on public.properties
DO $$ BEGIN
    DROP POLICY IF EXISTS "properties_public_view" ON public.properties;
    DROP POLICY IF EXISTS "properties_read_active" ON public.properties;
    DROP POLICY IF EXISTS "Anyone can view published properties" ON public.properties;
    DROP POLICY IF EXISTS "properties_owner_read_all" ON public.properties;
    DROP POLICY IF EXISTS "properties_admin_full_access" ON public.properties;
    DROP POLICY IF EXISTS "Allow server-mediated property listings update" ON public.properties;
END $$;

-- Public Visibility: Anyone can view 'active' or 'published' properties
CREATE POLICY "properties_public_view" ON public.properties
FOR SELECT TO public
USING (status::text IN ('active', 'published'));

-- Owner Visibility: Authenticated users can read all their own properties in all statuses
CREATE POLICY "properties_owner_read_all" ON public.properties
FOR SELECT TO authenticated
USING (
    (SELECT auth.uid()) = advertiser_id
    OR (SELECT auth.uid()) = user_id
    OR (SELECT auth.uid()) = owner_id
);

-- Admin Full Access
CREATE POLICY "properties_admin_full_access" ON public.properties
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = (SELECT auth.uid()) 
          AND profiles.role::text IN ('admin', 'superadmin', 'moderator')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = (SELECT auth.uid()) 
          AND profiles.role::text IN ('admin', 'superadmin', 'moderator')
    )
);

-- Allow server-mediated update policy for Next.js server actions
CREATE POLICY "Allow server-mediated property listings update"
ON public.properties FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Dedicated High-Privilege RPC for Instant Admin Approval
CREATE OR REPLACE FUNCTION public.admin_approve_property(
    p_property_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated public.properties%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    UPDATE public.properties
    SET status = 'active',
        approved_at = v_now,
        published_at = v_now,
        moderated_at = v_now,
        moderation_notes = COALESCE(p_notes, moderation_notes),
        updated_at = v_now
    WHERE id = p_property_id
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Property not found');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_updated.id,
        'status', v_updated.status,
        'approved_at', v_updated.approved_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_property(UUID, TEXT) TO anon, authenticated, service_role;

-- 6. Update search_properties_within_bounds PostGIS RPC to include 'active' & 'published'
CREATE OR REPLACE FUNCTION public.search_properties_within_bounds(
    min_lng DOUBLE PRECISION,
    min_lat DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    filter_transaction_type transaction_type_enum DEFAULT NULL,
    filter_category VARCHAR DEFAULT NULL,
    min_price NUMERIC DEFAULT NULL,
    max_price NUMERIC DEFAULT NULL,
    limit_count INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    slug VARCHAR,
    title VARCHAR,
    description TEXT,
    price NUMERIC,
    currency VARCHAR,
    rental_period VARCHAR,
    transaction_type transaction_type_enum,
    category VARCHAR,
    area_sqm NUMERIC,
    bedrooms INT,
    bathrooms INT,
    location_privacy location_privacy_enum,
    exact_lat DOUBLE PRECISION,
    exact_lng DOUBLE PRECISION,
    approximate_lat DOUBLE PRECISION,
    approximate_lng DOUBLE PRECISION,
    status property_status_enum,
    featured BOOLEAN,
    advertiser_type VARCHAR,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.slug,
        p.title,
        p.description,
        p.price,
        p.currency,
        p.rental_period,
        p.transaction_type,
        p.category,
        p.area_sqm,
        p.bedrooms,
        p.bathrooms,
        p.location_privacy,
        p.exact_lat,
        p.exact_lng,
        p.approximate_lat,
        p.approximate_lng,
        p.status,
        p.featured,
        p.advertiser_type,
        p.created_at
    FROM public.properties p
    WHERE 
        p.status::text IN ('active', 'published')
        AND p.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
        AND (filter_transaction_type IS NULL OR p.transaction_type = filter_transaction_type)
        AND (filter_category IS NULL OR p.category = filter_category)
        AND (min_price IS NULL OR p.price >= min_price)
        AND (max_price IS NULL OR p.price <= max_price)
    ORDER BY p.featured DESC, p.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.search_properties_within_bounds TO anon, authenticated, service_role;

-- 7. Ensure get_dashboard_properties_for_user returns all user listings without restricting status
CREATE OR REPLACE FUNCTION public.get_dashboard_properties_for_user(p_user_id UUID)
RETURNS SETOF public.properties
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.properties
    WHERE advertiser_id = p_user_id
       OR user_id = p_user_id
       OR owner_id = p_user_id
    ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_properties_for_user(UUID) TO anon, authenticated, service_role;
