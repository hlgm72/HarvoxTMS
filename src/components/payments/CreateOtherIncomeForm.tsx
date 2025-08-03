import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useCreateOtherIncome } from "@/hooks/useOtherIncome";
import { useATMInput } from "@/hooks/useATMInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

export function CreateOtherIncomeForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { drivers: companyDrivers = [], loading: driversLoading } = useCompanyDrivers();
  const createOtherIncome = useCreateOtherIncome();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    income_type: "",
    income_date: null as Date | null,
    driver_user_id: "",
    reference_number: "",
    notes: ""
  });

  const atmInput = useATMInput({
    initialValue: 0,
    onValueChange: () => {}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.driver_user_id || !formData.income_date) {
      console.error("Driver or date not selected");
      return;
    }

    try {
      await createOtherIncome.mutateAsync({
        driver_user_id: formData.driver_user_id,
        description: formData.description,
        amount: atmInput.numericValue,
        income_type: formData.income_type,
        income_date: formData.income_date.toISOString().split('T')[0], // Convert to YYYY-MM-DD
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
        status: 'pending'
      });
      onClose();
    } catch (error) {
      console.error("Error creating other income:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="driver">Conductor *</Label>
        <Select 
          value={formData.driver_user_id} 
          onValueChange={(value) => setFormData({ ...formData, driver_user_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar conductor" />
          </SelectTrigger>
          <SelectContent>
            {driversLoading ? (
              <SelectItem value="loading" disabled>Cargando conductores...</SelectItem>
            ) : companyDrivers.length === 0 ? (
              <SelectItem value="no-drivers" disabled>No hay conductores disponibles</SelectItem>
            ) : (
              companyDrivers.map((driver) => (
                <SelectItem key={driver.user_id} value={driver.user_id}>
                  {`${driver.first_name || ''} ${driver.last_name || ''}`.trim() || driver.user_id}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="description">Descripción *</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descripción del ingreso"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Monto *</Label>
          <Input
            id="amount"
            value={atmInput.displayValue}
            onKeyDown={atmInput.handleKeyDown}
            onPaste={atmInput.handlePaste}
            placeholder="$0.00"
            readOnly
            className="text-right"
            required
          />
        </div>
        <div>
          <Label>Fecha *</Label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.income_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.income_date ? format(formData.income_date, "PPP", { locale: es }) : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.income_date || undefined}
                onSelect={(date) => {
                  setFormData({ ...formData, income_date: date || null });
                  setIsDatePickerOpen(false);
                }}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <Label htmlFor="income_type">Tipo de Ingreso *</Label>
        <Select 
          value={formData.income_type} 
          onValueChange={(value) => setFormData({ ...formData, income_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bonus">Bonificación</SelectItem>
            <SelectItem value="reimbursement">Reembolso</SelectItem>
            <SelectItem value="compensation">Compensación</SelectItem>
            <SelectItem value="overtime">Horas Extra</SelectItem>
            <SelectItem value="allowance">Asignación</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="reference_number">Número de Referencia</Label>
        <Input
          id="reference_number"
          value={formData.reference_number}
          onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
          placeholder="Número de referencia (opcional)"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notas adicionales (opcional)"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={createOtherIncome.isPending || !formData.driver_user_id || !formData.income_date || !formData.description || !formData.income_type}
        >
          {createOtherIncome.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creando...
            </>
          ) : (
            'Crear Ingreso'
          )}
        </Button>
      </div>
    </form>
  );
}