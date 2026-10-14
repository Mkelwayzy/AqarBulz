-- ==============================================================================
-- Migration: 20261015030000_fix_pending_properties_rls.sql
-- Description:
--   1. Add user_id and owner_id columns (with auto-sync trigger to advertiser_id)
--      to guarantee compatibility across all query schemas.
--   2. Extend property_status_enum with 'pending' and 'active' status variants.
--   3. Create RLS policies:
--      - "properties_owner_read_all": allows authenticated users to read and
--        track all their own properties regardless of status (pending/draft/active/rejected).
--      - "properties_admin_full_access": grants platform admins/moderators full read/write
--        access across all property lifecycle stages.
--      - "Anyone can view published properties": covers published and active listings.
--   4. Provide high-performance RPC helpers with SECURITY DEFINER for resilient
--      server-mediated dashboard and admin moderation queries.
-- ==============================================================================

-- 1. Ensure status enum accommodates 'pending' and 'active' if enum exists
DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'active';
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'under_review';
EXCEPTION WHEN undefined_object THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- 2. Ensure user_id and owner_id columns exist on public.properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id and owner_id from advertiser_id
UPDATE public.properties 
SET user_id = advertiser_id 
WHERE user_id IS NULL AND advertiser_id IS NOT NULL;

UPDATE public.properties 
SET owner_id = advertiser_id 
WHERE owner_id IS NULL AND advertiser_id IS NOT NULL;

-- Create sync trigger between advertiser_id, user_id, and owner_id
CREATE OR REPLACE FUNCTION public.sync_property_owner_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.advertiser_id IS NULL THEN
        NEW.advertiser_id := COALESCE(NEW.user_id, NEW.owner_id);
    END IF;
    IF NEW.user_id IS NULL THEN
        NEW.user_id := COALESCE(NEW.advertiser_id, NEW.owner_id);
    END IF;
    IF NEW.owner_id IS NULL THEN
        NEW.owner_id := COALESCE(NEW.advertiser_id, NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_property_owner_columns ON public.properties;
CREATE TRIGGER trg_sync_property_owner_columns
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.sync_property_owner_columns();

-- 3. Indexes for fast RLS evaluation
CREATE INDEX IF NOT EXISTS idx_properties_advertiser_id ON public.properties(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);

-- 4. Clean up existing conflicting policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "properties_owner_read_all" ON public.properties;
    DROP POLICY IF EXISTS "Owners and brokers can view their own listings" ON public.properties;
    DROP POLICY IF EXISTS "properties_admin_full_access" ON public.properties;
    DROP POLICY IF EXISTS "Anyone can view published properties" ON public.properties;
END $$;

-- 5. Owner Visibility: Authenticated users can read all their own properties in all statuses
CREATE POLICY "properties_owner_read_all" ON public.properties
FOR SELECT TO authenticated
USING (
    (SELECT auth.uid()) = advertiser_id
    OR (SELECT auth.uid()) = user_id
    OR (SELECT auth.uid()) = owner_id
);

-- 6. Administrator Full Access: Platform admins and moderators can view and modify all listings
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

-- 7. Public Visibility: Anyone can view approved/published or active properties
CREATE POLICY "Anyone can view published properties" ON public.properties
FOR SELECT
USING (status::text IN ('published', 'active'));

-- 8. Resilient RPC Functions for Server-Mediated Dashboard & Moderation Queries
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

CREATE OR REPLACE FUNCTION public.get_all_properties_for_admin_rpc()
RETURNS SETOF public.properties
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.properties
    ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_properties_for_admin_rpc() TO anon, authenticated, service_role;
