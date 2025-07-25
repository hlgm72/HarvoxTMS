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
import { useToast } from "@/hooks/use-toast";

interface ExpenseTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  template?: any; // For edit mode
}

export function ExpenseTemplateDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  mode, 
  template 
}: ExpenseTemplateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [inactiveTemplate, setInactiveTemplate] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    driver_user_id: mode === 'edit' ? template?.driver_user_id : '',
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
        driver_user_id: '',
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
        driver_user_id: template.driver_user_id,
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

  // Obtener conductores de la compañía
  const { data: drivers = [] } = useQuery({
    queryKey: ['company-drivers'],
    queryFn: async () => {
      // Primero obtenemos la compañía del usuario actual
      const { data: userRole } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (!userRole?.company_id) return [];

      // Obtenemos los roles de conductor de la compañía
      const { data: driverRoles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', userRole.company_id)
        .eq('role', 'driver')
        .eq('is_active', true);

      if (rolesError || !driverRoles) return [];

      // Luego obtenemos la información de los perfiles
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverRoles.map(d => d.user_id));

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

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

  // Verificar plantillas inactivas (solo para modo create)
  useEffect(() => {
    if (mode === 'create' && formData.driver_user_id && formData.expenseTypeId) {
      checkInactiveTemplate();
    }
  }, [formData.driver_user_id, formData.expenseTypeId, mode]);

  const checkInactiveTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_expense_templates')
        .select(`
          *,
          expense_types(name),
          driver_profile:profiles(first_name, last_name)
        `)
        .eq('driver_user_id', formData.driver_user_id)
        .eq('expense_type_id', formData.expenseTypeId)
        .eq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      setInactiveTemplate(data?.[0] || null);
    } catch (error) {
      console.error('Error checking inactive templates:', error);
    }
  };

  const handleReactivateTemplate = async () => {
    if (!inactiveTemplate) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('recurring_expense_templates')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', inactiveTemplate.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Plantilla de deducción reactivada exitosamente",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error reactivating template:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo reactivar la plantilla",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const templateData = {
        driver_user_id: formData.driver_user_id,
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

        toast({
          title: "Éxito",
          description: "Plantilla de deducción creada exitosamente",
        });
      } else {
        const { error } = await supabase
          .from('recurring_expense_templates')
          .update(templateData)
          .eq('id', template.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Plantilla de deducción actualizada exitosamente",
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} expense template:`, error);
      toast({
        title: "Error",
        description: error.message || `No se pudo ${mode === 'create' ? 'crear' : 'actualizar'} la plantilla de deducción`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = mode === 'edit' || (
    formData.driver_user_id && 
    formData.expenseTypeId && 
    formData.amount && 
    parseFloat(formData.amount) > 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Crear Nueva Deducción' : 'Editar Deducción'}
          </DialogTitle>
        </DialogHeader>

        {inactiveTemplate && mode === 'create' && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ya existe una plantilla inactiva para este conductor y tipo de gasto:
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                <p><strong>Conductor:</strong> {inactiveTemplate.driver_profile?.first_name} {inactiveTemplate.driver_profile?.last_name}</p>
                <p><strong>Tipo:</strong> {inactiveTemplate.expense_types?.name}</p>
                <p><strong>Monto:</strong> ${inactiveTemplate.amount}</p>
                <p><strong>Frecuencia:</strong> {inactiveTemplate.frequency === 'weekly' ? 'Semanal' : inactiveTemplate.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}</p>
              </div>
              <Button 
                onClick={handleReactivateTemplate}
                disabled={isLoading}
                className="mt-2"
                size="sm"
              >
                Reactivar Plantilla Existente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label>Conductor</Label>
              <Input
                value={`${template?.driver_profile?.first_name || ''} ${template?.driver_profile?.last_name || ''}`}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="driver">Conductor</Label>
              <Select 
                value={formData.driver_user_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, driver_user_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.user_id} value={driver.user_id}>
                      {driver.first_name} {driver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vigente Desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !effectiveFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {effectiveFrom ? format(effectiveFrom, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={effectiveFrom}
                    onSelect={setEffectiveFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Vigente Hasta (Opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !effectiveUntil && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {effectiveUntil ? format(effectiveUntil, "PPP", { locale: es }) : "Indefinido"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={effectiveUntil}
                    onSelect={setEffectiveUntil}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Información adicional sobre esta deducción..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isFormValid} 
              className="flex-1"
            >
              {isLoading 
                ? `${mode === 'create' ? 'Creando' : 'Actualizando'}...` 
                : `${mode === 'create' ? 'Crear' : 'Actualizar'} Deducción`
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}