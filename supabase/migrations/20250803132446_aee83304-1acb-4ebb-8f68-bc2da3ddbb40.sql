-- Crear tabla para despachadores de la empresa
CREATE TABLE public.company_dispatchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  hire_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.company_dispatchers ENABLE ROW LEVEL SECURITY;

-- Políticas para despachadores
CREATE POLICY "Company owners can manage dispatchers"
ON public.company_dispatchers
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() AND role = 'company_owner'
  )
);

CREATE POLICY "Operations managers can view dispatchers"
ON public.company_dispatchers
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() AND role IN ('operations_manager', 'company_owner')
  )
);

CREATE POLICY "Dispatchers can view their own record"
ON public.company_dispatchers
FOR SELECT
USING (user_id = auth.uid());

-- Crear tabla para ingresos adicionales de despachadores
CREATE TABLE public.dispatcher_other_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  dispatcher_user_id UUID NOT NULL,
  income_type TEXT NOT NULL CHECK (income_type IN ('bonus', 'commission', 'reimbursement', 'compensation', 'overtime', 'allowance', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  income_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reference_number TEXT,
  notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.dispatcher_other_income ENABLE ROW LEVEL SECURITY;

-- Políticas para ingresos de despachadores
CREATE POLICY "Company owners can manage dispatcher income"
ON public.dispatcher_other_income
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() AND role = 'company_owner'
  )
);

CREATE POLICY "Operations managers can manage dispatcher income"
ON public.dispatcher_other_income
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() AND role IN ('operations_manager', 'company_owner')
  )
);

CREATE POLICY "Dispatchers can view their own income"
ON public.dispatcher_other_income
FOR SELECT
USING (dispatcher_user_id = auth.uid());

-- Triggers para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_dispatchers_updated_at
  BEFORE UPDATE ON public.company_dispatchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dispatcher_other_income_updated_at
  BEFORE UPDATE ON public.dispatcher_other_income
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar performance
CREATE INDEX idx_company_dispatchers_company_id ON public.company_dispatchers(company_id);
CREATE INDEX idx_company_dispatchers_user_id ON public.company_dispatchers(user_id);
CREATE INDEX idx_dispatcher_other_income_company_id ON public.dispatcher_other_income(company_id);
CREATE INDEX idx_dispatcher_other_income_dispatcher_user_id ON public.dispatcher_other_income(dispatcher_user_id);
CREATE INDEX idx_dispatcher_other_income_status ON public.dispatcher_other_income(status);