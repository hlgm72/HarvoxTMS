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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarIcon } from "lucide-react";
import { parseISO, isWithinInterval, isBefore, isAfter, format } from "date-fns";
import { formatPrettyDate, formatMonthName } from '@/lib/dateFormatting';
import { formatDateOnly, formatDateInUserTimeZone } from "@/lib/dateFormatting";
import { useATMInput } from "@/hooks/useATMInput";
import { cn } from "@/lib/utils";
import { useFleetNotifications } from '@/components/notifications';
import { UserTypeSelector } from "@/components/ui/UserTypeSelector";
import { useTranslation } from 'react-i18next';
import { useFinancialDataValidation } from '@/hooks/useFinancialDataValidation'; // ⭐ NUEVO
import { shouldDisableFinancialOperation, getFinancialOperationTooltip } from '@/lib/financialIntegrityUtils'; // ⭐ NUEVO

interface EventualDeductionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingDeduction?: {
    id: string;
    user_id: string;
    expense_type_id: string;
    amount: number;
    description: string;
    expense_date: string;
    applied_to_role: string;
  } | null;
}

export function EventualDeductionDialog({ 
  isOpen, 
  onClose, 
  onSuccess,
  editingDeduction = null
}: EventualDeductionDialogProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation('payments');
  const { showSuccess, showError } = useFleetNotifications();
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedRole, setSelectedRole] = useState<"driver" | "dispatcher">("driver");
  
  const [formData, setFormData] = useState({
    user_id: '',
    expense_type_id: '',
    amount: '',
    description: ''
  });
  
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(undefined);
  const [driverComboboxOpen, setDriverComboboxOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // ⭐ VALIDACIÓN DE PROTECCIÓN FINANCIERA POR CONDUCTOR
  const { 
    data: financialValidation, 
    isLoading: isValidationLoading 
  } = useFinancialDataValidation(
    null, // No tenemos período específico aquí, pero podemos validar por conductor
    formData.user_id || editingDeduction?.user_id
  );

  // Verificar si el conductor está pagado y la operación debe estar bloqueada
  const isDriverPaid = financialValidation?.driver_is_paid === true;
  const canModify = !shouldDisableFinancialOperation(financialValidation, isValidationLoading);
  const protectionTooltip = getFinancialOperationTooltip(financialValidation, 'crear/editar esta deducción');

  // ATM Input - Implementación estable como en ExpenseTemplateDialog
  const atmInput = useATMInput({
    initialValue: 0,
    onValueChange: (value) => {
      setFormData(prev => ({ ...prev, amount: value.toString() }));
    }
  });

  // Reset form when dialog opens or populate if editing
  useEffect(() => {
    if (isOpen) {
      if (editingDeduction) {
        // Populate form for editing
        setSelectedRole(editingDeduction.applied_to_role as "driver" | "dispatcher");
        setFormData({
          user_id: editingDeduction.user_id,
          expense_type_id: editingDeduction.expense_type_id,
          amount: editingDeduction.amount.toString(),
          description: editingDeduction.description
        });
        setExpenseDate(parseISO(editingDeduction.expense_date));
        atmInput.setValue(editingDeduction.amount);
      } else {
        // Reset form for creating
        setSelectedRole("driver");
        setFormData({
          user_id: '',
          expense_type_id: '',
          amount: '',
          description: ''
        });
        setExpenseDate(undefined);
        atmInput.setValue(0);
      }
    }
  }, [isOpen, editingDeduction]);

  // Obtener usuarios por rol seleccionado
  const { data: users = [] } = useQuery({
    queryKey: ['company-users-eventual', selectedRole],
    queryFn: async () => {
      try {
        const { data: companyUsers, error: usersError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('role', selectedRole)
          .eq('is_active', true);

        if (usersError) throw usersError;
        if (!companyUsers || companyUsers.length === 0) return [];

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', companyUsers.map(d => d.user_id));

        if (profilesError) throw profilesError;
        return profiles || [];
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
    enabled: !!user?.id && isOpen
  });

  // Obtener períodos de pago de la empresa para el conductor seleccionado
  const { data: paymentPeriods = [], isLoading: isLoadingPeriods } = useQuery({
    queryKey: ['company-payment-periods-for-driver', formData.user_id, expenseDate],
    queryFn: async () => {
      if (!formData.user_id || !expenseDate) {
        console.log('No driver selected or no expense date');
        return [];
      }

      console.log('Fetching periods for driver:', formData.user_id, 'date:', expenseDate);

      try {
        // Primero obtenemos la empresa del conductor
        console.log('Step 1: Getting user company...');
        const { data: userCompanyRoles, error: companyError } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', formData.user_id)
          .eq('is_active', true)
          .limit(1);

        if (companyError) {
          console.error('Error getting user company:', companyError);
          return [];
        }

        if (!userCompanyRoles || userCompanyRoles.length === 0) {
          console.log('No company found for user');
          return [];
        }

        const companyId = userCompanyRoles[0].company_id;
        console.log('User company found:', companyId);

        // Obtenemos los períodos de usuario para el conductor en la fecha del gasto
        console.log('Step 2: Getting user periods for date...');
        
        // Convertir expenseDate a formato YYYY-MM-DD para la comparación
        const expenseDateStr = expenseDate.toISOString().split('T')[0];
        console.log('Expense date for filtering:', expenseDateStr);
        
        const { data: userPeriods, error: periodsError } = await supabase
          .from('user_payrolls')
          .select(`
            *,
            period:company_payment_periods!company_payment_period_id(
              period_start_date,
              period_end_date,
              period_frequency
            )
          `)
          .eq('company_id', companyId)
          .eq('user_id', formData.user_id)
          .in('status', ['open', 'processing'])
          .order('created_at', { ascending: false});
        
        if (periodsError) {
          console.error('Error fetching user periods:', periodsError);
          return [];
        }
        
        // Filtrar manualmente los períodos que contienen la fecha del gasto
        const filteredPeriods = (userPeriods || []).filter(period => {
          if (!period.period) return false;
          const startDate = period.period.period_start_date;
          const endDate = period.period.period_end_date;
          return expenseDateStr >= startDate && expenseDateStr <= endDate;
        });
        
        console.log('User periods found:', userPeriods?.length || 0, 'Filtered:', filteredPeriods.length);
        
        return filteredPeriods;

        if (periodsError) {
          console.error('Error fetching user periods:', periodsError);
          return [];
        }

        console.log('User periods found:', userPeriods?.length || 0);

        if (!userPeriods || userPeriods.length === 0) {
          console.log('No user periods found for this date');
          return [];
        }

        console.log('Final driver periods:', userPeriods.length);
        return userPeriods;
      } catch (error) {
        console.error('Error in payment periods query:', error);
        return [];
      }
    },
    enabled: !!formData.user_id && !!expenseDate && isOpen
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
      if (!expenseDate) {
        throw new Error('La fecha del gasto es requerida');
      }

      // Verificar que hay un período válido (solo para crear, no para editar)
      if (!editingDeduction && (!paymentPeriods || paymentPeriods.length === 0)) {
        throw new Error('No se encontró un período de pago válido para la fecha seleccionada. Por favor, selecciona una fecha dentro de un período abierto.');
      }

      if (editingDeduction) {
        // Update existing deduction
        const { error } = await supabase
          .from('expense_instances')
          .update({
            user_id: formData.user_id,
            expense_type_id: formData.expense_type_id,
            amount: parseFloat(formData.amount),
            description: formData.description,
            expense_date: formatDateInUserTimeZone(expenseDate),
            applied_to_role: selectedRole
          })
          .eq('id', editingDeduction.id);

        if (error) throw error;
        showSuccess(t("deductions.notifications.success"), t("deductions.period_dialog.success_updated"));
      } else {
        // Create new deduction
        const { error } = await supabase
          .from('expense_instances')
          .insert({
            payment_period_id: paymentPeriods[0]?.company_payment_period_id,
            user_id: formData.user_id,
            expense_type_id: formData.expense_type_id,
            amount: parseFloat(formData.amount),
            description: formData.description,
            expense_date: formatDateInUserTimeZone(expenseDate),
            status: 'planned',
            is_critical: false,
            priority: 5,
            applied_to_role: selectedRole,
            created_by: user?.id
          });

        if (error) throw error;

        // Recalculate user payroll after adding deduction
        const userPayrollId = paymentPeriods[0]?.id;
        if (userPayrollId) {
          const { error: calcError } = await supabase.rpc(
            'calculate_user_payment_period_with_validation',
            { calculation_id: userPayrollId }
          );
          
          if (calcError) {
            console.error('Error recalculating payroll:', calcError);
          }
        }

        showSuccess(t("deductions.notifications.success"), t("deductions.period_dialog.success_created"));
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating eventual deduction:', error);
      showError(t("deductions.notifications.error"), error.message || t("deductions.period_dialog.error_create"));
    } finally {
      setIsLoading(false);
    }
  };

  // Función helper para determinar el tipo de período
  const getPeriodLabel = (period: any) => {
    const today = new Date();
    
    // Crear fechas locales para evitar problemas de zona horaria
    const [startYear, startMonth, startDay] = period.company_payment_periods.period_start_date.split('-').map(Number);
    const [endYear, endMonth, endDay] = period.company_payment_periods.period_end_date.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    // Verificar si es el período actual
    if (isWithinInterval(today, { start: startDate, end: endDate })) {
      return 'actual';
    }
    
    // Verificar si es un período anterior
    if (isBefore(endDate, today)) {
      return 'anterior';
    }
    
    // Verificar si es un período siguiente
    if (isAfter(startDate, today)) {
      return 'siguiente';
    }
    
    return '';
  };

  const isFormValid = 
    formData.user_id &&
    expenseDate &&
    formData.expense_type_id && 
    formData.amount && 
    parseFloat(formData.amount) > 0 &&
    formData.description.trim().length > 0 &&
    (editingDeduction || (!editingDeduction && paymentPeriods.length > 0));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header - Fixed */}
        <div className="flex flex-col space-y-1.5 p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>
            {editingDeduction ? t('deductions.period_dialog.edit_title') : t('deductions.period_dialog.create_title')}
          </DialogTitle>
          <DialogDescription>
            {editingDeduction ? t('deductions.period_dialog.edit_description') : t('deductions.period_dialog.create_description')}
          </DialogDescription>

          {/* ⭐ ADVERTENCIA DE CONDUCTOR PAGADO */}
          {isDriverPaid && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <div>
                  <h4 className="font-semibold">Conductor Ya Pagado</h4>
                  <p className="text-sm mt-1">
                    Este conductor ya ha sido marcado como pagado para el período de pago correspondiente. 
                    No se pueden realizar modificaciones en deducciones para preservar la integridad financiera.
                  </p>
                  {financialValidation?.warning_message && (
                    <p className="text-sm mt-2 font-medium">
                      {financialValidation.warning_message}
                    </p>
                  )}
                </div>  
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <UserTypeSelector
                value={selectedRole}
                onChange={(role) => {
                  setSelectedRole(role);
                  setFormData(prev => ({ ...prev, user_id: '' }));
                }}
                label={t("deductions.template.apply_to")}
              />

              <div className="space-y-2">
                <Label htmlFor="user">{selectedRole === "driver" ? t("deductions.form.driver") : t("deductions.form.dispatcher")}</Label>
                <Popover open={driverComboboxOpen} onOpenChange={setDriverComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={driverComboboxOpen}
                      className="w-full justify-between"
                    >
                      {formData.user_id
                        ? users.find((user) => user.user_id === formData.user_id)?.first_name + " " + users.find((user) => user.user_id === formData.user_id)?.last_name
                        : `${selectedRole === "driver" ? t("deductions.form.select_driver") : t("deductions.form.select_dispatcher")}`}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder={selectedRole === "driver" ? t("deductions.form.search_driver") : t("deductions.form.search_dispatcher")} />
                      <CommandEmpty>{selectedRole === "driver" ? t("deductions.form.no_drivers_found") : t("deductions.form.no_dispatchers_found")}</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {users.map((user) => (
                            <CommandItem
                              key={user.user_id}
                              value={`${user.first_name} ${user.last_name}`}
                              onSelect={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  user_id: user.user_id
                                }));
                                setDriverComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.user_id === user.user_id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {user.first_name} {user.last_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{t("deductions.period_dialog.expense_date_required")}</Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expenseDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expenseDate ? formatPrettyDate(expenseDate) : t("deductions.form.select_date")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expenseDate}
                      onSelect={(date) => {
                        if (date) {
                          setExpenseDate(date);
                          setIsDatePickerOpen(false);
                        }
                      }}
                      month={expenseDate}
                      onMonthChange={setExpenseDate}
                      captionLayout="dropdown-buttons"
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                {formData.user_id && expenseDate && isLoadingPeriods && (
                  <div className="p-3 border border-blue-200 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">
                      {t("deductions.period_dialog.checking_period")}
                    </p>
                  </div>
                )}
                
                {formData.user_id && expenseDate && !isLoadingPeriods && paymentPeriods.length === 0 && (
                  <div className="p-3 border border-orange-200 bg-orange-50 rounded-md">
                    <p className="text-sm text-orange-800">
                      {t("deductions.period_dialog.no_period_found", { date: formatPrettyDate(expenseDate) })}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      {t("deductions.period_dialog.select_period_date")}
                    </p>
                  </div>
                )}
                
                {formData.user_id && expenseDate && !isLoadingPeriods && paymentPeriods.length > 0 && (
                  <div className="p-3 border border-green-200 bg-green-50 rounded-md">
                    <p className="text-sm text-green-800">
                      {(() => {
                        const period = paymentPeriods[0]?.period;
                        if (!period) return 'Período no disponible';
                        
                        const startDate = formatDateOnly(period.period_start_date);
                        const endDate = formatDateOnly(period.period_end_date);
                        const frequency = period.period_frequency;
                        const periodStart = new Date(period.period_start_date);
                        
                        let periodLabel = '';
                        
                        if (frequency === 'weekly') {
                          // Calcular número de semana ISO del año
                          const oneJan = new Date(periodStart.getFullYear(), 0, 1);
                          const numberOfDays = Math.floor((periodStart.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
                          const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
                          periodLabel = `Period Week ${weekNumber}/${periodStart.getFullYear()}`;
                        } else if (frequency === 'biweekly') {
                          // Determinar si es primera o segunda quincena
                          const day = periodStart.getDate();
                          const monthName = periodStart.toLocaleDateString('en-US', { month: 'short' });
                          const quinzena = day <= 15 ? 'Q1' : 'Q2';
                          periodLabel = `Period ${monthName} ${quinzena}/${periodStart.getFullYear()}`;
                        } else if (frequency === 'monthly') {
                          // Mostrar nombre del mes
                          const monthName = periodStart.toLocaleDateString('en-US', { month: 'long' });
                          periodLabel = `Period ${monthName}/${periodStart.getFullYear()}`;
                        } else {
                          periodLabel = `Period ${frequency}`;
                        }
                        
                        return `✓ ${periodLabel}: ${startDate} - ${endDate}`;
                      })()}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-type">{t("deductions.form.expense_type")}</Label>
                <Select 
                  value={formData.expense_type_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, expense_type_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("deductions.form.select_expense_type")} />
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

              <div className="space-y-2">
                <Label htmlFor="amount">{t("deductions.form.amount")} <span className="text-red-500">*</span></Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  value={atmInput.displayValue}
                  onChange={atmInput.handleInput}
                  onKeyDown={atmInput.handleKeyDown}
                  onPaste={atmInput.handlePaste}
                  onFocus={atmInput.handleFocus}
                  onClick={atmInput.handleClick}
                  placeholder="$0.00"
                  className="text-right text-lg"
                  autoComplete="off"
                  required
                />
                <div className="text-xs text-muted-foreground text-center">
                  {t("deductions.period_dialog.atm_helper")}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("deductions.period_dialog.description_label")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t("deductions.period_dialog.placeholder")}
                  rows={3}
                  required
                />
              </div>
            </div>

          {/* Actions - Fixed */}
          <div className="flex gap-2 p-4 border-t flex-shrink-0 bg-background">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t("deductions.form.cancel")}
            </Button>
            <Button 
              type="submit" 
              disabled={
                isLoading || 
                !isFormValid ||
                !canModify // ⭐ NUEVO: Deshabilitar si conductor pagado
              }
              title={protectionTooltip || undefined} // ⭐ NUEVO: Tooltip explicativo
              className="flex-1"
            >
              {isLoading 
                ? (editingDeduction ? t("deductions.period_dialog.updating") : t("deductions.period_dialog.creating")) 
                : (editingDeduction ? t("deductions.period_dialog.update_button") : t("deductions.period_dialog.create_button"))
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}