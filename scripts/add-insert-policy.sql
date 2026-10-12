-- Fix properties and property images insert RLS
DROP POLICY IF EXISTS "Allow server-mediated property listings insertion" ON public.properties;
CREATE POLICY "Allow server-mediated property listings insertion"
ON public.properties FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server-mediated property images insertion" ON public.property_images;
CREATE POLICY "Allow server-mediated property images insertion"
ON public.property_images FOR INSERT
TO anon, authenticated
WITH CHECK (true);
