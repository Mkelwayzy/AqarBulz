-- ==============================================================================
-- AqarPulse Platform — Enforce Phone and Email Uniqueness Migration
-- ==============================================================================

-- 1. Ensure Case-Insensitive Email Uniqueness on Profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower_unique 
ON public.profiles (LOWER(email));

-- 2. Enforce Phone Uniqueness for all Non-Empty Phone Numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique 
ON public.profiles (phone) 
WHERE phone IS NOT NULL AND TRIM(phone) != '';

-- 3. Document Index Metadata for Supabase Best Practices
COMMENT ON INDEX public.idx_profiles_email_lower_unique IS 'Enforces case-insensitive uniqueness on profile emails to prevent duplicate accounts';
COMMENT ON INDEX public.idx_profiles_phone_unique IS 'Enforces uniqueness on phone numbers to prevent duplicate registrations with same contact info';
