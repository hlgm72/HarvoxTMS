-- Create a function with SECURITY DEFINER to bypass RLS restrictions
CREATE OR REPLACE FUNCTION public.force_assign_payment_period(load_id_param uuid, period_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.loads 
  SET payment_period_id = period_id_param
  WHERE id = load_id_param;
  
  RETURN FOUND;
END;
$$;

-- Use the function to assign the period
SELECT public.force_assign_payment_period(
  'd8d403fd-7bc4-43c4-af1f-1ade395184f6'::uuid,
  '6109b35c-ca0e-4eff-9655-ddc614818ab5'::uuid
);