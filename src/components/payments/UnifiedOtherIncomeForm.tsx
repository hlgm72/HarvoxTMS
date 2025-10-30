import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDateInUserTimeZone, formatPrettyDate, parseDateSafe, formatDateOnly } from '@/lib/dateFormatting';
import { useCreateOtherIncome, useUpdateOtherIncome } from "@/hooks/useOtherIncome";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useConsolidatedDispatchers } from "@/hooks/useConsolidatedDispatchers";
import { useATMInput } from "@/hooks/useATMInput";
import { UserTypeSelector } from "@/components/ui/UserTypeSelector";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPeriodLabel } from '@/utils/periodUtils';

interface UnifiedOtherIncomeFormProps {
  onClose: () => void;
  defaultUserType?: "driver" | "dispatcher";
  showButtons?: boolean;
  onValidationChange?: (isValid: boolean) => void;
  onPeriodStatusChange?: (status: {
    isLoading: boolean;
    isPaid: boolean;
    periodInfo?: {
      period_start_date: string;
      period_end_date: string;
      period_frequency: string;
    };
  }) => void;
  editData?: {
    id: string;
    description: string;
    amount: number;
    income_type: string;
    income_date: string;
    user_id: string;
    applied_to_role: "driver" | "dispatcher";
    reference_number?: string;
  };
}

