-- Create table to map WEX cards to drivers
CREATE TABLE IF NOT EXISTS public.driver_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  card_number_last_four TEXT NOT NULL,
  card_provider TEXT NOT NULL DEFAULT 'wex',
  card_identifier TEXT, -- Full card identifier for internal use
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deactivated_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.driver_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for driver_cards
CREATE POLICY "Users can view cards from their company" 
ON public.driver_cards 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.company_id = driver_cards.company_id 
    AND ucr.is_active = true
  )
);

CREATE POLICY "Company owners and operations managers can manage cards" 
ON public.driver_cards 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.company_id = driver_cards.company_id 
    AND ucr.role IN ('company_owner', 'operations_manager')
    AND ucr.is_active = true
  )
);

-- Add indexes for performance
CREATE INDEX idx_driver_cards_driver_user_id ON public.driver_cards(driver_user_id);
CREATE INDEX idx_driver_cards_company_id ON public.driver_cards(company_id);
CREATE INDEX idx_driver_cards_card_last_four ON public.driver_cards(card_number_last_four);
CREATE INDEX idx_driver_cards_active ON public.driver_cards(is_active);

-- Add foreign key constraints
ALTER TABLE public.driver_cards 
ADD CONSTRAINT fk_driver_cards_driver_user_id 
FOREIGN KEY (driver_user_id) REFERENCES auth.users(id);

-- Add columns to fuel_expenses for WEX integration
ALTER TABLE public.fuel_expenses 
ADD COLUMN IF NOT EXISTS card_last_four TEXT,
ADD COLUMN IF NOT EXISTS authorization_code TEXT,
ADD COLUMN IF NOT EXISTS wex_reference_id TEXT,
ADD COLUMN IF NOT EXISTS raw_webhook_data JSONB;

-- Create index for WEX reference lookups
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_wex_reference 
ON public.fuel_expenses(wex_reference_id);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_card_last_four 
ON public.fuel_expenses(card_last_four);