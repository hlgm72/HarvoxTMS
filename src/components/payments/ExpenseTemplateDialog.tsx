import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, AlertTriangle, Check, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useATMInput } from "@/hooks/useATMInput";

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
  const [driverSearchOpen, setDriverSearchOpen] = useState(false);
  const [driverSearchValue, setDriverSearchValue] = useState("");
  const [isFromDatePickerOpen, setIsFromDatePickerOpen] = useState(false);
  const [isUntilDatePickerOpen, setIsUntilDatePickerOpen] = useState(false);
  
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
      atmInput.setValue(template.amount * 100); // Convert to cents
    }
  }, [template?.amount, mode]);

  // Obtener conductores de la compañía
  const { data: drivers = [] } = useQuery({
    queryKey: ['company-drivers'],
    queryFn: async () => {
      try {
        // Obtenemos directamente de company_drivers
        const { data: companyDrivers, error: driversError } = await supabase
          .from('company_drivers')
          .select('user_id')
          .eq('is_active', true);

        if (driversError) {
          console.error('Error fetching company drivers:', driversError);
          return [];
        }

        if (!companyDrivers || companyDrivers.length === 0) return [];

        // Luego obtenemos los perfiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', companyDrivers.map(d => d.user_id));

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return [];
        }

        return profiles || [];
      } catch (error) {
        console.error('Error in drivers query:', error);
        return [];
      }
    },
    enabled: !!user?.id
  });

  // Filtrar conductores para búsqueda
  const filteredDrivers = useMemo(() => {
    if (!driverSearchValue) return drivers;
    
    return drivers.filter(driver => {
      const fullName = `${driver.first_name} ${driver.last_name}`.toLowerCase();
      return fullName.includes(driverSearchValue.toLowerCase());
    });
  }, [drivers, driverSearchValue]);

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
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
              <Popover open={driverSearchOpen} onOpenChange={setDriverSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={driverSearchOpen}
                    className="w-full justify-between"
                  >
                    {formData.driver_user_id 
                      ? drivers.find(driver => driver.user_id === formData.driver_user_id)?.first_name + ' ' + 
                        drivers.find(driver => driver.user_id === formData.driver_user_id)?.last_name
                      : "Seleccionar conductor..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar conductor..." 
                      value={driverSearchValue}
                      onValueChange={setDriverSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron conductores.</CommandEmpty>
                      <CommandGroup>
                        {filteredDrivers.map((driver) => (
                          <CommandItem
                            key={driver.user_id}
                            value={`${driver.first_name} ${driver.last_name}`}
                            onSelect={() => {
                              setFormData(prev => ({ ...prev, driver_user_id: driver.user_id }));
                              setDriverSearchOpen(false);
                              setDriverSearchValue("");
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
                type="text"
                value={atmInput.displayValue}
                onChange={() => {}} // Dummy onChange to satisfy React warning
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
              <Popover open={isFromDatePickerOpen} onOpenChange={setIsFromDatePickerOpen}>
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
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    {/* Selectores de mes y año */}
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={effectiveFrom ? format(effectiveFrom, 'MMMM', { locale: es }) : ""}
                        onValueChange={(monthName) => {
                          const monthIndex = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                                            .indexOf(monthName.toLowerCase());
                          if (monthIndex !== -1) {
                            const currentYear = effectiveFrom?.getFullYear() || new Date().getFullYear();
                            const currentDay = effectiveFrom?.getDate() || 1;
                            setEffectiveFrom(new Date(currentYear, monthIndex, currentDay));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Mes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enero">Enero</SelectItem>
                          <SelectItem value="febrero">Febrero</SelectItem>
                          <SelectItem value="marzo">Marzo</SelectItem>
                          <SelectItem value="abril">Abril</SelectItem>
                          <SelectItem value="mayo">Mayo</SelectItem>
                          <SelectItem value="junio">Junio</SelectItem>
                          <SelectItem value="julio">Julio</SelectItem>
                          <SelectItem value="agosto">Agosto</SelectItem>
                          <SelectItem value="septiembre">Septiembre</SelectItem>
                          <SelectItem value="octubre">Octubre</SelectItem>
                          <SelectItem value="noviembre">Noviembre</SelectItem>
                          <SelectItem value="diciembre">Diciembre</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={effectiveFrom?.getFullYear()?.toString() || ""}
                        onValueChange={(year) => {
                          const currentMonth = effectiveFrom?.getMonth() || 0;
                          const currentDay = effectiveFrom?.getDate() || 1;
                          setEffectiveFrom(new Date(parseInt(year), currentMonth, currentDay));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Calendar */}
                    <Calendar
                      mode="single"
                      selected={effectiveFrom}
                      onSelect={(date) => {
                        if (date) {
                          setEffectiveFrom(date);
                          setIsFromDatePickerOpen(false);
                        }
                      }}
                      month={effectiveFrom}
                      onMonthChange={setEffectiveFrom}
                      className="p-0 pointer-events-auto"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Vigente Hasta (Opcional)</Label>
              <Popover open={isUntilDatePickerOpen} onOpenChange={setIsUntilDatePickerOpen}>
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
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    {/* Selectores de mes y año */}
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={effectiveUntil ? format(effectiveUntil, 'MMMM', { locale: es }) : ""}
                        onValueChange={(monthName) => {
                          const monthIndex = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                                            .indexOf(monthName.toLowerCase());
                          if (monthIndex !== -1) {
                            const currentYear = effectiveUntil?.getFullYear() || new Date().getFullYear();
                            const currentDay = effectiveUntil?.getDate() || 1;
                            setEffectiveUntil(new Date(currentYear, monthIndex, currentDay));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Mes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enero">Enero</SelectItem>
                          <SelectItem value="febrero">Febrero</SelectItem>
                          <SelectItem value="marzo">Marzo</SelectItem>
                          <SelectItem value="abril">Abril</SelectItem>
                          <SelectItem value="mayo">Mayo</SelectItem>
                          <SelectItem value="junio">Junio</SelectItem>
                          <SelectItem value="julio">Julio</SelectItem>
                          <SelectItem value="agosto">Agosto</SelectItem>
                          <SelectItem value="septiembre">Septiembre</SelectItem>
                          <SelectItem value="octubre">Octubre</SelectItem>
                          <SelectItem value="noviembre">Noviembre</SelectItem>
                          <SelectItem value="diciembre">Diciembre</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={effectiveUntil?.getFullYear()?.toString() || ""}
                        onValueChange={(year) => {
                          const currentMonth = effectiveUntil?.getMonth() || 0;
                          const currentDay = effectiveUntil?.getDate() || 1;
                          setEffectiveUntil(new Date(parseInt(year), currentMonth, currentDay));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Calendar */}
                    <Calendar
                      mode="single"
                      selected={effectiveUntil}
                      onSelect={(date) => {
                        if (date) {
                          setEffectiveUntil(date);
                          setIsUntilDatePickerOpen(false);
                        }
                      }}
                      month={effectiveUntil}
                      onMonthChange={setEffectiveUntil}
                      className="p-0 pointer-events-auto"
                    />
                  </div>
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