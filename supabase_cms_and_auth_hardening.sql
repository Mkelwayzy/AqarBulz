-- ==============================================================================
-- AqarPulse Platform — Phase 4 Migration: CMS & Auth Security Hardening
-- Standalone SQL for Supabase SQL Editor
-- Non-destructive, Idempotent DDL with Strict Server-Side RLS
-- ==============================================================================

-- 1. CMS Homepage Settings
CREATE TABLE IF NOT EXISTS public.cms_homepage_settings (
    id TEXT PRIMARY KEY DEFAULT 'homepage_settings',
    hero_badge_text TEXT NOT NULL DEFAULT 'المنصة الجغرافية الذكية الأولى لعقارات جمهورية مصر العربية',
    hero_title_line1 TEXT NOT NULL DEFAULT 'اكتشف عقارك المثالي على',
    hero_title_line2 TEXT NOT NULL DEFAULT 'خريطة تفاعلية ذكية',
    hero_description TEXT NOT NULL DEFAULT 'ابحث وتنقّل بين أرقى التجمعات السكنية والمشاريع الاستثمارية بدقة مكانية حقيقية.',
    hero_cta_text TEXT NOT NULL DEFAULT 'استكشف الخريطة',
    hero_cta_link TEXT NOT NULL DEFAULT '/explore',
    banner_title TEXT NOT NULL DEFAULT 'تصفح العقارات عبر الخريطة التفاعلية المقسمة',
    banner_subtitle TEXT NOT NULL DEFAULT 'شاهد مواقع الفيلات والشقق الفعلية مع حماية خصوصية العناوين.',
    banner_cta_text TEXT NOT NULL DEFAULT 'فتح الخريطة التفاعلية الآن',
    section_order JSONB NOT NULL DEFAULT '["hero", "map_banner", "categories", "featured", "recent", "features"]'::jsonb,
    section_visibility JSONB NOT NULL DEFAULT '{"hero": true, "map_banner": true, "categories": true, "featured": true, "recent": true, "features": true}'::jsonb,
    nav_labels JSONB NOT NULL DEFAULT '{"brandTitle": "نبض العقار", "brandSubtitle": "AqarPulse Egypt", "home": "الرئيسية", "propertiesDropdown": "العقارات", "sale": "بيع", "rent": "إيجار", "explore": "الخريطة الذكية", "smartMatch": "التوافق الذكي", "about": "عن منصة نبض العقار", "contact": "اتصل بنا", "terms": "الشروط والأحكام", "privacy": "سياسة الخصوصية وأمن البيانات", "addProperty": "أضف عقارك"}'::jsonb,
    contact_phone TEXT NOT NULL DEFAULT '+201001234567',
    contact_email TEXT NOT NULL DEFAULT 'info@aqarpulse.eg',
    contact_whatsapp TEXT NOT NULL DEFAULT '+201001234567',
    meta_title TEXT NOT NULL DEFAULT 'نبض العقار (AqarPulse) | المنصة العقارية الذكية',
    meta_description TEXT NOT NULL DEFAULT 'منصة عقارية مصرية ذكية بالخرائط التفاعلية وتحليلات الموقع وحماية الخصوصية.',
    featured_property_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by TEXT NOT NULL DEFAULT 'system'
);

-- Ensure non-destructive addition if table existed
ALTER TABLE public.cms_homepage_settings ADD COLUMN IF NOT EXISTS nav_labels JSONB DEFAULT '{"brandTitle": "نبض العقار", "brandSubtitle": "AqarPulse Egypt", "home": "الرئيسية", "propertiesDropdown": "العقارات", "sale": "بيع", "rent": "إيجار", "explore": "الخريطة الذكية", "smartMatch": "التوافق الذكي", "about": "عن منصة نبض العقار", "contact": "اتصل بنا", "terms": "الشروط والأحكام", "privacy": "سياسة الخصوصية وأمن البيانات", "addProperty": "أضف عقارك"}'::jsonb;

-- 2. CMS Static Pages
CREATE TABLE IF NOT EXISTS public.cms_static_pages (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title_ar TEXT NOT NULL,
    content_ar TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by TEXT NOT NULL DEFAULT 'system'
);

-- 3. CMS Media Assets
CREATE TABLE IF NOT EXISTS public.cms_media_assets (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    alt_text TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    uploaded_by TEXT NOT NULL,
    in_use_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. CMS Revisions (Audit & Rollback Log)
CREATE TABLE IF NOT EXISTS public.cms_revisions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by TEXT NOT NULL
);

-- ==============================================================================
-- Row-Level Security (RLS) Configuration
-- ==============================================================================

ALTER TABLE public.cms_homepage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_static_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_revisions ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if exist for safe re-runs
DROP POLICY IF EXISTS "Public can view published homepage settings" ON public.cms_homepage_settings;
DROP POLICY IF EXISTS "Admins can manage homepage settings" ON public.cms_homepage_settings;
DROP POLICY IF EXISTS "Public can view published static pages" ON public.cms_static_pages;
DROP POLICY IF EXISTS "Admins can manage static pages" ON public.cms_static_pages;
DROP POLICY IF EXISTS "Public can view media assets" ON public.cms_media_assets;
DROP POLICY IF EXISTS "Admins can manage media assets" ON public.cms_media_assets;
DROP POLICY IF EXISTS "Admins can view revisions" ON public.cms_revisions;

-- 1. Homepage Settings: Public read if published, Admin full manage
CREATE POLICY "Public can view published homepage settings"
ON public.cms_homepage_settings FOR SELECT
TO anon, authenticated
USING (is_published = true);

CREATE POLICY "Admins can manage homepage settings"
ON public.cms_homepage_settings FOR ALL
TO authenticated
USING (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
    OR coalesce((auth.jwt() ->> 'role'), '') = 'admin'
)
WITH CHECK (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
    OR coalesce((auth.jwt() ->> 'role'), '') = 'admin'
);

-- 2. Static Pages: Public read if published, Admin full manage
CREATE POLICY "Public can view published static pages"
ON public.cms_static_pages FOR SELECT
TO anon, authenticated
USING (is_published = true);

CREATE POLICY "Admins can manage static pages"
ON public.cms_static_pages FOR ALL
TO authenticated
USING (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
    OR coalesce((auth.jwt() ->> 'role'), '') = 'admin'
)
WITH CHECK (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
    OR coalesce((auth.jwt() ->> 'role'), '') = 'admin'
);

-- 3. Media Assets: Public read, Admin write
CREATE POLICY "Public can view media assets"
ON public.cms_media_assets FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage media assets"
ON public.cms_media_assets FOR ALL
TO authenticated
USING (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
    OR coalesce((auth.jwt() ->> 'role'), '') = 'admin'
)
WITH CHECK (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
    OR coalesce((auth.jwt() ->> 'role'), '') = 'admin'
);

-- 4. Revisions: Admins only
CREATE POLICY "Admins can view revisions"
ON public.cms_revisions FOR SELECT
TO authenticated
USING (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
    OR coalesce((auth.jwt() ->> 'role'), '') = 'admin'
);
