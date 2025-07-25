-- Agregar nuevo tipo de gasto para suscripciones de loadboard
INSERT INTO public.expense_types (
  name,
  description,
  category,
  is_active
) VALUES (
  'Loadboard Subscription',
  'Suscripciones a plataformas de carga (DAT, Truckstop, Sylectus, etc.)',
  'technology',
  true
);