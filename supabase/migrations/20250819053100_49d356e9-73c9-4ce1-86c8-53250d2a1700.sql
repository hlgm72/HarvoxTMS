-- Crear función que se ejecuta cuando se sube un POD para completar automáticamente la carga
CREATE OR REPLACE FUNCTION auto_complete_load_on_pod_upload()
RETURNS TRIGGER AS $$
DECLARE
  load_record RECORD;
BEGIN
  -- Solo procesar si es un nuevo documento POD que se está insertando
  IF NEW.document_type = 'pod' AND NEW.is_active = true THEN
    
    -- Obtener información de la carga asociada
    SELECT * INTO load_record
    FROM loads
    WHERE id = NEW.load_id;
    
    -- Si la carga existe y está en estado 'delivered', cambiarla a 'completed'
    IF FOUND AND load_record.status = 'delivered' THEN
      UPDATE loads
      SET status = 'completed',
          updated_at = now()
      WHERE id = NEW.load_id;
      
      -- Registrar el cambio en el historial
      INSERT INTO load_status_history (
        load_id,
        old_status,
        new_status,
        changed_by,
        changed_at,
        notes
      ) VALUES (
        NEW.load_id,
        'delivered',
        'completed',
        auth.uid(),
        now(),
        'Auto-completed on POD upload'
      );
      
      RAISE NOTICE 'Load % auto-completed from delivered to completed due to POD upload', NEW.load_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger que ejecuta la función cuando se inserta un documento
CREATE TRIGGER trigger_auto_complete_on_pod_upload
  AFTER INSERT ON load_documents
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_load_on_pod_upload();