export function UnifiedOtherIncomeForm({ onClose, defaultUserType = "driver", editData, showButtons = true, onValidationChange, onPeriodStatusChange }: UnifiedOtherIncomeFormProps) {
  const { t } = useTranslation(['payments', 'common']);
  const isEditing = !!editData;
  
  const [description, setDescription] = useState(editData?.description || "");
  const [incomeType, setIncomeType] = useState(editData?.income_type || "");
  const [date, setDate] = useState<Date | undefined>(editData ? parseDateSafe(editData.income_date) : undefined);
  const [userType, setUserType] = useState<"driver" | "dispatcher">(editData?.applied_to_role || defaultUserType);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(editData?.user_id || "");
  const [referenceNumber, setReferenceNumber] = useState(editData?.reference_number || "");
  const [touched, setTouched] = useState({
    incomeType: false,
    amount: false,
    description: false
  });

  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { drivers, loading: driversLoading, error: driversError } = useCompanyDrivers();
  
  const { data: dispatchers = [] } = useConsolidatedDispatchers();
  const createOtherIncome = useCreateOtherIncome();
  const updateOtherIncome = useUpdateOtherIncome();
  const atmInput = useATMInput({
    initialValue: editData?.amount || 0
  });

  // Verificar períodos pagados
  const { data: paymentPeriods = [], isLoading: isLoadingPeriods } = useQuery({
    queryKey: ['user-payment-periods-for-income', selectedUser, date?.toISOString()],
    queryFn: async () => {
      console.log('🔄 Executing query with:', { selectedUser, date, companyId: selectedCompany?.id });
      
      if (!selectedUser || !date || !selectedCompany?.id) {
        console.log('⚠️ Query skipped - missing required data');
        return [];
      }

      try {
        const incomeDateStr = formatDateInUserTimeZone(date);
        console.log('📅 Formatted date:', incomeDateStr);
        
        const { data: allPeriods, error: periodsError } = await supabase
          .from('user_payrolls')
          .select(`
            *,
            period:company_payment_periods!company_payment_period_id(
              period_start_date,
              period_end_date,
              period_frequency
            )
          `)
          .eq('company_id', selectedCompany.id)
          .eq('user_id', selectedUser)
          .order('created_at', { ascending: false });
        
        console.log('📊 Query result:', { allPeriods, error: periodsError });
        
        if (periodsError) {
          console.error('Error fetching user periods:', periodsError);
          return [];
        }

        // Filtrar períodos que contienen la fecha del ingreso
        const periodsForDate = allPeriods?.filter(period => {
          if (!period.period) return false;
          const startDate = period.period.period_start_date;
          const endDate = period.period.period_end_date;
          return incomeDateStr >= startDate && incomeDateStr <= endDate;
        }) || [];

        console.log('🎯 Periods for date:', periodsForDate);

        // Retornar solo períodos pagados para mostrar advertencia
        const paidPeriods = periodsForDate.filter(p => p.payment_status === 'paid');
        console.log('💰 Paid periods:', paidPeriods);
        return paidPeriods;
      } catch (error) {
        console.error('Error in payment periods query:', error);
        return [];
      }
    },
    enabled: !!selectedUser && !!date && !!selectedCompany?.id
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Marcar todos los campos como tocados al enviar
    setTouched({
      incomeType: true,
      amount: true,
      description: true
    });
    
    if (!selectedUser || !date || !incomeType || atmInput.numericValue <= 0 || !description.trim()) {
      console.error("Required fields not filled:", { 
        selectedUser, 
        date, 
        incomeType, 
        amount: atmInput.numericValue,
        description: description.trim()
      });
      return;
    }

    try {
      if (isEditing && editData) {
        // Para la edición, incluir user_id y applied_to_role si cambiaron
        const updateData = {
          id: editData.id,
          user_id: selectedUser, // ✅ Ahora se permite cambiar el usuario
          applied_to_role: userType, // ✅ Ahora se permite cambiar el tipo de usuario
          description,
          amount: atmInput.numericValue,
          income_type: incomeType,
          income_date: formatDateInUserTimeZone(date),
          reference_number: referenceNumber || null,
        };
        
        console.log('Updating other income with data:', updateData);
        await updateOtherIncome.mutateAsync(updateData);
      } else {
        await createOtherIncome.mutateAsync({
          user_id: selectedUser,
          description,
          amount: atmInput.numericValue,
          income_type: incomeType,
          income_date: formatDateInUserTimeZone(date),
          reference_number: referenceNumber || undefined,
          applied_to_role: userType,
          status: 'pending'
        });
      }
      onClose();
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} other income:`, error);
    }
  };

  const incomeTypes = [
    { key: "Bonus", label: t('form.income_types.bonus') },
    { key: "Commission", label: t('form.income_types.commission') }, 
    { key: "Overtime", label: t('form.income_types.overtime') },
    { key: "Fuel Bonus", label: t('form.income_types.fuel_bonus') },
    { key: "Safety Bonus", label: t('form.income_types.safety_bonus') },
    { key: "Referral Bonus", label: t('form.income_types.referral_bonus') },
    { key: "Holiday Pay", label: t('form.income_types.holiday_pay') },
    { key: "Other", label: t('form.income_types.other') }
  ];

  const currentUsers = userType === "driver" ? drivers : dispatchers;

  // Verificar si el período está pagado (el query ya filtra solo los pagados)
  const isPeriodPaid = paymentPeriods.length > 0;
  
  console.log('🎯 isPeriodPaid calculated:', isPeriodPaid, 'paymentPeriods:', paymentPeriods);

  // Validación del formulario con useMemo
  const isFormValid = useMemo(() => {
    const valid = Boolean(
      selectedUser && 
      description.trim() && 
      incomeType && 
      atmInput.numericValue > 0 && 
      date &&
      !isPeriodPaid // Bloquear si el período está pagado
    );
    console.log('✅ Form validation:', { valid, isPeriodPaid, selectedUser, hasDescription: !!description.trim(), incomeType, amount: atmInput.numericValue, hasDate: !!date });
    return valid;
  }, [selectedUser, description, incomeType, atmInput.numericValue, date, isPeriodPaid]);

  // Notificar al padre cuando cambie la validación
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isFormValid);
    }
  }, [isFormValid, onValidationChange]);

  // Notificar al padre cuando cambie el estado de período pagado
  useEffect(() => {
    console.log('🔍 Period status changed:', {
      isLoadingPeriods,
      isPeriodPaid,
      paymentPeriodsLength: paymentPeriods.length,
      hasPeriodInfo: !!paymentPeriods[0]?.period
    });
    
    if (onPeriodStatusChange) {
      const status = {
        isLoading: isLoadingPeriods,
        isPaid: isPeriodPaid,
        periodInfo: isPeriodPaid && paymentPeriods[0]?.period ? {
          period_start_date: paymentPeriods[0].period.period_start_date,
          period_end_date: paymentPeriods[0].period.period_end_date,
          period_frequency: paymentPeriods[0].period.period_frequency
        } : undefined
      };
      console.log('📤 Sending period status to parent:', status);
      onPeriodStatusChange(status);
    }
  }, [isLoadingPeriods, isPeriodPaid, paymentPeriods, onPeriodStatusChange]);
  
  const isButtonDisabled = !isFormValid || (isEditing ? updateOtherIncome.isPending : createOtherIncome.isPending);

  return (
    <form id="other-income-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
          <UserTypeSelector
            value={userType}
            onChange={setUserType}
            label={t('form.apply_to')}
          />

          <div className="space-y-2">
            <Label htmlFor="user">
              {userType === "driver" ? t('form.driver') : t('form.dispatcher')}
            </Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder={`${t(userType === "driver" ? 'form.select_driver' : 'form.select_dispatcher')}`} />
              </SelectTrigger>
              <SelectContent>
                {currentUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {userType === "driver" 
                      ? `${user.first_name} ${user.last_name}`.trim()
                      : user.full_name || `${user.first_name} ${user.last_name}`.trim()
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">{t('form.income_date')}</Label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? formatPrettyDate(date) : <span>{t('form.select_date')}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
              <div className="pointer-events-auto">
                <Calendar
                  mode="single"
                  selected={date}
                  defaultMonth={date}
                  onSelect={(newDate) => {
                    setDate(newDate);
                    setIsDatePickerOpen(false);
                  }}
                  disableClear={true}
                  fromYear={2020}
                  toYear={2030}
                  initialFocus
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="income-type">
            {t('form.income_type')} <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={incomeType} 
            onValueChange={(value) => {
              setIncomeType(value);
              setTouched(prev => ({ ...prev, incomeType: true }));
            }}
            required
          >
            <SelectTrigger className={cn(touched.incomeType && !incomeType && "border-destructive")}>
              <SelectValue placeholder={t('form.select_income_type')} />
            </SelectTrigger>
            <SelectContent>
              {incomeTypes.map((type) => (
                <SelectItem key={type.key} value={type.key}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {touched.incomeType && !incomeType && (
            <p className="text-xs text-destructive">{t('form.income_type_required', { defaultValue: 'Income type is required' })}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">
            {t('form.amount')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="amount"
            type="text"
            inputMode="numeric"
            value={atmInput.displayValue}
            onChange={atmInput.handleInput}
            onKeyDown={atmInput.handleKeyDown}
            onPaste={atmInput.handlePaste}
            onFocus={atmInput.handleFocus}
            onBlur={() => setTouched(prev => ({ ...prev, amount: true }))}
            onMouseDown={atmInput.handleMouseDown}
            placeholder="$0.00"
            className={cn("text-right text-lg", touched.amount && atmInput.numericValue <= 0 && "border-destructive")}
            autoComplete="off"
            required
          />
          {touched.amount && atmInput.numericValue <= 0 && (
            <p className="text-xs text-destructive">{t('form.amount_required', { defaultValue: 'Amount must be greater than $0.00' })}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference-number">{t('form.reference_number')}</Label>
          <Input
            id="reference-number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder={t('form.reference_placeholder')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          {t('form.description')} <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
          placeholder={t('form.description_placeholder')}
          rows={2}
          className={cn(touched.description && !description.trim() && "border-destructive")}
        />
        {touched.description && !description.trim() && (
          <p className="text-xs text-destructive">{t('form.description_required', { defaultValue: 'Description is required' })}</p>
        )}
      </div>

      {showButtons && (
        <div className="flex gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            {t('form.cancel')}
          </Button>
          <Button 
            type="submit"
            disabled={isButtonDisabled}
            className="flex-1"
          >
            {(isEditing ? updateOtherIncome.isPending : createOtherIncome.isPending) ? 
             (isEditing ? t('form.updating') : t('form.creating')) : 
             (isEditing ? t('form.update') : t('form.create'))}
          </Button>
        </div>
      )}
    </form>
  );
}