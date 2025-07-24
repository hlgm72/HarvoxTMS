import { useState } from "react";
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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CreateExpenseTemplateDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateExpenseTemplateDialog({ onClose, onSuccess }: CreateExpenseTemplateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    driver_user_id: '',
    expense_type_id: '',
    amount: '',
    frequency: '',
    notes: '',
    month_week: 1
  });
  
  const [effectiveFrom, setEffectiveFrom] = useState<Date>();
  const [effectiveUntil, setEffectiveUntil] = useState<Date>();

  // Obtener conductores de la empresa
  const { data: drivers = [] } = useQuery({
    queryKey: ['company-drivers', user?.user_metadata?.company_id],
    queryFn: async () => {
      if (!user?.user_metadata?.company_id) return [];
      
      const { data: driverRoles } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', user.user_metadata.company_id)
        .eq('role', 'driver')
        .eq('is_active', true);

      if (!driverRoles) return [];

      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverRoles.map(d => d.user_id));

      if (error) throw error;
      return data;
    },
    enabled: !!user?.user_metadata?.company_id,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!effectiveFrom) {
      toast({
        title: "Error",
        description: "Por favor selecciona la fecha de inicio",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const frequencyConfig = formData.frequency === 'monthly' 
        ? { month_week: formData.month_week }
        : null;

      const { error } = await supabase
        .from('recurring_expense_templates')
        .insert({
          driver_user_id: formData.driver_user_id,
          expense_type_id: formData.expense_type_id,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          frequency_config: frequencyConfig,
          effective_from: effectiveFrom.toISOString().split('T')[0],
          effective_until: effectiveUntil?.toISOString().split('T')[0] || null,
          notes: formData.notes || null,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Plantilla de deducción creada exitosamente",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating expense template:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la plantilla de deducción",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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

        <div className="space-y-2">
          <Label htmlFor="expense-type">Tipo de Gasto</Label>
          <Select
            value={formData.expense_type_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, expense_type_id: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {expenseTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name} {type.category && `(${type.category})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Creando..." : "Crear Deducción"}
        </Button>
      </div>
    </form>
  );
}