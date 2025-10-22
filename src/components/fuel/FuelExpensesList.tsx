import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Fuel, MoreHorizontal, Edit, Trash2, Eye, MapPin, Receipt, User, Calendar, DollarSign } from 'lucide-react';
import { useFuelExpenses, useDeleteFuelExpense } from '@/hooks/useFuelExpenses';
import { useCompanyDrivers } from '@/hooks/useCompanyDrivers';
import { formatDateTime, formatDateOnly } from '@/lib/dateFormatting';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FuelViewToggle, type FuelViewMode } from './FuelViewToggle';
import { formatPeriodLabel } from '@/utils/periodUtils';

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
  const [viewMode, setViewMode] = useState<FuelViewMode>('cards');
  const { t } = useTranslation(['fuel', 'common']);

  // Función para obtener el nombre del conductor
  const getDriverName = (driverUserId: string) => {
    const driver = drivers.find(d => d.user_id === driverUserId);
    if (driver && driver.first_name && driver.last_name) {
      return `${driver.first_name} ${driver.last_name}`;
    }
    return t('fuel:expenses_list.driver_not_found');
  };

  // Función para obtener el avatar del conductor
  const getDriverAvatar = (driverUserId: string) => {
    const driver = drivers.find(d => d.user_id === driverUserId);
    return {
      url: driver?.avatar_url,
      name: getDriverName(driverUserId),
      initials: driver ? `${driver.first_name?.charAt(0) || ''}${driver.last_name?.charAt(0) || ''}` : '??'
    };
  };

  // Función para obtener la licencia del conductor
  const getDriverLicense = (driverUserId: string) => {
    const driver = drivers.find(d => d.user_id === driverUserId);
    return driver?.license_number;
  };

  // Función para formatear la ubicación (Ciudad, Estado)
  const formatStationLocation = (stationName?: string, stationCity?: string, stationState?: string) => {
    const parts = [];
    
    if (stationName) {
      parts.push(stationName);
    }
    
    if (stationCity && stationState) {
      parts.push(`${stationCity}, ${stationState}`);
    } else if (stationCity) {
      parts.push(stationCity);
    } else if (stationState) {
      parts.push(stationState);
    }
    
    return parts.length > 0 ? parts : ['N/A'];
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 hover:bg-yellow-100 hover:text-yellow-800 dark:hover:bg-yellow-900 dark:hover:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:bg-green-100 hover:text-green-800 dark:hover:bg-green-900 dark:hover:text-green-300',
      verified: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-900 dark:hover:text-blue-300',
      applied: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 hover:bg-purple-100 hover:text-purple-800 dark:hover:bg-purple-900 dark:hover:text-purple-300',
    };
    
    const labels = {
      pending: t('fuel:filters.pending'),
      approved: t('fuel:filters.approved'),
      verified: t('fuel:filters.verified'),
      applied: 'Aplicado',
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
    console.log('🎯 Iniciando proceso de eliminación para expense:', expenseId);
    setExpenseToDelete(expenseId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      console.log('✅ Confirmando eliminación de expense:', expenseToDelete);
      deleteMutation.mutate(expenseToDelete);
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } else {
      console.warn('⚠️ No hay expense ID para eliminar');
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
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Fuel className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">{t('fuel:expenses_list.title_full', { count: 0 })}</span>
              <span className="sm:hidden">{t('fuel:expenses_list.title_short', { count: 0 })}</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <FuelViewToggle 
                currentView={viewMode}
                onViewChange={setViewMode}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Fuel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {t('fuel:expenses_list.no_expenses')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('fuel:expenses_list.no_expenses_description')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Fuel className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">{t('fuel:expenses_list.title_full', { count: expenses.length })}</span>
              <span className="sm:hidden">{t('fuel:expenses_list.title_short', { count: expenses.length })}</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <FuelViewToggle 
                currentView={viewMode}
                onViewChange={setViewMode}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative p-0 sm:p-6">
          {/* Vista Cards */}
          {viewMode === 'cards' && (
            <div className="space-y-3 p-4">
            {expenses.map((expense) => (
              <div key={expense.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={getDriverAvatar(expense.driver_user_id).url} alt={getDriverAvatar(expense.driver_user_id).name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getDriverAvatar(expense.driver_user_id).initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center justify-between flex-1">
                      <div className="font-bold text-base">
                        {getDriverName(expense.driver_user_id)}
                      </div>
                      <div className="flex items-center gap-1 text-lg font-bold text-primary">
                        <DollarSign className="h-5 w-5" />
                        <span>{expense.total_amount?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={t('fuel:expenses_list.actions.menu_label')}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-48 z-[60] bg-popover border shadow-md"
                    >
                      <DropdownMenuItem 
                        onClick={() => onView?.(expense.id)}
                        className="cursor-pointer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('fuel:expenses_list.actions.view')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onEdit?.(expense.id)}
                        className="cursor-pointer"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t('fuel:expenses_list.actions.edit')}
                      </DropdownMenuItem>
                      {expense.receipt_url && (
                        <DropdownMenuItem asChild>
                          <a 
                            href={expense.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="cursor-pointer"
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            {t('fuel:expenses_list.actions.view_receipt')}
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(expense.id)}
                        className="text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('fuel:expenses_list.actions.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{formatDateOnly(expense.transaction_date)}</span>
                    </div>
                    {(expense as any).company_payment_periods?.period_start_date && (expense as any).company_payment_periods?.period_end_date && (
                      <div className="text-xs text-muted-foreground pl-4">
                        {formatPeriodLabel((expense as any).company_payment_periods.period_start_date, (expense as any).company_payment_periods.period_end_date)} ({formatDateOnly((expense as any).company_payment_periods.period_start_date)} - {formatDateOnly((expense as any).company_payment_periods.period_end_date)})
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <div className="truncate">
                      {formatStationLocation(expense.station_name, expense.station_city, expense.station_state).map((part, index) => (
                        <div key={index} className={index === 0 ? "font-medium" : "text-xs text-muted-foreground"}>
                          {part}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Fuel className="h-3 w-3 text-muted-foreground" />
                      <span>{expense.gallons_purchased?.toFixed(1)} gal</span>
                    </div>
                    <div className="text-xs text-muted-foreground pl-4">
                      ${expense.price_per_gallon?.toFixed(3)}/gal
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getFuelTypeIcon(expense.fuel_type)}
                    <span className="capitalize">{t(`fuel:expenses_list.fuel_types.${expense.fuel_type}`, expense.fuel_type)}</span>
                  </div>
                </div>
                
                <div className="flex justify-end items-center">
                  {getStatusBadge(expense.status)}
                </div>
              </div>
            ))}
            </div>
          )}

          {/* Vista Tabla */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto overflow-y-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('fuel:expenses_list.columns.driver')}</TableHead>
                  <TableHead>{t('fuel:expenses_list.columns.date')}</TableHead>
                  <TableHead>{t('fuel:expenses_list.columns.station')}</TableHead>
                  <TableHead>{t('fuel:expenses_list.columns.fuel_type')}</TableHead>
                  <TableHead>{t('fuel:expenses_list.columns.gallons')}</TableHead>
                  <TableHead>{t('fuel:expenses_list.columns.price_per_gallon')}</TableHead>
                  <TableHead>{t('fuel:expenses_list.columns.total')}</TableHead>
                  <TableHead>{t('fuel:expenses_list.columns.status')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getDriverAvatar(expense.driver_user_id).url} alt={getDriverAvatar(expense.driver_user_id).name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getDriverAvatar(expense.driver_user_id).initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {getDriverName(expense.driver_user_id)}
                          </div>
                          {getDriverLicense(expense.driver_user_id) && (
                            <div className="text-xs text-muted-foreground">
                              {t('fuel:expenses_list.license')}: {getDriverLicense(expense.driver_user_id)}
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
                          {formatStationLocation(expense.station_name, expense.station_city, expense.station_state).map((part, index) => (
                            <div key={index} className={index === 0 ? "font-medium" : "text-xs text-muted-foreground truncate max-w-[150px]"}>
                              {part}
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getFuelTypeIcon(expense.fuel_type)}
                        <span className="capitalize">{t(`fuel:expenses_list.fuel_types.${expense.fuel_type}`, expense.fuel_type)}</span>
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
                            aria-label={t('fuel:expenses_list.actions.menu_label')}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end" 
                          className="w-48 z-[60] bg-popover border shadow-md"
                          side="bottom"
                          sideOffset={5}
                          avoidCollisions={true}
                          collisionPadding={10}
                        >
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onView?.(expense.id);
                            }}
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t('fuel:expenses_list.actions.view')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit?.(expense.id);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t('fuel:expenses_list.actions.edit')}
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
                                {t('fuel:expenses_list.actions.view_receipt')}
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
                            {t('fuel:expenses_list.actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('fuel:expenses_list.delete_dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('fuel:expenses_list.delete_dialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('fuel:expenses_list.delete_dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('fuel:expenses_list.delete_dialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}