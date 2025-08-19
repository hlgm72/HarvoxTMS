import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
}


export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionText,
  stopInfo,
  isLoading = false
}) => {
  const { t } = useTranslation(['dashboard']);
  const [etaDate, setEtaDate] = useState('');
  const [etaTime, setEtaTime] = useState('');
  const [notes, setNotes] = useState('');

  // Generar opciones para el dropdown de tiempo combinado
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) { // Intervalos de 5 minutos
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    return times;
  };

  // Función para redondear la hora actual a intervalos de 5 minutos
  const roundTimeToNearestInterval = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Redondear a los 5 minutos más cercanos
    const roundedMinutes = Math.round(minutes / 5) * 5;
    
    // Si se redondea a 60, ajustar la hora
    if (roundedMinutes === 60) {
      const adjustedHours = (hours + 1) % 24;
      return `${adjustedHours.toString().padStart(2, '0')}:00`;
    }
    
    return `${hours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
  };


  const handleConfirm = () => {
    console.log('🔍 handleConfirm - Valores antes de procesar:', { etaDate, etaTime });
    
    let eta: Date | null = null;
    
    if (etaDate && etaTime) {
      // Crear fecha en zona horaria local del usuario
      const [year, month, day] = etaDate.split('-').map(Number);
      const [hours, minutes] = etaTime.split(':').map(Number);
      
      console.log('🕐 handleConfirm - Componentes de fecha/hora:', { 
        year, month, day, hours, minutes
      });
      
      // Crear fecha local y convertir explícitamente a UTC
      const localDate = new Date(year, month - 1, day, hours, minutes);
      console.log('📅 handleConfirm - Fecha local creada:', {
        local: localDate.toString(),
        localISOString: localDate.toISOString(),
        timezoneOffset: localDate.getTimezoneOffset()
      });
      
      // La fecha ya se convierte automáticamente a UTC cuando usamos toISOString()
      // Solo necesitamos pasarla como está
      eta = localDate;
      
      console.log('📅 handleConfirm - Fecha ETA final:', {
        eta: eta.toISOString(),
        local: eta.toString(),
        hours24: eta.getHours(),
        minutes: eta.getMinutes()
      });
    }
    
    onConfirm(eta, notes);
    
    // Reset form
    setEtaDate('');
    setEtaTime('');
    setNotes('');
  };

  const handleClose = () => {
    // Reset form
    setEtaDate('');
    setEtaTime('');
    setNotes('');
    onClose();
  };


  // Determinar el tipo de campo de tiempo según el estado
  const getTimeFieldInfo = () => {
    return { 
      label: t('dashboard:loads.status_update_modal.eta_label'), 
      isETA: true,
      defaultToNow: false 
    };
  };

  const timeFieldInfo = getTimeFieldInfo();

  console.log('🔍 StatusUpdateModal - Estado del modal:', {
    isOpen,
    timeFieldInfo,
    etaDate,
    etaTime
  });

  // Set default date and time
  React.useEffect(() => {
    console.log('🕐 useEffect ejecutándose:', { isOpen, etaDate, etaTime, timeFieldInfo });
    
    if (isOpen && !etaDate) {
      const now = new Date();
      setEtaDate(format(now, 'yyyy-MM-dd'));
      
      // Si no es ETA, establecer la hora actual redondeada a intervalos de 5 minutos
      if (timeFieldInfo.defaultToNow && !etaTime) {
        const now = new Date();
        const roundedTimeValue = roundTimeToNearestInterval(now);
        
        console.log('⏰ DEBUG - Hora actual del sistema:', {
          now: now.toString(),
          hours: now.getHours(),
          minutes: now.getMinutes(),
          originalTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
          roundedTime: roundedTimeValue
        });
        console.log('⏰ Estableciendo hora automática redondeada:', roundedTimeValue);
        setEtaTime(roundedTimeValue);
      }
    }
  }, [isOpen, etaDate, etaTime, timeFieldInfo.defaultToNow]);

  return (
    <>
      <style>{`
        #eta-time::-webkit-datetime-edit-ampm-field {
          display: none !important;
        }
        #eta-time::-webkit-datetime-edit-hour-field,
        #eta-time::-webkit-datetime-edit-minute-field {
          text-align: center;
        }
      `}</style>
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
                 <Select value={etaTime} onValueChange={setEtaTime}>
                   <SelectTrigger className="text-sm">
                     <SelectValue placeholder="HH:MM" />
                   </SelectTrigger>
                   <SelectContent className="max-h-60 overflow-y-auto">
                     {generateTimeOptions().map((time) => (
                       <SelectItem key={time} value={time}>
                         {time}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
            </div>
          </div>


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
    </>
  );
};