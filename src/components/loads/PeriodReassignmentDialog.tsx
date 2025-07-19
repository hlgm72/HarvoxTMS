import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Calendar, Truck, DollarSign, Fuel, Receipt, Plus } from 'lucide-react';
import { usePaymentPeriods } from '@/hooks/usePaymentPeriods';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface PeriodReassignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  element: {
    id: string;
    type: 'load' | 'fuel_expense' | 'expense_instance' | 'other_income';
    name: string;
    amount: number;
    currentPeriodId?: string;
    driverUserId: string;
  };
}

const PeriodReassignmentDialog = ({ 
  isOpen, 
  onClose, 
  element 
}: PeriodReassignmentDialogProps) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const { 
    paymentPeriods, 
    reassignElement, 
    isReassigningElement 
  } = usePaymentPeriods(element.driverUserId);

  const handleReassign = () => {
    if (!selectedPeriodId) {
      toast({
        title: "Error",
        description: "Selecciona un período de destino",
        variant: "destructive",
      });
      return;
    }

    reassignElement({
      elementType: element.type,
      elementId: element.id,
      newPeriodId: selectedPeriodId
    });

    onClose();
  };

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'load':
        return <Truck className="h-4 w-4" />;
      case 'fuel_expense':
        return <Fuel className="h-4 w-4" />;
      case 'expense_instance':
        return <Receipt className="h-4 w-4" />;
      case 'other_income':
        return <Plus className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getElementTypeLabel = (type: string) => {
    switch (type) {
      case 'load':
        return 'Carga';
      case 'fuel_expense':
        return 'Gasto de Combustible';
      case 'expense_instance':
        return 'Gasto';
      case 'other_income':
        return 'Otro Ingreso';
      default:
        return 'Elemento';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'paid':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'locked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Abierto';
      case 'processing':
        return 'Procesando';
      case 'closed':
        return 'Cerrado';
      case 'paid':
        return 'Pagado';
      case 'locked':
        return 'Bloqueado';
      default:
        return status;
    }
  };

  // Filtrar períodos disponibles (no bloqueados y diferentes al actual)
  const availablePeriods = paymentPeriods?.filter(period => 
    !period.is_locked && 
    period.id !== element.currentPeriodId &&
    period.status === 'open'
  ) || [];

  const currentPeriod = paymentPeriods?.find(p => p.id === element.currentPeriodId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reasignar a Período de Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del elemento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {getElementIcon(element.type)}
                {getElementTypeLabel(element.type)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Elemento:</span>
                  <span className="font-medium">{element.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monto:</span>
                  <span className="font-medium">{formatCurrency(element.amount)}</span>
                </div>
                {currentPeriod && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Período Actual:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {format(parseISO(currentPeriod.period_start_date), 'dd/MM', { locale: es })} - {' '}
                        {format(parseISO(currentPeriod.period_end_date), 'dd/MM/yy', { locale: es })}
                      </span>
                      <Badge className={`text-xs ${getStatusColor(currentPeriod.status)}`}>
                        {getStatusText(currentPeriod.status)}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selección de nuevo período */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Seleccionar Nuevo Período</h3>
            </div>

            {availablePeriods.length === 0 ? (
              <Card>
                <CardContent className="py-6">
                  <div className="text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No hay períodos disponibles</p>
                    <p className="text-sm">
                      No existen períodos abiertos donde se pueda reasignar este elemento
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar período de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>
                            {format(parseISO(period.period_start_date), 'dd/MM', { locale: es })} - {' '}
                            {format(parseISO(period.period_end_date), 'dd/MM/yy', { locale: es })}
                          </span>
                          <Badge className={`ml-2 text-xs ${getStatusColor(period.status)}`}>
                            {getStatusText(period.status)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Vista previa del período seleccionado */}
                {selectedPeriodId && (
                  <Card>
                    <CardContent className="pt-4">
                      {(() => {
                        const selectedPeriod = availablePeriods.find(p => p.id === selectedPeriodId);
                        if (!selectedPeriod) return null;
                        
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Período:</span>
                              <span className="font-medium">
                                {format(parseISO(selectedPeriod.period_start_date), 'dd/MM/yyyy', { locale: es })} - {' '}
                                {format(parseISO(selectedPeriod.period_end_date), 'dd/MM/yyyy', { locale: es })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Frecuencia:</span>
                              <span className="font-medium capitalize">{selectedPeriod.period_frequency}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Ingresos Actuales:</span>
                              <span className="font-medium">{formatCurrency(selectedPeriod.total_income)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isReassigningElement}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReassign} 
              disabled={!selectedPeriodId || isReassigningElement || availablePeriods.length === 0}
            >
              {isReassigningElement ? 'Reasignando...' : 'Reasignar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PeriodReassignmentDialog;