-- Create owner_operators table for independent drivers
CREATE TABLE public.owner_operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Business information
  business_name TEXT,
  business_type TEXT, -- 'sole_proprietorship', 'llc', 'corporation', etc.
  tax_id TEXT, -- EIN or SSN
  
  -- Contact information
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_drivers table for employed drivers
CREATE TABLE public.company_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Employment information
  employee_id TEXT,
  hire_date DATE,
  employment_type TEXT, -- 'full_time', 'part_time', 'contract'
  job_title TEXT DEFAULT 'Driver',
  department TEXT,
  
  -- Compensation information
  base_salary DECIMAL(10,2),
  hourly_rate DECIMAL(8,2),
  pay_frequency TEXT, -- 'weekly', 'bi_weekly', 'monthly'
  
  -- Performance tracking
  performance_rating DECIMAL(3,2), -- Scale of 1.00 to 5.00
  last_review_date DATE,
  next_review_date DATE,
  
  -- Benefits information
  benefits_eligible BOOLEAN DEFAULT true,
  vacation_days_accrued DECIMAL(5,2) DEFAULT 0,
  sick_days_accrued DECIMAL(5,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  termination_date DATE,
  termination_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.owner_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for owner_operators
CREATE POLICY "Users can view their own owner operator profile" 
ON public.owner_operators 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own owner operator profile" 
ON public.owner_operators 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own owner operator profile" 
ON public.owner_operators 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Company members can view owner operator profiles in their company
CREATE POLICY "Company members can view company owner operators" 
ON public.owner_operators 
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

-- RLS Policies for company_drivers  
CREATE POLICY "Users can view their own company driver profile" 
ON public.company_drivers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own company driver profile" 
ON public.company_drivers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company driver profile" 
ON public.company_drivers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Company members can view company driver profiles in their company
CREATE POLICY "Company members can view company driver profiles" 
ON public.company_drivers 
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

-- Service role policies
CREATE POLICY "Service role can manage owner operators" 
ON public.owner_operators FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage company drivers" 
ON public.company_drivers FOR ALL 
USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_owner_operators_user_id ON public.owner_operators(user_id);
CREATE INDEX idx_owner_operators_active ON public.owner_operators(is_active) WHERE is_active = true;
CREATE INDEX idx_owner_operators_business_name ON public.owner_operators(business_name);

CREATE INDEX idx_company_drivers_user_id ON public.company_drivers(user_id);
CREATE INDEX idx_company_drivers_active ON public.company_drivers(is_active) WHERE is_active = true;
CREATE INDEX idx_company_drivers_employee_id ON public.company_drivers(employee_id);
CREATE INDEX idx_company_drivers_hire_date ON public.company_drivers(hire_date);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_owner_operators_updated_at
  BEFORE UPDATE ON public.owner_operators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_drivers_updated_at
  BEFORE UPDATE ON public.company_drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();