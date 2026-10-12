-- ==============================================================================
-- AqarPulse Platform — Master Engineering Directive Security Remediation Migration
-- Migration: 20261012000000_security_remediation_rls_and_integrity.sql
-- Description:
--   1. Eliminates insecure open RLS update/delete policies on properties.
--   2. Enforces resource ownership for updates: advertiser or admin only.
--   3. Restricts storage.objects deletion: only the object uploader or admin can delete.
--   4. Adds numeric & spatial check constraints for database integrity.
--   5. Secures inquiries and private communication against IDOR.
-- ==============================================================================

-- 1. HARDEN PROPERTIES ROW LEVEL SECURITY (RLS)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow server-mediated property listings update" ON public.properties;
    DROP POLICY IF EXISTS "Advertisers and Admins can update properties" ON public.properties;
    DROP POLICY IF EXISTS "Advertisers and Admins can delete properties" ON public.properties;
END $$;

-- Only advertiser or admin can update property listings
CREATE POLICY "Advertisers and Admins can update properties"
ON public.properties FOR UPDATE
TO authenticated
USING (
    advertiser_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
)
WITH CHECK (
    advertiser_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
);

-- Only advertiser or admin can delete property listings
CREATE POLICY "Advertisers and Admins can delete properties"
ON public.properties FOR DELETE
TO authenticated
USING (
    advertiser_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
);

-- 2. HARDEN STORAGE OBJECTS RLS (BUCKET: property-images)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow delete from property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Uploader or Admin can delete property images" ON storage.objects;
END $$;

-- Only uploader (matching folder prefix) or platform admin can delete storage media
CREATE POLICY "Uploader or Admin can delete property images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'property-images'
    AND (
        (SELECT auth.uid())::text = (storage.foldername(name))[1]
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role = 'admin'
        )
    )
);

-- 3. INTEGRITY & DATA CONSTRAINTS ON PROPERTIES
DO $$ BEGIN
    -- Ensure price is strictly non-negative
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_price_non_negative'
    ) THEN
        ALTER TABLE public.properties
        ADD CONSTRAINT chk_properties_price_non_negative
        CHECK (price >= 0);
    END IF;

    -- Ensure area is strictly positive
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_area_positive'
    ) THEN
        ALTER TABLE public.properties
        ADD CONSTRAINT chk_properties_area_positive
        CHECK (area_sqm > 0);
    END IF;

    -- Ensure exact coordinates fall within Egypt bounds (Lat 21-32.5, Lng 24-37.5)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_coords_egypt_bounds'
    ) THEN
        ALTER TABLE public.properties
        ADD CONSTRAINT chk_properties_coords_egypt_bounds
        CHECK (
            exact_lat BETWEEN 21.0 AND 32.5
            AND exact_lng BETWEEN 24.0 AND 37.5
        );
    END IF;
END $$;

-- 4. HARDEN INQUIRIES & APPOINTMENTS RLS
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can only view their own inquiries" ON public.inquiries;
    DROP POLICY IF EXISTS "Inquiry Participants and Admins Access" ON public.inquiries;
    DROP POLICY IF EXISTS "Seekers can create inquiries for published properties" ON public.inquiries;
    DROP POLICY IF EXISTS "Authenticated Seekers can create inquiries" ON public.inquiries;
    DROP POLICY IF EXISTS "Anonymous Guests can create inquiries" ON public.inquiries;
    DROP POLICY IF EXISTS "Advertisers and Admins can update inquiries" ON public.inquiries;
END $$;

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- 1. Only inquiry seeker, property advertiser, or admin can read private inquiries (Anonymous users have NO SELECT access)
CREATE POLICY "Inquiry Participants and Admins Access"
ON public.inquiries FOR SELECT
TO authenticated
USING (
    seeker_id = (SELECT auth.uid())
    OR advertiser_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
);

-- 2a. Authenticated Seekers: Must bind seeker_id to auth.uid() and advertiser_id to authoritative property record
CREATE POLICY "Authenticated Seekers can create inquiries"
ON public.inquiries FOR INSERT
TO authenticated
WITH CHECK (
    seeker_id = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_id 
          AND p.status = 'published'
          AND p.advertiser_id = public.inquiries.advertiser_id
    )
);

-- 2b. Anonymous Guests: Must set seeker_id to NULL and bind advertiser_id to authoritative property record
CREATE POLICY "Anonymous Guests can create inquiries"
ON public.inquiries FOR INSERT
TO anon
WITH CHECK (
    seeker_id IS NULL
    AND EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_id 
          AND p.status = 'published'
          AND p.advertiser_id = public.inquiries.advertiser_id
    )
);

-- 3. Only advertiser or admin can update inquiry status
CREATE POLICY "Advertisers and Admins can update inquiries"
ON public.inquiries FOR UPDATE
TO authenticated
USING (
    advertiser_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
);

-- 5. HARDEN PROFILES IMMUTABILITY & PREVENT ROLE ESCALATION
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_verified IS DISTINCT FROM NEW.is_verified) THEN
        -- Allow service_role or authenticated users who are confirmed admins
        IF NOT (
            (SELECT auth.role()) = 'service_role'
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = (SELECT auth.uid()) AND role = 'admin'
            )
        ) THEN
            RAISE EXCEPTION 'غير مصرح بتعديل الصلاحيات أو الدور أو حالة التحقق للمستخدم (Security Violation 403)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();
