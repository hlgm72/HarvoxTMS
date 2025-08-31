import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateInUserTimeZone, formatDateSafe, formatMonthName, formatDateAuto } from '@/lib/dateFormatting';
import { cn } from '@/lib/utils';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { useCompanyDrivers } from '@/hooks/useCompanyDrivers';
import { useCompanyPaymentPeriods } from '@/hooks/useCompanyPaymentPeriods';
import { useEquipment } from '@/hooks/useEquipment';
import { useDriverEquipment } from '@/hooks/useDriverEquipment';
import { useFuelExpenseACID } from '@/hooks/useFuelExpenseACID';
import { useFuelExpense } from '@/hooks/useFuelExpenses';
import { useDriverCards } from '@/hooks/useDriverCards';
import { formatPrettyDate } from '@/lib/dateFormatting';
import { StateCombobox } from '@/components/ui/StateCombobox';
import { useStates } from '@/hooks/useStates';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useATMInput } from '@/hooks/useATMInput';
import { usePaymentPeriodGenerator } from '@/hooks/usePaymentPeriodGenerator';

const formSchema = z.object({
  driver_user_id: z.string().min(1, 'Selecciona un conductor'),
  payment_period_id: z.string().optional(), // Opcional para creación (se genera automáticamente), requerido para edición
  transaction_date: z.date({
    required_error: 'La fecha es requerida',
  }),
  fuel_type: z.string().min(1, 'Selecciona el tipo de combustible'),
  gallons_purchased: z.coerce.number().positive('Los galones deben ser positivos'),
  price_per_gallon: z.coerce.number().positive('El precio por galón debe ser positivo'),
  total_amount: z.coerce.number().positive('El monto total debe ser positivo'),
  vehicle_id: z.string().optional(),
  
  // Información de la estación
  station_name: z.string().optional(),
  station_city: z.string().optional(),
  station_state: z.string().optional(),
  
  // Información de pago/tarjeta
  driver_card_id: z.string().optional(),
  card_last_five: z.string().optional(),
  invoice_number: z.string().optional(),
  
  // Desglose de costos (opcional)
  gross_amount: z.coerce.number().optional(),
  discount_amount: z.coerce.number().optional(),
  fees: z.coerce.number().optional(),
  
  receipt_url: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FuelExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId?: string | null; // Si se proporciona, es modo edición
}

export function FuelExpenseDialog({ 
  open, 
  onOpenChange, 
  expenseId = null 
}: FuelExpenseDialogProps) {
  const { t } = useTranslation(['fuel', 'common']);
  const { userCompany } = useCompanyCache();
  const { drivers } = useCompanyDrivers();
  const { data: paymentPeriods = [], refetch: refetchPaymentPeriods } = useCompanyPaymentPeriods(userCompany?.company_id);
  const { equipment } = useEquipment();
  const { mutate: mutateFuelExpense, isPending } = useFuelExpenseACID();
  const { data: expense } = useFuelExpense(expenseId || '');
  const { states } = useStates();
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();

  const isEditMode = !!expenseId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      driver_user_id: '',
      payment_period_id: '',
      transaction_date: new Date(),
      fuel_type: 'diesel',
      gallons_purchased: 0,
      price_per_gallon: 0,
      total_amount: 0,
      vehicle_id: '',
      station_name: '',
      station_city: '',
      station_state: '',
      driver_card_id: '',
      card_last_five: '',
      invoice_number: '',
      gross_amount: 0,
      discount_amount: 0,
      fees: 0,
      receipt_url: '',
      notes: '',
    },
  });

  // Populate form with expense data for edit mode
  React.useEffect(() => {
    if (isEditMode && expense) {
      form.reset({
        driver_user_id: expense.driver_user_id,
        payment_period_id: expense.payment_period_id,
        transaction_date: new Date(expense.transaction_date),
        fuel_type: expense.fuel_type,
        gallons_purchased: expense.gallons_purchased,
        price_per_gallon: expense.price_per_gallon,
        total_amount: expense.total_amount,
        station_name: expense.station_name || '',
        station_city: expense.station_city || '',
        station_state: expense.station_state || '',
        vehicle_id: expense.vehicle_id || '',
        driver_card_id: '',
        card_last_five: '',
        invoice_number: '',
        gross_amount: 0,
        discount_amount: 0,
        fees: 0,
        receipt_url: expense.receipt_url || '',
        notes: expense.notes || '',
      });
    } else if (!isEditMode) {
      // Reset to default values for create mode
      form.reset({
        driver_user_id: '',
        payment_period_id: '',
        transaction_date: new Date(),
        fuel_type: 'diesel',
        gallons_purchased: 0,
        price_per_gallon: 0,
        total_amount: 0,
        vehicle_id: '',
        station_name: '',
        station_city: '',
        station_state: '',
        driver_card_id: '',
        card_last_five: '',
        invoice_number: '',
        gross_amount: 0,
        discount_amount: 0,
        fees: 0,
        receipt_url: '',
        notes: '',
      });
    }
  }, [expense, form, isEditMode]);

  // ATM formatters for monetary fields
  const grossAmountATM = useATMInput({
    initialValue: form.watch('gross_amount') || 0,
    onValueChange: (value) => form.setValue('gross_amount', value)
  });

  const discountAmountATM = useATMInput({
    initialValue: form.watch('discount_amount') || 0,
    onValueChange: (value) => form.setValue('discount_amount', value)
  });

  const feesATM = useATMInput({
    initialValue: form.watch('fees') || 0,
    onValueChange: (value) => form.setValue('fees', value)
  });

  const totalAmountATM = useATMInput({
    initialValue: form.watch('total_amount') || 0,
    onValueChange: (value) => form.setValue('total_amount', value)
  });

  // Get available cards for selected driver
  const selectedDriverId = form.watch('driver_user_id');
  const { data: driverCards = [] } = useDriverCards(selectedDriverId || '');

  // Get equipment assigned to selected driver
  const { data: driverEquipment = [] } = useDriverEquipment(selectedDriverId || '');

  // Función para calcular las fechas del período basado en la fecha de transacción
  const calculatePeriodDates = (transactionDate: Date, company: any) => {
    if (!company || !transactionDate) return null;

    const frequency = company.default_payment_frequency || 'weekly';
    let periodStart: Date;
    let periodEnd: Date;

    if (frequency === 'weekly') {
      // Calcular inicio de semana (lunes)
      const dayOfWeek = transactionDate.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart = new Date(transactionDate);
      periodStart.setDate(transactionDate.getDate() - daysFromMonday);
      
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 6);
    } else if (frequency === 'biweekly') {
      // Lógica para bisemanal basada en payment_cycle_start_day
      const cycleStartDay = company.payment_cycle_start_day || 1;
      const yearStart = new Date(transactionDate.getFullYear(), 0, cycleStartDay);
      const daysDiff = Math.floor((transactionDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
      const periodNumber = Math.floor(daysDiff / 14);
      
      periodStart = new Date(yearStart);
      periodStart.setDate(yearStart.getDate() + (periodNumber * 14));
      
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 13);
    } else {
      // Monthly
      periodStart = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);
      periodEnd = new Date(transactionDate.getFullYear(), transactionDate.getMonth() + 1, 0);
    }
    
    return {
      start: formatDateInUserTimeZone(periodStart),
      end: formatDateInUserTimeZone(periodEnd)
    };
  };

  const onSubmit = async (data: FormData) => {
    if (isEditMode) {
      // Edit mode
      if (!expenseId) return;

      mutateFuelExpense({
        expenseData: {
          driver_user_id: data.driver_user_id,
          payment_period_id: data.payment_period_id!,
          transaction_date: data.transaction_date.toISOString(),
          fuel_type: data.fuel_type,
          gallons_purchased: data.gallons_purchased,
          price_per_gallon: data.price_per_gallon,
          total_amount: data.total_amount,
          station_name: data.station_name,
          station_city: data.station_city,
          station_state: data.station_state,
          receipt_url: data.receipt_url,
          notes: data.notes,
        },
        expenseId: expenseId
      });
    } else {
      // Create mode - use the existing create logic with period generation
      if (!data.payment_period_id && userCompany?.company_id) {
        try {
          const transactionDateStr = formatDateInUserTimeZone(data.transaction_date);
          
          console.log('🔍 FuelExpenseDialog - Ensuring payment period exists for:', {
            company: userCompany.company_id,
            date: transactionDateStr,
            driver: data.driver_user_id
          });

          const generatedPeriodId = await ensurePaymentPeriodExists({
            companyId: userCompany.company_id,
            userId: data.driver_user_id,
            targetDate: transactionDateStr
          });

          if (generatedPeriodId) {
            data.payment_period_id = generatedPeriodId;
            console.log('✅ Period ensured:', generatedPeriodId);
          } else {
            console.error('❌ Could not ensure payment period exists');
            return;
          }
        } catch (error) {
          console.error('❌ Error ensuring payment period:', error);
          return;
        }
      }

      mutateFuelExpense({
        expenseData: {
          driver_user_id: data.driver_user_id,
          payment_period_id: data.payment_period_id!,
          transaction_date: data.transaction_date.toISOString(),
          fuel_type: data.fuel_type,
          gallons_purchased: data.gallons_purchased,
          price_per_gallon: data.price_per_gallon,
          total_amount: data.total_amount,
          station_name: data.station_name,
          station_city: data.station_city,
          station_state: data.station_state,
          card_last_five: data.card_last_five,
          invoice_number: data.invoice_number,
          gross_amount: data.gross_amount,
          discount_amount: data.discount_amount,
          fees: data.fees,
          receipt_url: data.receipt_url,
          notes: data.notes,
        }
      });
    }

    // Reset form and close dialog
    if (!isEditMode) {
      form.reset();
    }
    onOpenChange(false);
  };

  const gallons = form.watch('gallons_purchased');
  const pricePerGallon = form.watch('price_per_gallon');
  const grossAmount = form.watch('gross_amount');
  const discountAmount = form.watch('discount_amount');
  const fees = form.watch('fees');
  const transactionDate = form.watch('transaction_date');

  // Auto-calculate gross amount (gallons * price) - only for create mode
  React.useEffect(() => {
    if (!isEditMode && gallons && pricePerGallon) {
      const gross = gallons * pricePerGallon;
      const roundedGross = Number(gross.toFixed(2));
      form.setValue('gross_amount', roundedGross);
      grossAmountATM.setValue(roundedGross);
    }
  }, [gallons, pricePerGallon, isEditMode]);

  // Auto-calculate total amount (gross - discounts + fees) - only for create mode
  React.useEffect(() => {
    if (!isEditMode && grossAmount !== undefined && !isNaN(grossAmount)) {
      const discount = Number(discountAmount) || 0;
      const fee = Number(fees) || 0;
      const total = Number(grossAmount) - discount + fee;
      if (!isNaN(total) && typeof total === 'number') {
        const roundedTotal = Number(total.toFixed(2));
        form.setValue('total_amount', roundedTotal);
        totalAmountATM.setValue(roundedTotal);
      }
    }
  }, [grossAmount, discountAmount, fees, isEditMode]);

  // Auto-calculate total for edit mode (simple calculation)
  React.useEffect(() => {
    if (isEditMode && gallons && pricePerGallon) {
      const total = gallons * pricePerGallon;
      const roundedTotal = Number(total.toFixed(2));
      form.setValue('total_amount', roundedTotal);
    }
  }, [gallons, pricePerGallon, isEditMode]);

  // Auto-select payment period based on transaction date (solo buscar, no crear)
  const [predictedPeriod, setPredictedPeriod] = React.useState<{start: string, end: string} | null>(null);
  
  React.useEffect(() => {
    if (!isEditMode && transactionDate && paymentPeriods.length) {
      const transactionDateStr = formatDateInUserTimeZone(transactionDate);
      
      // Solo buscar período existente, no crear automáticamente
      const matchingPeriod = paymentPeriods.find(period => {
        const startDate = period.period_start_date;
        const endDate = period.period_end_date;
        return transactionDateStr >= startDate && transactionDateStr <= endDate;
      });

      if (matchingPeriod) {
        form.setValue('payment_period_id', matchingPeriod.id);
        setPredictedPeriod(null);
      } else {
        // Si no hay período, limpiar la selección y calcular el período que se crearía
        form.setValue('payment_period_id', '');
        
        // Calcular las fechas del período que se generaría
        if (userCompany?.company_id) {
          const periodDates = calculatePeriodDates(transactionDate, userCompany);
          setPredictedPeriod(periodDates);
        }
      }
    }
  }, [transactionDate, paymentPeriods, userCompany, isEditMode]);

  if (isEditMode && !expenseId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t('fuel:edit_dialog.title') : t('fuel:create_dialog.title')}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? t('fuel:edit_dialog.description')
              : t('fuel:create_dialog.description')
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t('fuel:create_dialog.sections.basic_info')}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="driver_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.driver')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fuel:create_dialog.placeholders.select_driver')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.user_id} value={driver.user_id}>
                              {driver.first_name && driver.last_name 
                                ? `${driver.first_name} ${driver.last_name}`
                                : `Usuario ${driver.user_id.slice(0, 8)}`
                              }
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_period_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.payment_period')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fuel:create_dialog.placeholders.select_period')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {paymentPeriods.map((period) => (
                             <SelectItem key={period.id} value={period.id}>
                               {formatDateAuto(period.period_start_date)} - {formatDateAuto(period.period_end_date)}
                             </SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="transaction_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('fuel:create_dialog.fields.transaction_date')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                               {field.value ? (
                                 formatPrettyDate(field.value)
                               ) : (
                                <span>{t('fuel:create_dialog.placeholders.select_date')}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fuel_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.fuel_type')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fuel:create_dialog.placeholders.select_fuel_type')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="diesel">{t('fuel:create_dialog.fuel_types.diesel')}</SelectItem>
                          <SelectItem value="gasoline">{t('fuel:create_dialog.fuel_types.gasoline')}</SelectItem>
                          <SelectItem value="def">{t('fuel:create_dialog.fuel_types.def')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Línea 1: Gallons *, Price/Gallon *, Gross Amount */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="gallons_purchased"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.gallons')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.001" 
                          placeholder={t('fuel:create_dialog.placeholders.gallons')} 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price_per_gallon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.price_per_gallon')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.001" 
                          placeholder={t('fuel:create_dialog.placeholders.price')} 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gross_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.gross_amount')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="$0.00"
                          value={grossAmountATM.displayValue}
                          onInput={grossAmountATM.handleInput}
                          onKeyDown={grossAmountATM.handleKeyDown}
                          onFocus={grossAmountATM.handleFocus}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Línea 2: Discount Amount, Fees, Total Amount */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.discount_amount')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="$0.00"
                          value={discountAmountATM.displayValue}
                          onInput={discountAmountATM.handleInput}
                          onKeyDown={discountAmountATM.handleKeyDown}
                          onFocus={discountAmountATM.handleFocus}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.fees')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="$0.00"
                          value={feesATM.displayValue}
                          onInput={feesATM.handleInput}
                          onKeyDown={feesATM.handleKeyDown}
                          onFocus={feesATM.handleFocus}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="total_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.total_amount')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="$0.00"
                          value={totalAmountATM.displayValue}
                          onInput={totalAmountATM.handleInput}
                          onKeyDown={totalAmountATM.handleKeyDown}
                          onFocus={totalAmountATM.handleFocus}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Información de la Estación */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('fuel:create_dialog.sections.station_info')}</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="station_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.station_name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('fuel:create_dialog.placeholders.station_example')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="station_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.city')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('fuel:create_dialog.placeholders.city_example')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="station_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.state')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fuel:create_dialog.placeholders.select_state')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {states.map((state) => (
                            <SelectItem key={state.id} value={state.id}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="vehicle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fuel:create_dialog.fields.vehicle')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('fuel:create_dialog.placeholders.select_vehicle')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipment.map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.equipment_number} - {eq.make} {eq.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campos adicionales solo para creación */}
            {!isEditMode && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {t('fuel:create_dialog.sections.additional_info')}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="driver_card_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fuel:create_dialog.fields.driver_card')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('fuel:create_dialog.placeholders.select_card')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {driverCards.map((card) => (
                              <SelectItem key={card.id} value={card.id}>
                                {card.card_provider.toUpperCase()} - ****{card.card_number_last_five}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="card_last_five"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fuel:create_dialog.fields.card_last_five')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('fuel:create_dialog.placeholders.card_example')} maxLength={5} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="invoice_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.invoice_number')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('fuel:create_dialog.placeholders.invoice_example')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            )}

            {/* Información Adicional */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('fuel:create_dialog.sections.additional_info')}</h3>
              
              <FormField
                control={form.control}
                name="receipt_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fuel:create_dialog.fields.receipt_url')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('fuel:create_dialog.placeholders.receipt_url')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fuel:create_dialog.fields.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('fuel:create_dialog.placeholders.notes')}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending 
                  ? (isEditMode ? t('fuel:create_dialog.actions.saving') : t('fuel:create_dialog.actions.creating')) 
                  : (isEditMode ? t('fuel:create_dialog.actions.save_changes') : t('fuel:create_dialog.actions.create'))
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}