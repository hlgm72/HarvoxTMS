import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Fuel, MoreHorizontal, Edit, Trash2, Eye, MapPin, Receipt, User, Calendar, DollarSign } from 'lucide-react';
import { useFuelExpenses, useDeleteFuelExpense } from '@/hooks/useFuelExpenses';
import { useCompanyDrivers } from '@/hooks/useCompanyDrivers';
import { formatDateTime, formatDateOnly } from '@/lib/dateFormatting';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface FuelExpensesListProps {
  filters: {
    driverId?: string;
    periodId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    vehicleId?: string;
  };
  onEdit?: (expenseId: string) => void;
  onView?: (expenseId: string) => void;
}

export function FuelExpensesList({ filters, onEdit, onView }: FuelExpensesListProps) {
  const { data: expenses = [], isLoading } = useFuelExpenses(filters);
  const { drivers = [] } = useCompanyDrivers();
  const deleteMutation = useDeleteFuelExpense();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // Función para obtener el nombre del conductor
  const getDriverName = (driverUserId: string) => {
    const driver = drivers.find(d => d.user_id === driverUserId);
    if (driver && driver.first_name && driver.last_name) {
      return `${driver.first_name} ${driver.last_name}`;
    }
    return 'Conductor no encontrado';
  };

  // Función para obtener la licencia del conductor
  const getDriverLicense = (driverUserId: string) => {
    const driver = drivers.find(d => d.user_id === driverUserId);
    return driver?.license_number;
  };

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

  const getFuelTypeIcon = (fuelType: string) => {
    return <Fuel className="h-4 w-4" />;
  };

  const handleDelete = (expenseId: string) => {
    setExpenseToDelete(expenseId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      deleteMutation.mutate(expenseToDelete);
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Fuel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No hay gastos de combustible
            </h3>
            <p className="text-sm text-muted-foreground">
              Los gastos de combustible aparecerán aquí cuando se registren.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Gastos de Combustible ({expenses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="overflow-x-auto overflow-y-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estación</TableHead>
                  <TableHead>Combustible</TableHead>
                  <TableHead>Galones</TableHead>
                  <TableHead>Precio/Galón</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {getDriverName(expense.driver_user_id)}
                          </div>
                          {getDriverLicense(expense.driver_user_id) && (
                            <div className="text-xs text-muted-foreground">
                              Licencia: {getDriverLicense(expense.driver_user_id)}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDateOnly(expense.transaction_date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{expense.station_name || 'N/A'}</div>
                          {expense.station_state && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              Estado: {expense.station_state}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getFuelTypeIcon(expense.fuel_type)}
                        <span className="capitalize">{expense.fuel_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {expense.gallons_purchased?.toFixed(3)} gal
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        {expense.price_per_gallon?.toFixed(3)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {expense.total_amount?.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(expense.status)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 relative z-10"
                            aria-label="Opciones del gasto"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end" 
                          className="w-48 z-50 bg-popover border shadow-md"
                          side="bottom"
                          sideOffset={5}
                        >
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onView?.(expense.id);
                            }}
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit?.(expense.id);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {expense.receipt_url && (
                            <DropdownMenuItem asChild>
                              <a 
                                href={expense.receipt_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Receipt className="h-4 w-4 mr-2" />
                                Ver recibo
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(expense.id);
                            }}
                            className="text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto de combustible?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El gasto de combustible será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}