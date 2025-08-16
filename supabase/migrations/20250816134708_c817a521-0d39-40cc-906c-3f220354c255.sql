-- Crear el índice correcto para el foreign key loads_broker_dispatcher_id_fkey
-- que en realidad está en la columna client_contact_id (posición 24)

CREATE INDEX IF NOT EXISTS idx_loads_client_contact_id 
ON public.loads(client_contact_id);

-- También verificar si existe idx_loads_broker_dispatcher_id y eliminarlo si no es necesario
DROP INDEX IF EXISTS public.idx_loads_broker_dispatcher_id;