import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useFleetNotifications } from "@/components/notifications";
import { useATMInput } from "@/hooks/useATMInput";
import { UserTypeSelector } from "@/components/ui/UserTypeSelector";
import { UserSelector } from "@/components/forms/UserSelector";

interface UnifiedExpenseTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  template?: any;
}

export function UnifiedExpenseTemplateDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  mode, 
  template 
}: UnifiedExpenseTemplateDialogProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useFleetNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [inactiveTemplate, setInactiveTemplate] = useState<any>(null);
  const [isFromDatePickerOpen, setIsFromDatePickerOpen] = useState(false);
  const [isUntilDatePickerOpen, setIsUntilDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    userType: (mode === 'edit' ? (template?.dispatcher_user_id ? 'dispatcher' : 'driver') : 'driver') as 'driver' | 'dispatcher',
    user_id: mode === 'edit' ? (template?.driver_user_id || template?.dispatcher_user_id || '') : '',
    expenseTypeId: mode === 'edit' ? template?.expense_type_id : '',
    amount: mode === 'edit' ? template?.amount.toString() : '',
    frequency: mode === 'edit' ? template?.frequency : 'weekly',
    notes: mode === 'edit' ? (template?.notes || '') : '',
    month_week: mode === 'edit' ? (template?.month_week || 1) : 1
  });
  
  const [effectiveFrom, setEffectiveFrom] = useState<Date>(
    mode === 'edit' && template?.start_date 
      ? new Date(template.start_date + 'T00:00:00') 
      : new Date()
  );
  const [effectiveUntil, setEffectiveUntil] = useState<Date | undefined>(
    mode === 'edit' && template?.end_date 
      ? new Date(template.end_date + 'T00:00:00') 
      : undefined
  );

  // Reset form when mode or template changes
  useEffect(() => {
    if (mode === 'create') {
      setFormData({
        userType: 'driver',
        user_id: '',
        expenseTypeId: '',
        amount: '',
        frequency: 'weekly',
        notes: '',
        month_week: 1
      });
      setEffectiveFrom(new Date());
      setEffectiveUntil(undefined);
      setInactiveTemplate(null);
    } else if (mode === 'edit' && template) {
      setFormData({
        userType: template.dispatcher_user_id ? 'dispatcher' : 'driver',
        user_id: template.driver_user_id || template.dispatcher_user_id || '',
        expenseTypeId: template.expense_type_id,
        amount: template.amount.toString(),
        frequency: template.frequency,
        notes: template.notes || '',
        month_week: template.month_week || 1
      });
      setEffectiveFrom(template.start_date ? new Date(template.start_date + 'T00:00:00') : new Date());
      setEffectiveUntil(template.end_date ? new Date(template.end_date + 'T00:00:00') : undefined);
      setInactiveTemplate(null);
    }
  }, [mode, template]);

  // ATM Input para el monto
  const atmInput = useATMInput({
    initialValue: mode === 'edit' ? template?.amount || 0 : 0,
    onValueChange: (value) => {
      setFormData(prev => ({ ...prev, amount: value.toString() }));
    }
  });

  // Actualizar ATM input cuando cambie el template en modo edición
  useEffect(() => {
    if (mode === 'edit' && template?.amount) {
      atmInput.setValue(template.amount * 100);
    }
  }, [template?.amount, mode]);

  // Reset user selection when user type changes
  useEffect(() => {
    if (mode === 'create') {
      setFormData(prev => ({ ...prev, user_id: '' }));
    }
  }, [formData.userType, mode]);

  // Obtener tipos de gastos
  const { data: expenseTypes = [] } = useQuery({
    queryKey: ['expense-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const templateData = {
        [formData.userType === 'driver' ? 'driver_user_id' : 'dispatcher_user_id']: formData.user_id,
        expense_type_id: formData.expenseTypeId,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        month_week: formData.frequency === 'monthly' ? formData.month_week : null,
        start_date: effectiveFrom ? `${effectiveFrom.getFullYear()}-${String(effectiveFrom.getMonth() + 1).padStart(2, '0')}-${String(effectiveFrom.getDate()).padStart(2, '0')}` : null,
        end_date: effectiveUntil ? `${effectiveUntil.getFullYear()}-${String(effectiveUntil.getMonth() + 1).padStart(2, '0')}-${String(effectiveUntil.getDate()).padStart(2, '0')}` : null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      };

      if (mode === 'create') {
        const { error } = await supabase
          .from('recurring_expense_templates')
          .insert(templateData);

        if (error) throw error;

        showSuccess("Éxito", `Plantilla de deducción para ${formData.userType === 'driver' ? 'conductor' : 'despachador'} creada exitosamente`);
      } else {
        const { error } = await supabase
          .from('recurring_expense_templates')
          .update(templateData)
          .eq('id', template.id);

        if (error) throw error;

        showSuccess("Éxito", "Plantilla de deducción actualizada exitosamente");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} expense template:`, error);
      showError("Error", error.message || `No se pudo ${mode === 'create' ? 'crear' : 'actualizar'} la plantilla de deducción`);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = mode === 'edit' || (
    formData.user_id && 
    formData.expenseTypeId && 
    formData.amount && 
    parseFloat(formData.amount) > 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Crear Nueva Deducción' : 'Editar Deducción'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de tipo de usuario - solo en modo crear */}
          {mode === 'create' && (
            <UserTypeSelector
              value={formData.userType}
              onChange={(value) => setFormData(prev => ({ ...prev, userType: value }))}
              label="Tipo de Usuario"
            />
          )}

          {/* Información del usuario en modo edición */}
          {mode === 'edit' && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">
                {formData.userType === 'driver' ? 'Conductor' : 'Despachador'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {template?.driver_profile?.first_name || template?.dispatcher_profile?.first_name || ''} {' '}
                {template?.driver_profile?.last_name || template?.dispatcher_profile?.last_name || ''}
              </p>
            </div>
          )}

          {/* Selector de usuario */}
          {mode === 'create' && (
            <UserSelector
              value={formData.user_id}
              onChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
              userType={formData.userType}
              label={formData.userType === 'driver' ? 'Conductor' : 'Despachador'}
            />
          )}

          {/* Tipo de gasto */}
          {mode === 'edit' ? (
            <div className="space-y-2">
              <Label>Tipo de Gasto</Label>
              <Input
                value={template?.expense_types?.name || 'Tipo no definido'}
                disabled
                className="bg-muted"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="expense-type">Tipo de Gasto</Label>
              <Select 
                value={formData.expenseTypeId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, expenseTypeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo de gasto" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Monto y Frecuencia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto ($)</Label>
              <Input
                id="amount"
                type="text"
                value={atmInput.displayValue}
                onChange={() => {}}
                onKeyDown={atmInput.handleKeyDown}
                onPaste={atmInput.handlePaste}
                placeholder="$0.00"
                className="text-right"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frecuencia</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quincenal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Semana del mes para frecuencia mensual */}
          {formData.frequency === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="month-week">Semana del Mes</Label>
              <Select
                value={formData.month_week.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, month_week: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar semana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Primera semana</SelectItem>
                  <SelectItem value="2">Segunda semana</SelectItem>
                  <SelectItem value="3">Tercera semana</SelectItem>
                  <SelectItem value="4">Cuarta semana</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fechas efectivas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Efectivo Desde</Label>
              <Popover open={isFromDatePickerOpen} onOpenChange={setIsFromDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !effectiveFrom && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {effectiveFrom ? format(effectiveFrom, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={effectiveFrom}
                    onSelect={(date) => {
                      setEffectiveFrom(date || new Date());
                      setIsFromDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Efectivo Hasta (Opcional)</Label>
              <Popover open={isUntilDatePickerOpen} onOpenChange={setIsUntilDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !effectiveUntil && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {effectiveUntil ? format(effectiveUntil, "PPP", { locale: es }) : "Sin fecha límite"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={effectiveUntil}
                    onSelect={(date) => {
                      setEffectiveUntil(date);
                      setIsUntilDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas adicionales sobre esta deducción..."
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid || isLoading}>
              {isLoading ? "Guardando..." : mode === 'create' ? 'Crear Deducción' : 'Actualizar Deducción'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}