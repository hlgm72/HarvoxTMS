import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, User, Fuel, Car, Receipt, DollarSign, Gauge, CreditCard } from 'lucide-react';
import { useFuelExpense } from '@/hooks/useFuelExpenses';
import { formatDateOnly, formatDateTime } from '@/lib/dateFormatting';

interface ViewFuelExpenseDialogProps {
  expenseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewFuelExpenseDialog({ expenseId, open, onOpenChange }: ViewFuelExpenseDialogProps) {
  const { data: expense, isLoading } = useFuelExpense(expenseId || '');

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      verified: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    };
    
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      verified: 'Verificado',
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (!expenseId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Detalles del Gasto de Combustible
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : expense ? (
          <div className="space-y-6">
            {/* Estado y Información Principal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Información General
                  {getStatusBadge(expense.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Conductor</div>
                      <div className="font-medium">ID: {expense.driver_user_id}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Fecha de Transacción</div>
                      <div className="font-medium">{formatDateOnly(expense.transaction_date)}</div>
                    </div>
                  </div>
                </div>

                {expense.geotab_vehicles && (
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Vehículo</div>
                      <div className="font-medium">
                        {expense.geotab_vehicles.name}
                        {expense.geotab_vehicles.license_plate && 
                          ` - ${expense.geotab_vehicles.license_plate}`
                        }
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detalles del Combustible */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Fuel className="h-5 w-5" />
                  Detalles del Combustible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground">Tipo</div>
                    <div className="font-medium capitalize">{expense.fuel_type}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground">Galones</div>
                    <div className="font-medium">{expense.gallons_purchased?.toFixed(3)} gal</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground">Precio por Galón</div>
                    <div className="font-medium flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {expense.price_per_gallon?.toFixed(3)}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold flex items-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {expense.total_amount?.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Información de la Estación */}
            {(expense.station_name || expense.station_state) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Estación de Combustible
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {expense.station_name && (
                    <div>
                      <div className="text-sm text-muted-foreground">Nombre</div>
                      <div className="font-medium">{expense.station_name}</div>
                    </div>
                  )}
                  
                  {expense.station_state && (
                    <div>
                      <div className="text-sm text-muted-foreground">Estado</div>
                      <div className="font-medium">{expense.station_state}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Información Adicional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información Adicional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {expense.odometer_reading && (
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Lectura del Odómetro</div>
                      <div className="font-medium">{expense.odometer_reading?.toLocaleString()} millas</div>
                    </div>
                  </div>
                )}

                {expense.receipt_url && (
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Recibo</div>
                      <Button variant="link" className="h-auto p-0" asChild>
                        <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
                          Ver recibo
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {expense.notes && (
                  <div>
                    <div className="text-sm text-muted-foreground">Notas</div>
                    <div className="font-medium">{expense.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información de Auditoría */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de Auditoría</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Creado</div>
                    <div className="font-medium">{formatDateTime(expense.created_at)}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground">Última Actualización</div>
                    <div className="font-medium">{formatDateTime(expense.updated_at)}</div>
                  </div>
                </div>

                {expense.verified_at && expense.verified_by && (
                  <div>
                    <div className="text-sm text-muted-foreground">Verificado</div>
                    <div className="font-medium">
                      {formatDateTime(expense.verified_at)} por {expense.verified_by}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No se encontró el gasto de combustible
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}