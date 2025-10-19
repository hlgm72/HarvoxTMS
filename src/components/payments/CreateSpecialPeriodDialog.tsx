import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { formatPrettyDate } from '@/lib/dateFormatting';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatDateInUserTimeZone } from '@/lib/dateFormatting';
import { useFleetNotifications } from '@/components/notifications';

interface CreateSpecialPeriodDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSpecialPeriodDialog({ onClose, onSuccess }: CreateSpecialPeriodDialogProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    period_type: 'special',
    period_frequency: 'custom',
    reason: '',
    notes: ''
  });
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      showError("Error", "Por favor selecciona las fechas de inicio y fin");
      return;
    }

    if (!user?.user_metadata?.company_id) {
      showError("Error", "No se pudo identificar la empresa");
      return;
    }

    setIsLoading(true);

    try {
      // Note: Special periods are now created through user_payment_periods
      // This will be handled by the payment period generator
      showError("Información", "La creación de períodos especiales requiere actualización del sistema");
      return;

      showSuccess("Éxito", "Período especial creado exitosamente");

      onSuccess();
    } catch (error: any) {
      console.error('Error creating special period:', error);
      showError("Error", error.message || "No se pudo crear el período especial");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date">Fecha de Inicio</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="start-date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? formatPrettyDate(startDate) : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                onClear={() => setStartDate(undefined)}
                onToday={() => setStartDate(new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date">Fecha de Fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="end-date"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? formatPrettyDate(endDate) : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                onClear={() => setEndDate(undefined)}
                onToday={() => setEndDate(new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="period-type">Tipo de Período</Label>
        <Select
          value={formData.period_type}
          onValueChange={(value) => setFormData(prev => ({ ...prev, period_type: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="special">Especial</SelectItem>
            <SelectItem value="bonus">Bono</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Razón del Período Especial</Label>
        <Input
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
          placeholder="Ej: Bono de fin de año, período de ajuste..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (Opcional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Información adicional sobre este período..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Creando..." : "Crear Período"}
        </Button>
      </div>
    </form>
  );
}