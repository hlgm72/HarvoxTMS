-- Crear políticas RLS para driver_fuel_cards
ALTER TABLE public.driver_fuel_cards ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver las tarjetas de su empresa
CREATE POLICY "Users can view fuel cards of their company drivers" 
ON public.driver_fuel_cards 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr1
    JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = auth.uid() 
    AND ucr2.user_id = driver_fuel_cards.driver_user_id
    AND ucr1.is_active = true 
    AND ucr2.is_active = true
  )
);

-- Política para insertar tarjetas (solo admins de la empresa)
CREATE POLICY "Company admins can insert fuel cards" 
ON public.driver_fuel_cards 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr1
    JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = auth.uid() 
    AND ucr2.user_id = driver_fuel_cards.driver_user_id
    AND ucr1.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr1.is_active = true 
    AND ucr2.is_active = true
  )
);

-- Política para actualizar tarjetas (solo admins de la empresa)
CREATE POLICY "Company admins can update fuel cards" 
ON public.driver_fuel_cards 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr1
    JOIN public.user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = auth.uid() 
    AND ucr2.user_id = driver_fuel_cards.driver_user_id
    AND ucr1.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr1.is_active = true 
    AND ucr2.is_active = true
  )
);

-- Verificar si la tabla fuel_card_providers existe y crear políticas
CREATE POLICY "Users can view fuel card providers" 
ON public.fuel_card_providers 
FOR SELECT 
USING (is_active = true);