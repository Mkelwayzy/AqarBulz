DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow uploads to property-images bucket" ON storage.objects;
END $$;

CREATE POLICY "Allow uploads to property-images bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Allow update to property-images bucket"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'property-images')
WITH CHECK (bucket_id = 'property-images');
