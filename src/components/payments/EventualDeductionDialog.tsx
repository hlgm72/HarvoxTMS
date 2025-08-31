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

        // Obtenemos los períodos que contienen la fecha del gasto
        console.log('Step 2: Getting company periods for date...');
        const { data: companyPeriods, error: periodsError } = await supabase
          .from('company_payment_periods')
          .select('*')
          .eq('company_id', companyId)
          .lte('period_start_date', formatDateInUserTimeZone(expenseDate))
          .gte('period_end_date', formatDateInUserTimeZone(expenseDate))
          .in('status', ['open', 'processing'])
          .order('period_start_date', { ascending: false });

        if (periodsError) {
          console.error('Error fetching company periods:', periodsError);
          return [];
        }

        console.log('Company periods found:', companyPeriods?.length || 0);

        if (!companyPeriods || companyPeriods.length === 0) {
          console.log('No company periods found for this date');
          return [];
        }

        // Para cada período de empresa, verificamos/creamos el driver_period_calculation
        console.log('Step 3: Processing driver calculations...');
        const driverPeriods = [];
        
        for (const companyPeriod of companyPeriods) {
          console.log('Processing period:', companyPeriod.id);
          
          // Verificar si existe el driver_period_calculation
          let { data: driverCalc, error: calcError } = await supabase
            .from('driver_period_calculations')
            .select('id')
            .eq('company_payment_period_id', companyPeriod.id)
            .eq('driver_user_id', formData.user_id)
            .maybeSingle();

          if (calcError && calcError.code !== 'PGRST116') {
            console.error('Error checking driver calculation:', calcError);
            continue;
          }

          console.log('Existing driver calc:', driverCalc?.id || 'none');

          // Si no existe, lo creamos
          if (!driverCalc) {
            console.log('Creating new driver calculation...');
            const { data: newCalc, error: createError } = await supabase
              .from('driver_period_calculations')
              .insert({
                company_payment_period_id: companyPeriod.id,
                driver_user_id: formData.user_id,
                gross_earnings: 0,
                total_deductions: 0,
                other_income: 0,
                has_negative_balance: false
              })
              .select('id')
              .single();

            if (createError) {
              console.error('Error creating driver calculation:', createError);
              continue;
            }
            console.log('Created new driver calc:', newCalc?.id);
            driverCalc = newCalc;
          }

          driverPeriods.push({
            id: driverCalc.id,
            company_payment_period_id: companyPeriod.id,
            company_payment_periods: companyPeriod
          });
        }

        console.log('Final driver periods:', driverPeriods.length);
        return driverPeriods;
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
        showSuccess(t("deductions.notifications.success"), t("deductions.eventual.success_updated"));
      } else {
        // Create new deduction
        const { error } = await supabase
          .from('expense_instances')
          .insert({
            payment_period_id: paymentPeriods[0]?.id,
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
        showSuccess(t("deductions.notifications.success"), t("deductions.eventual.success_created"));
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating eventual deduction:', error);
      showError(t("deductions.notifications.error"), error.message || t("deductions.eventual.error_create"));
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
    (editingDeduction || paymentPeriods.length > 0) &&
    formData.expense_type_id && 
    formData.amount && 
    parseFloat(formData.amount) > 0 &&
    formData.description.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>
            {editingDeduction ? t("deductions.eventual.edit_title") : t("deductions.eventual.create_title")}
          </DialogTitle>
          <DialogDescription>
            {editingDeduction 
              ? t("deductions.template.edit_description")
              : t("deductions.eventual.create_description")
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label>{t("deductions.eventual.expense_date_required")}</Label>
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
                <div className="p-4 space-y-4">
                  {/* Selectores de mes y año */}
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={expenseDate ? formatMonthName(expenseDate) : ""}
                      onValueChange={(monthName) => {
                        const monthIndex = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                                          .indexOf(monthName.toLowerCase());
                        if (monthIndex !== -1) {
                          const currentYear = expenseDate?.getFullYear() || new Date().getFullYear();
                          const currentDay = expenseDate?.getDate() || 1;
                          setExpenseDate(new Date(currentYear, monthIndex, currentDay));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("deductions.eventual.month")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enero">{t("deductions.months.january")}</SelectItem>
                        <SelectItem value="febrero">{t("deductions.months.february")}</SelectItem>
                        <SelectItem value="marzo">{t("deductions.months.march")}</SelectItem>
                        <SelectItem value="abril">{t("deductions.months.april")}</SelectItem>
                        <SelectItem value="mayo">{t("deductions.months.may")}</SelectItem>
                        <SelectItem value="junio">{t("deductions.months.june")}</SelectItem>
                        <SelectItem value="julio">{t("deductions.months.july")}</SelectItem>
                        <SelectItem value="agosto">{t("deductions.months.august")}</SelectItem>
                        <SelectItem value="septiembre">{t("deductions.months.september")}</SelectItem>
                        <SelectItem value="octubre">{t("deductions.months.october")}</SelectItem>
                        <SelectItem value="noviembre">{t("deductions.months.november")}</SelectItem>
                        <SelectItem value="diciembre">{t("deductions.months.december")}</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={expenseDate?.getFullYear()?.toString() || ""}
                      onValueChange={(year) => {
                        const currentMonth = expenseDate?.getMonth() || 0;
                        const currentDay = expenseDate?.getDate() || 1;
                        setExpenseDate(new Date(parseInt(year), currentMonth, currentDay));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("deductions.placeholders.year")} />
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
                    selected={expenseDate}
                    onSelect={(date) => {
                      if (date) {
                        setExpenseDate(date);
                        setIsDatePickerOpen(false);
                      }
                    }}
                    month={expenseDate}
                    onMonthChange={setExpenseDate}
                    className="p-0 pointer-events-auto"
                  />
                </div>
              </PopoverContent>
            </Popover>
            
            {formData.user_id && expenseDate && isLoadingPeriods && (
              <div className="p-3 border border-blue-200 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  {t("deductions.eventual.checking_period")}
                </p>
              </div>
            )}
            
            {formData.user_id && expenseDate && !isLoadingPeriods && paymentPeriods.length === 0 && (
              <div className="p-3 border border-orange-200 bg-orange-50 rounded-md">
                <p className="text-sm text-orange-800">
                  {t("deductions.eventual.no_period_found", { date: formatPrettyDate(expenseDate) })}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {t("deductions.eventual.select_period_date")}
                </p>
              </div>
            )}
            
            {formData.user_id && expenseDate && !isLoadingPeriods && paymentPeriods.length > 0 && (
              <div className="p-3 border border-green-200 bg-green-50 rounded-md">
                <p className="text-sm text-green-800">
                  {(() => {
                    const startDate = formatDateOnly(paymentPeriods[0].company_payment_periods.period_start_date);
                    const endDate = formatDateOnly(paymentPeriods[0].company_payment_periods.period_end_date);
                    const frequency = paymentPeriods[0].company_payment_periods.period_frequency;
                    
                    // Traducir el tipo de período usando las claves existentes
                    const periodType = frequency === 'weekly' ? t('other_income.frequency.weekly') :
                                     frequency === 'biweekly' ? t('other_income.frequency.biweekly') :
                                     frequency === 'monthly' ? t('other_income.frequency.monthly') :
                                     frequency;
                    
                    return `✓ ${periodType} period found: ${startDate} - ${endDate}`;
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
              {t("deductions.eventual.atm_helper")}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("deductions.eventual.description_label")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t("deductions.eventual.placeholder")}
              rows={3}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t("deductions.form.cancel")}
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !isFormValid} 
              className="flex-1"
            >
              {isLoading 
                ? (editingDeduction ? t("deductions.eventual.updating") : t("deductions.eventual.creating")) 
                : (editingDeduction ? t("deductions.eventual.update_button") : t("deductions.eventual.create_button"))
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}