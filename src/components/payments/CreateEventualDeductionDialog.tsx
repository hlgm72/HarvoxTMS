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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CreateEventualDeductionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateEventualDeductionDialog({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateEventualDeductionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    driver_user_id: '',
    payment_period_id: '',
    expense_type_id: '',
    amount: '',
    description: '',
    is_critical: false,
    priority: 5
  });
  
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [driverComboboxOpen, setDriverComboboxOpen] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        driver_user_id: '',
        payment_period_id: '',
        expense_type_id: '',
        amount: '',
        description: '',
        is_critical: false,
        priority: 5
      });
      setExpenseDate(new Date());
    }
  }, [isOpen]);

  // Obtener conductores de la compañía
  const { data: drivers = [] } = useQuery({
    queryKey: ['company-drivers-eventual'],
    queryFn: async () => {
      try {
        const { data: companyDrivers, error: driversError } = await supabase
          .from('company_drivers')
          .select('user_id')
          .eq('is_active', true);

        if (driversError) throw driversError;
        if (!companyDrivers || companyDrivers.length === 0) return [];

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', companyDrivers.map(d => d.user_id));

        if (profilesError) throw profilesError;
        return profiles || [];
      } catch (error) {
        console.error('Error fetching drivers:', error);
        return [];
      }
    },
    enabled: !!user?.id && isOpen
  });

  // Obtener períodos de pago del conductor seleccionado
  const { data: paymentPeriods = [] } = useQuery({
    queryKey: ['driver-payment-periods', formData.driver_user_id],
    queryFn: async () => {
      if (!formData.driver_user_id) return [];

      try {
        const { data, error } = await supabase
          .from('driver_period_calculations')
          .select(`
            id,
            company_payment_period_id,
            company_payment_periods:company_payment_period_id (
              period_start_date,
              period_end_date,
              period_frequency,
              status
            )
          `)
          .eq('driver_user_id', formData.driver_user_id)
          .order('company_payment_period_id', { ascending: false });

        if (error) throw error;
        
        return data?.filter(period => 
          period.company_payment_periods?.status === 'open' || 
          period.company_payment_periods?.status === 'processing'
        ) || [];
      } catch (error) {
        console.error('Error fetching payment periods:', error);
        return [];
      }
    },
    enabled: !!formData.driver_user_id && isOpen
  });

  // Obtener tipos de gastos
  const { data: expenseTypes = [] } = useQuery({
    queryKey: ['expense-types-eventual'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('expense_instances')
        .insert({
          payment_period_id: formData.payment_period_id,
          expense_type_id: formData.expense_type_id,
          amount: parseFloat(formData.amount),
          description: formData.description,
          expense_date: format(expenseDate, 'yyyy-MM-dd'),
          status: 'planned',
          is_critical: formData.is_critical,
          priority: formData.priority,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Deducción eventual creada exitosamente",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating eventual deduction:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la deducción eventual",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = 
    formData.driver_user_id && 
    formData.payment_period_id &&
    formData.expense_type_id && 
    formData.amount && 
    parseFloat(formData.amount) > 0 &&
    formData.description.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Crear Deducción Eventual</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="driver">Conductor</Label>
            <Popover open={driverComboboxOpen} onOpenChange={setDriverComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={driverComboboxOpen}
                  className="w-full justify-between"
                >
                  {formData.driver_user_id
                    ? drivers.find((driver) => driver.user_id === formData.driver_user_id)?.first_name + " " + drivers.find((driver) => driver.user_id === formData.driver_user_id)?.last_name
                    : "Seleccionar conductor..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar conductor..." />
                  <CommandEmpty>No se encontró conductor.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {drivers.map((driver) => (
                        <CommandItem
                          key={driver.user_id}
                          value={`${driver.first_name} ${driver.last_name}`}
                          onSelect={() => {
                            setFormData(prev => ({
                              ...prev,
                              driver_user_id: driver.user_id,
                              payment_period_id: '' // Reset period when driver changes
                            }));
                            setDriverComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.driver_user_id === driver.user_id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {driver.first_name} {driver.last_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {formData.driver_user_id && (
            <div className="space-y-2">
              <Label htmlFor="payment-period">Período de Pago</Label>
              {paymentPeriods.length === 0 ? (
                <div className="space-y-2">
                  <div className="p-3 border border-orange-200 bg-orange-50 rounded-md">
                    <p className="text-sm text-orange-800">
                      No hay períodos de pago disponibles para este conductor.
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Los períodos de pago deben estar en estado "abierto" o "procesando" para crear deducciones eventuales.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open('/payments', '_blank');
                    }}
                    className="w-full"
                  >
                    Ir a Períodos de Pago
                  </Button>
                </div>
              ) : (
                <Select 
                  value={formData.payment_period_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_period_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar período" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentPeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {format(new Date(period.company_payment_periods.period_start_date), 'dd/MM/yyyy', { locale: es })} - {' '}
                        {format(new Date(period.company_payment_periods.period_end_date), 'dd/MM/yyyy', { locale: es })} {' '}
                        ({period.company_payment_periods.period_frequency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="expense-type">Tipo de Gasto</Label>
            <Select 
              value={formData.expense_type_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, expense_type_id: value }))}
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
              <Label>Fecha del Gasto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expenseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expenseDate ? format(expenseDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expenseDate}
                    onSelect={(date) => date && setExpenseDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción/Motivo</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe el motivo de esta deducción eventual (ej: Multa por exceso de velocidad, Reparación de neumático, etc.)"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="is-critical">¿Es un gasto crítico?</Label>
              <Select 
                value={formData.is_critical.toString()} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  is_critical: value === 'true',
                  priority: value === 'true' ? 1 : 5 // Critical expenses get priority 1
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No - Aplicar si hay balance</SelectItem>
                  <SelectItem value="true">Sí - Aplicar siempre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!formData.is_critical && (
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad (1-10)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 5 }))}
                />
              </div>
            )}
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
              {isLoading ? "Creando..." : "Crear Deducción Eventual"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}