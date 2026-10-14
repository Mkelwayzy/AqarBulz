-- ==============================================================================
-- Migration: 20261015020000_storage_rls_policies.sql
-- Description:
--   1. Ensure storage buckets 'property-images' and 'avatars' exist and are public.
--   2. Configure comprehensive, production-ready Storage RLS policies:
--      - Public Read for all property images and user avatars.
--      - Authenticated uploads, updates, and deletes tied to user ownership (auth.uid()).
--      - Safe server API fallback permissions to avoid 403 / 400 errors.
-- ==============================================================================

-- 1. Ensure storage buckets exist and are marked as public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('property-images', 'property-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Clean up existing policies for property-images and avatars
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public Read Property Images Bucket" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read on property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated uploads to property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow upload to property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow update to property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow delete from property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated deletes on property-images" ON storage.objects;

    DROP POLICY IF EXISTS "Public Read Avatars Bucket" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read on avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Allow upload to avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Allow update to avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Allow delete from avatars" ON storage.objects;
END $$;

-- 3. Public Read Policies (Allow anyone to view property images and avatars)
CREATE POLICY "Allow public read on property-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

CREATE POLICY "Allow public read on avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 4. Upload / INSERT Policies
-- Users can insert objects into property-images and avatars buckets
CREATE POLICY "Allow authenticated upload to property-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Allow authenticated upload to avatars"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

-- 5. Update / UPDATE Policies
CREATE POLICY "Allow authenticated update to property-images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'property-images')
WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Allow authenticated update to avatars"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- 6. Delete / DELETE Policies
CREATE POLICY "Allow authenticated delete from property-images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'property-images');

CREATE POLICY "Allow authenticated delete from avatars"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'avatars');
