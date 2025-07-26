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
import { cn } from '@/lib/utils';
import { useCreateFuelExpense } from '@/hooks/useFuelExpenses';
import { useCompanyDrivers } from '@/hooks/useCompanyDrivers';
import { useCompanyPaymentPeriods } from '@/hooks/useCompanyPaymentPeriods';
import { useEquipment } from '@/hooks/useEquipment';
import { useCompanyCache } from '@/hooks/useCompanyCache';
import { useDriverCards } from '@/hooks/useDriverCards';

const formSchema = z.object({
  driver_user_id: z.string().min(1, 'Selecciona un conductor'),
  payment_period_id: z.string().min(1, 'Selecciona un período de pago'),
  transaction_date: z.date({
    required_error: 'La fecha es requerida',
  }),
  fuel_type: z.string().min(1, 'Selecciona el tipo de combustible'),
  gallons_purchased: z.coerce.number().positive('Los galones deben ser positivos'),
  price_per_gallon: z.coerce.number().positive('El precio por galón debe ser positivo'),
  total_amount: z.coerce.number().positive('El monto total debe ser positivo'),
  station_name: z.string().optional(),
  station_address: z.string().optional(),
  station_state: z.string().optional(),
  fuel_card_number: z.string().optional(),
  driver_card_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  odometer_reading: z.coerce.number().positive().optional(),
  
  // Campos adicionales que se extraen de PDF
  gross_amount: z.coerce.number().optional(),
  discount_amount: z.coerce.number().optional(),
  fees: z.coerce.number().optional(),
  card_last_four: z.string().max(4).optional(),
  invoice_number: z.string().optional(),
  
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
  const { data: paymentPeriods = [] } = useCompanyPaymentPeriods(userCompany?.company_id);
  const { equipment } = useEquipment();
  const createMutation = useCreateFuelExpense();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transaction_date: new Date(),
      fuel_type: 'diesel',
    },
  });

  const selectedDriverId = form.watch('driver_user_id');
  const { data: driverCards = [] } = useDriverCards(selectedDriverId);

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      driver_user_id: data.driver_user_id,
      payment_period_id: data.payment_period_id,
      transaction_date: data.transaction_date.toISOString(),
      fuel_type: data.fuel_type,
      gallons_purchased: data.gallons_purchased,
      price_per_gallon: data.price_per_gallon,
      total_amount: data.total_amount,
      station_name: data.station_name,
      station_address: data.station_address,
      station_state: data.station_state,
      fuel_card_number: data.fuel_card_number,
      odometer_reading: data.odometer_reading,
      
      // Campos adicionales de PDF
      gross_amount: data.gross_amount,
      discount_amount: data.discount_amount,
      fees: data.fees,
      card_last_four: data.card_last_four,
      invoice_number: data.invoice_number,
      
      vehicle_id: data.vehicle_id,
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
  const transactionDate = form.watch('transaction_date');

  // Auto-calculate total amount
  React.useEffect(() => {
    if (gallons && pricePerGallon) {
      const total = gallons * pricePerGallon;
      form.setValue('total_amount', Number(total.toFixed(2)));
    }
  }, [gallons, pricePerGallon, form]);

  // Auto-select payment period based on transaction date
  React.useEffect(() => {
    if (transactionDate && paymentPeriods.length > 0) {
      const transactionDateStr = transactionDate.toISOString().split('T')[0];
      
      const matchingPeriod = paymentPeriods.find(period => {
        const startDate = new Date(period.period_start_date).toISOString().split('T')[0];
        const endDate = new Date(period.period_end_date).toISOString().split('T')[0];
        return transactionDateStr >= startDate && transactionDateStr <= endDate;
      });

      if (matchingPeriod && !form.getValues('payment_period_id')) {
        form.setValue('payment_period_id', matchingPeriod.id);
      }
    }
  }, [transactionDate, paymentPeriods, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Gasto de Combustible</DialogTitle>
          <DialogDescription>
            Registra un nuevo gasto de combustible para un conductor.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Fecha de transacción primero - es el campo más importante */}
            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Transacción *</FormLabel>
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
                            format(field.value, "PPP")
                          ) : (
                            <span>Seleccionar fecha</span>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="driver_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conductor</FormLabel>
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
                name="payment_period_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período de Pago</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Se seleccionará automáticamente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentPeriods.map((period) => (
                          <SelectItem key={period.id} value={period.id}>
                            {format(new Date(period.period_start_date), 'dd/MM/yyyy')} - {format(new Date(period.period_end_date), 'dd/MM/yyyy')}
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
              name="fuel_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Combustible</FormLabel>
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="gallons_purchased"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Galones</FormLabel>
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
                    <FormLabel>Precio/Galón</FormLabel>
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
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="station_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estación</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la estación" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehículo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vehículo" />
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="station_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de la Estación</FormLabel>
                    <FormControl>
                      <Input placeholder="TX, CA, FL..." maxLength={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="odometer_reading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lectura del Odómetro</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="123456"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="station_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección de la Estación</FormLabel>
                  <FormControl>
                    <Input placeholder="Dirección completa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                name="card_last_four"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Últimos 4 dígitos de tarjeta</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="1234" 
                        maxLength={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Desglose de Costos */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Desglose de Costos (Opcional)</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="gross_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto Bruto</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descuentos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
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
                      <FormLabel>Comisiones</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
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
              name="driver_card_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarjeta de Combustible</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tarjeta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {driverCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.card_provider.toUpperCase()} ****{card.card_number_last_four}
                          {card.card_identifier ? ` (${card.card_identifier})` : ''}
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