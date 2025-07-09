-- Create company brokers table
CREATE TABLE public.company_brokers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company broker dispatchers table
CREATE TABLE public.company_broker_dispatchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL REFERENCES public.company_brokers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone_office TEXT,
  phone_mobile TEXT,
  extension TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.company_brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_broker_dispatchers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for company_brokers
CREATE POLICY "Company members can view company brokers" 
ON public.company_brokers 
FOR SELECT 
USING (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can insert company brokers" 
ON public.company_brokers 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can update company brokers" 
ON public.company_brokers 
FOR UPDATE 
USING (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can delete company brokers" 
ON public.company_brokers 
FOR DELETE 
USING (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Create RLS policies for company_broker_dispatchers
CREATE POLICY "Company members can view broker dispatchers" 
ON public.company_broker_dispatchers 
FOR SELECT 
USING (
  broker_id IN (
    SELECT cb.id
    FROM company_brokers cb
    JOIN user_company_roles ucr ON cb.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can insert broker dispatchers" 
ON public.company_broker_dispatchers 
FOR INSERT 
WITH CHECK (
  broker_id IN (
    SELECT cb.id
    FROM company_brokers cb
    JOIN user_company_roles ucr ON cb.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can update broker dispatchers" 
ON public.company_broker_dispatchers 
FOR UPDATE 
USING (
  broker_id IN (
    SELECT cb.id
    FROM company_brokers cb
    JOIN user_company_roles ucr ON cb.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can delete broker dispatchers" 
ON public.company_broker_dispatchers 
FOR DELETE 
USING (
  broker_id IN (
    SELECT cb.id
    FROM company_brokers cb
    JOIN user_company_roles ucr ON cb.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Service role policies
CREATE POLICY "Service role can manage company brokers" 
ON public.company_brokers 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role can manage broker dispatchers" 
ON public.company_broker_dispatchers 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_company_brokers_updated_at
  BEFORE UPDATE ON public.company_brokers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_broker_dispatchers_updated_at
  BEFORE UPDATE ON public.company_broker_dispatchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_company_brokers_company_id ON public.company_brokers(company_id);
CREATE INDEX idx_company_brokers_active ON public.company_brokers(is_active);
CREATE INDEX idx_company_broker_dispatchers_broker_id ON public.company_broker_dispatchers(broker_id);
CREATE INDEX idx_company_broker_dispatchers_active ON public.company_broker_dispatchers(is_active);