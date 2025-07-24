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
import { useATMInput } from "@/hooks/useATMInput";

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
    frequency: '',
    notes: '',
    month_week: 1
  });

  // ATM Input para el monto
  const atmInput = useATMInput({
    initialValue: 0,
    onValueChange: (value) => {
      // El valor ya está actualizado en el hook
    }
  });
  
  const [effectiveFrom, setEffectiveFrom] = useState<Date>();
  const [effectiveUntil, setEffectiveUntil] = useState<Date>();

  // Obtener conductores de la empresa
  const { data: drivers = [] } = useQuery({
    queryKey: ['company-drivers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Obtener la empresa del usuario actual
      const { data: userRoles } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!userRoles || userRoles.length === 0) return [];
      
      // Tomar la primera empresa (en caso de múltiples roles)
      const companyId = userRoles[0].company_id;

      const { data: driverRoles } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('role', 'driver')
        .eq('is_active', true);

      if (!driverRoles) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', driverRoles.map(d => d.user_id));

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Obtener tipos de gastos reales
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
      const { error } = await supabase
        .from('recurring_expense_templates')
        .insert({
          driver_user_id: formData.driver_user_id,
          expense_type_id: formData.expense_type_id,
          amount: atmInput.numericValue,
          frequency: formData.frequency,
          start_date: effectiveFrom.toISOString().split('T')[0],
          end_date: effectiveUntil?.toISOString().split('T')[0] || null,
          notes: formData.notes || null,
          month_week: formData.frequency === 'monthly' ? formData.month_week : null,
          created_by: user?.id
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
    <div className="bg-card rounded-lg p-6 border">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="driver" className="text-foreground font-medium">Conductor</Label>
            <Select
              value={formData.driver_user_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, driver_user_id: value }))}
            >
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Seleccionar conductor" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {drivers.map((driver) => (
                  <SelectItem key={driver.user_id} value={driver.user_id}>
                    {driver.first_name} {driver.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-type" className="text-foreground font-medium">Tipo de Gasto</Label>
            <Select
              value={formData.expense_type_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, expense_type_id: value }))}
            >
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
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
            <Label htmlFor="amount" className="text-foreground font-medium">Monto ($) *</Label>
            <Input 
              type="text"
              value={atmInput.displayValue}
              onKeyDown={atmInput.handleKeyDown}
              onPaste={atmInput.handlePaste}
              placeholder="$0.00"
              className="text-right font-mono bg-background border-input"
              autoComplete="off"
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency" className="text-foreground font-medium">Frecuencia</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
            >
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Seleccionar frecuencia" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quincenal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.frequency === 'monthly' && (
          <div className="space-y-2">
            <Label htmlFor="month-week" className="text-foreground font-medium">Semana del Mes</Label>
            <Select
              value={formData.month_week.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, month_week: parseInt(value) }))}
            >
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Seleccionar semana" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
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
            <Label className="text-foreground font-medium">Vigente Desde</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background border-input",
                    !effectiveFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {effectiveFrom ? format(effectiveFrom, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border-border">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2030}
                  selected={effectiveFrom}
                  onSelect={setEffectiveFrom}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Vigente Hasta (Opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background border-input",
                    !effectiveUntil && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {effectiveUntil ? format(effectiveUntil, "PPP", { locale: es }) : "Indefinido"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border-border">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2030}
                  selected={effectiveUntil}
                  onSelect={setEffectiveUntil}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-foreground font-medium">Notas (Opcional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Información adicional sobre esta deducción..."
            className="bg-background border-input"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Creando..." : "Crear Deducción"}
          </Button>
        </div>
      </form>
    </div>
  );
}