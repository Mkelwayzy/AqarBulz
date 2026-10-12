-- ==============================================================================
-- AqarPulse Platform — Admin Roles, Staff Management & Password Functions
-- ==============================================================================

-- 1. Ensure columns exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_role VARCHAR(50) DEFAULT 'admin';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_permissions TEXT[] DEFAULT ARRAY['all'];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE;

-- 2. Ensure mkelwayzy@gmail.com is Superadmin
UPDATE public.profiles
SET role = 'admin',
    admin_role = 'superadmin',
    admin_permissions = ARRAY['all'],
    is_staff = TRUE
WHERE email = 'mkelwayzy@gmail.com';

-- 3. Security Definer RPC for admin to update a user's password directly
CREATE OR REPLACE FUNCTION public.update_user_password_direct(
  target_user_id UUID,
  new_password_text TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password_text, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = target_user_id;
END;
$func$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.update_user_password_direct(UUID, TEXT) TO authenticated, service_role, anon;
