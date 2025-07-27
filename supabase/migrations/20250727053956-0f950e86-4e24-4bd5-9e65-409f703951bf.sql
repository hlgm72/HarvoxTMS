-- Renombrar la columna card_last_four a card_last_five en la tabla fuel_expenses
ALTER TABLE public.fuel_expenses 
RENAME COLUMN card_last_four TO card_last_five;