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

interface EditExpenseTemplateDialogProps {
  template: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditExpenseTemplateDialog({ template, onClose, onSuccess }: EditExpenseTemplateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: template.amount.toString(),
    frequency: template.frequency,
    notes: template.notes || '',
    month_week: template.month_week || 1
  });
  
  const [effectiveFrom, setEffectiveFrom] = useState<Date>(
    template.start_date ? new Date(template.start_date) : new Date()
  );
  const [effectiveUntil, setEffectiveUntil] = useState<Date | undefined>(
    template.end_date ? new Date(template.end_date) : undefined
  );

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
      const { error } = await supabase
        .from('recurring_expense_templates')
        .update({
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          month_week: formData.frequency === 'monthly' ? formData.month_week : null,
          start_date: effectiveFrom.toISOString().split('T')[0],
          end_date: effectiveUntil?.toISOString().split('T')[0] || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Plantilla de deducción actualizada exitosamente",
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error updating expense template:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la plantilla de deducción",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Conductor</Label>
        <Input
          value={`${template.profiles?.first_name || ''} ${template.profiles?.last_name || ''}`}
          disabled
          className="bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Label>Tipo de Gasto</Label>
        <Input
          value={template.expense_types?.name || 'Tipo no definido'}
          disabled
          className="bg-muted"
        />
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
          {isLoading ? "Actualizando..." : "Actualizar Deducción"}
        </Button>
      </div>
    </form>
  );
}