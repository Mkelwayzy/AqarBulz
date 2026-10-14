-- ==============================================================================
-- Migration: 20261015040000_production_clean_slate_reset.sql
-- Description:
--   Comprehensive production reset: Wipes all testing/demo transactional data,
--   properties, inquiries, favorites, bookings, and non-admin test profiles,
--   while preserving all schemas, RLS policies, geography/taxonomy, and
--   the primary Super Administrator account.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Truncate dependent and transactional tables safely
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'favorites') THEN
        DELETE FROM public.favorites;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inquiry_messages') THEN
        DELETE FROM public.inquiry_messages;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inquiries') THEN
        DELETE FROM public.inquiries;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspection_bookings') THEN
        DELETE FROM public.inspection_bookings;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_reports') THEN
        DELETE FROM public.property_reports;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_images') THEN
        DELETE FROM public.property_images;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_amenities') THEN
        DELETE FROM public.property_amenities;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reservations') THEN
        DELETE FROM public.reservations;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reverse_requests') THEN
        DELETE FROM public.reverse_requests;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_searches') THEN
        DELETE FROM public.saved_searches;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'official_notices') THEN
        DELETE FROM public.official_notices;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'moderation_logs') THEN
        DELETE FROM public.moderation_logs;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_events') THEN
        DELETE FROM public.audit_events;
    END IF;

    -- 2. Delete all testing/demo properties and projects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') THEN
        DELETE FROM public.properties;
    END IF;

    -- 3. Delete non-admin test profiles, strictly preserving the Admin account
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        DELETE FROM public.profiles 
        WHERE role::text NOT IN ('admin', 'superadmin');
    END IF;

    -- 4. Delete non-admin auth.users if permissions allow
    BEGIN
        DELETE FROM auth.users 
        WHERE id NOT IN (
            SELECT id FROM public.profiles 
            WHERE role::text IN ('admin', 'superadmin')
        );
    EXCEPTION WHEN OTHERS THEN
        -- auth.users may require superuser/service_role permissions
        NULL;
    END;

END $$;
