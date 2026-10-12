-- ==============================================================================
-- AqarPulse Platform — Fix Storage RLS, Numeric Overflow & Land Building Permit
-- ==============================================================================

-- 1. Ensure storage bucket 'property-images' is public and configured
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage RLS policies for property-images
DROP POLICY IF EXISTS "Allow authenticated uploads to property-images" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to property-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'property-images');

DROP POLICY IF EXISTS "Allow public read property-images" ON storage.objects;
CREATE POLICY "Allow public read property-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "Allow authenticated deletes on property-images" ON storage.objects;
CREATE POLICY "Allow authenticated deletes on property-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'property-images');

-- 3. Eliminate 'numeric field overflow' by converting constrained numeric columns to unconstrained NUMERIC
ALTER TABLE public.properties ALTER COLUMN price TYPE NUMERIC;
ALTER TABLE public.properties ALTER COLUMN down_payment TYPE NUMERIC;
ALTER TABLE public.properties ALTER COLUMN area_sqm TYPE NUMERIC;

-- 4. Add has_building_permit column for land / property categorization
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS has_building_permit BOOLEAN DEFAULT FALSE;
