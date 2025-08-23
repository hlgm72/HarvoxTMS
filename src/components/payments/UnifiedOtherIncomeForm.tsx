import { useState } from "react";
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
import { formatDateInUserTimeZone, formatPrettyDate } from '@/lib/dateFormatting';
import { useCreateOtherIncome, useUpdateOtherIncome } from "@/hooks/useOtherIncome";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useCompanyDrivers } from "@/hooks/useCompanyDrivers";
import { useConsolidatedDispatchers } from "@/hooks/useConsolidatedDispatchers";
import { useATMInput } from "@/hooks/useATMInput";
import { UserTypeSelector } from "@/components/ui/UserTypeSelector";
import { useTranslation } from 'react-i18next';

interface UnifiedOtherIncomeFormProps {
  onClose: () => void;
  defaultUserType?: "driver" | "dispatcher";
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

export function UnifiedOtherIncomeForm({ onClose, defaultUserType = "driver", editData }: UnifiedOtherIncomeFormProps) {
  const { t } = useTranslation(['payments', 'common']);
  const isEditing = !!editData;
  
  const [description, setDescription] = useState(editData?.description || "");
  const [incomeType, setIncomeType] = useState(editData?.income_type || "");
  const [date, setDate] = useState<Date | undefined>(editData ? new Date(editData.income_date) : undefined);
  const [userType, setUserType] = useState<"driver" | "dispatcher">(editData?.applied_to_role || defaultUserType);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(editData?.user_id || "");
  const [referenceNumber, setReferenceNumber] = useState(editData?.reference_number || "");

  const { user } = useAuth();
  const { selectedCompany } = useUserCompanies();
  const { drivers, loading: driversLoading, error: driversError } = useCompanyDrivers();
  
  // Debug log para ver el estado de los drivers
  console.log('Drivers data:', { drivers, driversLoading, driversError });
  const { data: dispatchers = [] } = useConsolidatedDispatchers();
  const createOtherIncome = useCreateOtherIncome();
  const updateOtherIncome = useUpdateOtherIncome();
  const atmInput = useATMInput({
    initialValue: editData?.amount || 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !date) {
      console.error("User or date not selected");
      return;
    }

    try {
      if (isEditing && editData) {
        // Para la edición, solo enviamos los campos que pueden ser actualizados
        const updateData = {
          id: editData.id,
          description,
          amount: atmInput.numericValue,
          income_type: incomeType,
           income_date: formatDateInUserTimeZone(date),
          reference_number: referenceNumber || null, // Usar null en lugar de undefined
          // No incluir user_id ni applied_to_role en la actualización ya que pueden causar conflictos RLS
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
    { key: "Bonus", label: t('income.form.income_types.bonus') },
    { key: "Commission", label: t('income.form.income_types.commission') }, 
    { key: "Overtime", label: t('income.form.income_types.overtime') },
    { key: "Fuel Bonus", label: t('income.form.income_types.fuel_bonus') },
    { key: "Safety Bonus", label: t('income.form.income_types.safety_bonus') },
    { key: "Referral Bonus", label: t('income.form.income_types.referral_bonus') },
    { key: "Holiday Pay", label: t('income.form.income_types.holiday_pay') },
    { key: "Other", label: t('income.form.income_types.other') }
  ];

  const currentUsers = userType === "driver" ? drivers : dispatchers;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEditing && (
        <UserTypeSelector
          value={userType}
          onChange={setUserType}
          label={t('income.form.apply_to')}
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="user">
          {userType === "driver" ? t('income.form.driver') : t('income.form.dispatcher')}
        </Label>
        <Select value={selectedUser} onValueChange={setSelectedUser} disabled={isEditing}>
          <SelectTrigger>
            <SelectValue placeholder={`${t(userType === "driver" ? 'income.form.select_driver' : 'income.form.select_dispatcher')}`} />
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

      <div className="space-y-2">
        <Label htmlFor="income-type">{t('income.form.income_type')}</Label>
        <Select value={incomeType} onValueChange={setIncomeType}>
          <SelectTrigger>
            <SelectValue placeholder={t('income.form.select_income_type')} />
          </SelectTrigger>
          <SelectContent>
            {incomeTypes.map((type) => (
              <SelectItem key={type.key} value={type.key}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">{t('income.form.income_date')}</Label>
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
              {date ? formatPrettyDate(date) : <span>{t('income.form.select_date')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(date) => {
                setDate(date);
                setIsDatePickerOpen(false);
              }}
              initialFocus
              showOutsideDays={true}
              className="pointer-events-auto p-3 [&_td]:px-1 [&_button]:mx-0.5"
              captionLayout="dropdown-buttons"
              fromYear={2020}
              toYear={2030}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">{t('income.form.amount')}</Label>
        <Input
          id="amount"
          value={atmInput.displayValue}
          onChange={(e) => atmInput.setValue(parseFloat(e.target.value) || 0)}
          onKeyDown={atmInput.handleKeyDown}
          onPaste={atmInput.handlePaste}
          placeholder={t('income.form.amount_placeholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference-number">{t('income.form.reference_number')}</Label>
        <Input
          id="reference-number"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder={t('income.form.reference_placeholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('income.form.description')}</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('income.form.description_placeholder')}
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('income.form.cancel')}
        </Button>
        <Button 
          type="submit" 
          disabled={(isEditing ? updateOtherIncome.isPending : createOtherIncome.isPending) || 
                   !selectedUser || !description || atmInput.numericValue <= 0 || !date}
        >
          {(isEditing ? updateOtherIncome.isPending : createOtherIncome.isPending) ? 
           (isEditing ? t('income.form.updating') : t('income.form.creating')) : 
           (isEditing ? t('income.form.update') : t('income.form.create'))}
        </Button>
      </div>
    </form>
  );
}