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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, AlertTriangle, Check, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { formatPrettyDate, formatMonthName } from '@/lib/dateFormatting';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";
import { useFleetNotifications } from "@/components/notifications";
import { useATMInput } from "@/hooks/useATMInput";
import { UserTypeSelector } from "@/components/ui/UserTypeSelector";
import { useExpenseTemplateACID } from "@/hooks/useExpenseTemplateACID";

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
  const { t } = useTranslation('payments');
  const { showSuccess, showError } = useFleetNotifications();
  const expenseTemplateMutation = useExpenseTemplateACID();
  const [isLoading, setIsLoading] = useState(false);
  const [inactiveTemplate, setInactiveTemplate] = useState<any>(null);
  const [driverSearchOpen, setDriverSearchOpen] = useState(false);
  const [driverSearchValue, setDriverSearchValue] = useState("");
  const [isFromDatePickerOpen, setIsFromDatePickerOpen] = useState(false);
  const [isUntilDatePickerOpen, setIsUntilDatePickerOpen] = useState(false);
  
  const [selectedRole, setSelectedRole] = useState<"driver" | "dispatcher">(
    mode === 'edit' ? (template?.applied_to_role || 'driver') : 'driver'
  );
  
  const [formData, setFormData] = useState({
    driver_user_id: mode === 'edit' ? template?.user_id : '',
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
      setSelectedRole('driver');
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
      atmInput.setValue(0);
    } else if (mode === 'edit' && template) {
      setSelectedRole(template.applied_to_role || 'driver');
      setFormData({
        driver_user_id: template.user_id,
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

  // Reset form when modal opens/closes in create mode
  useEffect(() => {
    if (!isOpen && mode === 'create') {
      // Reset all fields when modal closes in create mode
      setSelectedRole('driver');
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
      setDriverSearchValue('');
      atmInput.setValue(0);
    }
  }, [isOpen, mode]);

  // Reset selected user when role changes in create mode
  useEffect(() => {
    if (mode === 'create') {
      setFormData(prev => ({ ...prev, driver_user_id: '' }));
    }
  }, [selectedRole, mode]);

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
      atmInput.setValue(template.amount); // El hook useATMInput ya maneja la conversión a centavos
    }
  }, [template?.amount, mode]);

  // Obtener usuarios de la compañía según el rol seleccionado
  const { data: users = [] } = useQuery({
    queryKey: ['company-users', selectedRole],
    queryFn: async () => {
      try {
        // Obtenemos usuarios de user_company_roles según el rol seleccionado
        const { data: companyUsers, error: usersError } = await supabase
          .from('user_company_roles')
          .select('user_id')
          .eq('role', selectedRole)
          .eq('is_active', true);

        if (usersError) {
          console.error('Error fetching company users:', usersError);
          return [];
        }

        if (!companyUsers || companyUsers.length === 0) return [];

        // Luego obtenemos los perfiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', companyUsers.map(d => d.user_id));

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return [];
        }

        return profiles || [];
      } catch (error) {
        console.error('Error in users query:', error);
        return [];
      }
    },
    enabled: !!user?.id && isOpen
  });

  // Filtrar usuarios para búsqueda
  const filteredUsers = useMemo(() => {
    if (!driverSearchValue) return users;
    
    return users.filter(user => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      return fullName.includes(driverSearchValue.toLowerCase());
    });
  }, [users, driverSearchValue]);

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
      // Primero obtener la plantilla inactiva
      const { data: templates, error } = await supabase
        .from('expense_recurring_templates')
        .select(`
          *,
          expense_types(name)
        `)
        .eq('user_id', formData.driver_user_id)
        .eq('expense_type_id', formData.expenseTypeId)
        .eq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (templates && templates.length > 0) {
        // Obtener el perfil del usuario por separado
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', formData.driver_user_id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }

        // Combinar los datos
        const templateWithProfile = {
          ...templates[0],
          driver_profile: profile
        };

        setInactiveTemplate(templateWithProfile);
      } else {
        setInactiveTemplate(null);
      }
    } catch (error) {
      console.error('Error checking inactive templates:', error);
    }
  };

  const handleReactivateTemplate = async () => {
    if (!inactiveTemplate) return;

    setIsLoading(true);
    try {
      // Usar el hook ACID para reactivar
      await expenseTemplateMutation.mutateAsync({
        templateData: {
          user_id: inactiveTemplate.user_id,
          expense_type_id: inactiveTemplate.expense_type_id,
          amount: inactiveTemplate.amount,
          frequency: inactiveTemplate.frequency,
          start_date: inactiveTemplate.start_date,
          end_date: inactiveTemplate.end_date,
          month_week: inactiveTemplate.month_week,
          notes: inactiveTemplate.notes,
          applied_to_role: inactiveTemplate.applied_to_role,
          is_active: true
        },
        templateId: inactiveTemplate.id
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error reactivating template:', error);
      // El hook ya muestra el error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const templateData = {
        user_id: formData.driver_user_id,
        expense_type_id: formData.expenseTypeId,
        amount: parseFloat(formData.amount),
        frequency: formData.frequency,
        month_week: formData.frequency === 'monthly' ? formData.month_week : null,
        start_date: effectiveFrom ? `${effectiveFrom.getFullYear()}-${String(effectiveFrom.getMonth() + 1).padStart(2, '0')}-${String(effectiveFrom.getDate()).padStart(2, '0')}` : null,
        end_date: effectiveUntil ? `${effectiveUntil.getFullYear()}-${String(effectiveUntil.getMonth() + 1).padStart(2, '0')}-${String(effectiveUntil.getDate()).padStart(2, '0')}` : null,
        notes: formData.notes || null,
        applied_to_role: selectedRole,
        is_active: true
      };

      // Usar el hook ACID en lugar de operaciones directas
      await expenseTemplateMutation.mutateAsync({
        templateData,
        templateId: mode === 'edit' ? template.id : undefined
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} expense template:`, error);
      // El hook ya muestra el error
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header - Fixed */}
        <div className="flex flex-col space-y-1.5 p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>
            {mode === 'create' ? t("deductions.template.create_title") : t("deductions.template.edit_title")}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? t("deductions.template.create_description")
              : t("deductions.template.edit_description")
            }
          </DialogDescription>
        </div>

        {inactiveTemplate && mode === 'create' && (
          <Alert className="mx-6 mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t("deductions.form.inactive_template_exists")}
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                <p><strong>{t("deductions.form.driver")}:</strong> {inactiveTemplate.driver_profile?.first_name} {inactiveTemplate.driver_profile?.last_name}</p>
                <p><strong>{t("deductions.form.type_label")}</strong> {inactiveTemplate.expense_types?.name}</p>
                <p><strong>{t("deductions.form.amount_label")}</strong> ${inactiveTemplate.amount}</p>
                <p><strong>{t("deductions.form.frequency_label")}</strong> {inactiveTemplate.frequency === 'weekly' ? t("deductions.form.weekly") : inactiveTemplate.frequency === 'biweekly' ? t("deductions.form.biweekly") : t("deductions.form.monthly")}</p>
              </div>
              <Button 
                onClick={handleReactivateTemplate}
                disabled={isLoading}
                className="mt-2"
                size="sm"
              >
                {t("deductions.form.reactivate_template")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          {mode === 'create' && (
            <UserTypeSelector
              value={selectedRole}
              onChange={setSelectedRole}
              label={t("deductions.template.apply_to")}
              disabled={false}
            />
          )}

          {mode === 'edit' && (
            <>
              <div className="space-y-2">
                <Label>{t("deductions.labels.applied_role")}</Label>
                <Input
                  value={template?.applied_to_role === 'driver' ? t("deductions.form.driver") : template?.applied_to_role === 'dispatcher' ? t("deductions.form.dispatcher") : t("deductions.form.not_specified")}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("deductions.labels.user")}</Label>
                <Input
                  value={`${template?.user_profile?.first_name || template?.driver_profile?.first_name || ''} ${template?.user_profile?.last_name || template?.driver_profile?.last_name || ''}`}
                  disabled
                  className="bg-muted"
                />
              </div>
            </>
          )}

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="user">{selectedRole === 'driver' ? t("deductions.form.driver") : t("deductions.form.dispatcher")}</Label>
              <Popover open={driverSearchOpen} onOpenChange={setDriverSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={driverSearchOpen}
                    className="w-full justify-between"
                  >
                     {formData.driver_user_id 
                       ? users.find(user => user.user_id === formData.driver_user_id)?.first_name + ' ' + 
                         users.find(user => user.user_id === formData.driver_user_id)?.last_name
                       : `${selectedRole === 'driver' ? t("deductions.form.select_driver") : t("deductions.form.select_dispatcher")}`}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                   <Command>
                     <CommandInput 
                       placeholder={selectedRole === 'driver' ? t("deductions.form.search_driver") : t("deductions.form.search_dispatcher")}
                       value={driverSearchValue}
                       onValueChange={setDriverSearchValue}
                     />
                     <CommandList>
                       <CommandEmpty>{selectedRole === 'driver' ? t("deductions.form.no_drivers_found") : t("deductions.form.no_dispatchers_found")}</CommandEmpty>
                       <CommandGroup>
                         {filteredUsers && filteredUsers.map((user) => (
                           <CommandItem
                             key={user.user_id}
                             value={`${user.first_name} ${user.last_name}`}
                             onSelect={() => {
                               setFormData(prev => ({ ...prev, driver_user_id: user.user_id }));
                               setDriverSearchOpen(false);
                               setDriverSearchValue("");
                             }}
                           >
                             <Check
                               className={cn(
                                 "mr-2 h-4 w-4",
                                 formData.driver_user_id === user.user_id ? "opacity-100" : "opacity-0"
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
          )}

          {mode === 'edit' ? (
            <div className="space-y-2">
              <Label>{t("deductions.form.expense_type")}</Label>
              <Input
                value={template?.expense_types?.name || 'Tipo no definido'}
                disabled
                className="bg-muted"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="expense-type">{t("deductions.form.expense_type")}</Label>
              <Select 
                value={formData.expenseTypeId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, expenseTypeId: value }))}
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
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t("deductions.form.amount")}</Label>
              <Input
                id="amount"
                type="text"
                value={atmInput.displayValue}
                onChange={() => {}} // Dummy onChange to satisfy React warning
                onKeyDown={atmInput.handleKeyDown}
                onInput={atmInput.handleInput}
                onPaste={atmInput.handlePaste}
                onFocus={atmInput.handleFocus}
                onClick={atmInput.handleClick}
                placeholder="$0.00"
                className="text-right"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">{t("deductions.form.frequency")}</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("deductions.form.select_frequency")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t("deductions.form.weekly")}</SelectItem>
                  <SelectItem value="biweekly">{t("deductions.form.biweekly")}</SelectItem>
                  <SelectItem value="monthly">{t("deductions.form.monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.frequency === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="month-week">{t("deductions.form.month_week")}</Label>
              <Select
                value={formData.month_week.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, month_week: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("deductions.form.select_week")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("deductions.form.first_week")}</SelectItem>
                  <SelectItem value="2">{t("deductions.form.second_week")}</SelectItem>
                  <SelectItem value="3">{t("deductions.form.third_week")}</SelectItem>
                  <SelectItem value="4">{t("deductions.form.fourth_week")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("deductions.labels.effective_from")}</Label>
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
                    {effectiveFrom ? formatPrettyDate(effectiveFrom) : t("deductions.form.select_date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={effectiveFrom}
                    onSelect={(date) => {
                      if (date) {
                        setEffectiveFrom(date);
                        setIsFromDatePickerOpen(false);
                      }
                    }}
                    disabled={(date) => {
                      // Deshabilitar fechas posteriores a "Vigente Hasta" si está seleccionada
                      if (effectiveUntil) {
                        return date > effectiveUntil;
                      }
                      return false;
                    }}
                    defaultMonth={effectiveFrom}
                    className="p-3 pointer-events-auto"
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("deductions.labels.effective_until")} (Opcional)</Label>
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
                    {effectiveUntil ? formatPrettyDate(effectiveUntil) : t("deductions.form.indefinite")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={effectiveUntil}
                    onSelect={(date) => {
                      if (date) {
                        setEffectiveUntil(date);
                        setIsUntilDatePickerOpen(false);
                      }
                    }}
                    disabled={(date) => {
                      // Deshabilitar fechas anteriores a "Vigente Desde"
                      return date < effectiveFrom;
                    }}
                    defaultMonth={effectiveUntil}
                    className="p-3 pointer-events-auto"
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("deductions.form.notes_optional")}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t("deductions.template.placeholder")}
              rows={3}
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
              disabled={isLoading || !isFormValid} 
              className="flex-1"
            >
              {isLoading 
                ? `${mode === 'create' ? t("deductions.form.creating") : t("deductions.form.updating")}...` 
                : `${mode === 'create' ? t("deductions.form.create") : t("deductions.form.update")} ${t("deductions.form.deduction")}`
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}