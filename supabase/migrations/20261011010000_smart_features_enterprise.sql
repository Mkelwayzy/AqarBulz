-- ==============================================================================
-- نبض العقار (AqarPulse) — Enterprise Migration for 30 Smart Features
-- Stage 1 to 6 PostGIS & Supabase Database Tables, RLS, and Indexes
-- ==============================================================================

-- 1. System Settings & Smart Features Feature Flags
CREATE TABLE IF NOT EXISTS public.smart_features_config (
  id TEXT PRIMARY KEY DEFAULT 'current_config',
  version TEXT NOT NULL DEFAULT '2.0.0',
  features JSONB NOT NULL,
  financial_params JSONB NOT NULL,
  geospatial_params JSONB NOT NULL,
  finishing_params JSONB NOT NULL,
  inspection_params JSONB NOT NULL,
  mortgage_params JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- 2. Reverse Property Requests (طلب عقار خاص)
CREATE TABLE IF NOT EXISTS public.reverse_property_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  title TEXT NOT NULL,
  city_id TEXT NOT NULL,
  district_id TEXT NOT NULL,
  district_name_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'rent')),
  min_budget NUMERIC NOT NULL,
  max_budget NUMERIC NOT NULL,
  min_area NUMERIC NOT NULL,
  max_area NUMERIC,
  bedrooms INTEGER,
  notes TEXT,
  urgency TEXT NOT NULL DEFAULT 'flexible',
  status TEXT NOT NULL DEFAULT 'open',
  offers_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Engineering Inspection Bookings (خدمة الفحص الهندسي المعتمد)
CREATE TABLE IF NOT EXISTS public.engineering_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL,
  property_title TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  requester_email TEXT,
  property_address TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  inspection_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_engineer_name TEXT,
  report_pdf_url TEXT,
  score_overall INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Broker Reputation & Reviews (تقييمات الوسطاء المعتمدين)
CREATE TABLE IF NOT EXISTS public.broker_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  broker_name TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  rating_overall NUMERIC(3, 2) NOT NULL,
  rating_accuracy NUMERIC(3, 2) NOT NULL,
  rating_communication NUMERIC(3, 2) NOT NULL,
  rating_punctuality NUMERIC(3, 2) NOT NULL,
  comment TEXT NOT NULL,
  is_verified_deal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Compound Masterplans (مخططات الكمبوندات والمطورين)
CREATE TABLE IF NOT EXISTS public.compound_masterplans (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  developer_name_ar TEXT NOT NULL,
  district_name_ar TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  total_area_feddan NUMERIC,
  delivery_year INTEGER,
  starting_price NUMERIC NOT NULL,
  installment_years_max INTEGER DEFAULT 8,
  down_payment_percent NUMERIC DEFAULT 10,
  cover_image TEXT,
  masterplan_map_url TEXT,
  description_ar TEXT,
  available_units_count INTEGER DEFAULT 0,
  amenities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Investor Portfolio Tracking (محفظة إدارة أملاك المستثمر)
CREATE TABLE IF NOT EXISTS public.investor_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  property_title TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL,
  current_market_estimate NUMERIC NOT NULL,
  purchase_date DATE NOT NULL,
  rental_income_monthly NUMERIC DEFAULT 0,
  tenant_name TEXT,
  next_installment_due_date DATE,
  next_installment_amount NUMERIC,
  installments_remaining_count INTEGER,
  occupancy_status TEXT NOT NULL DEFAULT 'vacant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.smart_features_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reverse_property_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineering_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compound_masterplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_portfolios ENABLE ROW LEVEL SECURITY;

-- Read policies for public/seekers
CREATE POLICY "Public can view active smart config" ON public.smart_features_config FOR SELECT USING (true);
CREATE POLICY "Public can view masterplans" ON public.compound_masterplans FOR SELECT USING (true);
CREATE POLICY "Public can view open property requests" ON public.reverse_property_requests FOR SELECT USING (status = 'open');
CREATE POLICY "Public can view broker reviews" ON public.broker_reviews FOR SELECT USING (true);

-- Admin full control policies
CREATE POLICY "Admins full control config" ON public.smart_features_config FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full control inspections" ON public.engineering_inspections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
