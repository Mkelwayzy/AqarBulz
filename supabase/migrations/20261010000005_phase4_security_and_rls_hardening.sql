-- ==============================================================================
-- AqarPulse Platform — Phase 4: Security & RLS Hardening Migration
-- Migration: 20261010000005_phase4_security_and_rls_hardening.sql
-- Description:
--   1. Prevents privilege escalation (non-admins cannot alter their role/is_verified).
--   2. Prevents ordinary users from forcing status='published' directly.
--   3. Enforces separation of duties (owners cannot approve their own listings).
-- ==============================================================================

-- 1. Function & Trigger: Prevent Profile Role & Verification Escalation
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

-- 2. Function & Trigger: Prevent Direct Publishing by Ordinary Users
CREATE OR REPLACE FUNCTION public.enforce_safe_property_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting to published, verify caller is admin or service_role
    IF (NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published')) THEN
        IF NOT (
            (SELECT auth.role()) = 'service_role'
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = (SELECT auth.uid()) AND role = 'admin'
            )
        ) THEN
            -- Non-admins cannot publish directly; demote safely to pending_review
            NEW.status := 'pending_review';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_safe_property_status ON public.properties;
CREATE TRIGGER trg_enforce_safe_property_status
BEFORE INSERT OR UPDATE OF status ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.enforce_safe_property_status();

-- 3. Function & Trigger: Separation of Duties (Prevent Owner Self-Approval)
CREATE OR REPLACE FUNCTION public.prevent_owner_self_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published')) THEN
        IF (NEW.advertiser_id = (SELECT auth.uid()) AND (SELECT auth.role()) <> 'service_role') THEN
            RAISE EXCEPTION 'غير مسموح للمعلن باعتماد عقاره الخاص بنفسه لمنع تضارب المصالح (فصل المهام والصلاحيات)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_owner_self_approval ON public.properties;
CREATE TRIGGER trg_prevent_owner_self_approval
BEFORE UPDATE OF status ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.prevent_owner_self_approval();

-- 4. Verify RLS on property_images
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public Read Property Images" ON public.property_images;
    DROP POLICY IF EXISTS "Advertiser Insert Property Images" ON public.property_images;
    DROP POLICY IF EXISTS "Advertiser Delete Property Images" ON public.property_images;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Public Read Property Images"
ON public.property_images FOR SELECT
USING (true);

CREATE POLICY "Advertiser Insert Property Images"
ON public.property_images FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_id AND p.advertiser_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Advertiser Delete Property Images"
ON public.property_images FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_id AND p.advertiser_id = (SELECT auth.uid())
    )
);
