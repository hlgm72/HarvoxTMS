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
import { useTranslation } from 'react-i18next';

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
  newStatus?: string; // Agregar el estado al que se está transicionando
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionText,
  stopInfo,
  isLoading = false,
  loadId,
  isDeliveryStep = false,
  newStatus
}) => {
  const { t } = useTranslation(['dashboard']);
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
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching company ID:', error);
          return;
        }

        if (data) {
          setCompanyId(data.company_id);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchCompanyId();
  }, [isOpen]);

  // Determinar el tipo de campo de tiempo según el estado
  const getTimeFieldInfo = () => {
    if (!newStatus) {
      return { 
        label: t('dashboard:loads.status_update_modal.eta_label'), 
        isETA: true,
        defaultToNow: false 
      };
    }

    // Estados que requieren ETA (yendo)
    if (newStatus.includes('en_route')) {
      return { 
        label: t('dashboard:loads.status_update_modal.eta_label'), 
        isETA: true,
        defaultToNow: false 
      };
    }

    // Estados que requieren hora actual (llegando o completando)
    if (newStatus.includes('at_') || newStatus === 'loaded' || newStatus === 'delivered') {
      const isArrival = newStatus.includes('at_');
      const isPickup = newStatus === 'loaded';
      const isDelivery = newStatus === 'delivered';
      
      let labelKey = 'arrival_time_label';
      if (isPickup) labelKey = 'pickup_time_label';
      if (isDelivery) labelKey = 'delivery_time_label';
      
      return { 
        label: t(`dashboard:loads.status_update_modal.${labelKey}`), 
        isETA: false,
        defaultToNow: true 
      };
    }

    // Default
    return { 
      label: t('dashboard:loads.status_update_modal.eta_label'), 
      isETA: true,
      defaultToNow: false 
    };
  };

  const timeFieldInfo = getTimeFieldInfo();

  // Set default date and time
  React.useEffect(() => {
    if (isOpen && !etaDate) {
      const now = new Date();
      setEtaDate(format(now, 'yyyy-MM-dd'));
      
      // Si no es ETA, establecer la hora actual por defecto
      if (timeFieldInfo.defaultToNow && !etaTime) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        setEtaTime(`${hours}:${minutes}`);
      }
    }
  }, [isOpen, etaDate, etaTime, timeFieldInfo.defaultToNow]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('dashboard:loads.status_update_modal.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Action info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="font-medium text-sm">{actionText}</p>
            {stopInfo && (
              <div className="text-xs text-muted-foreground mt-1">
                <p>{t('dashboard:loads.status_update_modal.stop_info', { number: stopInfo.stop_number, company: stopInfo.company_name })}</p>
                <p>{stopInfo.street_address}</p>
              </div>
            )}
          </div>

          {/* Time Fields */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {timeFieldInfo.label}
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="eta-date" className="text-xs text-muted-foreground">
                  {t('dashboard:loads.status_update_modal.date_label')}
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
                  {t('dashboard:loads.status_update_modal.time_label')}
                </Label>
                <Input
                  id="eta-time"
                  type="text"
                  placeholder="HH:mm"
                  pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                  value={etaTime}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Solo permitir números y :
                    const formatted = value.replace(/[^\d:]/g, '');
                    // Auto-formatear mientras escribe
                    if (formatted.length === 2 && !formatted.includes(':')) {
                      setEtaTime(formatted + ':');
                    } else if (formatted.length <= 5) {
                      setEtaTime(formatted);
                    }
                  }}
                  className="text-sm font-mono"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* POD Upload - Only show for delivery step */}
          {isDeliveryStep && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t('dashboard:loads.status_update_modal.pod_label')}
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
                    {isUploading ? t('dashboard:loads.status_update_modal.uploading') : t('dashboard:loads.status_update_modal.upload')}
                  </Button>
                )}
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  {t('dashboard:loads.status_update_modal.file_selected')} {selectedFile.name}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              {t('dashboard:loads.status_update_modal.notes_label')}
            </Label>
            <Textarea
              id="notes"
              placeholder={t('dashboard:loads.status_update_modal.notes_placeholder')}
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
            {t('dashboard:loads.status_update_modal.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? t('dashboard:loads.status_update_modal.updating') : t('dashboard:loads.status_update_modal.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};