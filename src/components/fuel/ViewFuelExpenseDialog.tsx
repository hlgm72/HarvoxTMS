import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, User, Fuel, Car, Receipt, DollarSign, Gauge, CreditCard, FileText } from 'lucide-react';
import { useFuelExpense } from '@/hooks/useFuelExpenses';
import { useCompanyDrivers } from '@/hooks/useCompanyDrivers';
import { formatDateOnly, formatDateTime } from '@/lib/dateFormatting';
import { capitalizeWords } from '@/lib/textUtils';

interface ViewFuelExpenseDialogProps {
  expenseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewFuelExpenseDialog({ expenseId, open, onOpenChange }: ViewFuelExpenseDialogProps) {
  const { t } = useTranslation('fuel');
  const { data: expense, isLoading } = useFuelExpense(expenseId || '');
  const { drivers = [] } = useCompanyDrivers();

  // Función para obtener el nombre del conductor
  const getDriverName = (driverUserId: string) => {
    const driver = drivers.find(d => d.user_id === driverUserId);
    if (driver && driver.first_name && driver.last_name) {
      return `${driver.first_name} ${driver.last_name}`;
    }
    return t('view_dialog.driver_not_found');
  };

  const getStatusBadge = (status: string) => {
    const labels = {
      pending: t('fuel:filters.pending'),
      approved: t('fuel:filters.approved'),
      verified: t('fuel:filters.verified'),
      applied: t('fuel:filters.applied'),
    };

    const getVariant = (status: string): "default" | "secondary" | "destructive" | "success" | "warning" | "primary" | "outline" => {
      const variantMap = {
        pending: 'warning' as const,
        approved: 'success' as const,
        verified: 'default' as const,
        applied: 'primary' as const,
      };
      return variantMap[status as keyof typeof variantMap] || 'default';
    };

    return (
      <Badge variant={getVariant(status)}>
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
            {t('view_dialog.title')}
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
                  {t('view_dialog.general_info')}
                  {getStatusBadge(expense.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t('view_dialog.driver')}</div>
                      <div className="font-medium">{getDriverName(expense.driver_user_id)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t('view_dialog.transaction_date')}</div>
                      <div className="font-medium">{formatDateOnly(expense.transaction_date)}</div>
                    </div>
                  </div>
                </div>

                {expense.company_equipment && (
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t('view_dialog.vehicle')}</div>
                      <div className="font-medium">
                        {expense.company_equipment.equipment_number}
                        {expense.company_equipment.make && ` - ${capitalizeWords(expense.company_equipment.make)}`}
                        {expense.company_equipment.model && ` ${capitalizeWords(expense.company_equipment.model)}`}
                        {expense.company_equipment.year && ` (${expense.company_equipment.year})`}
                        {expense.company_equipment.license_plate && 
                          ` - ${t('view_dialog.license_plate')}: ${expense.company_equipment.license_plate}`
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
                  {t('view_dialog.fuel_details')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('view_dialog.type')}</div>
                    <div className="font-medium capitalize">{expense.fuel_type}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground">{t('view_dialog.gallons')}</div>
                    <div className="font-medium">{expense.gallons_purchased?.toFixed(3)} gal</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground">{t('view_dialog.price_per_gallon')}</div>
                    <div className="font-medium flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {expense.price_per_gallon?.toFixed(3)}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">{t('view_dialog.total')}:</span>
                  <span className="text-2xl font-bold flex items-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    {expense.total_amount?.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Información de la Estación */}
            {(expense.station_name || expense.station_city || expense.station_state) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t('view_dialog.fuel_station')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {expense.station_name && (
                    <div>
                      <div className="text-sm text-muted-foreground">{t('view_dialog.name')}</div>
                      <div className="font-medium">{expense.station_name}</div>
                    </div>
                  )}
                  
                  {(expense.station_city || expense.station_state) && (
                    <div>
                      <div className="text-sm text-muted-foreground">{t('view_dialog.location')}</div>
                      <div className="font-medium">
                        {expense.station_city && expense.station_state 
                          ? `${expense.station_city}, ${expense.station_state}`
                          : expense.station_city || expense.station_state
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Información Adicional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('view_dialog.additional_info')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {expense.driver_fuel_card && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t('view_dialog.fuel_card')}</div>
                      <div className="font-medium">
                        {expense.driver_fuel_card.card_provider.toUpperCase()} - **** {expense.driver_fuel_card.card_number_last_five}
                      </div>
                    </div>
                  </div>
                )}

                {expense.invoice_number && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t('view_dialog.invoice')}</div>
                      <div className="font-medium">{expense.invoice_number}</div>
                    </div>
                  </div>
                )}

                {expense.receipt_url && (
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t('view_dialog.receipt')}</div>
                      <Button variant="link" className="h-auto p-0" asChild>
                        <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
                          {t('view_dialog.view_receipt')}
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {expense.notes && (
                  <div>
                    <div className="text-sm text-muted-foreground">{t('view_dialog.notes')}</div>
                    <div className="font-medium">{expense.notes}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Información de Auditoría */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('view_dialog.audit_info')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('view_dialog.created')}</div>
                    <div className="font-medium">{formatDateTime(expense.created_at)}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground">{t('view_dialog.last_updated')}</div>
                    <div className="font-medium">{formatDateTime(expense.updated_at)}</div>
                  </div>
                </div>

                {expense.verified_at && expense.verified_by && (
                  <div>
                    <div className="text-sm text-muted-foreground">{t('view_dialog.verified')}</div>
                    <div className="font-medium">
                      {formatDateTime(expense.verified_at)} {t('view_dialog.by')} {expense.verified_by}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {t('view_dialog.not_found')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}