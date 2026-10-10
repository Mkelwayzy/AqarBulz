-- ==============================================================================
-- AqarPulse — Phase 4 Additive Migration:
-- 1. Property Reports & Complaints Table (property_reports) with RLS
-- 2. Advertiser Suspension & Operational Columns on public.profiles
-- ==============================================================================

-- 1. Property Reports & Complaints Table
CREATE TABLE IF NOT EXISTS public.property_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    reporter_name VARCHAR(200),
    reporter_contact VARCHAR(100),
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'misleading_details', 
        'duplicate_listing', 
        'unavailable', 
        'fraud_impersonation', 
        'inappropriate_content', 
        'other'
    )),
    details TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 
        'investigating', 
        'resolved', 
        'dismissed'
    )),
    resolution_notes TEXT,
    admin_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_reports_status ON public.property_reports(status);
CREATE INDEX IF NOT EXISTS idx_property_reports_property ON public.property_reports(property_id);

-- Row Level Security (RLS)
ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;

-- Anyone (public / anonymous visitor / authenticated user) can report an issue
CREATE POLICY "Public can submit property reports"
ON public.property_reports FOR INSERT
WITH CHECK (true);

-- Only verified administrators can view and manage reports
CREATE POLICY "Admins can view and manage property reports"
ON public.property_reports FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
);

-- 2. Add suspension columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
