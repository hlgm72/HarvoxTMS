-- Create basic authentication and multi-tenant tables
-- Using auth.users email instead of duplicating email fields

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal information
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  
  -- Profile settings
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_profiles table for driver-specific information
CREATE TABLE public.driver_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Driver information
  license_number TEXT,
  license_state CHAR(2) REFERENCES public.states(id),
  license_expiry_date DATE,
  cdl_class TEXT, -- 'A', 'B', 'C'
  
  -- Additional driver data
  date_of_birth DATE,
  hire_date DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_company_roles for multi-tenant user management
CREATE TYPE public.user_role AS ENUM (
  'company_owner',
  'senior_dispatcher', 
  'dispatcher',
  'driver',
  'safety_manager'
);

CREATE TABLE public.user_company_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Role and permissions
  role public.user_role NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb, -- Array of specific permissions
  
  -- Delegation tracking
  delegated_by UUID REFERENCES auth.users(id), -- If assigned by company owner
  delegated_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, company_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_company_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for driver_profiles  
CREATE POLICY "Users can view their own driver profile" 
ON public.driver_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own driver profile" 
ON public.driver_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own driver profile" 
ON public.driver_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Company members can view driver profiles of their company
CREATE POLICY "Company members can view company driver profiles" 
ON public.driver_profiles 
FOR SELECT 
USING (
  user_id IN (
    SELECT ucr.user_id 
    FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id 
      FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) 
    AND ucr.is_active = true
  )
);

-- RLS Policies for user_company_roles
CREATE POLICY "Users can view their own company roles" 
ON public.user_company_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Company owners can manage company roles" 
ON public.user_company_roles 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id 
    FROM public.user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'company_owner' 
    AND is_active = true
  )
);

-- Service role policies
CREATE POLICY "Service role can manage profiles" 
ON public.profiles FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage driver profiles" 
ON public.driver_profiles FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage user company roles" 
ON public.user_company_roles FOR ALL 
USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_driver_profiles_user_id ON public.driver_profiles(user_id);
CREATE INDEX idx_driver_profiles_license_state ON public.driver_profiles(license_state);
CREATE INDEX idx_user_company_roles_user_id ON public.user_company_roles(user_id);
CREATE INDEX idx_user_company_roles_company_id ON public.user_company_roles(company_id);
CREATE INDEX idx_user_company_roles_active ON public.user_company_roles(is_active) WHERE is_active = true;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_profiles_updated_at
  BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_company_roles_updated_at
  BEFORE UPDATE ON public.user_company_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();