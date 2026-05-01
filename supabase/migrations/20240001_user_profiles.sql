-- 20240001_user_profiles.sql

-- 1. UTILS: REUSABLE TIMESTAMPTZ TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'sales', 'service')),
  tenant_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns are nullable if they weren't in an older version
ALTER TABLE public.user_profiles ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE public.user_profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.user_profiles ALTER COLUMN tenant_id DROP NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.user_profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. SYNC PROFILE ON AUTH USER CHANGES (CREATE OR UPDATE)
CREATE OR REPLACE FUNCTION public.handle_sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    role, 
    tenant_id,
    last_login_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'full_name', 'Unknown User'),
    COALESCE(NEW.raw_app_meta_data->>'role', 'service'),
    NULLIF(NEW.raw_app_meta_data->>'tenant_id', '')::UUID,
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NEW.raw_app_meta_data->>'full_name', user_profiles.full_name),
    role = COALESCE(NEW.raw_app_meta_data->>'role', user_profiles.role),
    tenant_id = COALESCE(NULLIF(NEW.raw_app_meta_data->>'tenant_id', '')::UUID, user_profiles.tenant_id),
    last_login_at = NEW.last_sign_in_at,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for both Insert and Update to keep profiles in sync with Auth Metadata
DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users;
CREATE TRIGGER on_auth_user_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_sync_user_profile();

-- 4. RLS FOR USER PROFILES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_can_read_own_profile') THEN
        CREATE POLICY "user_can_read_own_profile"
        ON public.user_profiles FOR SELECT
        USING (auth.uid() = id);
    END IF;
END $$;

-- 5. ERROR LOGS TABLE
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_stack TEXT,
  current_url TEXT,
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anyone_can_insert_error_logs') THEN
        CREATE POLICY "anyone_can_insert_error_logs"
        ON public.error_logs FOR INSERT
        WITH CHECK (true);
    END IF;
END $$;