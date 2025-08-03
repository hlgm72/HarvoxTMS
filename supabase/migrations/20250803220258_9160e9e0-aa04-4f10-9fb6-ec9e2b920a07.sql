-- Fix security warning: Add proper search_path to the function
CREATE OR REPLACE FUNCTION public.update_user_invitations_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;