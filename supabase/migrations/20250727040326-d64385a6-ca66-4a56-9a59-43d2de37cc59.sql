-- Renombrar la columna card_number_last_four a card_number_last_five en la tabla driver_cards
ALTER TABLE public.driver_cards 
RENAME COLUMN card_number_last_four TO card_number_last_five;

-- Actualizar comentarios de la columna para reflejar el cambio
COMMENT ON COLUMN public.driver_cards.card_number_last_five IS 'Últimos 5 dígitos del número de tarjeta de combustible';