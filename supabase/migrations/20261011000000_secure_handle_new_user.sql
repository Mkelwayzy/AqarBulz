-- ==============================================================================
-- AqarPulse Platform — Secure Supabase Auth Trigger Migration
-- Fixes: Database error saving new user (500)
-- Prevents privilege escalation to admin role from client metadata
-- Sets safe search_path to public for SECURITY DEFINER execution
-- ==============================================================================

-- 1. Ensure user_role_enum exists safely
DO $$ BEGIN
    CREATE TYPE public.user_role_enum AS ENUM ('guest', 'seeker', 'buyer', 'owner', 'broker', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Enhanced secure handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role public.user_role_enum := 'seeker'::public.user_role_enum;
    v_raw_role text;
BEGIN
    v_raw_role := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'seeker')));
    
    -- Strictly disallow privilege escalation: never allow admin role from client metadata
    IF v_raw_role IN ('seeker', 'buyer') THEN
        v_role := 'seeker'::public.user_role_enum;
    ELSIF v_raw_role = 'owner' THEN
        v_role := 'owner'::public.user_role_enum;
    ELSIF v_raw_role = 'broker' THEN
        v_role := 'broker'::public.user_role_enum;
    ELSE
        v_role := 'seeker'::public.user_role_enum;
    END IF;

    -- Upsert into public.profiles with safe defaults
    INSERT INTO public.profiles (
        id, 
        name, 
        email, 
        phone, 
        role, 
        is_verified, 
        whatsapp_enabled, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), split_part(COALESCE(NEW.email, 'user@aqarpulse'), '@', 1)),
        COALESCE(NEW.email, NEW.id::text || '@temp.aqarpulse'),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
        v_role,
        FALSE, -- Unverified until documents/licenses are moderated
        COALESCE((NEW.raw_user_meta_data->>'whatsapp_enabled')::boolean, TRUE),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = COALESCE(NULLIF(TRIM(EXCLUDED.name), ''), public.profiles.name),
        phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), public.profiles.phone),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Resilient fallback: never abort transaction, log warning in PostgreSQL log
    RAISE WARNING 'AqarPulse Auth Trigger Warning: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
