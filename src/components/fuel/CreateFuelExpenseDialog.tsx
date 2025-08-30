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
import { useDriverCards } from '@/hooks/useDriverCards';
import { formatPrettyDate } from '@/lib/dateFormatting';
import { StateCombobox } from '@/components/ui/StateCombobox';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useATMInput } from '@/hooks/useATMInput';
import { usePaymentPeriodGenerator } from '@/hooks/usePaymentPeriodGenerator';

const formSchema = z.object({
  driver_user_id: z.string().min(1, 'Selecciona un conductor'),
  payment_period_id: z.string().optional(), // Ahora es opcional, se genera automáticamente si es necesario
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

interface CreateFuelExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFuelExpenseDialog({ open, onOpenChange }: CreateFuelExpenseDialogProps) {
  const { t } = useTranslation(['fuel', 'common']);
  const { userCompany } = useCompanyCache();
  const { drivers } = useCompanyDrivers();
  const { data: paymentPeriods = [], refetch: refetchPaymentPeriods } = useCompanyPaymentPeriods(userCompany?.company_id);
  const { equipment } = useEquipment();
  const { mutate: createFuelExpense, isPending } = useFuelExpenseACID();
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();

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

  const selectedDriverId = form.watch('driver_user_id');
  const { data: driverCards = [] } = useDriverCards(selectedDriverId);
  const { data: driverEquipment = [] } = useDriverEquipment(selectedDriverId);

  // ATM Input hooks para campos monetarios con sincronización manual
  const pricePerGallonATM = useATMInput({
    initialValue: 0,
    onValueChange: (value) => form.setValue('price_per_gallon', value)
  });

  const discountAmountATM = useATMInput({
    initialValue: 0,
    onValueChange: (value) => form.setValue('discount_amount', value)
  });

  const feesATM = useATMInput({
    initialValue: 0,
    onValueChange: (value) => form.setValue('fees', value)
  });

  const grossAmountATM = useATMInput({
    initialValue: 0
  });

  const totalAmountATM = useATMInput({
    initialValue: 0
  });

  const onSubmit = async (data: FormData) => {
    // ✅ SISTEMA BAJO DEMANDA v2.0: Usar la nueva función optimizada
    if (!data.payment_period_id && userCompany?.company_id) {
      try {
        const transactionDateStr = formatDateInUserTimeZone(data.transaction_date);
        
        console.log('🔍 CreateFuelExpenseDialog - Ensuring payment period exists for:', {
          company: userCompany.company_id,
          date: transactionDateStr,
          driver: data.driver_user_id
        });

        // Usar el nuevo sistema bajo demanda
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

    // Ahora guardar la transacción con el período asignado
    createFuelExpense({
      expenseData: {
        driver_user_id: data.driver_user_id,
        payment_period_id: data.payment_period_id,
        transaction_date: data.transaction_date.toISOString(),
        fuel_type: data.fuel_type,
        gallons_purchased: data.gallons_purchased,
        price_per_gallon: data.price_per_gallon,
        total_amount: data.total_amount,
        station_name: data.station_name,
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

    // Resetear form y cerrar dialog
    form.reset();
    onOpenChange(false);
  };

  const gallons = form.watch('gallons_purchased');
  const pricePerGallon = form.watch('price_per_gallon');
  const grossAmount = form.watch('gross_amount');
  const discountAmount = form.watch('discount_amount');
  const fees = form.watch('fees');
  const transactionDate = form.watch('transaction_date');

  // Auto-calculate gross amount (gallons * price)
  React.useEffect(() => {
    if (gallons && pricePerGallon) {
      const gross = gallons * pricePerGallon;
      const roundedGross = Number(gross.toFixed(2));
      form.setValue('gross_amount', roundedGross);
      grossAmountATM.setValue(roundedGross);
    }
  }, [gallons, pricePerGallon]); // Solo estas dependencias necesarias

  // Auto-calculate total amount (gross - discounts + fees)
  React.useEffect(() => {
    if (grossAmount !== undefined && !isNaN(grossAmount)) {
      const discount = Number(discountAmount) || 0;
      const fee = Number(fees) || 0;
      const total = Number(grossAmount) - discount + fee;
      if (!isNaN(total) && typeof total === 'number') {
        const roundedTotal = Number(total.toFixed(2));
        form.setValue('total_amount', roundedTotal);
        totalAmountATM.setValue(roundedTotal);
      }
    }
  }, [grossAmount, discountAmount, fees]); // Solo estas dependencias necesarias

  // Auto-select payment period based on transaction date (solo buscar, no crear)
  const [predictedPeriod, setPredictedPeriod] = React.useState<{start: string, end: string} | null>(null);
  
  React.useEffect(() => {
    if (!transactionDate || !paymentPeriods.length) return;
    
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
  }, [transactionDate, paymentPeriods, userCompany]);

  // Función para calcular las fechas del período que se crearía
  const calculatePeriodDates = (date: Date, company: any) => {
    const frequency = company.default_payment_frequency || 'weekly';
    const startDay = company.payment_cycle_start_day || 1; // 1 = Monday
    
    let frequencyDays = 7;
    switch (frequency) {
      case 'weekly': frequencyDays = 7; break;
      case 'biweekly': frequencyDays = 14; break;
      case 'monthly': frequencyDays = 30; break;
    }
    
    // Encontrar el lunes de la semana de la fecha seleccionada
    const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, etc.
    let daysToMonday;
    
    if (dayOfWeek === 0) { // Domingo
      daysToMonday = 6; // Retroceder 6 días para llegar al lunes anterior
    } else {
      daysToMonday = dayOfWeek - 1; // Retroceder los días necesarios para llegar al lunes
    }
    
    const periodStart = new Date(date);
    periodStart.setDate(date.getDate() - daysToMonday);
    
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + frequencyDays - 1);
    
    return {
      start: formatDateInUserTimeZone(periodStart),
      end: formatDateInUserTimeZone(periodEnd)
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>{t('fuel:create_dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('fuel:create_dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* SECCIÓN 1: Información Básica */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">{t('fuel:create_dialog.sections.basic_info')}</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="transaction_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('fuel:create_dialog.fields.transaction_date')}</FormLabel>
                      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
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
                          <div className="p-4 space-y-4 bg-white">
                            {/* Selectores de mes y año */}
                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                value={field.value ? formatMonthName(field.value) : ""}
                                onValueChange={(monthName) => {
                                  const monthIndex = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                                                    .indexOf(monthName.toLowerCase());
                                  if (monthIndex !== -1) {
                                    const currentYear = field.value?.getFullYear() || new Date().getFullYear();
                                    const currentDay = field.value?.getDate() || 1;
                                    field.onChange(new Date(currentYear, monthIndex, currentDay));
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('fuel:create_dialog.placeholders.month')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="enero">{t('fuel:create_dialog.months.january')}</SelectItem>
                                  <SelectItem value="febrero">{t('fuel:create_dialog.months.february')}</SelectItem>
                                  <SelectItem value="marzo">{t('fuel:create_dialog.months.march')}</SelectItem>
                                  <SelectItem value="abril">{t('fuel:create_dialog.months.april')}</SelectItem>
                                  <SelectItem value="mayo">{t('fuel:create_dialog.months.may')}</SelectItem>
                                  <SelectItem value="junio">{t('fuel:create_dialog.months.june')}</SelectItem>
                                  <SelectItem value="julio">{t('fuel:create_dialog.months.july')}</SelectItem>
                                  <SelectItem value="agosto">{t('fuel:create_dialog.months.august')}</SelectItem>
                                  <SelectItem value="septiembre">{t('fuel:create_dialog.months.september')}</SelectItem>
                                  <SelectItem value="octubre">{t('fuel:create_dialog.months.october')}</SelectItem>
                                  <SelectItem value="noviembre">{t('fuel:create_dialog.months.november')}</SelectItem>
                                  <SelectItem value="diciembre">{t('fuel:create_dialog.months.december')}</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Select
                                value={field.value?.getFullYear()?.toString() || ""}
                                onValueChange={(year) => {
                                  const currentMonth = field.value?.getMonth() || 0;
                                  const currentDay = field.value?.getDate() || 1;
                                  field.onChange(new Date(parseInt(year), currentMonth, currentDay));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('fuel:create_dialog.placeholders.year')} />
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
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setIsDatePickerOpen(false);
                              }}
                              month={field.value}
                              onMonthChange={field.onChange}
                              className="p-0 pointer-events-auto"
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_period_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('fuel:create_dialog.fields.payment_period')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(
                            predictedPeriod && "border-blue-300 bg-blue-50"
                          )}>
                             <SelectValue 
                               placeholder={
                                 predictedPeriod 
                                   ? t('fuel:create_dialog.period_messages.will_create', { 
                                       start: formatDateAuto(predictedPeriod.start), 
                                       end: formatDateAuto(predictedPeriod.end) 
                                     })
                                   : t('fuel:create_dialog.period_messages.auto_select')
                               } 
                             />
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
                      {predictedPeriod && (
                         <p className="text-xs text-blue-600 mt-1">
                           {t('fuel:create_dialog.period_messages.auto_create_info')}
                         </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                          {drivers.filter(driver => driver.id && driver.id.trim() !== '').map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.first_name} {driver.last_name}
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
                  name="vehicle_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.vehicle')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fuel:create_dialog.placeholders.select_truck')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {driverEquipment.filter(eq => eq.equipment_type === 'truck').map((eq) => (
                            <SelectItem key={eq.id} value={eq.id}>
                              🚛 #{eq.equipment_number} - {eq.make} {eq.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SECCIÓN 2: Detalles del Combustible */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">{t('fuel:create_dialog.sections.fuel_details')}</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fuel_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.fuel_type')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fuel:create_dialog.placeholders.select_type')} />
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

                <FormField
                  control={form.control}
                  name="driver_card_id"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t('fuel:create_dialog.fields.fuel_card')}</FormLabel>
                       <Select 
                         onValueChange={(value) => {
                           field.onChange(value);
                           // Extraer y asignar los últimos 4 dígitos de la tarjeta seleccionada
                           const selectedCard = driverCards.find(card => card.id === value);
                           if (selectedCard) {
                             // Asignar los 5 dígitos completos del card_number_last_five
                             form.setValue('card_last_five', selectedCard.card_number_last_five);
                           }
                         }} 
                         value={field.value}
                       >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fuel:create_dialog.placeholders.select_card')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {driverCards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.card_provider.toUpperCase()} ****{card.card_number_last_five}
                              {card.card_identifier ? ` (${card.card_identifier})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                          placeholder={t('fuel:create_dialog.placeholders.gallons_amount')}
                          {...field}
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
                           className="text-right pr-3"
                           value={pricePerGallonATM.displayValue}
                           onKeyDown={pricePerGallonATM.handleKeyDown}
                           onPaste={pricePerGallonATM.handlePaste}
                           placeholder={t('fuel:create_dialog.placeholders.money_amount')}
                           readOnly
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
                          className="text-right pr-3 bg-muted"
                          value={grossAmountATM.displayValue}
                          placeholder={t('fuel:create_dialog.placeholders.money_amount')}
                          readOnly
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.discounts')}</FormLabel>
                      <FormControl>
                        <Input
                          className="text-right pr-3"
                          value={discountAmountATM.displayValue}
                          onKeyDown={discountAmountATM.handleKeyDown}
                          onPaste={discountAmountATM.handlePaste}
                           placeholder={t('fuel:create_dialog.placeholders.money_amount')}
                          readOnly
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
                           className="text-right pr-3"
                           value={feesATM.displayValue}
                           onKeyDown={feesATM.handleKeyDown}
                           onPaste={feesATM.handlePaste}
                            placeholder={t('fuel:create_dialog.placeholders.money_amount')}
                           readOnly
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
                      <FormLabel>{t('fuel:create_dialog.fields.total')}</FormLabel>
                      <FormControl>
                        <Input
                          className="text-right pr-3 bg-muted"
                          value={totalAmountATM.displayValue}
                          placeholder={t('fuel:create_dialog.placeholders.money_amount')}
                          readOnly
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SECCIÓN 3: Información Adicional */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">{t('fuel:create_dialog.sections.additional_info')}</h4>
              
              <div className="grid grid-cols-3 gap-4">
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
                  name="station_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fuel:create_dialog.fields.state')}</FormLabel>
                      <FormControl>
                        <StateCombobox
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder={t('fuel:create_dialog.placeholders.select_state')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>


            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fuel:create_dialog.fields.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('fuel:create_dialog.placeholders.additional_notes')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('fuel:create_dialog.actions.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t('fuel:create_dialog.actions.saving') : t('fuel:create_dialog.actions.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}