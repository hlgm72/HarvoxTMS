import React from 'react';
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
import { formatDateInUserTimeZone, formatDateSafe } from '@/lib/dateFormatting';
import { cn } from '@/lib/utils';
import { useCreateFuelExpense } from '@/hooks/useFuelExpenses';
import { useCompanyDrivers } from '@/hooks/useCompanyDrivers';
import { useCompanyPaymentPeriods } from '@/hooks/useCompanyPaymentPeriods';
import { useEquipment } from '@/hooks/useEquipment';
import { useDriverEquipment } from '@/hooks/useDriverEquipment';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { useDriverCards } from '@/hooks/useDriverCards';
import { StateCombobox } from '@/components/ui/StateCombobox';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
  card_last_four: z.string().optional(),
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
  const { userCompany } = useCompanyCache();
  const { drivers } = useCompanyDrivers();
  const { data: paymentPeriods = [], refetch: refetchPaymentPeriods } = useCompanyPaymentPeriods(userCompany?.company_id);
  const { equipment } = useEquipment();
  const createMutation = useCreateFuelExpense();
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const queryClient = useQueryClient();

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
      card_last_four: '',
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

  const onSubmit = async (data: FormData) => {
    // Si no hay período seleccionado, generar uno antes de guardar
    if (!data.payment_period_id && userCompany?.company_id) {
      try {
        const transactionDateStr = formatDateInUserTimeZone(data.transaction_date);
        
        // Generar el período específico para esta fecha
        const { data: generatedData, error } = await supabase.rpc('generate_company_payment_periods', {
          company_id_param: userCompany.company_id,
          from_date: transactionDateStr,
          to_date: transactionDateStr
        });

        if (error) {
          console.error('Error generating payment period:', error);
          return;
        }

        if (generatedData && typeof generatedData === 'object' && 'success' in generatedData && generatedData.success) {
          // Refetch para obtener el nuevo período
          const updatedPeriods = await refetchPaymentPeriods();
          
          // Buscar el período que coincida con la fecha
          const newMatchingPeriod = updatedPeriods.data?.find(period => {
            const startDate = period.period_start_date;
            const endDate = period.period_end_date;
            return transactionDateStr >= startDate && transactionDateStr <= endDate;
          });
          
          if (newMatchingPeriod) {
            data.payment_period_id = newMatchingPeriod.id;
          } else {
            console.error('No se pudo crear el período de pago para la fecha');
            return;
          }
        }
      } catch (error) {
        console.error('Error generating payment period:', error);
        return;
      }
    }

    // Ahora guardar la transacción con el período asignado
    createMutation.mutate({
      driver_user_id: data.driver_user_id,
      payment_period_id: data.payment_period_id,
      transaction_date: data.transaction_date.toISOString(),
      fuel_type: data.fuel_type,
      gallons_purchased: data.gallons_purchased,
      price_per_gallon: data.price_per_gallon,
      total_amount: data.total_amount,
      vehicle_id: data.vehicle_id,
      
      // Información de la estación
      station_name: data.station_name,
      station_state: data.station_state,
      
      // Información de pago/tarjeta
      card_last_four: data.card_last_four,
      invoice_number: data.invoice_number,
      
      // Desglose de costos
      gross_amount: data.gross_amount,
      discount_amount: data.discount_amount,
      fees: data.fees,
      
      receipt_url: data.receipt_url,
      notes: data.notes,
    }, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
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
      form.setValue('gross_amount', Number(gross.toFixed(2)));
    }
  }, [gallons, pricePerGallon, form]);

  // Auto-calculate total amount (gross - discounts + fees)
  React.useEffect(() => {
    if (grossAmount !== undefined && !isNaN(grossAmount)) {
      const discount = Number(discountAmount) || 0;
      const fee = Number(fees) || 0;
      const total = Number(grossAmount) - discount + fee;
      if (!isNaN(total) && typeof total === 'number') {
        form.setValue('total_amount', Number(total.toFixed(2)));
      }
    }
  }, [grossAmount, discountAmount, fees, form]);

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
  }, [transactionDate, paymentPeriods, form, userCompany]);

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
          <DialogTitle>Registrar Gasto de Combustible</DialogTitle>
          <DialogDescription>
            Registra un nuevo gasto de combustible para un conductor.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* SECCIÓN 1: Información Básica */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">Información Básica</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="transaction_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Transacción *</FormLabel>
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
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
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
                                value={field.value ? format(field.value, 'MMMM', { locale: es }) : ""}
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
                                value={field.value?.getFullYear()?.toString() || ""}
                                onValueChange={(year) => {
                                  const currentMonth = field.value?.getMonth() || 0;
                                  const currentDay = field.value?.getDate() || 1;
                                  field.onChange(new Date(parseInt(year), currentMonth, currentDay));
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
                      <FormLabel>Período de Pago</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(
                            predictedPeriod && "border-blue-300 bg-blue-50"
                          )}>
                             <SelectValue 
                               placeholder={
                                 predictedPeriod 
                                   ? `Se creará: ${formatDateSafe(predictedPeriod.start, 'dd/MM/yyyy')} - ${formatDateSafe(predictedPeriod.end, 'dd/MM/yyyy')}`
                                   : "Se seleccionará automáticamente"
                               } 
                             />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {paymentPeriods.map((period) => (
                             <SelectItem key={period.id} value={period.id}>
                               {formatDateSafe(period.period_start_date, 'dd/MM/yyyy')} - {formatDateSafe(period.period_end_date, 'dd/MM/yyyy')}
                             </SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      {predictedPeriod && (
                        <p className="text-xs text-blue-600 mt-1">
                          💡 El período se creará automáticamente al guardar
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
                      <FormLabel>Conductor *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar conductor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {drivers.map((driver) => (
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
                      <FormLabel>Vehículo (Camión)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar camión" />
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
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">Detalles del Combustible</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fuel_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Combustible *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="gasoline">Gasolina</SelectItem>
                          <SelectItem value="def">DEF</SelectItem>
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
                      <FormLabel>Tarjeta de Combustible</FormLabel>
                       <Select 
                         onValueChange={(value) => {
                           field.onChange(value);
                           // Extraer y asignar los últimos 4 dígitos de la tarjeta seleccionada
                           const selectedCard = driverCards.find(card => card.id === value);
                           if (selectedCard) {
                             form.setValue('card_last_four', selectedCard.card_number_last_five);
                           }
                         }} 
                         value={field.value}
                       >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tarjeta" />
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
                      <FormLabel>Galones *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0.000"
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
                      <FormLabel>Precio/Galón *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? "" : value);
                            }}
                            value={field.value ? Number(field.value).toFixed(2) : ""}
                          />
                        </div>
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
                      <FormLabel>Monto Bruto</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8 bg-muted"
                            {...field}
                            value={field.value ? Number(field.value).toFixed(2) : ""}
                            readOnly
                          />
                        </div>
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
                      <FormLabel>Descuentos</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? "" : value);
                            }}
                            value={field.value ? Number(field.value).toFixed(2) : ""}
                          />
                        </div>
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
                      <FormLabel>Comisiones</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? "" : value);
                            }}
                            value={field.value ? Number(field.value).toFixed(2) : ""}
                          />
                        </div>
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
                      <FormLabel>Total *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8 bg-muted"
                            {...field}
                            value={field.value ? Number(field.value).toFixed(2) : ""}
                            readOnly
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SECCIÓN 3: Información Adicional */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">Información Adicional</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="invoice_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Factura</FormLabel>
                      <FormControl>
                        <Input placeholder="INV-123456" {...field} />
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
                      <FormLabel>Nombre de la Estación</FormLabel>
                      <FormControl>
                        <Input placeholder="Shell, Pilot, Loves..." {...field} />
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
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <StateCombobox
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Selecciona estado..."
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
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales..."
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
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}