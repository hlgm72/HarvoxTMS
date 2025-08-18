import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Clock, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDocumentUploadFlowACID } from '@/hooks/useDocumentManagementACID';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (eta: Date | null, notes: string) => void;
  actionText: string;
  stopInfo?: {
    stop_number: number;
    stop_type: string;
    company_name: string;
    street_address: string;
  };
  isLoading?: boolean;
  loadId?: string;
  isDeliveryStep?: boolean;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionText,
  stopInfo,
  isLoading = false,
  loadId,
  isDeliveryStep = false
}) => {
  const [etaDate, setEtaDate] = useState('');
  const [etaTime, setEtaTime] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const { mutate: uploadDocument, isPending: isUploading } = useDocumentUploadFlowACID();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadPOD = () => {
    if (!selectedFile || !loadId || !companyId) {
      toast.error('Faltan datos requeridos para subir el documento');
      return;
    }

    uploadDocument({
      file: selectedFile,
      documentData: {
        document_type: 'pod',
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        content_type: selectedFile.type,
        company_id: companyId,
        load_id: loadId
      }
    }, {
      onSuccess: () => {
        toast.success('POD subido exitosamente');
        setSelectedFile(null);
      },
      onError: (error) => {
        console.error('Error uploading POD:', error);
        toast.error('Error al subir el POD');
      }
    });
  };

  const handleConfirm = () => {
    let eta: Date | null = null;
    
    if (etaDate && etaTime) {
      eta = new Date(`${etaDate}T${etaTime}`);
    }
    
    onConfirm(eta, notes);
    
    // Reset form
    setEtaDate('');
    setEtaTime('');
    setNotes('');
    setSelectedFile(null);
  };

  const handleClose = () => {
    // Reset form
    setEtaDate('');
    setEtaTime('');
    setNotes('');
    setSelectedFile(null);
    onClose();
  };

  // Get company ID for current user
  React.useEffect(() => {
    const fetchCompanyId = async () => {
      if (!isOpen) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error fetching company ID:', error);
          return;
        }

        setCompanyId(data.company_id);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchCompanyId();
  }, [isOpen]);

  // Set default date to today
  React.useEffect(() => {
    if (isOpen && !etaDate) {
      const today = new Date();
      setEtaDate(format(today, 'yyyy-MM-dd'));
    }
  }, [isOpen, etaDate]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Actualizar Estado de Carga
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Action info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="font-medium text-sm">{actionText}</p>
            {stopInfo && (
              <div className="text-xs text-muted-foreground mt-1">
                <p>Parada {stopInfo.stop_number}: {stopInfo.company_name}</p>
                <p>{stopInfo.street_address}</p>
              </div>
            )}
          </div>

          {/* ETA Fields */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Tiempo Estimado de Llegada (ETA)
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="eta-date" className="text-xs text-muted-foreground">
                  Fecha
                </Label>
                <Input
                  id="eta-date"
                  type="date"
                  value={etaDate}
                  onChange={(e) => setEtaDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="eta-time" className="text-xs text-muted-foreground">
                  Hora
                </Label>
                <Input
                  id="eta-time"
                  type="time"
                  value={etaTime}
                  onChange={(e) => setEtaTime(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* POD Upload - Only show for delivery step */}
          {isDeliveryStep && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Subir POD (Proof of Delivery)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="text-sm"
                />
                {selectedFile && (
                  <Button
                    type="button"
                    onClick={handleUploadPOD}
                    disabled={isUploading}
                    size="sm"
                    className="shrink-0"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {isUploading ? "Subiendo..." : "Subir"}
                  </Button>
                )}
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Archivo seleccionado: {selectedFile.name}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notas Adicionales (Opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Información adicional sobre el estado, condiciones del tráfico, problemas, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? "Actualizando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};