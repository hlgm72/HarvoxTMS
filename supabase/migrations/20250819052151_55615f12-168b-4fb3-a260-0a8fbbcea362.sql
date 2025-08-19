-- Función para detectar cuando se sube POD y marcar como completed
CREATE OR REPLACE FUNCTION public.auto_complete_load_with_pod()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  load_record RECORD;
  work_documents_exist BOOLEAN := false;
BEGIN
  -- Solo procesar si es un documento POD que se está insertando
  IF TG_OP = 'INSERT' AND NEW.document_type = 'pod' AND NEW.archived_at IS NULL THEN
    
    -- Obtener información de la carga
    SELECT * INTO load_record
    FROM loads
    WHERE id = NEW.load_id;
    
    -- Si la carga existe y está en estado 'delivered'
    IF FOUND AND load_record.status = 'delivered' THEN
      
      -- Verificar que tenga documentos de trabajo (RC o LO)
      SELECT EXISTS (
        SELECT 1 FROM load_documents 
        WHERE load_id = NEW.load_id 
        AND document_type IN ('rate_confirmation', 'load_order')
        AND archived_at IS NULL
      ) INTO work_documents_exist;
      
      -- Si tiene documentos de trabajo, marcar como completed
      IF work_documents_exist THEN
        UPDATE loads 
        SET 
          status = 'completed',
          updated_at = now()
        WHERE id = NEW.load_id;
        
        -- Registrar en historial
        INSERT INTO load_status_history (
          load_id,
          previous_status,
          new_status,
          changed_by,
          changed_at,
          notes
        ) VALUES (
          NEW.load_id,
          'delivered',
          'completed',
          NEW.uploaded_by,
          now(),
          'Auto-completed: POD uploaded to delivered load'
        );
        
        RAISE NOTICE 'Load % auto-completed after POD upload', NEW.load_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear trigger para ejecutar la función cuando se inserte un documento
DROP TRIGGER IF EXISTS trigger_auto_complete_load_with_pod ON load_documents;
CREATE TRIGGER trigger_auto_complete_load_with_pod
  AFTER INSERT ON load_documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_load_with_pod();