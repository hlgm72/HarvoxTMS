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
import { useFuelExpense, useUpdateFuelExpense } from '@/hooks/useFuelExpenses';
import { useCompanyDrivers } from '@/hooks/useCompanyDrivers';
import { useCompanyPaymentPeriods } from '@/hooks/useCompanyPaymentPeriods';
import { useEquipment } from '@/hooks/useEquipment';

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
  station_state: z.string().optional(),
  vehicle_id: z.string().optional(),
  odometer_reading: z.coerce.number().optional(),
  receipt_url: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditFuelExpenseDialogProps {
  expenseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFuelExpenseDialog({ expenseId, open, onOpenChange }: EditFuelExpenseDialogProps) {
  const { data: expense } = useFuelExpense(expenseId || '');
  const { drivers } = useCompanyDrivers();
  const { data: paymentPeriods = [] } = useCompanyPaymentPeriods();
  const { equipment } = useEquipment();
  const updateMutation = useUpdateFuelExpense();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    if (expense) {
      form.reset({
        driver_user_id: expense.driver_user_id,
        payment_period_id: expense.payment_period_id,
        transaction_date: new Date(expense.transaction_date),
        fuel_type: expense.fuel_type,
        gallons_purchased: expense.gallons_purchased,
        price_per_gallon: expense.price_per_gallon,
        total_amount: expense.total_amount,
        station_name: expense.station_name || '',
        station_state: expense.station_state || '',
        vehicle_id: expense.vehicle_id || '',
        odometer_reading: expense.odometer_reading || undefined,
        receipt_url: expense.receipt_url || '',
        notes: expense.notes || '',
      });
    }
  }, [expense, form]);

  const onSubmit = (data: FormData) => {
    if (!expenseId) return;

    updateMutation.mutate({
      id: expenseId,
      ...data,
      transaction_date: data.transaction_date.toISOString(),
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const gallons = form.watch('gallons_purchased');
  const pricePerGallon = form.watch('price_per_gallon');

  React.useEffect(() => {
    if (gallons && pricePerGallon) {
      const total = gallons * pricePerGallon;
      form.setValue('total_amount', Number(total.toFixed(2)));
    }
  }, [gallons, pricePerGallon, form]);

  if (!expenseId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Gasto de Combustible</DialogTitle>
          <DialogDescription>
            Modifica los detalles del gasto de combustible.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <SelectValue placeholder="Seleccionar período" />
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Transacción</FormLabel>
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
            </div>

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
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="TX, CA, NY..." maxLength={2} {...field} />
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
                    <FormLabel>Odómetro</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Millas"
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}